# Website-Of-Mia

Install with `npm ci`, build with `npm run build`, and deploy with `npm run deploy`.
Cloudflare's `npx wrangler deploy` uses the exact Wrangler version in the committed package and lock files. Its custom build generates the media manifests, verifies the mascot, and prepares `dist`.

Oversized public media fails the build so it cannot disappear from a successful release. The BDO animation is delivered as a lossless animated WebP; its original GIF is retained under `content/media-originals`.
