import {test} from 'node:test';
import assert from 'node:assert/strict';
import {handleShop,priceBag,usdMicros,verifiedAdditionalPayment} from '../src/shop.ts';
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

const extraRef='de6b5f48-fc22-4c57-870f-cdaf5c6f58ff';
const originalPayment={referenceID:id,invoiceID:order,customerID:order,amountInUSD:'0.1',filledAmountInUSD:'0.098084',paymentState:'PARTIALLY_FILLED',depositAddress:'0xB5B25D5879709b7e652DaFe86A5c1C576294433A',externalPlatformID:1,blockchainSymbol:'BASE',currencySymbol:'ETH',confirmationCurrent:30,confirmationRequired:30};
const additionalPayment={...originalPayment,referenceID:extraRef,invoiceID:extraRef,amountInUSD:'0.004903',filledAmountInUSD:'0.004903',paymentState:'OVER_FILLED'};
test('additional payment must match the authenticated order, customer, address and network',()=>{
 const row={id:order,reference_id:id,total_cents:10};
 assert.equal(verifiedAdditionalPayment(originalPayment,additionalPayment,row),4903);
 for(const change of [{customerID:id},{depositAddress:'0x0000000000000000000000000000000000000001'},{blockchainSymbol:'ETH'},{currencySymbol:'USDC'},{externalPlatformID:2},{invoiceID:order},{confirmationCurrent:1},{confirmationCurrent:undefined},{paymentState:'OPEN'}])assert.throws(()=>verifiedAdditionalPayment(originalPayment,{...additionalPayment,...change},row));
 assert.equal(usdMicros('0.098084000000000000'),98084);
 for(const value of ['0.0099999','-1','NaN','0.1e2'])assert.throws(()=>usdMicros(value));
});
test('authenticated partial payments add up once and only mark paid when the total is covered',async()=>{
 const row={id:order,reference_id:id,total_cents:10,status:'OPEN'};const credits=new Map();
 const key='test-only-key',env={PAYRAM_BASE_URL:'https://pay.example.com',PAYRAM_API_KEY:key,SHOP_ORDERS:{prepare(sql){return {bind(...args){return {
  first:async()=>sql.includes('SUM(')?{total:[...credits.values()].reduce((a,b)=>a+b,0)}:sql.includes('reference_id=?')?(args[0]===id?row:null):row,
  run:async()=>{if(sql.startsWith('INSERT INTO order_payment_credits'))credits.set(args[0],Math.max(credits.get(args[0])||0,args[2]));else if(sql.startsWith('UPDATE orders')&&!['FILLED','OVER_FILLED'].includes(row.status))row.status=args[0];return {meta:{changes:1}};}
 }}}}}};
 const originalFetch=globalThis.fetch;
 globalThis.fetch=async url=>Response.json(String(url).endsWith(extraRef)?additionalPayment:originalPayment);
 const raw=JSON.stringify({reference_id:extraRef,status:'OPEN'});
 const signingKey=await crypto.subtle.importKey('raw',new TextEncoder().encode(key),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const signature='sha256='+Buffer.from(await crypto.subtle.sign('HMAC',signingKey,new TextEncoder().encode(raw))).toString('hex');
 try{
  const check=()=>handleShop(new Request('https://morteva.com/api/shop/orders/'+order),env);
  assert.equal((await(await check()).json()).paid,false);
  for(let i=0;i<2;i++)assert.equal((await handleShop(new Request('https://morteva.com/api/shop/webhook',{method:'POST',headers:{'X-Payram-Signature':signature},body:raw}),env)).status,200);
  assert.equal(row.status,'OVER_FILLED');assert.equal(credits.size,2);assert.equal([...credits.values()].reduce((a,b)=>a+b,0),102987);
  assert.equal((await(await check()).json()).paid,true);
 }finally{globalThis.fetch=originalFetch;}
});
