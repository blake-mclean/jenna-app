// CORS is only required for browser-based (web) callers.
// Native iOS/Android clients do not send an Origin header and are unaffected.
//
// If a web version of JENNA is ever shipped, add its domain to ALLOWED_ORIGINS.
// Until then no cross-origin web access is permitted.
const ALLOWED_ORIGINS: string[] = [
  // 'https://jenna.app',
];

export function getCorsHeaders(req: Request): Record<string, string> {
  const base = {
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
  };

  const origin = req.headers.get('Origin');
  // No Origin header = native client, no CORS headers needed
  if (!origin) return base;

  // Known web origin — reflect it back
  if (ALLOWED_ORIGINS.includes(origin)) {
    return { ...base, 'Access-Control-Allow-Origin': origin };
  }

  // Unknown web origin — return base headers only (browser will block the request)
  return base;
}
