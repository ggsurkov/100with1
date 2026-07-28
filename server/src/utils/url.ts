import { Request } from 'express';

function stripTrailingSlashes(url: string): string {
  return url.replace(/\/+$/, '');
}

// Resolves the frontend's base URL for building links embedded in QR codes etc.
// Priority: explicit CLIENT_URL env (production/deploy) > the request's own
// Origin/Referer (so an ngrok tunnel or a phone-on-LAN dev setup "just works"
// without touching .env) > localhost fallback.
export function getClientBaseUrl(req: Request): string {
  const fromEnv = process.env.CLIENT_URL;
  if (fromEnv) return stripTrailingSlashes(fromEnv);

  const origin = req.headers.origin;
  if (typeof origin === 'string' && origin) return stripTrailingSlashes(origin);

  const referer = req.headers.referer;
  if (typeof referer === 'string' && referer) {
    try {
      return stripTrailingSlashes(new URL(referer).origin);
    } catch {
      // Malformed referer — fall through to default.
    }
  }

  return 'http://localhost:5173';
}
