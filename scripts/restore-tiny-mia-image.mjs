// Rebuild, verify, and publish the current MySpace Mia mascot from text-safe source chunks.
// The chunked source avoids binary corruption in repository upload paths.
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const publicDir = new URL('../public/', import.meta.url);
const imagePath = new URL('tiny-mia-anime.webp', publicDir);
const release = 'myspace-anime-20261001-r3';
const cursorRelease = 'hand-light-20261003-r2';

const chunkDir = new URL('../content/tiny-mia-anime-base64-v2/', import.meta.url);
const chunkNames = (await readdir(chunkDir))
  .filter(name => /^part-\d+\.txt$/.test(name))
  .sort();

if (chunkNames.length !== 6) {
  throw new Error(`MySpace Mia anime source must contain exactly 6 chunks; found ${chunkNames.length}.`);
}

const encoded = (await Promise.all(
  chunkNames.map(name => readFile(new URL(name, chunkDir), 'utf8'))
)).join('').replace(/\s+/g, '');

const image = Buffer.from(encoded, 'base64');
const expectedBytes = 31322;
const expectedSha256 = '33e6676f8c057ce37df3f79b92a0e67221778d368bd1f52fad81ccd0d523c89a';

if (image.length !== expectedBytes) {
  throw new Error(`MySpace Mia anime rebuild produced ${image.length} bytes; expected ${expectedBytes}.`);
}
if (createHash('sha256').update(image).digest('hex') !== expectedSha256) {
  throw new Error('MySpace Mia anime rebuild failed SHA-256 verification.');
}
await writeFile(imagePath, image);

const petPath = new URL('mia-pet.js', publicDir);
const orbsPath = new URL('orbs.js', publicDir);
const [pet, orbs] = await Promise.all([readFile(petPath, 'utf8'), readFile(orbsPath, 'utf8')]);
const imageAssignment = /img\.src = asset\('tiny-mia-anime\.webp(?:\?[^']*)?'\);/;
const petLoader = /script\.src = '\/mia-pet\.js(?:\?[^']*)?';/;
if (!imageAssignment.test(pet) || !petLoader.test(orbs)) {
  throw new Error('MySpace Mia image or loader reference changed; refusing silent build drift.');
}

const updatedPet = pet.replace(imageAssignment, `img.src = asset('tiny-mia-anime.webp?v=myspace-anime-20261001-r3');`);
const updatedOrbs = orbs.replace(petLoader, `script.src = '/mia-pet.js?v=${release}';`);
const htmlFiles = (await readdir(publicDir)).filter(name => name.endsWith('.html'));
const pages = await Promise.all(htmlFiles.map(async name => {
  const path = new URL(name, publicDir);
  const source = await readFile(path, 'utf8');
  return { path, source, updated: source.replace(/\/orbs\.js(?:\?v=[^"'<>\s]*)?/g, `/orbs.js?v=${cursorRelease}`) };
}));

if (updatedPet !== pet) await writeFile(petPath, updatedPet);
if (updatedOrbs !== orbs) await writeFile(orbsPath, updatedOrbs);
for (const page of pages) {
  if (page.updated !== page.source) await writeFile(page.path, page.updated);
}

console.log(`MySpace Mia: verified anime mascot rebuilt from source chunks.`);
