import { copyFile, mkdir, readdir, rm, stat } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

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

if (skipped.length) {
  for (const item of skipped) {
    console.warn(`Deploy asset omitted because it exceeds Cloudflare's asset limit: ${item.path} (${(item.bytes / 1024 / 1024).toFixed(1)} MiB)`);
  }
}

console.log(`Prepared deploy assets in dist (${skipped.length} oversized asset${skipped.length === 1 ? "" : "s"} omitted).`);
