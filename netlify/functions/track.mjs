import { recordEvent, isBot, getGeo } from './lib/store.mjs';

const SCROLL_DEPTHS = [25, 50, 75, 100];

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

  const { path, referrer, device, isNew, sid, depth } = payload;
  if (!path) {
    return new Response('Missing path', { status: 400 });
  }

  // A depth means the visitor crossed a scroll milestone on a page they already
  // registered a view for, so it is recorded separately rather than as a view.
  if (depth !== undefined) {
    if (!SCROLL_DEPTHS.includes(depth)) {
      return new Response('Invalid depth', { status: 400 });
    }
    await recordEvent('scroll', { path, depth, sid: sid || null }).catch(() => {});
    return new Response(null, { status: 204 });
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
