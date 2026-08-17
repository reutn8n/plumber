const { getStore } = require('@netlify/blobs');

const BOT_UA_PATTERN = /bot|crawler|spider|slurp|mediapartners|headlesschrome|python-requests|curl|wget|scrapy|facebookexternalhit|petalbot|bytespider|gptbot|ccbot|semrushbot|ahrefsbot|mj12bot|dotbot|applebot/i;

function isBot(userAgent) {
  return !userAgent || BOT_UA_PATTERN.test(userAgent);
}

function getGeo(headers) {
  try {
    const raw = headers['x-nf-geo'];
    if (!raw) return { city: null, country: null };
    const geo = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'));
    return { city: geo.city || null, country: (geo.country && geo.country.code) || null };
  } catch {
    return { city: null, country: null };
  }
}

function dateStr(date) {
  const d = date || new Date();
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function eventsStore() {
  return getStore('site-events');
}

async function recordEvent(type, data) {
  const store = eventsStore();
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const day = dateStr(new Date(ts));
  const key = `${type}/${day}/${ts}-${rand}`;
  await store.setJSON(key, { ts, type, ...data });
  return key;
}

async function listEventKeys(type, dayPrefix) {
  const store = eventsStore();
  const prefix = dayPrefix ? `${type}/${dayPrefix}/` : `${type}/`;
  const { blobs } = await store.list({ prefix });
  return blobs.map((b) => b.key);
}

async function getEvents(type, dayPrefix) {
  const store = eventsStore();
  const keys = await listEventKeys(type, dayPrefix);
  const events = await Promise.all(keys.map((key) => store.get(key, { type: 'json' })));
  return events.filter(Boolean);
}

async function getEventsInLastNDays(type, days) {
  const dates = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(dateStr(d));
  }
  const perDay = await Promise.all(dates.map((day) => getEvents(type, day)));
  return { dates, eventsByDate: Object.fromEntries(dates.map((d, i) => [d, perDay[i]])) };
}

module.exports = { isBot, getGeo, dateStr, recordEvent, getEvents, getEventsInLastNDays };
