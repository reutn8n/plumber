import { sendTelegram } from './lib/telegram.mjs';
import { recordEvent, isBot, getGeo } from './lib/store.mjs';

const LABELS = {
  phone_click: '📞 לחיצה על מספר הטלפון',
  whatsapp_click: '💬 לחיצה על כפתור הוואטסאפ',
  generate_lead: '✅ ליד חדש מהטופס באתר',
};

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { type, name, phone, issue, page } = payload;
  const label = LABELS[type];
  if (!label) {
    return new Response('Unknown event type', { status: 400 });
  }

  if (!isBot(req.headers.get('user-agent'))) {
    const { city } = getGeo(req.headers);
    await recordEvent(type, {
      path: page || null,
      name: name || null,
      phone: phone || null,
      issue: issue || null,
      city,
    }).catch(() => {});
  }

  const lines = [label];
  if (name) lines.push(`שם: ${name}`);
  if (phone) lines.push(`טלפון: ${phone}`);
  if (issue) lines.push(`תיאור: ${issue}`);
  if (page) lines.push(`מהעמוד: ${page}`);

  try {
    await sendTelegram(lines.join('\n'));
  } catch {
    return new Response('Failed to send notification', { status: 502 });
  }

  return new Response('ok');
};
