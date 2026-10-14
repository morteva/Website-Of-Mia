import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../public/mia-pet.js',import.meta.url),'utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function fixture(initial){
 const timers=[],nodes=[],events={},requests=[];let pool=initial,fail=false;
 function element(tag){const listeners={},classes=new Set();const e={tag,hidden:false,textContent:'',children:[],style:{},className:'',listeners,
 append(...items){this.children.push(...items);nodes.push(...items);},setAttribute(){},decode:async()=>{},addEventListener(name,fn){listeners[name]=fn;},classList:{add(c){classes.add(c)},remove(c){classes.delete(c)}},};
 return e;}
 const head=element('head'),body=element('body'),doc={head,body,createElement:element,baseURI:'https://morteva.com/',currentScript:{src:'https://morteva.com/mia-pet.js?v=test'},hidden:false,addEventListener(n,f){events['doc:'+n]=f}};
 const storage=new Map(),window={setTimeout(fn){timers.push(fn);return timers.length;},setInterval(fn){events.interval=fn;},addEventListener(n,f){events[n]=f}};
 runInNewContext(source,{window,document:doc,location:{pathname:'/'},sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},URL,Date,Set,Promise,Math,clearTimeout(){},console:{warn(){}},fetch:async(url,options)=>{requests.push({url,options});if(fail)throw Error('offline');return {ok:true,json:async()=>pool};}});
 await tick();await tick();
 const root=body.children[0],bubble=body.children[1],restore=body.children[2],sprite=root.children[0],copy=bubble.children[1];
 return {root,bubble,copy,restore,sprite,requests,events,setPool:v=>{pool=v},fail:v=>{fail=v},async flush(){await tick();await tick();}};
}
test('requests fresh content instead of the previous force-cache URL and displays exact live text',async()=>{
 const f=await fixture({lines:[{text:'37 years old and still happiest dressed like daylight personally offended me.'}]});
 assert.equal(f.copy.textContent,'37 years old and still happiest dressed like daylight personally offended me.');
 assert.equal(f.requests[0].options.cache,'no-store');const url=new URL(f.requests[0].url);assert.equal(url.pathname,'/myspace-mia-thoughts.json');assert.ok(url.searchParams.has('fresh'));assert.ok(!url.search.includes('20261001'));});
test('an open tab refreshes on focus and removes a deleted displayed line',async()=>{
 const f=await fixture({lines:[{text:'Thirty-seven years old and still happiest dressed like daylight personally offended me.'}]});
 f.setPool({lines:[{text:'37 years old and still happiest dressed like daylight personally offended me.'}]});
 f.events.focus();await f.flush();assert.equal(f.copy.textContent,'37 years old and still happiest dressed like daylight personally offended me.');assert.equal(f.bubble.hidden,false);});
test('click refreshes the pool before picking another thought',async()=>{
 const f=await fixture({lines:[{text:'Old thought'}]});f.setPool({lines:[{text:'New thought'}]});
 await f.sprite.listeners.click();assert.equal(f.copy.textContent,'New thought');assert.equal(f.requests.length,2);});
test('returning to a tab refreshes and hidden state survives a content update',async()=>{
 const f=await fixture({lines:[{text:'Old thought'}]});f.root.children[2].listeners.click();assert.equal(f.root.hidden,true);
 f.setPool({lines:[{text:'New thought'}]});f.events['doc:visibilitychange']();await f.flush();assert.equal(f.root.hidden,true);
 await f.restore.listeners.click();assert.equal(f.copy.textContent,'New thought');assert.equal(f.root.hidden,false);});
test('a transient refresh failure preserves a valid pool and a later request recovers',async()=>{
 const f=await fixture({lines:[{text:'Existing thought'}]});f.fail(true);await f.sprite.listeners.click();assert.equal(f.copy.textContent,'Existing thought');
 f.fail(false);f.setPool({lines:[{text:'Recovered thought'}]});await f.sprite.listeners.click();assert.equal(f.copy.textContent,'Recovered thought');});
