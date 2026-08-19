import { sendTelegram } from './lib/telegram.mjs';
import { buildSummaryText } from './lib/reports.mjs';

export const config = {
  schedule: '0 18 * * *', // 21:00 Israel time
};

export default async () => {
  try {
    const dateLabel = new Date().toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' });
    const text = await buildSummaryText(1, `📊 סיכום יומי — ${dateLabel}`);
    await sendTelegram(text);
    return new Response('ok');
  } catch (err) {
    return new Response(`error: ${err.message}`, { status: 500 });
  }
};
