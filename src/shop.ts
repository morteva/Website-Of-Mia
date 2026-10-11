// Payment credentials stay on the Worker; browser totals and webhook claims are never authoritative.
interface ShopEnv {
 ASSETS: Fetcher;
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
 const response=await fetch(base(env)!+path,{...options,redirect:'error',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json','API-Key':env.PAYRAM_API_KEY!,...(env.PAYRAM_GATEWAY_KEY?{'X-Morteva-Gateway':env.PAYRAM_GATEWAY_KEY}:{})}});
 if(!response.ok)throw Error('PayRam HTTP '+response.status);return response.json() as Promise<any>;
}
export function priceBag(catalog:any,items:any){
 if(catalog.currency!=='USD'||!Array.isArray(catalog.products)||!Array.isArray(items)||!items.length||items.length>50)throw Error('Invalid bag');
 const unique=new Set();let total=0;
 const lines=items.map((item:any)=>{
  if(!item||typeof item.id!=='string'||unique.has(item.id)||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>99)throw Error('Invalid bag');
  unique.add(item.id);const p=catalog.products.find((p:any)=>p.id===item.id);
  if(!p||p.available===false||typeof p.name!=='string'||!Number.isSafeInteger(p.priceCents)||p.priceCents<=0)throw Error('An item is unavailable');
  total+=p.priceCents*item.quantity;
  if(!Number.isSafeInteger(total)||total>100000000)throw Error('Invalid total');
  return {id:p.id,name:p.name,priceCents:p.priceCents,quantity:item.quantity};
 });return {lines,total};
}
async function reconcile(env:ShopEnv,row:any){
 const result=await provider(env,'/api/v1/payment/reference/'+encodeURIComponent(row.reference_id));
 if(result.referenceID!==row.reference_id||Math.round(Number(result.amountInUSD)*100)!==row.total_cents||result.invoiceID!==row.id)throw Error('Mismatched payment');
 const status=result.paymentState;
 if(!['OPEN','CANCELLED','PARTIALLY_FILLED','FILLED','OVER_FILLED'].includes(status))throw Error('Invalid payment state');
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
 if(path==='/api/shop/config'&&request.method==='GET')return json({enabled:ready(env)});
 if(!env.SHOP_ORDERS||!env.PAYRAM_API_KEY||!base(env))return json({error:'Payments aren’t available yet.'},503);
 if(path==='/api/shop/webhook'&&request.method==='POST'){
  const raw=await request.text();if(!await verifySignature(raw,request.headers.get('X-Payram-Signature'),env.PAYRAM_API_KEY))return json({error:'Unauthorized'},401);
  let event;try{event=JSON.parse(raw);}catch{return json({error:'Invalid event'},400);}
  if(typeof event.reference_id!=='string')return json({error:'Invalid event'},400);
  const row=await env.SHOP_ORDERS.prepare('SELECT * FROM orders WHERE reference_id=?').bind(event.reference_id).first();
  if(!row)return json({received:true});
  try{await reconcile(env,row);return json({received:true});}catch(error){console.error('payram verification:',error instanceof Error?error.message:'failed');return json({error:'Verification pending'},503);}
 }
 if(path==='/api/shop/checkout'&&request.method==='POST'){
  if(!ready(env))return json({error:'Payments aren’t available yet.'},503);
  let input:any;try{input=await request.json();}catch{return json({error:'Invalid request'},400);}
  if(!uuid.test(input?.requestId)||typeof input.email!=='string'||input.email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email))return json({error:'Enter a valid email address.'},400);
  let priced;try{const response=await env.ASSETS.fetch(new Request(new URL('/shop-catalog.json',url)));if(!response.ok)throw Error();priced=priceBag(await response.json(),input.items);}catch{return json({error:'Your bag changed. Reload the shop and check the items.'},400);}
  const existing:any=await env.SHOP_ORDERS.prepare('SELECT * FROM orders WHERE id=?').bind(input.requestId).first();
  if(existing){
   if(existing.email!==input.email||existing.items_json!==JSON.stringify(priced.lines))return json({error:'Start a new checkout.'},409);
   if(existing.checkout_url)return json({orderId:existing.id,url:existing.checkout_url});
   return json({error:'This checkout is being processed. Do not submit another payment.'},409);
  }
  const ip=request.headers.get('CF-Connecting-IP')||'local';
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip+env.PAYRAM_API_KEY));
  const client=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
  const count:any=await env.SHOP_ORDERS.prepare('SELECT COUNT(*) AS count FROM orders WHERE client_hash=? AND created_at>?').bind(client,Date.now()-3600000).first();
  if(count?.count>=20)return json({error:'Too many checkouts. Please try later.'},429);
  const inserted=await env.SHOP_ORDERS.prepare("INSERT OR IGNORE INTO orders (id,email,items_json,total_cents,status,created_at,updated_at,client_hash) VALUES (?,?,?,?,'CREATING',?,?,?)").bind(input.requestId,input.email,JSON.stringify(priced.lines),priced.total,Date.now(),Date.now(),client).run();
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
 const match=path.match(/^\/api\/shop\/orders\/([a-f0-9-]+)$/i);
 if(match&&uuid.test(match[1])&&request.method==='GET'){
  const row:any=await env.SHOP_ORDERS.prepare('SELECT * FROM orders WHERE id=?').bind(match[1]).first();if(!row)return json({error:'Order not found'},404);
  let status=row.status;
  if(row.reference_id&&!paidStates.has(status)&&Date.now()-row.updated_at>10000){try{status=await reconcile(env,row);}catch(error){console.error('payram verification:',error instanceof Error?error.message:'failed');return json({error:'Payment verification is temporarily unavailable.'},503);}}
  return json({status,totalCents:row.total_cents,paid:paidStates.has(status)});
 }
 return json({error:'Not found'},404);
}
