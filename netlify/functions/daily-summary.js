const { sendTelegram } = require('./lib/telegram');
const { buildSummaryText } = require('./lib/reports');

exports.handler = async () => {
  try {
    const dateLabel = new Date().toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' });
    const text = await buildSummaryText(1, `📊 סיכום יומי — ${dateLabel}`);
    await sendTelegram(text);
    return { statusCode: 200, body: 'ok' };
  } catch (err) {
    return { statusCode: 500, body: `error: ${err.message}` };
  }
};
