import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mountPodcastRecorder,uploadRecording} from '../public/podcast-recorder.js';
import {readFileSync} from 'node:fs';

function fixture({denied=false,mime='audio/webm;codecs=opus',failUpload=false,failSave=false}={}) {
 const nodes=new Map(); const node=()=>({hidden:false,disabled:false,textContent:'',value:0,pause(){},removeAttribute(key){delete this[key]}});
 const root={innerHTML:'',querySelector(selector){if(!nodes.has(selector))nodes.set(selector,node());return nodes.get(selector)}};
 let time=0,micCalls=0,stops=0,uploads=0,saves=0,locked=false,tick,stopResult;
 const listeners=new Map(),track={stop(){stops++}},stream={getTracks:()=>[track],getAudioTracks:()=>[track]};
 class Recorder {
  static isTypeSupported(type){return type===mime}
  constructor(s,options){this.mimeType=options.mimeType;this.state='inactive';Recorder.last=this}
  start(){this.state='recording'} pause(){this.state='paused'} resume(){this.state='recording'}
  stop(){this.state='inactive';this.ondataavailable({data:new Blob([new Uint8Array([26,69,223,163,0])])});stopResult=this.onstop()}
 }
 class XHR {
  constructor(){this.upload={}}
  open(method,url){assert.equal(method,'POST');assert.equal(url,'/wmm4/api/upload')}
  setRequestHeader(key,value){assert.equal(key,'X-CSRF-Token');assert.equal(value,'csrf')}
  send(form){uploads++;assert.equal(form.get('purpose'),'podcast');this.upload.onprogress({lengthComputable:true,loaded:5,total:5});if(failUpload){this.onerror();return;}this.status=200;this.responseText=JSON.stringify({id:'recording.webm',url:'/cms-media/recording.webm',type:'audio/webm',size:5});this.onload()}
 }
 const platform={isSecureContext:true,navigator:{mediaDevices:{async getUserMedia(){micCalls++;if(denied)throw Object.assign(Error('Denied'),{name:'NotAllowedError'});return stream}}},MediaRecorder:Recorder,File,FormData,XMLHttpRequest:XHR,performance:{now:()=>time},URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},setInterval(fn){tick=fn;return 1},clearInterval(){},requestAnimationFrame(){},cancelAnimationFrame(){},addEventListener:(key,fn)=>listeners.set(key,fn),removeEventListener:key=>listeners.delete(key),confirm:()=>true};
 const control=mountPodcastRecorder(root,{csrf:'csrf',lock(value){locked=value},onStart(){},async onUpload(asset,duration){saves++;assert.equal(asset.size,5);if(failSave)throw Error('Draft revision changed');control.duration=duration},onSaved(){},status(){}},platform);
 return {control,platform,nodes,track,get recorder(){return Recorder.last},get state(){return {micCalls,stops,uploads,saves,locked}},advance(ms){time+=ms;tick?.()},async stop(){control.stop();await stopResult},failUpload(value){failUpload=value},failSave(value){failSave=value},async retry(){await nodes.get('[data-retry]').onclick()},listeners};
}
test('does not request the microphone until Record; Stop uploads once and saves only a private draft',async()=>{
 const f=fixture();assert.equal(f.state.micCalls,0);await f.control.start();assert.equal(f.state.locked,true);f.advance(3500);await f.stop();
 assert.deepEqual(f.state,{micCalls:1,stops:1,uploads:1,saves:1,locked:false});assert.equal(f.control.duration,3);assert.match(f.nodes.get('[data-message]').textContent,/private draft/);assert.equal(f.nodes.get('[data-record]').disabled,false);f.control.destroy();
});
test('Pause excludes paused time; Resume continues the same recording',async()=>{
 const f=fixture();await f.control.start();f.advance(2000);f.nodes.get('[data-pause]').onclick();f.advance(10000);assert.equal(f.nodes.get('[data-time]').textContent,'00:02');f.nodes.get('[data-pause]').onclick();f.advance(3000);await f.stop();assert.equal(f.control.duration,5);f.control.destroy();
});
test('permission denial releases the interface and provides a useful message',async()=>{
 const f=fixture({denied:true});await f.control.start();assert.equal(f.state.locked,false);assert.equal(f.state.uploads,0);assert.match(f.nodes.get('[data-message]').textContent,/permission was denied/);assert.equal(f.nodes.get('[data-record]').disabled,false);f.control.destroy();
});
test('failed uploads preserve playback, backup download, navigation protection and retry',async()=>{
 const f=fixture({failUpload:true});await f.control.start();await f.stop();assert.equal(f.state.locked,true);assert.equal(f.nodes.get('[data-playback]').src,'blob:test');assert.equal(f.nodes.get('[data-download]').hidden,false);assert.equal(f.nodes.get('[data-retry]').hidden,false);
 let prevented=false;f.listeners.get('beforeunload')({preventDefault(){prevented=true}});assert.equal(prevented,true);f.failUpload(false);await f.retry();assert.equal(f.state.uploads,2);assert.equal(f.state.saves,1);assert.equal(f.state.locked,false);f.control.destroy();
});
test('retrying a failed draft save does not upload the same audio again',async()=>{
 const f=fixture({failSave:true});await f.control.start();await f.stop();f.failSave(false);await f.retry();assert.equal(f.state.uploads,1);assert.equal(f.state.saves,2);assert.equal(f.state.locked,false);f.control.destroy();
});
test('microphone disconnect stops and uploads recovered audio; the time limit also stops safely',async()=>{
 const f=fixture();await f.control.start();f.advance(2000);f.track.onended();await new Promise(resolve=>setImmediate(resolve));assert.equal(f.state.uploads,1);assert.equal(f.state.stops,1);f.control.destroy();
 const limit=fixture();await limit.control.start();limit.advance(7200000);await new Promise(resolve=>setImmediate(resolve));assert.equal(limit.state.uploads,1);assert.equal(limit.control.duration,7200);limit.control.destroy();
});
test('Safari MP4 recordings receive an m4a name and preserve their real MIME',async()=>{
 const f=fixture({mime:'audio/mp4'});await f.control.start();await f.stop();assert.match(f.nodes.get('[data-download]').download,/\.m4a$/);f.control.destroy();
});
test('unsupported and insecure browsers never request microphone access',async()=>{
 const f=fixture();f.platform.isSecureContext=false;await f.control.start();assert.equal(f.state.micCalls,0);assert.match(f.nodes.get('[data-message]').textContent,/HTTPS/);f.control.destroy();
});
test('uploader refuses expired sessions and invalid success payloads',async()=>{
 for(const [status,responseText] of [[401,'{}'],[200,'{}'],[200,'not-json']]){
  class XHR{constructor(){this.upload={}}open(){}setRequestHeader(){}send(){this.status=status;this.responseText=responseText;this.onload()}}
  await assert.rejects(uploadRecording(new File(['test'],'test.webm'), 'csrf',()=>{}, {XMLHttpRequest:XHR,FormData}));
 }
});
test('client integration saves a private podcast document and never auto-publishes',()=>{
 const source=readFileSync('public/cms-admin.js','utf8');const integration=source.slice(source.indexOf('function mountRecorder'),source.indexOf('async function save'));
 assert.match(integration,/document\?site=morteva&section=podcast/);assert.doesNotMatch(integration,/api\('publish/);assert.match(integration,/revision:doc.revision/);
});
