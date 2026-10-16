# Shop and PayRam architecture and audit

Audited October 15, 2026 by Mira. Source snapshots: Website-Of-Mia main 74fef18ed491f507fbb7b1d0b29c02284429014b; thisisbeside main 6f3d08c3b1273b345f2271cad3043437f128d41c. Live observations are dated evidence, not permanent health guarantees. This audit changed documentation only; no invoices, payments, refunds, fulfillment, secrets or production data were changed.

## Read before changing the shop

Use connected ONLINE GitHub. Read this document, PAYMENTS.md, DEPLOYMENT.md, both repositories' AGENTS.md and current source. Preserve newer work. Keep public source in GitHub; never replace runtime D1, R2, PayRam PostgreSQL, encryption keys or wallet state from a source checkout. Never put customer information, private drafts, receipt bearer IDs, credentials or paid files in Git.

A working payment page, enabled flag, passing mock test or historic paid receipt does not prove a new customer purchase succeeds. Distinguish source behavior, fresh live observations, historical handoff evidence and unverified assumptions.

## Components and ownership

| Component | Responsibility |
| --- | --- |
| morteva/Website-Of-Mia; Worker website-of-mia | Public shop/cart, checkout, payment reconciliation, receipts, paid download gate and owner order API |
| morteva/thisisbeside; Worker thisisbeside | Shared CMS login/session/CSRF, product drafts, media upload, validation and guarded GitHub publication |
| NEWSLETTER service binding | Morteva to shared Beside backend; its name is historical and includes CMS functions |
| SHOP_ORDERS D1: morteva-shop-orders | Immutable purchase snapshots, statuses, credit ledger and fulfillment |
| Shared Beside D1: thisisbeside-mailing-list | CMS documents, revisions, authentication and media records |
| SHOP_MEDIA / MEDIA R2: mira-site-media | Shared images and separately protected paid attachments |
| PayRam + PostgreSQL | Invoices, chain monitoring, deposit addresses, payment options and collection/sweep state |
| pay.morteva.com | Public payment frontend and narrowly exposed customer API through tunnel/proxy |

The shop is on morteva.com. The shared CMS backend being in thisisbeside does not make Beside's repository the public shop catalog source.

## Owner products and publication

Open /wmm4?section=shop. Product editor: name, description, USD cents, image, physical/digital/service kind, availability, per-unit shipping, allowed country codes and manual tax basis points. Hide and Trash are reversible. Availability is a boolean; there is no finite stock reservation.

Save draft writes the shared CMS document with optimistic revision checks. Publish items first saves and validates, then exports the visible public catalog to Website-Of-Mia public/shop-catalog.json and editable public/cms-published/shop.json. Publication uses site leases, managed-file hashes, immutable Git heads and a guarded atomic commit, preserving unrelated changes. Cloudflare subsequently builds from GitHub; a saved draft alone is not published.

Visible items require valid IDs, names and positive prices. Physical products need allowed two-letter country codes. Published digital products must reference an uploaded object marked paidDelivery=true. Images use validated CMS media IDs. Upload validation checks type/content and size; current upload cap is approximately 95 MB. Catalog max is 1000 items. Monetary fields are integer cents; tax basis points range 0..10000.

Paid uploads use delivery=paid, R2 custom metadata and a CMS media record. Anonymous /cms-media access must deny paid objects even if a database public flag is mistakenly set. Owner previews require authentication and no-store. Never convert a paid object into an ordinary public asset.

## Buyer checkout

/shop currently is noindex and intentionally has no public navigation entry. Browser search and cart use the published catalog. Local storage remembers the bag, one pending checkout and the last receipt; it is not an account or complete order history.

/api/shop/config checks the enable flag, bindings, key and HTTPS base URL configuration. It does not test provider health.

POST /api/shop/checkout accepts a UUID request ID, email, product IDs/quantities and optional buyer note/address. Server reads its own catalog and computes all prices, tax and shipping. Never trust browser totals. Limits: 50 distinct lines, quantity 1..99, total at most 100000000 cents; 20 new orders per IP hash per hour. IP hash is one-way and salted with provider key.

Physical shipping is per item quantity. Every physical item must allow the selected country. Name, line1, city, postal code and country are required. Tax is rounded per product line from subtotal and basis points; shipping is not taxed. This is manual tax configuration, not jurisdiction determination.

