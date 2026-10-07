import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true}).trim();
if(git('status','--porcelain'))throw new Error('Commit all source changes before releasing.');
git('fetch','origin');
if(git('rev-parse','HEAD')!==git('rev-parse','origin/main'))throw new Error('Release source must match GitHub main. Push or reconcile changes first.');
// Check the release before publishing; failures stop deployment.
execFileSync(process.execPath,['--test','test/editor-deployment.test.mjs','test/worker.test.mjs','test/security.test.mjs','test/site-progress.test.mjs'],{cwd:root,stdio:'inherit',windowsHide:true});
const sha=git('rev-parse','HEAD');
console.log(`Releasing GitHub source ${sha}`);
execFileSync(process.execPath,[resolve(root,'node_modules/wrangler/bin/wrangler.js'),'deploy','--config',resolve(root,'wrangler.jsonc')],{cwd:root,stdio:'inherit',windowsHide:true});
