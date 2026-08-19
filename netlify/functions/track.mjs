import { recordEvent, isBot, getGeo } from './lib/store.mjs';

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  if (isBot(req.headers.get('user-agent'))) {
    return new Response(null, { status: 204 });
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { path, referrer, device, isNew, sid } = payload;
  if (!path) {
    return new Response('Missing path', { status: 400 });
  }

  const { city, country } = getGeo(req.headers);

  await recordEvent('pageview', {
    path,
    referrer: referrer || null,
    device: device || 'desktop',
    isNew: !!isNew,
    sid: sid || null,
    city,
    country,
  }).catch(() => {});

  return new Response(null, { status: 204 });
};
