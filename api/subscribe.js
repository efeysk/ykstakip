const { redis, SUBS_KEY } = require('../lib/store');

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    const sub = req.body;
    if (!sub || !sub.endpoint) {
      res.status(400).json({ error: 'invalid subscription' });
      return;
    }
    await redis.hset(SUBS_KEY, { [sub.endpoint]: JSON.stringify(sub) });
    res.status(201).json({ ok: true });
    return;
  }

  if (req.method === 'DELETE') {
    const body = req.body || {};
    if (body.endpoint) {
      await redis.hdel(SUBS_KEY, body.endpoint);
    }
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'method not allowed' });
};
