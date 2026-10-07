# Security review — October 6, 2026

Authorized scope: morteva.com and thisisbeside.org, their canonical repositories and shared control-room backend. Live probes were small, unauthenticated, non-destructive requests. No brute-force login, load testing, real subscriber changes, email sends, production uploads, secret reads or data deletions were performed.

## Findings corrected

- Confirmed Beside subscribers' delivery preferences could previously be changed merely by submitting their email address. A mode change now sends a random, hashed, expiring confirmation token to that address. Existing preferences remain unchanged until the email link is used. Replay and incorrect tokens are rejected. The confirmation transaction checks the current token before updating.
- Login and contact limits previously checked counts separately from incrementing them. Parallel requests could pass the check together. Atomic SQL increments now enforce five login attempts per fifteen minutes and five contact submissions per hour per connection.
- Public newsletter/log subscriptions lacked connection-level throttling. They now share an atomic ten-request-per-fifteen-minute limit using a hashed Cloudflare connection IP. Existing subscribers and private data are preserved.
- Both Worker entry points now reject writes with a foreign Origin or cross-site browser request metadata. Existing CMS CSRF tokens remain required. Requests without browser Origin are still subject to authentication, CSRF and quotas.
- Non-upload request bodies have a 256 KiB actual-byte limit; CMS documents allow 4 MiB. Content-Length is not trusted alone. Uploads retain authentication, type signatures and the existing 95 MiB file limit; advertised upload requests above 100 MiB are refused without duplicating large upload buffers.
- All responses receive nosniff, HSTS, framing, referrer and permissions protections. HTML without an existing CSP receives object/base/framing restrictions. All control-room routes, including unauthorized previews, are explicitly non-cacheable. Same-origin draft iframe previews remain allowed; the control-room login's stronger existing CSP remains intact.
- Updated development tools and locked patched sharp/source-map-js dependencies. Removed the unused Cloudflare Vitest worker pool, which had retained obsolete dependencies. Both complete lockfile vulnerability audits returned zero known advisories after updating.

## Verification and code review

- Beside: TypeScript compilation and 61 tests passed, including parallel login throttling, signup rejection without emails/storage, mode changes requiring confirmation, token replay, signed sessions, CSRF, private uploads, subscriber filtering, GitHub export and email delivery behavior.
- Morteva: six tests passed, including body-size/origin guards, private caching, preview framing and preserved source/backend routing.
- Live pre-fix checks: private subscriber/document/GitHub APIs and draft previews returned 401 without a session; old admin routes and .git/.env probes did not expose content; public roots returned 200.
- Reviewed active Worker routing, authentication, newsletter subscriptions, contact forms, CMS validation/escaping, media access, parameterized SQL, subscriber exports and GitHub credential encryption. Common token/private-key pattern scan found no matches in source/public/migrations/scripts; it is not a complete secret-history audit.
- Each repository's source is committed and pushed before guarded deployment. Shared backend must deploy before Morteva. Post-deployment live checks should confirm both domains reject cross-site writes, retain private API denial, serve the normal pages and deliver the new security headers.

## Limits

This is a scoped code review and application security test, not proof of zero vulnerabilities. Distributed abuse can evade per-IP quotas. There is no full Cloudflare account/IAM, DNS, GitHub account, historical-secret, third-party service, load or authenticated browser penetration audit in this review. CSP intentionally does not impose a new strict script allowlist on existing inline-script pages. Signed sessions remain valid until their thirty-minute expiry if copied; signing-key rotation is the existing revocation mechanism. Future changes require renewed testing and dependency audits.

## Post-deployment results

Both guarded deployments succeeded. The live sweep made 142 small requests, including all 118 sitemap pages across the two sites; all listed pages returned 200 after normal redirects. Both domains returned 403 for the foreign-origin write, 413 for the oversized login request, and 401 for a forged-session logout request. Private APIs/previews still returned 401; retired administration and .git/.env probes still returned 404. All checked routes carried the new framing, nosniff and HSTS headers. No production emails or subscriber changes were performed.

Released code: Beside d5dc83e71338709d2b3d94b4cee901320375a457 (Worker version 31797caa-8181-4637-9b8f-1d5949ccb34a); Morteva dade80e7edb2a0a14ad46815d7b12e1246865f88 (Worker version 4f063a8c-2de2-4663-853d-62d24a455136). Later audit-record-only commits do not change the deployed application or increment site progress.
