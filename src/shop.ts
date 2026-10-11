// Payment credentials stay on the Worker; browser totals and webhook claims are never authoritative.
import {handleShopAdmin} from './shop-admin.ts';
interface ShopEnv {
 ASSETS: Fetcher;
 NEWSLETTER?: Fetcher;
 SHOP_MEDIA?: R2Bucket;
 SHOP_ORDERS?: D1Database;
 PAYRAM_BASE_URL?: string;
 PAYRAM_API_KEY?: string;
 PAYRAM_GATEWAY_KEY?: string;
 SHOP_CHECKOUT_ENABLED?: string;
}
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const paidStates=new Set(['FILLED','OVER_FILLED']);
function base(env:ShopEnv){
 try {const u=new URL(env.PAYRAM_BASE_URL||'');if(u.protocol==='https:'&&!u.username&&!u.password&&u.pathname==='/'&&!u.search&&!u.hash)return u.origin;}catch{}
 return null;
}
function ready(env:ShopEnv){return env.SHOP_CHECKOUT_ENABLED==='true'&&!!env.SHOP_ORDERS&&!!env.PAYRAM_API_KEY&&!!base(env);}
async function provider(env:ShopEnv,path:string,options:RequestInit={}){
 const response=await fetch(base(env)!+path,{...options,redirect:'manual',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json','API-Key':env.PAYRAM_API_KEY!,...(env.PAYRAM_GATEWAY_KEY?{'X-Morteva-Gateway':env.PAYRAM_GATEWAY_KEY}:{})}});
 if(!response.ok)throw Error('PayRam HTTP '+response.status);return response.json() as Promise<any>;
}
export function shippingAddress(value:any){
 const limits:Record<string,number>={name:150,line1:200,line2:200,city:100,region:100,postal:30,country:2};
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Enter your shipping address');
 const address:any={};for(const [key,max] of Object.entries(limits)){const text=value[key]??'';if(typeof text!=='string'||text.length>max||/[\x00-\x1f]/.test(text))throw Error('Invalid shipping address');address[key]=text.trim();}
 address.country=address.country.toUpperCase();if(!['name','line1','city','postal'].every(k=>address[k])||! /^[A-Z]{2}$/.test(address.country))throw Error('Complete your shipping address');return address;
}
export function priceBag(catalog:any,items:any,addressInput?:any){
 if(catalog.currency!=='USD'||!Array.isArray(catalog.products)||!Array.isArray(items)||!items.length||items.length>50)throw Error('Invalid bag');
 const unique=new Set();let subtotal=0,shipping=0,tax=0,address:any=null;
 const lines=items.map((item:any)=>{
  if(!item||typeof item.id!=='string'||unique.has(item.id)||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>99)throw Error('Invalid bag');
  unique.add(item.id);const p=catalog.products.find((p:any)=>p.id===item.id);
  if(!p||p.available===false||typeof p.name!=='string'||!Number.isSafeInteger(p.priceCents)||p.priceCents<=0)throw Error('An item is unavailable');
  const kind=p.kind||'service';if(!['physical','digital','service'].includes(kind))throw Error('Invalid item');
  const shippingCents=kind==='physical'?(p.shippingCents||0):0,taxBps=p.taxBps||0;
  if(!Number.isSafeInteger(shippingCents)||shippingCents<0||!Number.isInteger(taxBps)||taxBps<0||taxBps>10000)throw Error('Invalid item pricing');
  if(kind==='physical'){address??=shippingAddress(addressInput);if(!Array.isArray(p.shippingCountries)||!p.shippingCountries.includes(address.country))throw Error('Shipping is unavailable for this address');}
  if(kind==='digital'&&!/^[0-9a-f-]{36}\.(zip|exe|pdf|mp3|m4a|wav|mp4|webm)$/.test(p.downloadId||''))throw Error('Digital delivery unavailable');
  subtotal+=p.priceCents*item.quantity;shipping+=shippingCents*item.quantity;tax+=Math.round(p.priceCents*item.quantity*taxBps/10000);
  if(!Number.isSafeInteger(subtotal+shipping+tax)||subtotal+shipping+tax>100000000)throw Error('Invalid total');
  return {id:p.id,name:p.name,priceCents:p.priceCents,quantity:item.quantity,kind,shippingCents,taxBps,...(kind==='digital'?{downloadId:p.downloadId}:{})};
 });return {lines,total:subtotal+shipping+tax,subtotal,shipping,tax,address};
}
export function usdMicros(value:unknown){
 if(typeof value!=='string'||!/^\d{1,7}(?:\.\d{1,18})?$/.test(value))throw Error('Invalid payment amount');
 const [whole,fraction='']=value.split('.');if(/[^0]/.test(fraction.slice(6)))throw Error('Unsupported payment precision');
 const amount=Number(whole)*1000000+Number(fraction.slice(0,6).padEnd(6,'0'));
 if(!Number.isSafeInteger(amount))throw Error('Invalid payment amount');return amount;
}
function validateInvoice(result:any,row:any){
 if(result.referenceID!==row.reference_id||usdMicros(String(result.amountInUSD))!==row.total_cents*10000||result.invoiceID!==row.id)throw Error('Mismatched payment');
}
export function verifiedAdditionalPayment(original:any,extra:any,row:any){
 validateInvoice(original,row);
 if(!uuid.test(extra.referenceID)||extra.referenceID===row.reference_id||extra.invoiceID!==extra.referenceID||extra.customerID!==row.id||original.customerID!==row.id||extra.externalPlatformID!==original.externalPlatformID||typeof original.depositAddress!=='string'||!/^0x[0-9a-f]{40}$/i.test(original.depositAddress)||extra.depositAddress?.toLowerCase()!==original.depositAddress.toLowerCase()||extra.blockchainSymbol!==original.blockchainSymbol||extra.currencySymbol!==original.currencySymbol||!['ETH','USDC'].includes(original.currencySymbol)||original.blockchainSymbol!=='BASE'||!['PARTIALLY_FILLED','FILLED','OVER_FILLED'].includes(extra.paymentState)||!Number.isInteger(extra.confirmationCurrent)||extra.confirmationCurrent<extra.confirmationRequired||!Number.isInteger(extra.confirmationRequired)||extra.confirmationRequired<1)throw Error('Mismatched additional payment');
 return usdMicros(extra.filledAmountInUSD);
}
async function credit(env:ShopEnv,row:any,reference:string,amount:number){
 await env.SHOP_ORDERS!.prepare('INSERT INTO order_payment_credits (reference_id,order_id,amount_micros) VALUES (?,?,?) ON CONFLICT(reference_id) DO UPDATE SET amount_micros=MAX(amount_micros,excluded.amount_micros) WHERE order_id=excluded.order_id').bind(reference,row.id,amount).run();
}
async function reconcile(env:ShopEnv,row:any){
 const result=await provider(env,'/api/v1/payment/reference/'+encodeURIComponent(row.reference_id));
 validateInvoice(result,row);
 let status=result.paymentState;
 if(!['OPEN','CANCELLED','PARTIALLY_FILLED','FILLED','OVER_FILLED'].includes(status))throw Error('Invalid payment state');
 if(typeof result.filledAmountInUSD==='string'&&['PARTIALLY_FILLED','FILLED','OVER_FILLED'].includes(status)){
  await credit(env,row,row.reference_id,usdMicros(result.filledAmountInUSD));
  const received:any=await env.SHOP_ORDERS!.prepare('SELECT SUM(amount_micros) AS total FROM order_payment_credits WHERE order_id=?').bind(row.id).first();
  if(received?.total>=row.total_cents*10000)status=received.total===row.total_cents*10000?'FILLED':'OVER_FILLED';
 }
 await env.SHOP_ORDERS!.prepare("UPDATE orders SET status=?, updated_at=? WHERE id=? AND status NOT IN ('FILLED','OVER_FILLED')").bind(status,Date.now(),row.id).run();
 return paidStates.has(row.status)?row.status:status;
}
async function verifySignature(raw:string,header:string|null,key:string){
 if(!header||!/^sha256=[a-f0-9]{64}$/i.test(header))return false;
 const imported=await crypto.subtle.importKey('raw',new TextEncoder().encode(key),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 const bytes=Uint8Array.from(header.slice(7).match(/../g)!,v=>parseInt(v,16));
 return crypto.subtle.verify('HMAC',imported,bytes,new TextEncoder().encode(raw));
}
export async function handleShop(request:Request,env:ShopEnv){
 const url=new URL(request.url),path=url.pathname;
 if(path.startsWith('/api/shop/admin/'))return env.NEWSLETTER?handleShopAdmin(request,env):json({error:'Sign in first.'},401);
 if(path==='/api/shop/config'&&request.method==='GET')return json({enabled:ready(env)});
 if(!env.SHOP_ORDERS||!env.PAYRAM_API_KEY||!base(env))return json({error:'Payments aren’t available yet.'},503);
 if(path==='/api/shop/webhook'&&request.method==='POST'){
  const raw=await request.text();if(!await verifySignature(raw,request.headers.get('X-Payram-Signature'),env.PAYRAM_API_KEY))return json({error:'Unauthorized'},401);
  let event;try{event=JSON.parse(raw);}catch{return json({error:'Invalid event'},400);}
  if(typeof event.reference_id!=='string')return json({error:'Invalid event'},400);
  let row:any=await env.SHOP_ORDERS.prepare('SELECT * FROM orders WHERE reference_id=?').bind(event.reference_id).first();
  try{
   if(!row){
    if(!uuid.test(event.reference_id))return json({received:true});
    const extra=await provider(env,'/api/v1/payment/reference/'+encodeURIComponent(event.reference_id));
    if(extra.referenceID!==event.reference_id||!uuid.test(extra.customerID))return json({received:true});
    row=await env.SHOP_ORDERS.prepare('SELECT * FROM orders WHERE id=?').bind(extra.customerID).first();
    if(!row?.reference_id)return json({received:true});
    const original=await provider(env,'/api/v1/payment/reference/'+encodeURIComponent(row.reference_id));
    await credit(env,row,event.reference_id,verifiedAdditionalPayment(original,extra,row));
   }
   await reconcile(env,row);return json({received:true});
  }catch(error){console.error('payram verification:',error instanceof Error?error.message:'failed');return json({error:'Verification pending'},503);}
 }
 if(path==='/api/shop/checkout'&&request.method==='POST'){
  if(!ready(env))return json({error:'Payments aren’t available yet.'},503);
  let input:any;try{input=await request.json();}catch{return json({error:'Invalid request'},400);}
  if(!uuid.test(input?.requestId)||typeof input.email!=='string'||input.email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email))return json({error:'Enter a valid email address.'},400);
  let priced;try{const response=await env.ASSETS.fetch(new Request(new URL('/shop-catalog.json',url)));if(!response.ok)throw Error();priced=priceBag(await response.json(),input.items,input.shipping);}catch(error){return json({error:error instanceof Error?error.message:'Your bag changed. Reload the shop and check the items.'},400);}
  const buyerNote=input.buyerNote||'';if(typeof buyerNote!=='string'||buyerNote.length>2000)return json({error:'Keep your order note under 2,000 characters.'},400);
  const existing:any=await env.SHOP_ORDERS.prepare('SELECT * FROM orders WHERE id=?').bind(input.requestId).first();
  if(existing){
   if(existing.email!==input.email||existing.items_json!==JSON.stringify(priced.lines)||(existing.shipping_json||null)!==(priced.address?JSON.stringify(priced.address):null)||(existing.buyer_note||'')!==buyerNote)return json({error:'Start a new checkout.'},409);
   if(existing.checkout_url)return json({orderId:existing.id,url:existing.checkout_url});
   return json({error:'This checkout is being processed. Do not submit another payment.'},409);
  }
  const ip=request.headers.get('CF-Connecting-IP')||'local';
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip+env.PAYRAM_API_KEY));
  const client=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
  const count:any=await env.SHOP_ORDERS.prepare('SELECT COUNT(*) AS count FROM orders WHERE client_hash=? AND created_at>?').bind(client,Date.now()-3600000).first();
  if(count?.count>=20)return json({error:'Too many checkouts. Please try later.'},429);
  const inserted=await env.SHOP_ORDERS.prepare("INSERT OR IGNORE INTO orders (id,email,items_json,total_cents,status,created_at,updated_at,client_hash,shipping_json,subtotal_cents,shipping_cents,tax_cents,buyer_note) VALUES (?,?,?,?,'CREATING',?,?,?,?,?,?,?,?)").bind(input.requestId,input.email,JSON.stringify(priced.lines),priced.total,Date.now(),Date.now(),client,priced.address?JSON.stringify(priced.address):null,priced.subtotal,priced.shipping,priced.tax,buyerNote).run();
  if(inserted.meta.changes!==1)return json({error:'Checkout already processing.'},409);
  try{
   const payment=await provider(env,'/api/v1/payment',{method:'POST',body:JSON.stringify({customerEmail:input.email,customerID:input.requestId,invoiceID:input.requestId,amountInUSD:priced.total/100,currency:'USDC',network:'BASE'})});
   if(typeof payment.reference_id!=='string'||!uuid.test(payment.reference_id))throw Error('Invalid reference');
   const target=new URL(payment.url);if(target.origin!==base(env)||target.pathname!=='/payments'||target.searchParams.get('reference_id')!==payment.reference_id)throw Error('Invalid checkout URL');
   await env.SHOP_ORDERS.prepare("UPDATE orders SET reference_id=?, checkout_url=?, status='OPEN', updated_at=? WHERE id=?").bind(payment.reference_id,target.href,Date.now(),input.requestId).run();
   return json({orderId:input.requestId,url:target.href});
  }catch{
   await env.SHOP_ORDERS.prepare("UPDATE orders SET status='REVIEW',updated_at=? WHERE id=? AND status='CREATING'").bind(Date.now(),input.requestId).run();
   return json({error:'Checkout could not be opened. Contact Morteva before retrying.'},503);
  }
 }
 const download=path.match(/^\/api\/shop\/orders\/([a-f0-9-]+)\/download\/([^/]+)$/i);
 if(download&&uuid.test(download[1])&&request.method==='GET'){
  const row:any=await env.SHOP_ORDERS.prepare('SELECT * FROM orders WHERE id=?').bind(download[1]).first();
  if(!row||!paidStates.has(row.status))return json({error:'Payment must be verified before downloading.'},403);
  const line=JSON.parse(row.items_json).find((p:any)=>p.id===decodeURIComponent(download[2])&&p.kind==='digital');
  if(!line||!env.SHOP_MEDIA)return json({error:'Download not found'},404);
  const object=await env.SHOP_MEDIA.get(line.downloadId);if(!object||object.customMetadata?.paidDelivery!=='true')return json({error:'Download unavailable. Contact Morteva.'},404);
  const name=(object.customMetadata.name||line.name).replace(/[^a-zA-Z0-9._ -]/g,'_');
  return new Response(object.body,{headers:{'Content-Type':object.httpMetadata?.contentType||'application/octet-stream','Content-Disposition':`attachment; filename="${name}"`,'Content-Length':String(object.size),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 }
 const match=path.match(/^\/api\/shop\/orders\/([a-f0-9-]+)$/i);
 if(match&&uuid.test(match[1])&&request.method==='GET'){
  const row:any=await env.SHOP_ORDERS.prepare('SELECT * FROM orders WHERE id=?').bind(match[1]).first();if(!row)return json({error:'Order not found'},404);
  let status=row.status;
  if(row.reference_id&&!paidStates.has(status)&&Date.now()-row.updated_at>10000){try{status=await reconcile(env,row);}catch(error){console.error('payram verification:',error instanceof Error?error.message:'failed');return json({error:'Payment verification is temporarily unavailable.'},503);}}
  const paid=paidStates.has(status);
  return json({status,totalCents:row.total_cents,paid,...(paid?{fulfillment:row.fulfillment_status||'pending',trackingUrl:row.tracking_url||'',deliveryNote:row.customer_note||'',downloads:JSON.parse(row.items_json||'[]').filter((p:any)=>p.kind==='digital').map((p:any)=>({name:p.name,url:'/api/shop/orders/'+row.id+'/download/'+encodeURIComponent(p.id)}))}: {})});
 }
 return json({error:'Not found'},404);
}
