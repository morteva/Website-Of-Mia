# Production source

GitHub main is the source for production Worker code, build scripts and assets. Run the repository checks, commit and push changes, then use `npm run deploy`. The release command refuses uncommitted source or a HEAD that differs from origin/main and uses only this repository's wrangler.jsonc. Do not release through the old emoji-site-release staging configurations.

The shared control room stores user-created drafts, published content, logs and subscriber records in Cloudflare D1. Original uploads are in R2. These persistent records are production data, separate from Git source, and must not be overwritten by a build or committed with credentials. cms-seed.json seeds missing documents only. Cloudflare secrets stay in Cloudflare, never in Git.

Morteva requires the NEWSLETTER service binding to the thisisbeside Worker. Deploy Beside first when changing the shared CMS interface. Both source repositories must retain their Worker configuration; a static-only Morteva release removes the control-room and newsletter routes.
