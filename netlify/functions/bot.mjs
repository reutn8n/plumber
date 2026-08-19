import { sendTelegram } from './lib/telegram.mjs';
import { buildSummaryText, buildLeadsText } from './lib/reports.mjs';

const HELP = [
  'היי! אפשר לשאול אותי בכל שעה:',
  '',
  '📊 נתוני תנועה:',
  '• "היום" — סיכום היום',
  '• "השבוע" — 7 הימים האחרונים',
  '• "החודש" — 30 הימים האחרונים',
  '',
  '👥 פרטי לקוחות:',
  '• "לידים" — פניות של היום עם שם וטלפון',
  '• "לידים השבוע" / "לידים החודש" — לתקופה ארוכה יותר',
].join('\n');

function periodFrom(text) {
  if (/חודש|30/.test(text)) return { days: 30, label: '30 הימים האחרונים' };
  if (/שבוע|7/.test(text)) return { days: 7, label: '7 הימים האחרונים' };
  return { days: 1, label: 'היום' };
}

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
    if (/^\/start|עזרה|מה אתה יודע|פקודות/.test(text)) {
      reply = HELP;
    } else if (/ליד|לקוח|פני[יו]|טופס|פרטים/.test(text)) {
      reply = await buildLeadsText(periodFrom(text).days);
    } else {
      const { days, label } = periodFrom(text);
      reply = await buildSummaryText(days, `📊 סטטוס — ${label}`);
    }
  } catch {
    reply = 'הייתה שגיאה בשליפת הנתונים, נסי שוב בעוד רגע.';
  }

  await sendTelegram(reply).catch(() => {});

  return new Response('ok');
};
