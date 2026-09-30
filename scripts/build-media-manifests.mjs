import { readdir, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const publicDir = resolve(import.meta.dirname, "..", "public");
const MAX_DEPLOY_ASSET_BYTES = 24 * 1024 * 1024;

const imagePattern = /\.(avif|gif|jpe?g|png|webp)$/i;
const videoPattern = /\.(mp4|webm|ogg|m4v)$/i;
const galleryRoot = join(publicDir, "galleries");
const videosRoot = join(publicDir, "videos");
const gallery = {};

async function walkGallery(dir, parts = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkGallery(full, [...parts, entry.name]);
      continue;
    }
    if (!entry.isFile() || !imagePattern.test(entry.name)) continue;
    const info = await stat(full);
    if (info.size > MAX_DEPLOY_ASSET_BYTES) continue;
    const key = parts.join("/");
    gallery[key] ??= [];
    const url = "/galleries/" + [...parts, entry.name].map(encodeURIComponent).join("/");
    gallery[key].push({ name: entry.name, url });
  }
}

await walkGallery(galleryRoot);
for (const items of Object.values(gallery)) {
  items.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
}

const videos = [];
const videoEntries = await readdir(videosRoot, { withFileTypes: true });
for (const entry of videoEntries) {
  if (!entry.isFile() || !videoPattern.test(entry.name)) continue;
  const full = join(videosRoot, entry.name);
  const info = await stat(full);
  if (info.size > MAX_DEPLOY_ASSET_BYTES) continue;
  videos.push({ name: entry.name, url: "/videos/" + encodeURIComponent(entry.name) });
}
videos.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));

await writeFile(join(publicDir, "gallery-manifest.json"), JSON.stringify({ albums: gallery }, null, 2) + "\n");
await writeFile(join(publicDir, "video-manifest.json"), JSON.stringify({ videos }, null, 2) + "\n");

console.log("Built gallery and video manifests without rewriting hand-authored page copy.");
