const gplay = require('google-play-scraper');
const webpush = require('web-push');
const { redis, APP_ID, SUBS_KEY, MAX_HISTORY, getStatus, saveStatus } = require('../lib/store');

function configureWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

async function sendPushToAll(payload) {
  const subs = (await redis.hgetall(SUBS_KEY)) || {};
  const entries = Object.entries(subs);
  let sent = 0;

  await Promise.allSettled(
    entries.map(async ([endpoint, subValue]) => {
      const subscription = typeof subValue === 'string' ? JSON.parse(subValue) : subValue;
      try {
        await webpush.sendNotification(subscription, JSON.stringify(payload));
        sent += 1;
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await redis.hdel(SUBS_KEY, endpoint);
        }
      }
    })
  );

  return sent;
}

module.exports = async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided = req.headers['authorization'];
    if (provided !== `Bearer ${secret}`) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
  }

  const now = new Date();
  const nowStr = now.toISOString();

  const status = await getStatus();

  let result;
  try {
    result = await gplay.app({ appId: APP_ID, lang: 'tr', country: 'tr' });
  } catch (err) {
    status.last_checked = nowStr;
    status.last_error = String((err && err.message) || err);
    await saveStatus(status);
    res.status(200).json({ ok: false, error: status.last_error });
    return;
  }

  const newUpdatedTs = result.updated || null;
  const newVersion = result.version || null;
  const newUpdatedStr = newUpdatedTs ? new Date(newUpdatedTs).toISOString() : null;

  const oldUpdatedTs = status.last_updated_ts;
  const changed = Boolean(oldUpdatedTs && newUpdatedTs && newUpdatedTs !== oldUpdatedTs);

  status.last_checked = nowStr;
  status.last_error = null;

  let pushed = 0;

  if (changed) {
    status.alarm = true;
    status.alarm_message =
      `Uygulama ${newUpdatedStr} tarihinde güncellendi! Bu, sınav sonuçlarının açıklanmış ` +
      'olabileceğine dair bir sinyaldir (kesin bilgi değildir). ais.osym.gov.tr adresinden kontrol edin.';
    status.history.unshift({ detected_at: nowStr, updated_at: newUpdatedStr, version: newVersion });
    status.history = status.history.slice(0, MAX_HISTORY);

    if (configureWebPush()) {
      pushed = await sendPushToAll({
        title: 'ÖSYM Aday İşlemleri güncellendi',
        body: 'Uygulama az önce güncellendi. Sonuçlar açıklanmış olabilir, hemen kontrol et!',
        url: 'https://ais.osym.gov.tr',
      });
    }
  }

  status.last_updated_ts = newUpdatedTs;
  status.last_updated_str = newUpdatedStr;
  status.version = newVersion;

  await saveStatus(status);

  res.status(200).json({ ok: true, changed, pushed });
};
