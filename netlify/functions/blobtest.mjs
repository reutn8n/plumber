import { getStore } from '@netlify/blobs';

export default async () => {
  const result = { format: 'v2-esm' };

  result.hasBlobsContext = !!process.env.NETLIFY_BLOBS_CONTEXT;

  try {
    const store = getStore('site-events');
    await store.setJSON('selftest/v2-probe', { ok: true, ts: Date.now() });
    const readBack = await store.get('selftest/v2-probe', { type: 'json' });
    result.write = 'ok';
    result.read = readBack;
  } catch (err) {
    result.error = err.message;
  }

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  });
};
