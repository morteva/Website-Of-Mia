import { readFile, readdir, writeFile } from "node:fs/promises";
const path = new URL("../public/tiny-mia-thoughts.json", import.meta.url);
const data = JSON.parse(await readFile(path, "utf8"));
for (const item of data.lines) {
  item.text = String(item.text)
    .replace(/\bI do not\b/g, "I don't")
    .replace(/\bI cannot\b/g, "I can't")
    .replace(/\bI am\b/g, "I'm")
    .replace(/\bI would\b/g, "I'd")
    .replace(/\bI have\b/g, "I've")
    .replace(/\bI will\b/g, "I'll")
    .replace(/\bdoes not\b/g, "doesn't")
    .replace(/\bis not\b/g, "isn't")
    .replace(/\bwill not\b/g, "won't")
    .replace(/\bThere is\b/g, "There's")
    .replace(/\bThat is\b/g, "That's")
    .replace(/\bcontinues to be\b/g, "is still")
    .replace(/\bremains\b/g, "is still");
}

const overlayDir = new URL("../public/myspace-mia/", import.meta.url);
let overlayFiles = [];
try {
  overlayFiles = (await readdir(overlayDir)).filter(name => name.endsWith(".json"));
} catch {}

for (const name of overlayFiles) {
  const overlay = JSON.parse(await readFile(new URL(name, overlayDir), "utf8"));
  const category = overlay.category;
  const replacements = Array.isArray(overlay.lines) ? overlay.lines : [];
  const targets = data.lines.filter(item => item.category === category);
  if (targets.length !== 50 || replacements.length !== 50) {
    throw new Error(`MySpace Mia category ${category} must contain exactly 50 lines.`);
  }
  for (let i = 0; i < 50; i++) {
    targets[i].text = typeof replacements[i] === "string" ? replacements[i] : replacements[i].text;
    targets[i].weight = 1;
  }
}

data.notes = [
  "Full 1,200-line MySpace Mia pool.",
  "Category overlays replace old template-style lines with copy based on Mia's actual public voice, history, interests, humor, games, cars, goth roots, and Beside.",
  "Every category stays at 50 lines."
];
data.provenance = "Prewritten MySpace Mia dialogue based on Mia's voice and public history. It is not live thought, and a line is not a literal Mia quote unless explicitly marked as one.";


data.version = 3;
data.purpose = "MySpace Mia website thought pool";
await writeFile(path, JSON.stringify(data, null, 2) + "\n");
