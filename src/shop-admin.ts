const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function handleShopAdmin(request:Request,env:any){
 const url=new URL(request.url),path=url.pathname;
 const headers=new Headers(request.headers);headers.delete('Content-Length');headers.delete('Content-Type');
 const auth=await env.NEWSLETTER.fetch(new Request(new URL('/wmm4/api/shop-auth',url),{method:request.method==='GET'?'GET':'POST',headers}));
 if(!auth.ok)return json({error:auth.status===403?'Reload the control room before saving.':'Sign in to your control room first.'},auth.status===403?403:401);
 if(!env.SHOP_ORDERS)return json({error:'Shop storage is unavailable.'},503);
 if(path==='/api/shop/admin/orders'&&request.method==='GET'){
  const offset=Number(url.searchParams.get('offset')||0);if(!Number.isSafeInteger(offset)||offset<0)return json({error:'Invalid page'},400);
  const rows=await env.SHOP_ORDERS.prepare("SELECT * FROM orders WHERE items_json!='[]' ORDER BY created_at DESC LIMIT 100 OFFSET ?").bind(offset).all();
  return json({orders:rows.results.map((row:any)=>({...row,items:JSON.parse(row.items_json),shipping:row.shipping_json?JSON.parse(row.shipping_json):null,items_json:undefined,shipping_json:undefined})),nextOffset:rows.results.length===100?offset+100:null});
 }
 const match=path.match(/^\/api\/shop\/admin\/orders\/([a-f0-9-]+)$/i);
 if(match&&uuid.test(match[1])&&request.method==='PATCH'){
  let input:any;try{input=await request.json();}catch{return json({error:'Invalid order update'},400);}
  if(!input||!Number.isSafeInteger(input.revision)||!['pending','processing','shipped','completed'].includes(input.fulfillment)||typeof input.privateNotes!=='string'||input.privateNotes.length>10000||typeof input.customerNote!=='string'||input.customerNote.length>5000||typeof input.trackingUrl!=='string'||input.trackingUrl.length>2000)return json({error:'Choose an order status and valid notes.'},400);
  if(input.trackingUrl){try{const target=new URL(input.trackingUrl);if(target.protocol!=='https:'||target.username||target.password)throw Error();}catch{return json({error:'Tracking links must start with https://.'},400);}}
  const order:any=await env.SHOP_ORDERS.prepare('SELECT * FROM orders WHERE id=?').bind(match[1]).first();if(!order)return json({error:'Order not found'},404);
  if(!['FILLED','OVER_FILLED'].includes(order.status)&&input.fulfillment!=='pending')return json({error:'Verify payment before fulfilling this order.'},409);
  const saved=await env.SHOP_ORDERS.prepare('UPDATE orders SET fulfillment_status=?,tracking_url=?,customer_note=?,private_notes=?,fulfillment_revision=fulfillment_revision+1,updated_at=? WHERE id=? AND fulfillment_revision=?').bind(input.fulfillment,input.trackingUrl,input.customerNote,input.privateNotes,Date.now(),order.id,input.revision).run();
  if(!saved.meta.changes)return json({error:'This order changed in another tab. Reload before saving.'},409);
  return json({saved:true,revision:input.revision+1});
 }
 return json({error:'Not found'},404);
}
