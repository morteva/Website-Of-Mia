const $ = id => document.getElementById(id);
const money = cents => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100);
const key='morteva-shop-bag-v1';
let products=[],bag={};
let checkoutEnabled=false,checkingOut=false;
let pending;try{pending=JSON.parse(localStorage.getItem('morteva-shop-order-v1')||'null');}catch{}
try{const saved=JSON.parse(localStorage.getItem(key)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))bag=Object.fromEntries(Object.entries(saved).filter(([id,n])=>id.length<100&&Number.isInteger(n)&&n>0&&n<=99));}catch{}
function node(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
function button(text,action,label){const b=node('button',text,'shop-button');b.type='button';if(label)b.setAttribute('aria-label',label);b.addEventListener('click',action);return b;}
function persist(){try{localStorage.setItem(key,JSON.stringify(bag));}catch{$('cart-status').textContent='Your bag is available for this visit only.';}renderBag();}
function quantity(id,delta){const count=(bag[id]||0)+delta;if(count<=0)delete bag[id];else bag[id]=Math.min(99,count);persist();}
function renderBag(){const items=$('cart-items');items.replaceChildren();let total=0,count=0;for(const p of products){const qty=bag[p.id]||0;if(!qty)continue;count+=qty;total+=qty*p.priceCents;const row=node('div',undefined,'cart-row'),copy=node('div');copy.append(node('h3',p.name),node('p',money(p.priceCents)));const controls=node('div',undefined,'cart-controls');controls.append(button('−',()=>quantity(p.id,-1),`Remove one ${p.name}`),node('span',String(qty)),button('+',()=>quantity(p.id,1),`Add one ${p.name}`),button('Remove',()=>{delete bag[p.id];persist();},`Remove ${p.name} from bag`));row.append(copy,controls);items.append(row);}if(!count)items.append(node('p','Your bag is empty.'));$('cart-count').textContent=String(count);$('cart-total').textContent=money(total);$('shop-checkout').disabled=!checkoutEnabled||!count||checkingOut;}
function renderProducts(){const search=$('shop-search').value.trim().toLowerCase();const matching=products.filter(p=>`${p.name} ${p.description||''}`.toLowerCase().includes(search));const grid=$('shop-products');grid.replaceChildren();$('shop-empty').hidden=products.length!==0;$('shop-status').textContent=products.length?(matching.length?`${matching.length} item${matching.length===1?'':'s'}`:'No items match your search.') : '';for(const p of matching){const card=node('article',undefined,'shop-card');if(p.image){const url=new URL(p.image,location.origin);if(url.origin===location.origin){const img=node('img');img.src=url.href;img.alt=p.imageAlt||p.name;img.loading='lazy';card.append(img);}}card.append(node('h2',p.name),node('p',p.description||''));const bottom=node('div',undefined,'shop-card-bottom');const add=button(p.available===false?'Unavailable':'Add to bag',()=>quantity(p.id,1));add.disabled=p.available===false;bottom.append(node('strong',money(p.priceCents)),add);card.append(bottom);grid.append(card);}}
$('open-cart').addEventListener('click',()=>{$('shop-cart').showModal();});$('close-cart').addEventListener('click',()=>{$('shop-cart').close();});$('shop-search').addEventListener('input',renderProducts);
$('shop-checkout').addEventListener('click',async()=>{
 if(checkingOut||!checkoutEnabled)return;
 const email=$('checkout-email').value.trim();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){$('cart-status').textContent='Enter your email for the order.';return;}
 const items=products.filter(p=>bag[p.id]).map(p=>({id:p.id,quantity:bag[p.id]}));
 const snapshot=JSON.stringify(items);
 if(!pending||pending.snapshot!==snapshot||pending.email!==email)pending={id:crypto.randomUUID(),snapshot,email,bag:JSON.stringify(bag)};
 try{localStorage.setItem('morteva-shop-order-v1',JSON.stringify(pending));}catch{$('cart-status').textContent='Allow browser storage before starting checkout.';return;}
 checkingOut=true;renderBag();$('cart-status').textContent='Opening secure checkout…';
 try{
  const response=await fetch('/api/shop/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId:pending.id,email,items})});const result=await response.json();
  if(!response.ok)throw Error(result.error||'Checkout is unavailable.');
  const url=new URL(result.url);if(url.protocol!=='https:')throw Error('Checkout is unavailable.');
  $('check-order').hidden=false;location.assign(url.href);
 }catch(error){$('cart-status').textContent=error.message;checkingOut=false;renderBag();}
});
async function checkOrder(){
 if(!pending?.id)return;
 try{const response=await fetch('/api/shop/orders/'+encodeURIComponent(pending.id));const result=await response.json();if(!response.ok)throw Error(result.error||'Unable to check payment.');
  $('order-status').textContent=result.paid?'Payment received. Your order is recorded.':result.status==='PARTIALLY_FILLED'?'Payment received in part. Open your checkout to finish.':result.status==='CANCELLED'?'This payment expired. Contact Morteva if you already sent funds.':'Your payment is pending.';
  if(result.paid){if(JSON.stringify(bag)===pending.bag){bag={};persist();}pending=null;localStorage.removeItem('morteva-shop-order-v1');$('check-order').hidden=true;}
 }catch(error){$('order-status').textContent=error.message;}
}
$('check-order').addEventListener('click',checkOrder);
if(pending?.id){$('check-order').hidden=false;$('checkout-email').value=pending.email||'';}
try{const response=await fetch('/shop-catalog.json');if(!response.ok)throw Error('catalog');const data=await response.json();if(data.currency!=='USD'||!Array.isArray(data.products))throw Error('catalog');const ids=new Set();products=data.products.map(p=>{if(!p||typeof p.id!=='string'||!p.id||ids.has(p.id)||typeof p.name!=='string'||!Number.isSafeInteger(p.priceCents)||p.priceCents<0||p.priceCents>100000000)throw Error('catalog');ids.add(p.id);return p;});bag=Object.fromEntries(Object.entries(bag).filter(([id])=>ids.has(id)));renderProducts();renderBag();}catch{$('shop-status').textContent='The shop couldn’t load. Please try again shortly.';renderBag();}
try{const response=await fetch('/api/shop/config');const config=await response.json();checkoutEnabled=response.ok&&config.enabled===true;if(checkoutEnabled){$('checkout-note').textContent='Pay securely with crypto or available card options.';$('shop-checkout').textContent='Checkout';$('checkout-email-label').hidden=false;}renderBag();}catch{}
