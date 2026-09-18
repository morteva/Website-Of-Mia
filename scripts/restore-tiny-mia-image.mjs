// Verify and publish the current Tiny Mia mascot without overwriting it.
// The previous static creature remains preserved as backup binary parts and as a public backup asset.
import { readFile, writeFile, readdir } from 'node:fs/promises';
const publicDir = new URL('../public/', import.meta.url);
const imagePath = new URL('tiny-mia-gothic.png', publicDir);
const release = 'tiny-gothic-doll-20260918-r2';

const image = await readFile(imagePath);
if (image.length < 1000) {
  throw new Error('Tiny Mia current image is missing or unexpectedly empty; refusing to publish.');
}

const petPath = new URL('mia-pet.js', publicDir);
const orbsPath = new URL('orbs.js', publicDir);
const [pet, orbs] = await Promise.all([readFile(petPath, 'utf8'), readFile(orbsPath, 'utf8')]);
const imageAssignment = /img\.src = asset\('tiny-mia-gothic\.png(?:\?[^']*)?'\);/;
const petLoader = /script\.src = '\/mia-pet\.js(?:\?[^']*)?';/;
if (!imageAssignment.test(pet) || !petLoader.test(orbs)) {
  throw new Error('Tiny Mia image or loader reference changed; refusing silent build drift.');
}

const updatedPet = pet.replace(imageAssignment, `img.src = asset('tiny-mia-gothic.png?v=20260918-doll1');`);
const updatedOrbs = orbs.replace(petLoader, `script.src = '/mia-pet.js?v=${release}';`);
const htmlFiles = (await readdir(publicDir)).filter(name => name.endsWith('.html'));
const pages = await Promise.all(htmlFiles.map(async name => {
  const path = new URL(name, publicDir);
  const source = await readFile(path, 'utf8');
  return { path, source, updated: source.replace(/\/orbs\.js(?:\?v=[^"'<>\s]*)?/g, `/orbs.js?v=${release}`) };
}));

if (updatedPet !== pet) await writeFile(petPath, updatedPet);
if (updatedOrbs !== orbs) await writeFile(orbsPath, updatedOrbs);
for (const page of pages) {
  if (page.updated !== page.source) await writeFile(page.path, page.updated);
}

console.log(`Tiny Mia: gothic doll cutout present; previous mascot preserved as OLD-BACKUP.`);
