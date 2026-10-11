# Morteva payment connection

The Worker integrates with a replaceable PayRam server. Browser bags contain only product IDs and quantities. The Worker reads the checked-in catalog, validates availability, computes USD cents, stores an immutable order snapshot in the dedicated SHOP_ORDERS D1 database, and creates a USDC/Base payment with the order ID as invoiceID. No shop records are written into the shared CMS database.

Set Worker secrets PAYRAM_BASE_URL (HTTPS origin only), PAYRAM_API_KEY and PAYRAM_GATEWAY_KEY. The gateway key authorizes server calls through the local public proxy; only an allowlist of customer checkout routes is exposed without it. Public requests have authentication cookies and Authorization stripped. The admin interface stays on localhost port 8089. Set SHOP_CHECKOUT_ENABLED=true only after the mainnet wallet, consolidation and public checkout have been verified. Without these, checkout remains disabled. API keys must never appear in public assets or Git.

Register https://morteva.com/api/shop/webhook in PayRam. The Worker requires X-Payram-Signature HMAC authentication and verifies the payment's reference, invoice, USD amount and actual state against the authenticated PayRam API. It does not trust webhook status claims alone. Paid orders cannot be downgraded by a delayed event. Customer payment checks also reconcile the authenticated API, allowing recovery from missed webhooks.

Checkout request IDs prevent a double click or retry from creating another payment. Ambiguous creation failures enter REVIEW rather than issuing a second invoice. Resolve those against PayRam before retrying. Public order status requires the random order ID and exposes only payment state and total, not email or line items. Each client is limited to 20 new orders per hour, using a one-way keyed IP hash. Order emails and snapshots are private D1 runtime data, not Git source.

Apply migrations with wrangler d1 migrations apply SHOP_ORDERS --remote. Preserve both the orders database and PayRam's PostgreSQL data/AES key across updates. A mainnet PayRam instance must use a different data directory and encryption key from the test instance. The local test deployment at port 8088 remains separate from mainnet at port 8089.

The catalog stays empty until the owner adds actual products. This integration records payment orders; it does not invent shipping charges, tax rules, inventory guarantees, delivery workflows or provider acceptance. Configure any required fulfillment before offering the corresponding products. Card availability is controlled by PayRam's live payment options and underlying provider eligibility; test crypto payment success does not establish card acceptance or privacy in disputes.

Release through the existing GitHub main and guarded deployment workflow. Keep NEWSLETTER and all existing site routes intact.
