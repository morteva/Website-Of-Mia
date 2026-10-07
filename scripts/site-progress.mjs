import {execFileSync} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root = resolve(import.meta.dirname, '..');
const config = JSON.parse(readFileSync(resolve(root, 'public/site-progress-config.json'), 'utf8'));
const baseline = config.baselineCommit;
const git = (...args) => execFileSync('git', args, {cwd:root, encoding:'utf8', windowsHide:true}).trim();

export function progressForEdits(edits) {
  return Math.min(1000, config.baselineTenths + edits * config.incrementTenths) / 10;
}

export async function writeSiteProgress(destination) {
  // Cloudflare and fresh editor clones may contain only the latest commit.
  if (git('rev-parse', '--is-shallow-repository') === 'true') git('fetch', '--unshallow', 'origin');
  git('merge-base', '--is-ancestor', baseline, 'HEAD');
  const commits = git('log', '--format=%H', '--no-merges', `${baseline}..HEAD`, '--', 'public', 'src', 'scripts', 'wrangler.jsonc', 'package.json', 'package-lock.json');
  const edits = commits ? commits.split('\n').length : 0;
  await writeFile(destination, JSON.stringify({percent:progressForEdits(edits), edits, commit:git('rev-parse', 'HEAD')}) + '\n');
}
