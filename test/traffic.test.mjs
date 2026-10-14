import {test} from 'node:test';
import assert from 'node:assert/strict';
import {observeRequest,observeFetch,monitoredEnv} from '../src/traffic.ts';
test('traffic meters streamed payloads without exposing secrets or changing bytes',async()=>{
 const old=console.log,logs=[];console.log=s=>logs.push(JSON.parse(s));
 try{
 const pending=[];
 const response=await observeRequest(new Request('https://morteva.com/test?token=SECRET',{method:'POST',headers:{Authorization:'Bearer SECRET'},body:'é'}),{waitUntil:p=>pending.push(p)},async req=>{assert.equal(await req.text(),'é');return new Response('🖤',{headers:{'X-Keep':'yes'}})});
 assert.equal(response.headers.get('X-Keep'),'yes');assert.equal(await response.text(),'🖤');await Promise.all(pending);
 const event=logs.find(x=>x.direction==='bandwidth');assert.equal(event.rx_body_bytes,2);assert.equal(event.tx_body_bytes,4);assert.equal(event.rx_complete,true);assert.equal(event.transfer_state,'complete');assert.ok(!JSON.stringify(logs).includes('SECRET'));
 const outbound=await observeFetch(async()=>new Response('abc'),new Request('https://api.test/egress?secret=SECRET',{method:'POST',body:'content'}));assert.equal(await outbound.text(),'abc');assert.equal(logs.find(x=>x.direction==='egress').tx_bytes,null);assert.equal(logs.find(x=>x.direction==='egress_bandwidth').rx_body_bytes,3);
 }finally{console.log=old;}
});
test('binding wrappers preserve statement receivers and errors',async()=>{
 const old=console.log;console.log=()=>{};
 try{const stmt={x:3,bind(){return this;},async first(){return this.x;}};const env=monitoredEnv({DB:{prepare(){return stmt;}}});assert.equal(await env.DB.prepare('secret').bind().first(),3);await assert.rejects(()=>observeFetch(async()=>{throw new Error('original')},'https://api.test/'),/original/);}finally{console.log=old;}
});
