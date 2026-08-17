const crypto = require('crypto');

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function getAccessToken(clientEmail, privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: clientEmail,
    scope: SCOPE,
    aud: TOKEN_URL,
    exp: now + 3600,
    iat: now,
  };

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = crypto.createSign('RSA-SHA256').update(signingInput).sign(privateKey);
  const jwt = `${signingInput}.${signature.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    throw new Error(`Token request failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.access_token;
}

async function runReport(propertyId, accessToken, body) {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    throw new Error(`GA4 report failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function getGa4Client() {
  const clientEmail = process.env.GA_CLIENT_EMAIL;
  const privateKey = process.env.GA_PRIVATE_KEY.replace(/\\n/g, '\n');
  const propertyId = process.env.GA_PROPERTY_ID;
  const accessToken = await getAccessToken(clientEmail, privateKey);
  return {
    propertyId,
    runReport: (body) => runReport(propertyId, accessToken, body),
  };
}

async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  if (!res.ok) {
    throw new Error(`Telegram send failed: ${res.status} ${await res.text()}`);
  }
}

const PAGE_LABELS = {
  '/': 'עמוד הבית',
  '/about.html': 'אודות יאיר',
  '/expertise.html': 'מומחיות ופרויקטים',
  '/blog.html': 'בלוג (עמוד ראשי)',
  '/leak-detection-thermal-camera.html': 'איתור נזילות במצלמה תרמית',
  '/unclogging-drains.html': 'פתיחת סתימות',
  '/faucets-toilets-repair.html': 'ברזים וניאגרות',
  '/water-pressure-issues.html': 'לחץ מים',
  '/renovation-plumbing.html': 'שיפוצים',
  '/emergency-plumbing.html': 'קריאות חירום',
  '/home-plumbing-inspection.html': 'בדק בית',
  '/nezila-nistara-simanim.html': 'מאמר: סימנים לנזילה נסתרת',
  '/stima-kiyor-ambatya.html': 'מאמר: סתימה בכיור ואמבטיה',
  '/laghatz-mayim-namuch-sibot.html': 'מאמר: לחץ מים נמוך',
  '/berez-notef-nyagera-rotza.html': 'מאמר: ברז נוטף וניאגרה רצה',
  '/bdika-instalatzia-lifney-kniyat-dira.html': 'מאמר: בדיקת אינסטלציה לפני קניית דירה',
};

function pageLabel(path) {
  return PAGE_LABELS[path] || path;
}

module.exports = { getGa4Client, sendTelegram, pageLabel };
