import {test} from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {readFileSync} from 'node:fs';import {handleShop,priceBag} from '../src/shop.ts';
const id='c80f5363-0397-4761-aa1a-3155c3a21470',ref='7304776c-0502-472a-809b-209fc01fdf5e';
const address={name:'Test buyer',line1:'123 Test Street',line2:'',city:'Test City',region:'Test State',postal:'00000',country:'US'};
function fixture(){const db=new DatabaseSync(':memory:');for(const file of ['0001_orders.sql','0002_payment_credits.sql','0003_fulfillment.sql'])db.exec(readFileSync('migrations/shop/'+file,'utf8'));return {db,DB:{prepare(sql){let args=[];return {bind(...values){args=values;return this},async first(){return db.prepare(sql).get(...args)||null},async all(){return {results:db.prepare(sql).all(...args)}},async run(){return {meta:{changes:db.prepare(sql).run(...args).changes}}}}}}};}
test('shipping and tax use server prices and reject incomplete or unsupported addresses',()=>{
 const catalog={currency:'USD',products:[{id:'item',name:'Item',kind:'physical',priceCents:1250,shippingCents:300,shippingCountries:['US'],taxBps:800}]};
 const bag=priceBag(catalog,[{id:'item',quantity:2}],address);assert.equal(bag.subtotal,2500);assert.equal(bag.shipping,600);assert.equal(bag.tax,200);assert.equal(bag.total,3300);
 assert.throws(()=>priceBag(catalog,[{id:'item',quantity:1}]));assert.throws(()=>priceBag(catalog,[{id:'item',quantity:1}],{...address,country:'CA'}));
});
test('checkout stores immutable shipping, buyer notes and server totals in real SQL',async()=>{
 const f=fixture(),oldFetch=globalThis.fetch;globalThis.fetch=async()=>Response.json({reference_id:ref,url:'https://pay.example.com/payments?reference_id='+ref});
 const catalog={currency:'USD',products:[{id:'item',name:'Item',kind:'physical',priceCents:1250,shippingCents:300,shippingCountries:['US'],taxBps:800}]};
 const env={ASSETS:{fetch:async()=>Response.json(catalog)},SHOP_ORDERS:f.DB,PAYRAM_API_KEY:'test',PAYRAM_BASE_URL:'https://pay.example.com',SHOP_CHECKOUT_ENABLED:'true'};
 try{const response=await handleShop(new Request('https://morteva.com/api/shop/checkout',{method:'POST',body:JSON.stringify({requestId:id,email:'test@example.com',items:[{id:'item',quantity:2}],shipping:address,buyerNote:'Test instructions'})}),env);assert.equal(response.status,200);const row=f.db.prepare('SELECT * FROM orders').get();assert.equal(row.total_cents,3300);assert.equal(row.shipping_cents,600);assert.equal(row.tax_cents,200);assert.equal(row.buyer_note,'Test instructions');assert.deepEqual(JSON.parse(row.shipping_json),address);}finally{globalThis.fetch=oldFetch;f.db.close();}
});
test('order management requires the existing session and refuses fulfillment before payment',async()=>{
 const f=fixture();f.db.prepare("INSERT INTO orders(id,email,items_json,total_cents,status,created_at,updated_at,client_hash) VALUES(?,?,'[{\"id\":\"item\"}]',100,'OPEN',0,0,'fixture')").run(id,'test@example.com');
 const env={SHOP_ORDERS:f.DB,NEWSLETTER:{fetch:async()=>new Response('{}',{status:401})}};
 const base='https://morteva.com/api/shop/admin/orders';assert.equal((await handleShop(new Request(base),env)).status,401);
 env.NEWSLETTER.fetch=async request=>Response.json({authorized:true});
 const change=()=>new Request(base+'/'+id,{method:'PATCH',body:JSON.stringify({revision:0,fulfillment:'shipped',trackingUrl:'https://example.com/track',privateNotes:'Private',customerNote:'Sent'})});
 assert.equal((await handleShop(change(),env)).status,409);f.db.prepare("UPDATE orders SET status='FILLED'").run();assert.equal((await handleShop(change(),env)).status,200);assert.equal((await handleShop(change(),env)).status,409);assert.equal(f.db.prepare('SELECT fulfillment_status FROM orders').get().fulfillment_status,'shipped');f.db.close();
});
test('paid downloads require the paid order and private file, without exposing admin notes',async()=>{
 const f=fixture();const downloadId='7304776c-0502-472a-809b-209fc01fdf5e.pdf';f.db.prepare("INSERT INTO orders(id,email,items_json,total_cents,status,created_at,updated_at,client_hash,private_notes) VALUES(?,?,?,100,'OPEN',0,0,'fixture','SECRET')").run(id,'private@example.com',JSON.stringify([{id:'item',name:'PDF',kind:'digital',downloadId}]));
 const env={SHOP_ORDERS:f.DB,PAYRAM_API_KEY:'test',PAYRAM_BASE_URL:'https://pay.example.com',SHOP_MEDIA:{get:async()=>({body:'%PDF-test',size:9,customMetadata:{paidDelivery:'true',name:'test.pdf'}})}};
 const request=()=>new Request('https://morteva.com/api/shop/orders/'+id+'/download/item');assert.equal((await handleShop(request(),env)).status,403);f.db.prepare("UPDATE orders SET status='FILLED'").run();assert.equal((await handleShop(request(),env)).status,200);const receipt=await(await handleShop(new Request('https://morteva.com/api/shop/orders/'+id),env)).json();assert.equal(receipt.downloads.length,1);assert.equal(JSON.stringify(receipt).includes('SECRET'),false);assert.equal(JSON.stringify(receipt).includes('private@example.com'),false);assert.equal(JSON.stringify(receipt).includes(downloadId),false);f.db.close();
});
