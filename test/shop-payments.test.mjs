import {test} from 'node:test';
import assert from 'node:assert/strict';
import {handleShop,priceBag} from '../src/shop.ts';
const id='c80f5363-0397-4761-aa1a-3155c3a21470';
const order='7304776c-0502-472a-809b-209fc01fdf5e';
const catalog={currency:'USD',products:[{id:'fixture',name:'Fixture',priceCents:1250}]};
test('checkout uses current catalog prices and rejects unavailable or malformed bags',()=>{
 assert.equal(priceBag(catalog,[{id:'fixture',quantity:2,priceCents:1}]).total,2500);
 for(const items of [[],[{id:'missing',quantity:1}],[{id:'fixture',quantity:100}],[{id:'fixture',quantity:1.5}],[{id:'fixture',quantity:1},{id:'fixture',quantity:1}]])assert.throws(()=>priceBag(catalog,items));
 assert.throws(()=>priceBag({currency:'USD',products:[{...catalog.products[0],available:false}]},[{id:'fixture',quantity:1}]));
});
test('checkout stays unavailable without complete live configuration',async()=>{
 const request=new Request('https://morteva.com/api/shop/config');
 assert.deepEqual(await(await handleShop(request,{})).json(),{enabled:false});
 assert.deepEqual(await(await handleShop(request,{SHOP_ORDERS:{},PAYRAM_API_KEY:'fixture',PAYRAM_BASE_URL:'http://localhost',SHOP_CHECKOUT_ENABLED:'true'})).json(),{enabled:false});
});
test('webhook authenticity alone cannot mark an underpaid order paid',async()=>{
 const key='test-only-key';const row={id:order,reference_id:id,total_cents:2500,status:'OPEN'};let stored='OPEN';
 const env={PAYRAM_BASE_URL:'https://pay.example.com',PAYRAM_API_KEY:key,SHOP_ORDERS:{prepare(sql){return {bind(...args){return {first:async()=>row,run:async()=>{stored=args[0];return {meta:{changes:1}}}}}}}}};
 const original=globalThis.fetch;globalThis.fetch=async()=>Response.json({referenceID:id,invoiceID:order,amountInUSD:'25',paymentState:'PARTIALLY_FILLED'});
 const raw=JSON.stringify({reference_id:id,status:'FILLED'});
 const cryptoKey=await crypto.subtle.importKey('raw',new TextEncoder().encode(key),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const signature='sha256='+Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',cryptoKey,new TextEncoder().encode(raw))),n=>n.toString(16).padStart(2,'0')).join('');
 try{
  const req=()=>new Request('https://morteva.com/api/shop/webhook',{method:'POST',headers:{'X-Payram-Signature':signature},body:raw});
  assert.equal((await handleShop(req(),env)).status,200);assert.equal(stored,'PARTIALLY_FILLED');
  assert.equal((await handleShop(new Request('https://morteva.com/api/shop/webhook',{method:'POST',body:raw}),env)).status,401);
  globalThis.fetch=async()=>Response.json({referenceID:id,invoiceID:order,amountInUSD:'1',paymentState:'FILLED'});
  assert.equal((await handleShop(req(),env)).status,503);assert.equal(stored,'PARTIALLY_FILLED');
 }finally{globalThis.fetch=original;}
});
test('existing checkout is reused without creating a second payment',async()=>{
 let providerCalls=0;const original=globalThis.fetch;globalThis.fetch=async()=>{providerCalls++;throw Error('must not call');};
 const env={ASSETS:{fetch:async()=>Response.json(catalog)},SHOP_CHECKOUT_ENABLED:'true',PAYRAM_BASE_URL:'https://pay.example.com',PAYRAM_API_KEY:'fixture',SHOP_ORDERS:{prepare(){return {bind(){return {first:async()=>({id:order,email:'fixture@example.com',items_json:JSON.stringify(priceBag(catalog,[{id:'fixture',quantity:1}]).lines),checkout_url:'https://pay.example.com/payments?reference_id='+id})}}}}}};
 try{const result=await handleShop(new Request('https://morteva.com/api/shop/checkout',{method:'POST',body:JSON.stringify({requestId:order,email:'fixture@example.com',items:[{id:'fixture',quantity:1}]})}),env);assert.equal(result.status,200);assert.equal((await result.json()).orderId,order);assert.equal(providerCalls,0);}finally{globalThis.fetch=original;}
});
