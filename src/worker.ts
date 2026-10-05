interface Env { ASSETS: Fetcher; NEWSLETTER: Fetcher; }
export default {async fetch(request: Request,env: Env){
 const url=new URL(request.url),path=url.pathname;
 if(path==='/cms-admin.html')return new Response(null,{status:302,headers:{Location:'/wmm4','Cache-Control':'no-store'}});
 if(path==='/miamiamia'||path.startsWith('/miamiamia/'))return new Response('Not found',{status:404,headers:{'Cache-Control':'no-store'}});
 if(path==='/api/mia-newsletter/subscribe'||path.startsWith('/mia-newsletter/')||path==='/wmm4'||path.startsWith('/wmm4/')||path.startsWith('/cms-media/'))return env.NEWSLETTER.fetch(request);
 const bridge=new URL('/cms-bridge',url);bridge.searchParams.set('path',path);
 const dynamic=await env.NEWSLETTER.fetch(new Request(bridge,request));
 if(dynamic.status!==204)return dynamic;
 const response=await env.ASSETS.fetch(request);
 if(!response.headers.get('Content-Type')?.includes('text/html'))return response;
 const transform=new URL('/cms-transform',url);transform.searchParams.set('path',path);
 const rendered=await env.NEWSLETTER.fetch(new Request(transform,{method:'POST',body:response.body,headers:{'Content-Type':'text/html'}}));
 return new Response(rendered.body,{status:response.status,headers:rendered.headers});
}};
