import { readFile, writeFile } from "node:fs/promises";
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

data.version = 3;
data.purpose = "MySpace Mia website thought pool";
await writeFile(path, JSON.stringify(data, null, 2) + "\n");
