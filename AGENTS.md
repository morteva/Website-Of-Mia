# Site source and Mira Site Editor

The user requires GitHub to remain updated with every site change because the Mira Site Editor reads these repositories. This is a standing requirement, not an optional release step.

- Make changes in this canonical repository. Preserve newer changes from other work.
- Include all changed source, content, assets, build scripts, Worker routes and configuration needed to reproduce the site. Never deploy from an independent staging directory.
- Run relevant checks and builds, review the resulting changes, commit and push to GitHub main before releasing. Reconcile remote changes without force-pushing or discarding work.
- Use the guarded repository deployment command. Verify GitHub contains the final changes before reporting completion. If a push fails, report the failure explicitly; do not claim the task is complete.
- Changes made through the Mira Site Editor must also be persisted in GitHub. A live-only change is not a complete site change.
- Keep credentials, authenticator secrets, subscriber information and private drafts out of Git. D1 and R2 contain runtime data; do not overwrite them during a source synchronization. If an authorized public-content change is made directly through the CMS, also reconcile its editable source or public-content export with GitHub so the editor cannot restore stale content. Do not claim automatic CMS-to-GitHub synchronization unless it has been implemented and verified.

See DEPLOYMENT.md for the shared Worker and runtime-data requirements.

## MySpace Mia freshness rules

Standing instruction from Mia, October 14, 2026. Preserve these rules whenever changing the thought pool, widget, loaders, caching or deployment.

- The source pool is public/myspace-mia-thoughts.json. Preserve Mia's supplied text verbatim unless she requests edits. Keep total equal to lines.length and update the pool version when its contents change.
- The widget in public/mia-pet.js must request the current pool with cache: 'no-store' and a fresh request URL. Never restore force-cache, a fixed dated pool URL, or one-time loading that leaves open tabs using old lines indefinitely.
- Refresh at least every 60 seconds while the page is visible, when the window regains focus, when the tab becomes visible, and before clicking or restoring MySpace Mia selects a line. Keep concurrent requests coordinated.
- When the pool changes, prune removed lines from seen history and replace a currently displayed line if it no longer exists. Preserve the user's hidden state. On a transient fetch failure, retain the last valid pool and allow later refreshes to recover; never replace it with invalid or empty data.
- Keep the pool response Cache-Control: no-store in public/_headers. Keep the widget script revalidated, and change the widget loader version in public/orbs.js when widget code changes so a reload loads the new code.
- Verify the Cloudflare build and deployed commit, the exact pool URL requested by the widget, cache headers, open-tab refresh behavior, and the actual displayed bubble. A correct live JSON file alone is not proof that the displayed widget updated.
- Preserve and run test/myspace-freshness.test.mjs when these paths change. It covers fresh requests, exact displayed text, open-tab refresh, click refresh, hidden state and recovery after a failed request. Use a real-browser regression check for changes affecting displayed behavior.
- A tab already running old widget code may need one reload when shipping a widget-code fix. Subsequent pool-only updates must refresh through the rules above without requiring another manual reload, once deployment completes and the network is available.

## Shop and PayRam

Before shop, payment, paid media, fulfillment or backup work, read [SHOP-ARCHITECTURE.md](SHOP-ARCHITECTURE.md), PAYMENTS.md and current source in both online repositories. It records the complete source flow, live audit, historical setup and unverified gaps. Update it when verified behavior changes.

- Use connected online GitHub. Preserve both D1 databases, private R2, PayRam PostgreSQL/encryption keys and wallet state. Never publish secrets, customer details, private receipt IDs or paid files.
- Keep server-side pricing, immutable orders, checkout idempotency, raw webhook HMAC, authenticated provider verification and duplicate-safe additional-deposit credits. An original partial PayRam invoice can legitimately have a paid combined-credit shop order.
- Ambiguous invoice creation requires reconciliation before retry. Never fabricate paid state. Paid downloads require paid-order and private-object checks.
- Check the running service rather than assuming a saved local proxy configuration is current. Check backup age and task result. Enabled flags, mock tests and historical receipts do not prove a new purchase, card checkout, delivery or recoverable backup.
- Documentation audits authorize no transfers, refunds, wallet changes or production-data edits. Record unresolved access and verification limits honestly.

## Private login design

Mia deliberately leaves the /wmm4 login field labels, remember-PC checkbox text and submit-button text blank. Preserve that design. Do not add visible password/authenticator labels, login instructions or button text during accessibility, usability or bug audits unless Mia explicitly requests them.
