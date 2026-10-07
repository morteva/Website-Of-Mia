interface Env { ASSETS: Fetcher; NEWSLETTER: Fetcher; }
import {guardRequest, secureResponse} from './security.ts';
export default {async fetch(request: Request,env: Env){
 return secureResponse(request,await guardRequest(request)||await handleRequest(request,env));
}};
async function handleRequest(request: Request,env: Env){
 const url=new URL(request.url),path=url.pathname;
 if(path==='/cms-admin.html')return new Response(null,{status:302,headers:{Location:'/wmm4','Cache-Control':'no-store'}});
 if(path==='/miamiamia'||path.startsWith('/miamiamia/'))return new Response('Not found',{status:404,headers:{'Cache-Control':'no-store'}});
 if(path==='/wmm4'&&['GET','HEAD'].includes(request.method)){
  // Keep session checks and security headers in the shared backend, while
  // rendering Morteva's own editable control-room page.
  const backend=await env.NEWSLETTER.fetch(request);
  if(!backend.ok||!backend.headers.get('Content-Type')?.includes('text/html'))return backend;
  const asset=await env.ASSETS.fetch(new Request(new URL('/cms-admin.html',url)));
  if(!asset.ok)return new Response('The control room could not load.',{status:503});
  const sessionHtml=await backend.text();
  const csrf=sessionHtml.match(/data-csrf="([^"]*)"/)?.[1]||'';
  const html=(await asset.text()).replace('__CSRF__',()=>csrf);
  const headers=new Headers(backend.headers);headers.delete('Content-Length');headers.delete('ETag');
  return new Response(request.method==='HEAD'?null:html,{status:backend.status,headers});
 }
 if(path==='/api/mia-newsletter/subscribe'||path.startsWith('/mia-newsletter/')||path==='/wmm4'||path.startsWith('/wmm4/')||path.startsWith('/cms-media/'))return env.NEWSLETTER.fetch(request);
 const bridge=new URL('/cms-bridge',url);bridge.searchParams.set('path',path);
 const dynamic=await env.NEWSLETTER.fetch(new Request(bridge,request));
 if(dynamic.status!==204)return dynamic;
 const response=await env.ASSETS.fetch(request);
 if(!response.headers.get('Content-Type')?.includes('text/html'))return response;
 const transform=new URL('/cms-transform',url);transform.searchParams.set('path',path);
 const rendered=await env.NEWSLETTER.fetch(new Request(transform,{method:'POST',body:await response.text(),headers:{'Content-Type':'text/html'}}));
 if(!rendered.ok)return rendered;
 const headers=new Headers(response.headers);for(const [key,value] of rendered.headers)headers.set(key,value);headers.delete('Content-Length');headers.delete('ETag');
 return new Response(request.method==='HEAD'?null:rendered.body,{status:response.status,headers});
}
