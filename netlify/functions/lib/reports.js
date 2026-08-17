const { getEvents, getEventsInLastNDays, dateStr } = require('./store');
const { pageLabel } = require('./pages');

async function collect(days) {
  if (days === 1) {
    const today = dateStr(new Date());
    const [pageviews, phoneEvents, waEvents, leadEvents] = await Promise.all([
      getEvents('pageview', today),
      getEvents('phone_click', today),
      getEvents('whatsapp_click', today),
      getEvents('generate_lead', today),
    ]);
    return { pageviews, phoneEvents, waEvents, leadEvents };
  }

  const [pv, ph, wa, ld] = await Promise.all([
    getEventsInLastNDays('pageview', days),
    getEventsInLastNDays('phone_click', days),
    getEventsInLastNDays('whatsapp_click', days),
    getEventsInLastNDays('generate_lead', days),
  ]);
  const flatten = (d) => d.dates.flatMap((date) => d.eventsByDate[date]);
  return {
    pageviews: flatten(pv),
    phoneEvents: flatten(ph),
    waEvents: flatten(wa),
    leadEvents: flatten(ld),
  };
}

async function buildSummaryText(days, title) {
  const { pageviews, phoneEvents, waEvents, leadEvents } = await collect(days);

  const sids = new Set(pageviews.map((e) => e.sid).filter(Boolean));

  const viewsByPath = {};
  pageviews.forEach((e) => {
    viewsByPath[e.path] = (viewsByPath[e.path] || 0) + 1;
  });
  const topPages = Object.entries(viewsByPath)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const topPageLines = topPages.map(([path, views]) => `  • ${pageLabel(path)} — ${views} צפיות`).join('\n');

  return [
    title,
    '',
    `כניסות: ${sids.size}`,
    `צפיות בעמודים: ${pageviews.length}`,
    '',
    'עמודים פופולריים:',
    topPageLines || '  אין עדיין נתונים',
    '',
    `📞 טלפון: ${phoneEvents.length}   💬 וואטסאפ: ${waEvents.length}   ✅ לידים: ${leadEvents.length}`,
  ].join('\n');
}

module.exports = { buildSummaryText };
