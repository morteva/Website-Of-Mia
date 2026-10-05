import {readdir,readFile,stat} from 'node:fs/promises';
import {join,resolve} from 'node:path';
const base=resolve(import.meta.dirname,'../public');
let count=0;
async function inspect(dir){for(const item of await readdir(dir,{withFileTypes:true})){const file=join(dir,item.name);if(item.isDirectory()){await inspect(file);continue}if(!item.isFile())continue;count++;if((await stat(file)).size>24*1024*1024)throw Error('Asset exceeds deployment limit: '+file);if(item.name.endsWith('.html')&&!/^google[a-z0-9_-]+\.html$/i.test(item.name)){const html=await readFile(file,'utf8');if(!/<html\b/i.test(html)||!/<\/html>/i.test(html))throw Error('Incomplete HTML: '+file);if(/^(?:<<<<<<<|=======|>>>>>>>) /m.test(html))throw Error('Unresolved merge conflict: '+file)}}}
await inspect(base);
console.log(`Validated ${count} public assets. Source files were not rewritten.`);
