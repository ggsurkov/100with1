import crypto from 'crypto';

// Telegram bot + Mini App helpers. The captain screen runs inside Telegram as a
// Mini App; the bot sends push messages to captains. Global fetch (Node 18+) —
// axios is not a server dependency.

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME;
// Short name of the Mini App, set in @BotFather via /newapp.
const APP_NAME = process.env.TELEGRAM_APP_NAME;

if (!BOT_TOKEN || !BOT_USERNAME || !APP_NAME) {
  console.warn('[Telegram] Warning: Missing TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME or TELEGRAM_APP_NAME in .env — Telegram entry is off');
}

// initData older than this is rejected, so a leaked string cannot be replayed forever.
const INIT_DATA_MAX_AGE_SECONDS = 24 * 60 * 60;

// Direct link that opens the Mini App with the launch id as start_param.
// Returns null when Telegram is not configured.
export function getMiniAppLink(launchId: string): string | null {
  if (!BOT_USERNAME || !APP_NAME) return null;
  return `https://t.me/${BOT_USERNAME}/${APP_NAME}?startapp=${launchId}`;
}

// Validates Mini App initData as described in
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
// Returns the Telegram user id, or null if the data is missing, forged or stale.
export function verifyInitData(initData: unknown): number | null {
  if (!BOT_TOKEN || typeof initData !== 'string' || !initData) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const expected = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
  if (expected.length !== hash.length
    || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(hash))) {
    return null;
  }

  const authDate = Number(params.get('auth_date'));
  if (!authDate || Date.now() / 1000 - authDate > INIT_DATA_MAX_AGE_SECONDS) return null;

  try {
    const user = JSON.parse(params.get('user') || '');
    return typeof user?.id === 'number' ? user.id : null;
  } catch {
    return null;
  }
}

// Fire-and-forget push to one captain. A 403 means the captain did not allow
// messages from the bot — that is normal, so errors are only logged.
export function sendCaptainMessage(chatId: number, text: string, launchId: string): void {
  if (!BOT_TOKEN) return;
  const link = getMiniAppLink(launchId);
  fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      ...(link && { reply_markup: { inline_keyboard: [[{ text: 'Открыть игру', url: link }]] } }),
    }),
  })
    .then(async response => {
      if (!response.ok) console.warn('[Telegram] sendMessage failed:', response.status, await response.text());
    })
    .catch(error => console.warn('[Telegram] sendMessage error:', error));
}
