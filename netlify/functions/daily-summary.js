const { getGa4Client, sendTelegram, pageLabel } = require('./lib/ga4');

exports.handler = async () => {
  try {
    const { runReport } = await getGa4Client();

    const [totals, topPages, events] = await Promise.all([
      runReport({
        dateRanges: [{ startDate: 'today', endDate: 'today' }],
        metrics: [{ name: 'sessions' }, { name: 'activeUsers' }, { name: 'screenPageViews' }],
      }),
      runReport({
        dateRanges: [{ startDate: 'today', endDate: 'today' }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 3,
      }),
      runReport({
        dateRanges: [{ startDate: 'today', endDate: 'today' }],
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: {
            fieldName: 'eventName',
            inListFilter: { values: ['phone_click', 'whatsapp_click', 'generate_lead'] },
          },
        },
      }),
    ]);

    const totalsRow = (totals.rows && totals.rows[0]) || null;
    const sessions = totalsRow ? Number(totalsRow.metricValues[0].value) : 0;
    const users = totalsRow ? Number(totalsRow.metricValues[1].value) : 0;
    const pageviews = totalsRow ? Number(totalsRow.metricValues[2].value) : 0;

    const eventCounts = {};
    (events.rows || []).forEach((r) => {
      eventCounts[r.dimensionValues[0].value] = Number(r.metricValues[0].value);
    });

    const topPageLines = (topPages.rows || [])
      .map((r) => `  • ${pageLabel(r.dimensionValues[0].value)} — ${r.metricValues[0].value} צפיות`)
      .join('\n');

    const dateLabel = new Date().toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' });

    const lines = [
      `📊 סיכום יומי — ${dateLabel}`,
      '',
      `כניסות לאתר: ${sessions}`,
      `מבקרים: ${users}`,
      `צפיות בעמודים: ${pageviews}`,
      '',
      'העמודים הפופולריים היום:',
      topPageLines || '  אין עדיין נתונים',
      '',
      `📞 לחיצות טלפון: ${eventCounts.phone_click || 0}`,
      `💬 לחיצות וואטסאפ: ${eventCounts.whatsapp_click || 0}`,
      `✅ לידים מהטופס: ${eventCounts.generate_lead || 0}`,
    ];

    await sendTelegram(lines.join('\n'));

    return { statusCode: 200, body: 'ok' };
  } catch (err) {
    return { statusCode: 500, body: `error: ${err.message}` };
  }
};
