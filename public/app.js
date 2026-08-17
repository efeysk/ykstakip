function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function registerAndSubscribe() {
  const btn = document.getElementById('subscribe-btn');

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    alert('Bu tarayıcı push bildirimlerini desteklemiyor.');
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    alert('Bildirim izni vermeden alarm gönderilemez.');
    return;
  }

  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    const keyRes = await fetch('/api/vapid-public-key');
    const { publicKey } = await keyRes.json();

    if (!publicKey) {
      alert('Sunucuda VAPID anahtarı tanımlı değil. Vercel ortam değişkenlerini kontrol et.');
      return;
    }

    const existing = await reg.pushManager.getSubscription();
    const sub =
      existing ||
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      }));

    await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub),
    });

    btn.textContent = '✅ Bildirimler açık';
    btn.disabled = true;
  } catch (err) {
    console.error(err);
    alert('Bildirime abone olurken bir hata oluştu.');
  }
}

async function loadStatus() {
  try {
    const res = await fetch('/api/status');
    const status = await res.json();
    renderStatus(status);
  } catch (e) {
    console.error(e);
  }
}

function renderStatus(status) {
  const box = document.getElementById('status-box');
  const alarmBox = document.getElementById('alarm-box');
  const historyEl = document.getElementById('history');

  if (!status) {
    box.innerHTML = '<p class="empty">Henüz kontrol yapılmadı.</p>';
    return;
  }

  if (status.alarm) {
    alarmBox.style.display = 'block';
    alarmBox.querySelector('.msg').textContent = status.alarm_message;
  } else {
    alarmBox.style.display = 'none';
  }

  box.innerHTML = `
    <div class="row"><span class="label">Son güncelleme</span><span>${status.last_updated_str || '—'}</span></div>
    <div class="row"><span class="label">Sürüm</span><span>${status.version || '—'}</span></div>
    <div class="row"><span class="label">Son kontrol</span><span>${status.last_checked || '—'}</span></div>
  `;

  if (status.history && status.history.length) {
    historyEl.innerHTML = status.history
      .map(
        (h) =>
          `<div class="history-item"><span>${h.updated_at || ''} ${
            h.version ? '(v' + h.version + ')' : ''
          }</span><span>tespit: ${h.detected_at}</span></div>`
      )
      .join('');
  } else {
    historyEl.innerHTML = '<div class="empty">Henüz kayıtlı güncelleme tespiti yok.</div>';
  }
}

document.getElementById('subscribe-btn').addEventListener('click', registerAndSubscribe);
loadStatus();
setInterval(loadStatus, 60000);
