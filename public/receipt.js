const order=new URLSearchParams(location.search).get('order'),status=document.getElementById('receipt-status'),details=document.getElementById('receipt-details'),refresh=document.getElementById('receipt-refresh');
function link(text,url){const a=document.createElement('a');a.textContent=text;a.href=url;const p=document.createElement('p');p.append(a);details.append(p);}
async function check(){
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(order||'')){status.textContent='This receipt link is incomplete. Open it from your order.';refresh.disabled=true;return;}
 refresh.disabled=true;try{
  const response=await fetch('/api/shop/orders/'+order),result=await response.json();if(!response.ok)throw Error(result.error||'Unable to load this receipt.');details.replaceChildren();
  status.textContent=result.paid?'Payment received. Total '+new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(result.totalCents/100):result.status==='PARTIALLY_FILLED'?'Your payment arrived below the total. Contact Morteva before sending more.':result.status==='CANCELLED'?'This payment expired. Contact Morteva if you sent funds.':'Your payment is still being confirmed.';
  if(result.paid){const note=document.createElement('p');note.textContent='Delivery: '+({pending:'Not started',processing:'In progress',shipped:'Shipped',completed:'Completed'}[result.fulfillment]||'Not started');details.append(note);if(result.deliveryNote){const p=document.createElement('p');p.textContent=result.deliveryNote;p.className='receipt-note';details.append(p);}if(result.trackingUrl){const url=new URL(result.trackingUrl);if(url.protocol==='https:')link('Track your shipment',url.href);}for(const download of result.downloads||[]){const url=new URL(download.url,location.origin);if(url.origin===location.origin&&url.pathname.startsWith('/api/shop/orders/'+order+'/download/'))link('Download '+download.name,url.href);}}
 }catch(error){status.textContent=error.message;}finally{refresh.disabled=false;}
}
refresh.onclick=check;check();
