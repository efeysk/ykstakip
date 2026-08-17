const { Redis } = require('@upstash/redis');

const redis = Redis.fromEnv();

const APP_ID = 'tr.gov.osym.ais.android';
const STATUS_KEY = 'osym:status';
const SUBS_KEY = 'osym:subs';
const MAX_HISTORY = 50;

const DEFAULT_STATUS = {
  app_name: 'ÖSYM Aday İşlemleri Sistemi',
  package_id: APP_ID,
  last_checked: null,
  last_updated_ts: null,
  last_updated_str: null,
  version: null,
  alarm: false,
  alarm_message: null,
  last_error: null,
  history: [],
};

async function getStatus() {
  const data = await redis.get(STATUS_KEY);
  if (!data) return { ...DEFAULT_STATUS };
  return { ...DEFAULT_STATUS, ...data };
}

async function saveStatus(status) {
  await redis.set(STATUS_KEY, status);
}

module.exports = {
  redis,
  APP_ID,
  STATUS_KEY,
  SUBS_KEY,
  MAX_HISTORY,
  DEFAULT_STATUS,
  getStatus,
  saveStatus,
};
