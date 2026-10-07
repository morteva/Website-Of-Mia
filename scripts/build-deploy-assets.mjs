import { copyFile, mkdir, readdir, rm, stat } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { writeSiteProgress } from './site-progress.mjs';

const root = resolve(import.meta.dirname, "..");
const sourceDir = join(root, "public");
const deployDir = join(root, "dist");
const MAX_ASSET_BYTES = 24 * 1024 * 1024;
const skipped = [];

await rm(deployDir, { recursive: true, force: true });
await mkdir(deployDir, { recursive: true });

async function copyTree(source, destination) {
  const entries = await readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    const from = join(source, entry.name);
    const to = join(destination, entry.name);

    if (entry.isDirectory()) {
      await mkdir(to, { recursive: true });
      await copyTree(from, to);
      continue;
    }

    if (!entry.isFile()) continue;

    const info = await stat(from);
    if (info.size > MAX_ASSET_BYTES) {
      skipped.push({ path: relative(sourceDir, from), bytes: info.size });
      continue;
    }

    await copyFile(from, to);
  }
}

await copyTree(sourceDir, deployDir);
await writeSiteProgress(join(deployDir, 'site-progress.json'));

if (skipped.length) {
  throw new Error('Assets exceed the deploy size limit; no incomplete deployment is allowed:\n' + skipped.map(item => `${item.path} (${(item.bytes / 1024 / 1024).toFixed(1)} MiB)`).join('\n'));
}

console.log('Prepared all deploy assets in dist.');
