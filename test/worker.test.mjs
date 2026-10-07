import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.ts';
test('Morteva control room renders local source while retaining backend session protections',async()=>{
 const env={ASSETS:{fetch:async req=>{assert.equal(new URL(req.url).pathname,'/cms-admin.html');return new Response('<html><body data-csrf="__CSRF__">Morteva source</body></html>')}},NEWSLETTER:{fetch:async()=>new Response('<html><body data-csrf="fixture-token">Beside source</body></html>',{headers:{'Content-Type':'text/html','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'","Set-Cookie":"fixture=1; HttpOnly"}})}};
 const res=await worker.fetch(new Request('https://morteva.com/wmm4'),env);assert.match(await res.text(),/data-csrf="fixture-token">Morteva source/);assert.equal(res.headers.get('Cache-Control'),'no-store');assert.match(res.headers.get('Content-Security-Policy'),/default-src 'self'/);assert.match(res.headers.get('Set-Cookie'),/HttpOnly/);
 env.NEWSLETTER.fetch=async()=>new Response('Denied',{status:401});assert.equal((await worker.fetch(new Request('https://morteva.com/wmm4'),env)).status,401);
 env.NEWSLETTER.fetch=async()=>new Response('<body data-csrf=""></body>',{headers:{'Content-Type':'text/html'}});assert.match(await(await worker.fetch(new Request('https://morteva.com/wmm4'),env)).text(),/data-csrf=""/);
 assert.equal(await(await worker.fetch(new Request('https://morteva.com/wmm4',{method:'HEAD'}),env)).text(),'');
});
test('admin, signup and media routes use the shared backend and retired admin stays removed',async()=>{
 const calls=[];const env={ASSETS:{fetch:async()=>new Response('asset')},NEWSLETTER:{fetch:async req=>{calls.push(new URL(req.url).pathname);return new Response('backend')}}};
 for(const path of ['/wmm4','/wmm4/api/media','/api/mia-newsletter/subscribe','/mia-newsletter/confirm','/cms-media/file'])assert.equal(await(await worker.fetch(new Request('https://morteva.com'+path),env)).text(),'backend');
 assert.equal(calls.length,5);assert.equal((await worker.fetch(new Request('https://morteva.com/miamiamia'),env)).status,404);assert.equal((await worker.fetch(new Request('https://morteva.com/cms-admin.html'),env)).headers.get('Location'),'/wmm4');
});
test('HTML bridge retains source status and headers, and never transforms redirects',async()=>{
 const env={ASSETS:{fetch:async()=>new Response('<html>saved</html>',{headers:{'Content-Type':'text/html','X-Source':'kept','Cache-Control':'no-cache'}})},NEWSLETTER:{fetch:async req=>new URL(req.url).pathname==='/cms-bridge'?new Response(null,{status:204}):new Response('<html>published</html>',{headers:{'Content-Type':'text/html'}})}};
 const res=await worker.fetch(new Request('https://morteva.com/'),env);assert.equal(res.headers.get('X-Source'),'kept');assert.equal(res.headers.get('Cache-Control'),'no-cache');assert.equal(await res.text(),'<html>published</html>');
 env.ASSETS.fetch=async()=>new Response(null,{status:301,headers:{Location:'/podcast'}});assert.equal((await worker.fetch(new Request('https://morteva.com/voice-logs'),env)).headers.get('Location'),'/podcast');
});
