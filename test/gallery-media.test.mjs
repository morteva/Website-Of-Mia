import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

test('mixed gallery media play natively and image thumbnails open the full original',async()=>{
  const element=tag=>({tagName:tag,children:[],style:{},dataset:{},attributes:{},classList:{add(){},remove(){}},events:{},appendChild(e){this.children.push(e)},append(...els){this.children.push(...els)},replaceChildren(){this.children=[]},setAttribute(k,v){this.attributes[k]=v},removeAttribute(k){delete this.attributes[k]},addEventListener(k,f){this.events[k]=f},focus(){}});
  const nodes=new Map();const document={body:{style:{}},getElementById(id){if(!nodes.has(id))nodes.set(id,element('div'));return nodes.get(id)},querySelector(){return element('button')},querySelectorAll(){return []},createElement:element,addEventListener(){}};
  const media=[{name:'Clip.mp4',type:'video/mp4',url:'/clip.mp4',caption:'Video caption'},{name:'Photo.png',url:'/original.png',thumbnail:'/thumbnail.webp'}];
  const context={document,fetch:async()=>({ok:true,json:async()=>({albums:{Test:media}})})};
  const source=readFileSync('public/gallery.html','utf8').match(/<script>\s*(const lightbox=[\s\S]*?)<\/script>/)[1];runInNewContext(source,context);
  const slot=element('div');const album={dataset:{path:'Test'},querySelector:()=>slot};await context.loadAlbum(album);
  assert.equal(album.dataset.loaded,'true');const grid=slot.children[0],video=grid.children[0].children[0];
  assert.equal(video.tagName,'div');assert.equal(video.children[0].tagName,'video');assert.equal(video.children[0].controls,true);assert.equal(video.children[0].src,'/clip.mp4');assert.equal(grid.children[0].children[1].textContent,'Video caption');
  const photo=grid.children[1];assert.equal(photo.children[0].src,'/thumbnail.webp');photo.events.click();assert.equal(nodes.get('lightbox-image').src,'/original.png');
  context.closeLightbox();assert.equal(nodes.get('lightbox-image').src,'');
});
