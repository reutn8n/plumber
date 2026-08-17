const { sendTelegram } = require('./lib/telegram');
const { getEvents, dateStr } = require('./lib/store');
const { pageLabel } = require('./lib/pages');

exports.handler = async () => {
  try {
    const today = dateStr(new Date());

    const [pageviews, phoneEvents, waEvents, leadEvents] = await Promise.all([
      getEvents('pageview', today),
      getEvents('phone_click', today),
      getEvents('whatsapp_click', today),
      getEvents('generate_lead', today),
    ]);

    const sids = new Set(pageviews.map((e) => e.sid).filter(Boolean));

    const viewsByPath = {};
    pageviews.forEach((e) => {
      viewsByPath[e.path] = (viewsByPath[e.path] || 0) + 1;
    });
    const topPages = Object.entries(viewsByPath)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const topPageLines = topPages.map(([path, views]) => `  • ${pageLabel(path)} — ${views} צפיות`).join('\n');

    const dateLabel = new Date().toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' });

    const lines = [
      `📊 סיכום יומי — ${dateLabel}`,
      '',
      `כניסות לאתר: ${sids.size}`,
      `צפיות בעמודים: ${pageviews.length}`,
      '',
      'העמודים הפופולריים היום:',
      topPageLines || '  אין עדיין נתונים',
      '',
      `📞 לחיצות טלפון: ${phoneEvents.length}`,
      `💬 לחיצות וואטסאפ: ${waEvents.length}`,
      `✅ לידים מהטופס: ${leadEvents.length}`,
    ];

    await sendTelegram(lines.join('\n'));

    return { statusCode: 200, body: 'ok' };
  } catch (err) {
    return { statusCode: 500, body: `error: ${err.message}` };
  }
};
