const { sendTelegram } = require('./lib/telegram');
const { recordEvent, isBot } = require('./lib/store');

const LABELS = {
  phone_click: '📞 לחיצה על מספר הטלפון',
  whatsapp_click: '💬 לחיצה על כפתור הוואטסאפ',
  generate_lead: '✅ ליד חדש מהטופס באתר',
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { type, name, phone, issue, page } = payload;
  const label = LABELS[type];
  if (!label) {
    return { statusCode: 400, body: 'Unknown event type' };
  }

  const userAgent = event.headers['user-agent'] || '';
  if (!isBot(userAgent)) {
    const city = (event.headers['x-nf-geo'] && JSON.parse(event.headers['x-nf-geo']).city) || null;
    await recordEvent(type, { path: page || null, name: name || null, phone: phone || null, city }).catch(() => {});
  }

  const lines = [label];
  if (name) lines.push(`שם: ${name}`);
  if (phone) lines.push(`טלפון: ${phone}`);
  if (issue) lines.push(`תיאור: ${issue}`);
  if (page) lines.push(`מהעמוד: ${page}`);

  try {
    await sendTelegram(lines.join('\n'));
  } catch (err) {
    return { statusCode: 502, body: 'Failed to send notification' };
  }

  return { statusCode: 200, body: 'ok' };
};
