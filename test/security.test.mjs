import {test} from 'node:test';
import assert from 'node:assert/strict';
import {guardRequest,secureResponse} from '../src/security.ts';
test('rejects cross-site writes and oversized bodies without trusting Content-Length',async()=>{
  const make=(headers={},body='test')=>new Request('https://morteva.com/wmm4/login',{method:'POST',headers,body});
  assert.equal((await guardRequest(make({Origin:'https://evil.invalid'}))).status,403);
  assert.equal((await guardRequest(make({'Sec-Fetch-Site':'cross-site'}))).status,403);
  assert.equal((await guardRequest(make({},'x'.repeat(300000)))).status,413);
  assert.equal(await guardRequest(make({Origin:'https://morteva.com'})),null);
});
test('private responses never cache and same-origin previews remain permitted',()=>{
  const r=secureResponse(new Request('https://morteva.com/wmm4/preview/gallery'),new Response('preview',{headers:{'Content-Type':'text/html'}}));
  assert.equal(r.headers.get('Cache-Control'),'no-store');
  assert.equal(r.headers.get('X-Frame-Options'),'SAMEORIGIN');
  assert.match(r.headers.get('Content-Security-Policy'),/frame-ancestors 'self'/);
});
