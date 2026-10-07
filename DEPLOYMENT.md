# Production source

GitHub main is the source for production Worker code, build scripts and assets. Run the repository checks, commit and push changes, then use `npm run deploy`. The release command refuses uncommitted source or a HEAD that differs from origin/main and uses only this repository's wrangler.jsonc. Do not release through the old emoji-site-release staging configurations.

The shared control room stores user-created drafts, published content, logs and subscriber records in Cloudflare D1. Original uploads are in R2. These persistent records are production data, separate from Git source, and must not be overwritten by a build or committed with credentials. cms-seed.json seeds missing documents only. Cloudflare secrets stay in Cloudflare, never in Git.

Morteva requires the NEWSLETTER service binding to the thisisbeside Worker. Deploy Beside first when changing the shared CMS interface. Both source repositories must retain their Worker configuration; a static-only Morteva release removes the control-room and newsletter routes.

Deployment validates checked-in public files and serves them unchanged. It does not regenerate page content, assign palettes, replace headers/footers or restore archived Beta pages. Historical generation scripts are maintenance tools only and must never be put back into the deployment command. Deliberate maintenance changes must be reviewed and committed before release. CMS content is applied only when explicitly published from the control room.

Control-room public source synchronization is described in [GITHUB-SYNC.md](GITHUB-SYNC.md). Complete its private fine-grained token connection before publishing new CMS content. Public exports go to GitHub; credentials, drafts and subscriber records do not.

Site progress starts at 52% at commit 8156ec010e5dc61b411fd6e6ce4e86e6726b24ca. Each subsequent non-merge commit changing public assets, Worker code, build scripts or deployment/package configuration adds 0.1%, capped at 100%. A multi-file edit counts once; repeat deployments and documentation-only commits do not count. The build derives dist/site-progress.json from Git history without modifying checked-in source. Shallow Cloudflare/editor clones fetch full history before counting. Preserve the baseline history; never reset the counter or use a local browser counter. All pages with the progress label load site-progress.js to render the red bar and current percentage.
