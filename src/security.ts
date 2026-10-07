// Shared policy: keep this file identical in both site repositories.
export async function guardRequest(request: Request): Promise<Response | null> {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return null;
  const origin = request.headers.get('Origin');
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get('Sec-Fetch-Site') === 'cross-site') {
    return new Response('Cross-site request refused', {status:403});
  }
  const path = new URL(request.url).pathname;
  const limit = path === '/wmm4/api/upload' ? 100 * 1024 * 1024 : path === '/wmm4/api/document' ? 4 * 1024 * 1024 : 256 * 1024;
  const size = request.headers.get('Content-Length');
  if (size && (!/^\d+$/.test(size) || Number(size) > limit)) return new Response('Request too large', {status:413});
  // Uploads are parsed only after authentication; avoid buffering large files twice.
  if (path === '/wmm4/api/upload' || !request.body) return null;
  const reader = request.clone().body!.getReader();
  let bytes = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) return null;
      bytes += next.value.byteLength;
      if (bytes > limit) { void reader.cancel(); return new Response('Request too large', {status:413}); }
    }
  } catch { return new Response('Invalid request body', {status:400}); }
  finally { reader.releaseLock(); }
}

export function secureResponse(request: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', headers.get('X-Frame-Options') || 'SAMEORIGIN');
  headers.set('Referrer-Policy', headers.get('Referrer-Policy') || 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', headers.get('Permissions-Policy') || 'camera=(), microphone=(), geolocation=()');
  headers.set('Strict-Transport-Security', 'max-age=31536000');
  if (headers.get('Content-Type')?.includes('text/html') && !headers.has('Content-Security-Policy')) {
    headers.set('Content-Security-Policy', "base-uri 'self'; object-src 'none'; frame-ancestors 'self'");
  }
  if (new URL(request.url).pathname.startsWith('/wmm4')) headers.set('Cache-Control', 'no-store');
  return new Response(response.body, {status:response.status, statusText:response.statusText, headers});
}
