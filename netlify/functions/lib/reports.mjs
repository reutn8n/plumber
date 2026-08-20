import { getEvents, getEventsInLastNDays, dateStr } from './store.mjs';
import { pageLabel } from './pages.mjs';

// First day our own tracking actually persisted events. Before this the site
// had a tag installed but nothing was being saved, so any period reaching
// further back is measuring silence, not a drop in traffic.
const DATA_START = '2026-08-19';

function coverageNote(days) {
  if (days <= 1) return null;
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  if (dateStr(from) >= DATA_START) return null;

  const start = new Date(DATA_START + 'T00:00:00');
  const daysOfData = Math.floor((Date.now() - start.getTime()) / 86400000) + 1;
  const he = (d) => d.toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem', day: '2-digit', month: '2-digit' });
  return `⚠️ המדידה באתר התחילה ב-${he(start)}, כלומר יש ${daysOfData} ימי נתונים בלבד. הימים שלפני כן מופיעים כ-0 כי לא נמדדו — לא כי לא הייתה תנועה.`;
}

async function collect(days) {
  if (days === 1) {
    const today = dateStr(new Date());
    const [pageviews, phoneEvents, waEvents, leadEvents, scrollEvents] = await Promise.all([
      getEvents('pageview', today),
      getEvents('phone_click', today),
      getEvents('whatsapp_click', today),
      getEvents('generate_lead', today),
      getEvents('scroll', today),
    ]);
    return { pageviews, phoneEvents, waEvents, leadEvents, scrollEvents };
  }

  const [pv, ph, wa, ld, sc] = await Promise.all([
    getEventsInLastNDays('pageview', days),
    getEventsInLastNDays('phone_click', days),
    getEventsInLastNDays('whatsapp_click', days),
    getEventsInLastNDays('generate_lead', days),
    getEventsInLastNDays('scroll', days),
  ]);
  const flatten = (d) => d.dates.flatMap((date) => d.eventsByDate[date]);
  return {
    pageviews: flatten(pv),
    phoneEvents: flatten(ph),
    waEvents: flatten(wa),
    leadEvents: flatten(ld),
    scrollEvents: flatten(sc),
  };
}

// How far visitors actually get down the page, as a share of everyone who
// landed — this is what shows where people give up.
function scrollLines(scrollEvents, sessionCount) {
  if (!sessionCount) return null;
  const reached = {};
  [25, 50, 75, 100].forEach((d) => {
    reached[d] = new Set(
      scrollEvents.filter((e) => e.depth === d).map((e) => e.sid).filter(Boolean)
    ).size;
  });
  return [25, 50, 75, 100]
    .map((d) => `  ${d}%: ${Math.round((reached[d] / sessionCount) * 100)}% מהמבקרים`)
    .join('\n');
}

function formatWhen(ts) {
  return new Date(ts).toLocaleString('he-IL', {
    timeZone: 'Asia/Jerusalem',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export async function buildLeadsText(days) {
  const { leadEvents, phoneEvents, waEvents } = await collect(days);

  const period = days === 1 ? 'היום' : `${days} הימים האחרונים`;
  const lines = [`👥 פניות לקוחות — ${period}`, ''];

  if (leadEvents.length) {
    lines.push(`📋 מהטופס באתר (${leadEvents.length}):`);
    leadEvents
      .slice()
      .sort((a, b) => b.ts - a.ts)
      .forEach((e) => {
        lines.push('');
        lines.push(`• ${e.name || 'ללא שם'} — ${e.phone || 'ללא טלפון'}`);
        if (e.issue) lines.push(`  תיאור: ${e.issue}`);
        lines.push(`  ${formatWhen(e.ts)}${e.city ? ' · ' + e.city : ''}`);
      });
  } else {
    lines.push('📋 מהטופס באתר: אין פניות בתקופה הזו');
  }

  lines.push('');
  lines.push(
    `📞 לחצו על הטלפון: ${phoneEvents.length}   💬 לחצו על וואטסאפ: ${waEvents.length}`
  );
  lines.push('(בלחיצות האלה אין פרטים אישיים — הלקוח פונה ישירות, בלי להשאיר פרטים באתר)');

  const note = coverageNote(days);
  if (note) lines.push('', note);

  return lines.join('\n');
}

export async function buildSummaryText(days, title) {
  const { pageviews, phoneEvents, waEvents, leadEvents, scrollEvents } = await collect(days);

  const sids = new Set(pageviews.map((e) => e.sid).filter(Boolean));

  const viewsByPath = {};
  pageviews.forEach((e) => {
    viewsByPath[e.path] = (viewsByPath[e.path] || 0) + 1;
  });
  const topPages = Object.entries(viewsByPath)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const topPageLines = topPages.map(([path, views]) => `  • ${pageLabel(path)} — ${views} צפיות`).join('\n');

  const lines = [
    title,
    '',
    `כניסות: ${sids.size}`,
    `צפיות בעמודים: ${pageviews.length}`,
    '',
    'עמודים פופולריים:',
    topPageLines || '  אין עדיין נתונים',
    '',
    `📞 טלפון: ${phoneEvents.length}   💬 וואטסאפ: ${waEvents.length}   ✅ לידים: ${leadEvents.length}`,
  ];

  const scroll = scrollLines(scrollEvents || [], sids.size);
  if (scroll) lines.push('', 'עד כמה גללו בעמוד:', scroll);

  const note = coverageNote(days);
  if (note) lines.push('', note);

  return lines.join('\n');
}
