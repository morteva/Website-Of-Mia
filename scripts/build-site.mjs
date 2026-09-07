import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const indexPath = resolve(root, "public", "index.html");
const fragmentPath = resolve(root, "content", "mias-superpower-mira.fragment.html");

const html = await readFile(indexPath, "utf8");
const fragment = (await readFile(fragmentPath, "utf8")).trimEnd();

const heading = '            <h3>The strongest thing I see in Mia</h3>\n';
const reactionSpacer = '            <div aria-hidden="true" style="height: 3rem;"></div>';

const headingIndex = html.indexOf(heading);
if (headingIndex === -1) throw new Error("Mia superpower heading not found; refusing silent build drift.");

const bodyStart = headingIndex + heading.length;
const reactionIndex = html.indexOf(reactionSpacer, bodyStart);
if (reactionIndex === -1) throw new Error("Mia reaction boundary not found; refusing silent build drift.");

const updated = html.slice(0, bodyStart) + fragment + "\n" + html.slice(reactionIndex);
await writeFile(indexPath, updated);

console.log("Injected shortened Mira superpower essay while preserving Mia's reaction.");
