import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const publicDir = resolve(import.meta.dirname, "..", "public");

// The direct-source MySpace Mia pool must stay complete.
const thoughts = JSON.parse(await readFile(join(publicDir, "myspace-mia-thoughts.json"), "utf8"));
const thoughtCategories = ["feral_general","goth_style","gaming_general","bdo","mmo_leadership","tech_coding","website","mira_beside","ai_future","cars","animals","scifi_horror","music","people","boundaries","curiosity","night_brain","snacks","existential","introvert_social","fashion_beauty","nature_urban","work_life","random_observations"];
const thoughtCounts = new Map(thoughtCategories.map(category => [category, 0]));
const thoughtTexts = new Set();
if (!Array.isArray(thoughts.lines) || thoughts.lines.length !== 1200 || thoughts.total !== 1200) {
  throw new Error("MySpace Mia must contain exactly 1,200 entries.");
}
for (const line of thoughts.lines) {
  if (!thoughtCounts.has(line.category) || typeof line.text !== "string" || !line.text.trim() || thoughtTexts.has(line.text)) {
    throw new Error("MySpace Mia contains an unknown category, blank entry, or exact duplicate.");
  }
  thoughtCounts.set(line.category, thoughtCounts.get(line.category) + 1);
  thoughtTexts.add(line.text);
}
if ([...thoughtCounts.values()].some(count => count !== 50)) {
  throw new Error("MySpace Mia must contain exactly 50 entries in each of its 24 categories.");
}
console.log("Validated MySpace Mia: 24 categories, 50 each, 1,200 unique entries.");

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

const indexPath = join(publicDir, "index.html");
const homepage = await readFile(indexPath, "utf8");
const contentMatch = homepage.match(/<section class="section shell" id="links">[\s\S]*?<\/section>/i);
if (!contentMatch) throw new Error("Homepage Elsewhere section not found.");
const sharedContent = contentMatch[0];

const navItems = [
  { file: "index.html", href: "/", label: "Home" },
  { file: "story.html", href: "/story.html", label: "Story" },
  { file: "passions.html", href: "/passions.html", label: "Passions" },
  { file: "gallery.html", href: "/gallery.html", label: "Gallery" },
  { file: "voice-logs.html", href: "/voice-logs.html", label: "Voice" },
  { file: null, href: "https://thisisbeside.org/", label: "Beside", external: true }
];

function navFor(file) {
  const current = file === "videos.html" ? "gallery.html" : file;
  return '<nav class="nav-links" aria-label="Primary navigation">' + navItems.map(item => {
    const active = item.file && item.file === current ? ' aria-current="page"' : "";
    const external = item.external ? ' target="_blank" rel="noopener noreferrer"' : "";
    return `<a href="${item.href}"${active}${external}>${item.label}</a>`;
  }).join("") + "</nav>";
}

function footerFor(file) {
  const current = file === "hello.html" ? ' aria-current="page"' : "";
  return `<footer>
    <div class="shell footer-shell">
      <div class="footer-credit">Mia · Built by hand · No beige allowed</div>
      <div class="footer-quiet-wrap">
        <a class="footer-quiet-link" href="/hello.html"${current}>A Quiet Hello</a>
      </div>
    </div>
  </footer>`;
}

function readHead(source, pattern, fallback = "") {
  return source.match(pattern)?.[1]?.trim() || fallback;
}

function descriptionOf(source) {
  return source.match(/<meta\s+name=["']description["']\s+content="([^"]*)"[^>]*>/i)?.[1]
    || source.match(/<meta\s+name=["']description["']\s+content='([^']*)'[^>]*>/i)?.[1]
    || "Mia's personal website.";
}

function escapeAttr(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
}

function addSocial(source, file) {
  const title = readHead(source, /<title>([^<]+)<\/title>/i, "Miaorin Morwen Morteva");
  const description = descriptionOf(source);
  const canonical = readHead(source, /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["'][^>]*>/i, file === "index.html" ? "https://morteva.com/" : `https://morteva.com/${file}`);
  source = source.replace(/\s*<meta[^>]+data-mia-social[^>]*>/gi, "");
  const social = [
    `  <meta property="og:type" content="website" data-mia-social>`,
    `  <meta property="og:title" content="${escapeAttr(title)}" data-mia-social>`,
    `  <meta property="og:description" content="${escapeAttr(description)}" data-mia-social>`,
    `  <meta property="og:url" content="${escapeAttr(canonical)}" data-mia-social>`,
    `  <meta property="og:image" content="https://morteva.com/social-card.png" data-mia-social>`,
    `  <meta property="og:image:width" content="1200" data-mia-social>`,
    `  <meta property="og:image:height" content="630" data-mia-social>`,
    `  <meta property="og:image:alt" content="Mia's Morteva emblem" data-mia-social>`,
    `  <meta name="twitter:card" content="summary_large_image" data-mia-social>`,
    `  <meta name="twitter:title" content="${escapeAttr(title)}" data-mia-social>`,
    `  <meta name="twitter:description" content="${escapeAttr(description)}" data-mia-social>`,
    `  <meta name="twitter:image" content="https://morteva.com/social-card.png" data-mia-social>`
  ].join("\n");
  return source.replace(/<\/head>/i, social + "\n</head>");
}

const htmlFiles = (await readdir(publicDir)).filter(name => name.endsWith(".html") && !/^google[a-z0-9_-]+\.html$/i.test(name));
for (const file of htmlFiles) {
  const path = join(publicDir, file);
  let source = await readFile(path, "utf8");

  if (file !== "index.html") {
    source = source
      .replace(/\s*<section class="section shell" id="links">[\s\S]*?<\/section>/i, "")
      .replace(/\s*<section class="find-section(?: gallery-keep-exploring)?"[^>]*>[\s\S]*?<\/section>/i, "");
    source = source.replace(/\s*<footer\b/i, "\n\n" + sharedContent + "\n\n  <footer");
  }

  source = source.replace(/<nav class="nav-links"[^>]*>[\s\S]*?<\/nav>/i, navFor(file));
  source = source.replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/i, footerFor(file));

  if (!source.includes("data-content-protection")) {
    source = source.replace(/<\/head>/i, '  <script src="/content-protection.js?v=20260918-r1" defer data-content-protection></script>\n</head>');
  }
  if (!/<link\s+rel=["']icon["']/i.test(source)) {
    source = source.replace(/<\/head>/i, '  <link rel="icon" href="/favicon.png" type="image/png" data-mia-favicon>\n</head>');
  }
  source = source.replace(/\/styles\.css\?v=[^"']+/g, "/styles.css?v=20260930-voice-rewrite-r1");
  source = addSocial(source, file);

  await writeFile(path, source);
}

console.log("Built media manifests and shared site chrome without rewriting hand-authored page copy.");
