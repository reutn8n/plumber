const { getEventsInLastNDays } = require('./lib/store');
const { KNOWN_PAGES } = require('./lib/pages');

function toChartDate(isoDate) {
  return isoDate.replace(/-/g, '');
}

exports.handler = async (event) => {
  const password = event.headers['x-dashboard-password'];
  if (!password || password !== process.env.DASHBOARD_PASSWORD) {
    return { statusCode: 401, body: JSON.stringify({ error: 'unauthorized' }) };
  }

  try {
    const [pageviewData, phoneData, waData, leadData] = await Promise.all([
      getEventsInLastNDays('pageview', 30),
      getEventsInLastNDays('phone_click', 30),
      getEventsInLastNDays('whatsapp_click', 30),
      getEventsInLastNDays('generate_lead', 30),
    ]);

    const { dates, eventsByDate } = pageviewData;
    const allPageviews = dates.flatMap((d) => eventsByDate[d]);

    const dailyRows = dates.map((date) => {
      const dayEvents = eventsByDate[date];
      const sids = new Set(dayEvents.map((e) => e.sid).filter(Boolean));
      return {
        date: toChartDate(date),
        sessions: sids.size,
        users: sids.size,
        pageviews: dayEvents.length,
      };
    });

    const last7 = dailyRows.slice(-7);
    const prev7 = dailyRows.slice(-14, -7);
    const sum = (rows, key) => rows.reduce((total, r) => total + r[key], 0);
    const last7Sessions = sum(last7, 'sessions');
    const prev7Sessions = sum(prev7, 'sessions');
    const weekChangePct =
      prev7Sessions > 0
        ? Math.round(((last7Sessions - prev7Sessions) / prev7Sessions) * 100)
        : null;

    const viewsByPath = {};
    allPageviews.forEach((e) => {
      viewsByPath[e.path] = (viewsByPath[e.path] || 0) + 1;
    });
    const topPageRows = KNOWN_PAGES
      .map((path) => ({ path, views: viewsByPath[path] || 0 }))
      .sort((a, b) => b.views - a.views);

    const sessionMap = {};
    allPageviews.forEach((e) => {
      if (e.sid && !sessionMap[e.sid]) sessionMap[e.sid] = e;
    });
    const sessions = Object.values(sessionMap);

    const deviceCounts = {};
    sessions.forEach((s) => {
      deviceCounts[s.device] = (deviceCounts[s.device] || 0) + 1;
    });
    const deviceRows = Object.entries(deviceCounts)
      .map(([device, users]) => ({ device, users }))
      .sort((a, b) => b.users - a.users);

    const newCount = sessions.filter((s) => s.isNew).length;
    const newVsReturningRows = [
      { type: 'new', users: newCount },
      { type: 'returning', users: sessions.length - newCount },
    ];

    const cityCounts = {};
    sessions.forEach((s) => {
      if (s.city) cityCounts[s.city] = (cityCounts[s.city] || 0) + 1;
    });
    const cityRows = Object.entries(cityCounts)
      .map(([city, users]) => ({ city, users }))
      .sort((a, b) => b.users - a.users)
      .slice(0, 5);

    const countAll = (data) => dates.reduce((total, d) => total + data.eventsByDate[d].length, 0);

    const summary = {
      totalSessions30d: sum(dailyRows, 'sessions'),
      totalPageviews30d: sum(dailyRows, 'pageviews'),
      last7Sessions,
      prev7Sessions,
      weekChangePct,
      topPage: topPageRows[0] && topPageRows[0].views > 0 ? topPageRows[0] : null,
      phoneClicks: countAll(phoneData),
      whatsappClicks: countAll(waData),
      leads: countAll(leadData),
    };

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dailyRows,
        topPageRows,
        summary,
        audience: { devices: deviceRows, newVsReturning: newVsReturningRows, cities: cityRows },
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'server_error', message: err.message }),
    };
  }
};
