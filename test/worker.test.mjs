import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.ts';
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