An immutable snapshot stores product identity/name/kind/unit price/quantity, digital object reference, address, note and subtotal/shipping/tax/total in orders D1. Editing or deleting a catalog item later does not rewrite the purchase.

Request UUID is the idempotency key. Reusing it requires matching email, priced lines, address and note; an existing checkout is reused and an in-flight request returns conflict. The browser also blocks double submission.

The Worker records CREATING before PayRam POST /api/v1/payment. It uses API-Key and the private gateway header, customerID/invoiceID equal to order UUID, USD total, requested USDC on BASE, a 15-second timeout and no redirects. Response must include a valid reference UUID and HTTPS /payments checkout URL on the configured origin with matching reference. Success becomes OPEN. An ambiguous failure becomes REVIEW: reconcile with the provider before retrying; do not blindly create another invoice.

The checkout's requested USDC/BASE does not prove all buyer rails settle as USDC: the historical real test settled in Base ETH. PayRam's current frontend includes wallet, exchange/bridge and card/onramp choices driven by provider options; availability, KYC, fees and settlement vary by configuration/provider. Do not promise every displayed rail works.

## Payment verification and additional deposits

Webhook POST /api/shop/webhook verifies HMAC-SHA256 over the exact raw body using the project API key and X-Payram-Signature sha256=<hex>. Status claims in the webhook are not trusted. The Worker retrieves /api/v1/payment/reference/{reference} with authentication and verifies identity and requested amount.

Only FILLED and OVER_FILLED count as paid. OPEN, CREATING, REVIEW, CANCELLED and PARTIALLY_FILLED do not release files. USD accounting uses integer millionths, not floating-point sums. Already-paid orders cannot be downgraded by delayed events.

PayRam additional deposits can create separate system invoice references while the original remains PARTIALLY_FILLED. The local credit ledger is essential. Additional credit requires matching original order/customer, provider project, amount, BASE network, supported currency, deposit address and required confirmations. Reference IDs are unique; repeated notifications cannot double-credit or lower the accepted amount. Original verified amount plus verified extra credits determines FILLED/OVER_FILLED.

A partial original PayRam invoice with a paid shop order can therefore be correct. Never overwrite the shop status merely to copy the original invoice status. Conversely, never fabricate paid state or credit from a customer's screenshot.

GET order refreshes an unpaid stale order against the original reference, with a ten-second refresh interval. Already-paid orders return stored status. Missed extra-reference webhooks are not discovered by polling only the original invoice; recovery needs verified extra-reference reconciliation/replay. There is no scheduled shop reconciliation in the shared every-minute cron.

## Receipt, downloads and fulfillment

The buyer manually checks payment and refreshes receipt status; there is no automatic receipt email. On confirmed payment, the matching cart is cleared and receipt saved locally.

Public order responses expose limited status/total and, only after payment, fulfillment/tracking/customer delivery note/download links. They exclude email, address, private owner notes and raw storage IDs. UUID receipt links are bearer secrets without expiry or customer login. Anyone possessing one can access that receipt's permitted data/files.

GET /api/shop/orders/{order}/download/{product} requires a stored paid order, digital line in its immutable snapshot and private paid-delivery R2 metadata. It streams an attachment with no-store, not a public redirect. Current route also requires configured provider credentials but does not re-query paid status. It has no dedicated download expiry, range support or automatic refund revocation.

Owner /wmm4?section=orders uses /api/shop/admin/orders. Authentication and CSRF are checked with Beside /wmm4/api/shop-auth. Orders paginate 100 at a time and exclude empty-line diagnostic records. Updates use fulfillment_revision guards and support pending/processing/shipped/completed, HTTPS tracking, customer delivery note and private owner notes. Unpaid orders cannot be marked fulfilled. Fulfillment changes cannot mark payment paid.

No implemented automatic refunds, subscriptions, inventory reservation, shipping quotes/labels, customer accounts, automatic order email, or tax jurisdiction engine. A refund performed elsewhere does not automatically revoke paid access. There is no owner REVIEW-resolution UI in the audited implementation.

## PayRam host and backups

