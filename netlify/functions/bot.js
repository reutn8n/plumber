const { sendTelegram } = require('./lib/telegram');
const { buildSummaryText } = require('./lib/reports');

const HELP = [
  'היי! אפשר לשאול אותי בכל שעה:',
  '• "היום" / "סטטוס" / "מה קורה" — סיכום היום',
  '• "השבוע" — 7 הימים האחרונים',
  '• "החודש" — 30 הימים האחרונים',
].join('\n');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 200, body: 'ok' };
  }

  let update;
  try {
    update = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 200, body: 'ok' };
  }

  const message = update.message;
  if (!message || !message.text || !message.chat) {
    return { statusCode: 200, body: 'ok' };
  }

  if (String(message.chat.id) !== process.env.TELEGRAM_CHAT_ID) {
    return { statusCode: 200, body: 'ok' };
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
  } catch (err) {
    reply = 'הייתה שגיאה בשליפת הנתונים: ' + err.message;
  }

  await sendTelegram(reply).catch(() => {});

  return { statusCode: 200, body: 'ok' };
};
