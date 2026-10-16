import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
test('collecting browser-normalized journal HTML preserves original source and restores it after undo',()=>{
 const nodes=new Map(),fields=[];
 const node=()=>({dataset:{},classList:{toggle(){},add(){},remove(){}},value:'',innerHTML:'',style:{},showModal(){},close(){}});
 const document={body:{dataset:{csrf:'test'}},querySelector(s){if(!nodes.has(s))nodes.set(s,node());return nodes.get(s)},querySelectorAll(s){return s==='[data-field]'?fields:[]}};
 const source=readFileSync(new URL('../public/cms-admin.js',import.meta.url),'utf8').replace(/\}\)\(\);\s*$/,`globalThis.audit={collect,rememberJournalBody,set:item=>{section='journal';doc={draft:[item],revision:0};selected=0}};})();`);
 const context={document,window:{addEventListener(){}},location:{origin:'https://morteva.com'},console};runInNewContext(source,context);
 const body='<p class="original">Keep<br/>this</p>',item={id:'one',title:'Original',body,edited:false};context.audit.set(item);
 const writing={dataset:{field:'body'},innerHTML:'<p class="original">Keep<br>this</p>',isContentEditable:true};fields.push(writing);context.audit.rememberJournalBody(writing,body);
 context.audit.collect();assert.equal(item.body,body);assert.equal(item.edited,false);
 const loaded=writing.innerHTML;writing.innerHTML='<p>Changed</p>';context.audit.collect();assert.equal(item.body,'<p>Changed</p>');writing.innerHTML=loaded;context.audit.collect();assert.equal(item.body,body);
});
