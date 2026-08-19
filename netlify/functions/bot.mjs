import { sendTelegram } from './lib/telegram.mjs';
import { buildSummaryText } from './lib/reports.mjs';

const HELP = [
  'היי! אפשר לשאול אותי בכל שעה:',
  '• "היום" / "סטטוס" / "מה קורה" — סיכום היום',
  '• "השבוע" — 7 הימים האחרונים',
  '• "החודש" — 30 הימים האחרונים',
].join('\n');

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('ok');
  }

  let update;
  try {
    update = await req.json();
  } catch {
    return new Response('ok');
  }

  const message = update.message;
  if (!message || !message.text || !message.chat) {
    return new Response('ok');
  }

  if (String(message.chat.id) !== process.env.TELEGRAM_CHAT_ID) {
    return new Response('ok');
  }

  const text = message.text.trim();
  let reply;

  try {
    if (/^\/start/.test(text)) {
      reply = HELP;
    } else if (/חודש|30/.test(text)) {
      reply = await buildSummaryText(30, '📊 סטטוס — 30 הימים האחרונים');
    } else if (/שבוע|7/.test(text)) {
      reply = await buildSummaryText(7, '📊 סטטוס — 7 הימים האחרונים');
    } else {
      reply = await buildSummaryText(1, '📊 סטטוס — היום');
    }
  } catch {
    reply = 'הייתה שגיאה בשליפת הנתונים, נסי שוב בעוד רגע.';
  }

  await sendTelegram(reply).catch(() => {});

  return new Response('ok');
};
