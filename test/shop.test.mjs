import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync('public/shop.js','utf8');
async function setup(products, saved='{}'){
 const element=tag=>({tag,children:[],events:{},value:'',append(...children){this.children.push(...children)},replaceChildren(){this.children=[]},setAttribute(){},addEventListener(name,fn){this.events[name]=fn},showModal(){this.open=true},close(){this.open=false}});
 const nodes=new Map();const document={createElement:element,getElementById(id){if(!nodes.has(id))nodes.set(id,element('div'));return nodes.get(id)}};
 let storage=saved;const context={document,Intl,URL,location:{origin:'https://morteva.com'},localStorage:{getItem(){return storage},setItem(k,v){storage=v}},fetch:async()=>({ok:true,json:async()=>({currency:'USD',products})})};
 await runInNewContext(`(async()=>{${source}})()`,context);return {nodes,stored:()=>JSON.parse(storage)};
}
test('empty shop is honest and absent from navigation',async()=>{const {nodes}=await setup([]);assert.equal(nodes.get('shop-empty').hidden,false);assert.equal(nodes.get('cart-total').textContent,'$0.00');const html=readFileSync('public/shop.html','utf8');assert.match(html,/Payments aren’t available yet/);assert.match(html,/noindex,nofollow/);assert.doesNotMatch(html.match(/<nav[\s\S]*?<\/nav>/)[0],/\/shop/);});
test('catalog search, bag totals and removal work without interpreting product HTML',async()=>{const {nodes,stored}=await setup([{id:'one',name:'<b>Item</b>',description:'Test',priceCents:1250}]);const card=nodes.get('shop-products').children[0];assert.equal(card.children[0].textContent,'<b>Item</b>');card.children[2].children[1].events.click();assert.equal(nodes.get('cart-count').textContent,'1');assert.equal(nodes.get('cart-total').textContent,'$12.50');assert.equal(stored().one,1);nodes.get('cart-items').children[0].children[1].children[2].events.click();assert.equal(nodes.get('cart-total').textContent,'$25.00');nodes.get('cart-items').children[0].children[1].children[3].events.click();assert.equal(nodes.get('cart-count').textContent,'0');nodes.get('shop-search').value='missing';nodes.get('shop-search').events.input();assert.equal(nodes.get('shop-products').children.length,0);});
test('bad saved bag and invalid catalog cannot produce invalid totals',async()=>{const {nodes}=await setup([{id:'one',name:'Item',priceCents:-1}],'{"one":999999}');assert.match(nodes.get('shop-status').textContent,/couldn’t load/);assert.equal(nodes.get('cart-total').textContent,'$0.00');});
