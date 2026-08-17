const { getGa4Client } = require('./lib/ga4');

const KNOWN_PAGES = [
  '/',
  '/about.html',
  '/expertise.html',
  '/blog.html',
  '/leak-detection-thermal-camera.html',
  '/unclogging-drains.html',
  '/faucets-toilets-repair.html',
  '/water-pressure-issues.html',
  '/renovation-plumbing.html',
  '/emergency-plumbing.html',
  '/home-plumbing-inspection.html',
  '/nezila-nistara-simanim.html',
  '/stima-kiyor-ambatya.html',
  '/laghatz-mayim-namuch-sibot.html',
  '/berez-notef-nyagera-rotza.html',
  '/bdika-instalatzia-lifney-kniyat-dira.html',
];

function last30Dates() {
  const dates = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dates.push(`${y}${m}${day}`);
  }
  return dates;
}

exports.handler = async (event) => {
  const password = event.headers['x-dashboard-password'];
  if (!password || password !== process.env.DASHBOARD_PASSWORD) {
    return { statusCode: 401, body: JSON.stringify({ error: 'unauthorized' }) };
  }

  try {
    const { runReport } = await getGa4Client();

    const [daily, topPages, events, devices, newVsReturning, cities] = await Promise.all([
      runReport({
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'date' }],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' },
          { name: 'screenPageViews' },
        ],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
        keepEmptyRows: true,
      }),
      runReport({
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }],
        dimensionFilter: {
          filter: { fieldName: 'pagePath', inListFilter: { values: KNOWN_PAGES } },
        },
        limit: 50,
      }),
      runReport({
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: {
            fieldName: 'eventName',
            inListFilter: { values: ['phone_click', 'whatsapp_click', 'generate_lead'] },
          },
        },
      }),
      runReport({
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      }),
      runReport({
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'newVsReturning' }],
        metrics: [{ name: 'activeUsers' }],
      }),
      runReport({
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'city' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 5,
      }),
    ]);

    const rowsByDate = {};
    (daily.rows || []).forEach((r) => {
      rowsByDate[r.dimensionValues[0].value] = {
        sessions: Number(r.metricValues[0].value),
        users: Number(r.metricValues[1].value),
        pageviews: Number(r.metricValues[2].value),
      };
    });
    const dailyRows = last30Dates().map((date) => ({
      date,
      sessions: (rowsByDate[date] && rowsByDate[date].sessions) || 0,
      users: (rowsByDate[date] && rowsByDate[date].users) || 0,
      pageviews: (rowsByDate[date] && rowsByDate[date].pageviews) || 0,
    }));

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
    (topPages.rows || []).forEach((r) => {
      viewsByPath[r.dimensionValues[0].value] = Number(r.metricValues[0].value);
    });
    const topPageRows = KNOWN_PAGES
      .map((path) => ({ path, views: viewsByPath[path] || 0 }))
      .sort((a, b) => b.views - a.views);

    const eventCounts = {};
    (events.rows || []).forEach((r) => {
      eventCounts[r.dimensionValues[0].value] = Number(r.metricValues[0].value);
    });

    const deviceRows = (devices.rows || []).map((r) => ({
      device: r.dimensionValues[0].value,
      users: Number(r.metricValues[0].value),
    }));

    const newVsReturningRows = (newVsReturning.rows || []).map((r) => ({
      type: r.dimensionValues[0].value,
      users: Number(r.metricValues[0].value),
    }));

    const cityRows = (cities.rows || [])
      .map((r) => ({
        city: r.dimensionValues[0].value,
        users: Number(r.metricValues[0].value),
      }))
      .filter((r) => r.city && r.city !== '(not set)');

    const summary = {
      totalSessions30d: sum(dailyRows, 'sessions'),
      totalPageviews30d: sum(dailyRows, 'pageviews'),
      last7Sessions,
      prev7Sessions,
      weekChangePct,
      topPage: topPageRows[0] || null,
      phoneClicks: eventCounts.phone_click || 0,
      whatsappClicks: eventCounts.whatsapp_click || 0,
      leads: eventCounts.generate_lead || 0,
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
