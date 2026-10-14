// Metadata-only telemetry. Never record bodies, query strings, headers or credentials.
const site = 'morteva.com';
const encoder = new TextEncoder();
function emit(data: Record<string, unknown>) {
  try { console.log(JSON.stringify({schema:'traffic.v1',site,time:Date.now(),...data})); } catch {}
}
function address(input: any) {
  try { const u=new URL(input instanceof Request?input.url:String(input)); return {host:u.hostname,path:u.pathname.replace(/[A-Za-z0-9_-]{32,}/g,'[id]').slice(0,120)}; }
  catch {return {host:'unknown',path:'/'};}
}
function size(input: any): number|null {
  if(input==null)return 0;
  if(typeof input==='string')return encoder.encode(input).byteLength;
  if(input instanceof ArrayBuffer)return input.byteLength;
  if(ArrayBuffer.isView(input))return input.byteLength;
  if(input instanceof Blob)return input.size;
  if(input instanceof URLSearchParams)return encoder.encode(input.toString()).byteLength;
  return null;
}
export async function observeFetch(call:()=>Promise<Response>,input:any,init:any={},kind='external'):Promise<Response> {
  const at=Date.now(),meta=address(input),method=init.method||(input instanceof Request?input.method:'GET');
  const declared=input instanceof Request?input.headers.get('content-length'):new Headers(init.headers).get('content-length');
  const tx=declared!=null&&/^\d+$/.test(declared)?Number(declared):input instanceof Request&&input.body?null:size(init.body);
  try {
    const response=await call();
    emit({direction:'egress',kind,...meta,method,status:response.status,ms:Date.now()-at,tx_bytes:tx,rx_bytes_declared:response.headers.get('content-length')});
    if(!response.body||response.status===101)return response;
    let bytes=0,finished=false;
    const reader=response.body.getReader();
    const finish=(state:string)=>{if(!finished){finished=true;emit({direction:'egress_bandwidth',kind,...meta,method,status:response.status,rx_body_bytes:bytes,transfer_state:state});}};
    return new Response(new ReadableStream({async pull(controller){try{const next=await reader.read();if(next.done){finish('complete');controller.close();}else{bytes+=next.value.byteLength;controller.enqueue(next.value);}}catch(error){finish('error');controller.error(error);}},async cancel(reason){finish('cancelled');await reader.cancel(reason);}}),response);
  } catch(error) {emit({direction:'egress',kind,...meta,method,status:0,ms:Date.now()-at,tx_bytes:tx,error:true});throw error;}
}
export function monitoredFetch(input:any,init?:any):Promise<Response> {
  return observeFetch(()=>fetch(input,init),input,init);
}
export function monitoredEnv<T extends object>(env:T):T {
  const cache=new Map<any,any>();
  function wrap(value:any,name:string):any {
    if(!value||typeof value!=='object')return value;
    if(cache.has(value))return cache.get(value);
    const proxy=new Proxy(value,{get(target,key){
      const member=Reflect.get(target,key,target);
      if(typeof member!=='function')return member;
      if(key==='fetch')return (input:any,init?:any)=>observeFetch(()=>member.call(target,input,init),input,init,'binding:'+name);
      return (...args:any[])=>{
        const at=Date.now();
        const result=member.apply(target,args);
        if(result&&typeof result.then==='function')return result.then((output:any)=>{emit({direction:'binding',kind:name,operation:String(key),ms:Date.now()-at});return output;},(error:any)=>{emit({direction:'binding',kind:name,operation:String(key),ms:Date.now()-at,error:true});throw error;});
        return result&&typeof result==='object'?wrap(result,name):result;
      };
    }});cache.set(value,proxy);return proxy;
  }
  return new Proxy(env,{get(target,key){const v=Reflect.get(target,key,target);return ['ASSETS','NEWSLETTER','DB','MEDIA','SHOP_MEDIA','SHOP_ORDERS'].includes(String(key))?wrap(v,String(key)):v;}});
}
export async function observeRequest(request:Request,ctx:any,call:(request:Request)=>Promise<Response>):Promise<Response> {
  let incoming=0,consumed=false;
  const declared=request.headers.get('content-length');
  if(request.body){
    const stream=request.body.pipeThrough(new TransformStream({transform(chunk,controller){incoming+=chunk.byteLength;controller.enqueue(chunk);},flush(){consumed=true;}}));
    request=new Request(request,{body:stream,duplex:'half'} as RequestInit);
  }else consumed=true;
  const at=Date.now(),meta=address(request);
  const response=await call(request);
  let outgoing=0,finished=false;
  const complete=(state:string)=>{if(finished)return;finished=true;emit({direction:'bandwidth',...meta,method:request.method,status:response.status,ms:Date.now()-at,rx_body_bytes:incoming,rx_complete:consumed,rx_bytes_declared:declared,tx_body_bytes:outgoing,transfer_state:state});resolve();};
  let resolve=()=>{};
  const done=new Promise<void>(r=>{resolve=r;});
  if(!response.body||response.status===101){complete(response.status===101?'websocket-unmetered':'complete');return response;}
  // Pull through only as the consumer reads: no tee, buffering, or eager downloads.
  const reader=response.body.getReader();
  const stream=new ReadableStream({async pull(controller){try{const next=await reader.read();if(next.done){complete('complete');controller.close();}else{outgoing+=next.value.byteLength;controller.enqueue(next.value);}}catch(error){complete('error');controller.error(error);}},async cancel(reason){complete('cancelled');await reader.cancel(reason);}});
  if(ctx?.waitUntil)ctx.waitUntil(done);
  return new Response(stream,response);
}
