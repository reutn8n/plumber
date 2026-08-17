const { recordEvent, isBot, getGeo } = require('./lib/store');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const userAgent = event.headers['user-agent'] || '';
  if (isBot(userAgent)) {
    return { statusCode: 204, body: '' };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { path, referrer, device, isNew, sid } = payload;
  if (!path) {
    return { statusCode: 400, body: 'Missing path' };
  }

  const { city, country } = getGeo(event.headers);

  await recordEvent('pageview', {
    path,
    referrer: referrer || null,
    device: device || 'desktop',
    isNew: !!isNew,
    sid: sid || null,
    city,
    country,
  }).catch(() => {});

  return { statusCode: 204, body: '' };
};
