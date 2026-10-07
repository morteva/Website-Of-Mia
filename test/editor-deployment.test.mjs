import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cp,mkdtemp,readFile,writeFile,rm,readdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
test('deployment copies every public asset unchanged and preserves arbitrary editor changes',async()=>{
 const root=resolve(import.meta.dirname,'..'),temp=await mkdtemp(join(tmpdir(),'morteva-editor-build-'));
 try{execFileSync('git',['clone','--shared','--no-checkout',root,temp],{stdio:'pipe',windowsHide:true});for(const name of ['scripts','public'])await cp(join(root,name),join(temp,name),{recursive:true});
 const file=join(temp,'public/index.html');let html=await readFile(file,'utf8');html=html.replace('<main>','<main data-editor-test="saved"><p>Editor body</p>').replace('REACH OUT','Editor footer');await writeFile(file,html);
 const snapshots=new Map();async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const f=join(dir,e.name);if(e.isDirectory())await walk(f);else snapshots.set(f,await readFile(f))}}await walk(join(temp,'public'));
 for(let i=0;i<2;i++){for(const script of ['validate-public.mjs','build-deploy-assets.mjs'])execFileSync(process.execPath,[join(temp,'scripts',script)],{cwd:temp,stdio:'pipe',windowsHide:true});for(const [f,bytes]of snapshots){assert.deepEqual(await readFile(f),bytes,f);assert.deepEqual(await readFile(f.replace(join(temp,'public'),join(temp,'dist'))),bytes,f)}}
 }finally{await rm(temp,{recursive:true,force:true})}
});
