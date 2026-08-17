const { recordEvent, isBot } = require('./lib/store');

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

  let city = null;
  let country = null;
  try {
    const geo = event.headers['x-nf-geo'] && JSON.parse(event.headers['x-nf-geo']);
    if (geo) {
      city = geo.city || null;
      country = (geo.country && geo.country.code) || null;
    }
  } catch {}

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
