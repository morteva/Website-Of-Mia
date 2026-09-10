// Restore Mia's exact uploaded PNG from verified binary parts. No image processing.
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const publicDir = new URL('../public/', import.meta.url);
const sourceDir = new URL('../content/tiny-mia-static/', import.meta.url);
const expectedHash = 'fb5b1cce92b1f8063ee96ef285aebdb96e10b79e3bc89ceb3a45864210bec372';
const release = 'tiny-static-20260910-r2';
const parts = await Promise.all(Array.from({ length: 11 }, (_, index) =>
  readFile(new URL(`part-${String(index + 1).padStart(2, '0')}.bin`, sourceDir))
));
const image = Buffer.concat(parts);
if (image.length !== 25929 || createHash('sha256').update(image).digest('hex') !== expectedHash) {
  throw new Error('Tiny Mia original image checksum mismatch; refusing to publish altered artwork.');
}

const petPath = new URL('mia-pet.js', publicDir);
const orbsPath = new URL('orbs.js', publicDir);
const [pet, orbs] = await Promise.all([readFile(petPath, 'utf8'), readFile(orbsPath, 'utf8')]);
const imageAssignment = /img\.src = asset\('tiny-mia-static\.png(?:\?[^']*)?'\);/;
const petLoader = /script\.src = '\/mia-pet\.js(?:\?[^']*)?';/;
if (!imageAssignment.test(pet) || !petLoader.test(orbs)) {
  throw new Error('Tiny Mia image or loader reference changed; refusing silent build drift.');
}
const updatedPet = pet.replace(imageAssignment, `img.src = asset('tiny-mia-static.png?v=${expectedHash.slice(0, 12)}');`);
const updatedOrbs = orbs.replace(petLoader, `script.src = '/mia-pet.js?v=${release}';`);
const htmlFiles = (await readdir(publicDir)).filter(name => name.endsWith('.html'));
const pages = await Promise.all(htmlFiles.map(async name => {
  const path = new URL(name, publicDir);
  const source = await readFile(path, 'utf8');
  return { path, source, updated: source.replace(/\/orbs\.js(?:\?[^"'<>\s]*)?/g, `/orbs.js?v=${release}`) };
}));

await writeFile(new URL('tiny-mia-static.png', publicDir), image);
if (updatedPet !== pet) await writeFile(petPath, updatedPet);
if (updatedOrbs !== orbs) await writeFile(orbsPath, updatedOrbs);
for (const page of pages) {
  if (page.updated !== page.source) await writeFile(page.path, page.updated);
}
console.log(`Tiny Mia: original 128x128 PNG restored and SHA-256 verified (${expectedHash}); static corner and thought pool preserved.`);