October 11 handoff records PayRam 3.9 in mainnet container morteva-payram-mainnet inside the VM named Morteva PayRam Test. The name is misleading: it hosts mainnet alongside a separate test instance. Mainnet is loopback port 8089, test 8088; proxy and tunnel expose pay.morteva.com. This depends on Mia's PC, power, connectivity, VM and tunnel. It is not independent always-on hosting.

Keep setup wallet, fee-paying hot wallet, smart-contract collection wallet and receiving wallet roles distinct. Handoff collection settings were 2.5% operator fee, ETH minimum 0.00001 / 5-minute wait and USDC minimum 1 / 60-minute wait. These are historical settings, not freshly verified balances or current configuration. Never change wallets, fees, networks, collection or transfer funds during a documentation audit.

The Windows task starts the VM if needed, runs a guest PostgreSQL/config backup, copies the archive out, encrypts it with Windows DPAPI CurrentUser and removes the plaintext after encryption. It runs at logon and daily 03:00 with StartWhenAvailable, without WakeToRun. Restoring needs the account's DPAPI keys. This is not a complete backup of orders D1, shared CMS D1, R2, wallet recovery material or the entire VM. A restore has not been verified in this audit.

## Fresh observations and limits

- /shop and /shop-catalog.json returned 200. Published USD catalog contained 0 products. Checkout configuration reported enabled.
- Anonymous owner orders and shared shop-auth returned 401. Payment frontend returned 200; public root returned 404.
- Authenticated provider read of the historical real 10-cent Base ETH invoice returned PARTIALLY_FILLED: 0.098084 USD, 30/30 confirmations. The shop receipt reported OVER_FILLED, consistent with handoff's separate 0.004903 extra credit and total 0.102987. This confirms the known split-reference behavior, not a new purchase.
- Public customer reference and payment-options GET endpoints returned 200 without merchant credentials. The local saved proxy file had a narrower allowlist, so it is stale and must NOT be treated as proof of active routing or redeployed blindly.
- VM was running; host mainnet and test HTTP ports responded. Guest-control execution failed because the guest execution service was not ready. Read-only SSH with the existing stored credential also failed authentication. Current container version, private wallet settings and active proxy configuration could not be freshly inspected.
- Backup task's last run on October 15 at 10:04:50 returned 1. Newest encrypted archive observed was October 14 at 03:00:02. Guest-control failure blocks the backup script. Backup health is an unresolved issue, not a successful check.
- Ran the three existing Website-Of-Mia shop test files from the pinned online sources in an isolated temporary fixture: 13 passed, 0 failed. They use fake provider/storage plus in-memory SQLite. They cover payment signature/underpayment/additional credits, idempotency, server totals, owner auth/revisions, private downloads and cart behavior.
- No new real payment, full customer card checkout, real product download, physical shipping or restore test was performed. Historical ETH funding/collection does not prove card purchase or USDC product delivery. Production customer databases and private paid objects were not bulk-read.

## Files to follow and checks before claiming success

Website-Of-Mia: src/shop.ts, src/shop-admin.ts, src/worker.ts, public/shop.js, public/shop-admin.js, public/receipt.js, public/shop.html, public/cms-admin.html, public/shop-catalog.json, migrations/shop/0001_orders.sql through 0003_fulfillment.sql; tests shop.test.mjs, shop-payments.test.mjs and shop-management.test.mjs.

thisisbeside: src/shop-catalog.ts, src/cms.ts, src/github-sync.ts, wrangler.jsonc; test/shop-catalog.test.mjs. Inspect GitHub publication guards whenever changing exports.

For source changes run relevant tests and build; verify deployed GitHub commit and exact live files. For payment changes separately verify provider authentication, raw signed webhook, duplicate/additional credit handling and failure recovery. For delivery changes verify anonymous denial and paid-order streaming. Test without charging or moving funds unless Mia explicitly authorizes the transaction. Check backup age AND task result, and require an actual restore check before claiming recoverability.

Official API contract references: [PayRam payment status](https://docs.payram.com/api-integration/payments-api/payment-status), [create payment](https://docs.payram.com/api-integration/payments-api/create-payment), [PayRam official WooCommerce integration](https://github.com/PayRam/payram-woocommerce). Installed-version behavior and audited application code take precedence over assuming latest documentation applies.
