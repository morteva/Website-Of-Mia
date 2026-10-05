# Control room publications

/wmm4 → GitHub main → existing Cloudflare Workers Builds → live.

Connect GitHub under the private control room's **GitHub sync** section. Create a fine-grained token owned by morteva, limited to thisisbeside and Website-Of-Mia, with repository Contents: read and write. Do not use the broad GitHub CLI OAuth credential. The token is encrypted with AES-GCM in D1 using a key derived from the existing Cloudflare session secret, never returned by an API, logged, or committed. Renew expiring tokens in this same screen.

Connection first exports existing published records to public/cms-published/*.json without rewriting any existing HTML. Drafts, hidden/trashed bodies, subscriber records, support messages, submission identifiers, and credentials are excluded. Original uploads remain in R2; published source contains their stable public URLs. Podcast recordings and large downloads are not copied into Git blobs.

Each later Publish reads one immutable GitHub main revision, renders the selected section into that revision's public HTML, and creates one commit containing its page changes and public content export. New pages and hidden page removals travel in that same commit. Shared navigation updates preserve unrelated page content and existing theme classes. Git updates use force:false. Another GitHub commit arriving during publication stops the publication rather than overwriting it. Site-level leases also stop simultaneous CMS publications and draft saves during publication.

Public exports track the expected hashes of managed files. If the Site Editor changes a managed page afterward, publishing that CMS section stops with a conflict message. Reconcile the edited source and CMS draft before republishing; there is no automatic merge of arbitrary HTML into CMS fields. Changes from another CMS section update the affected baseline hashes. No static source generators run during a build.

Once a section has a GitHub commit recorded, its legacy D1 HTML overrides stop. The public page therefore changes through Cloudflare's normal deployment of Git source; later Site Editor changes remain authoritative. The publish response names the Git commit and says deployment is pending, rather than claiming the page is already live.

Logs remain add-only in D1. The public body, number and date are copied to public/mia-logs.json and public/mia-logs.html in the Beside repository, and the Journal chooser uses that checked-in HTML. Adding a log returns its separate GitHub sync outcome. A failed log sync preserves the saved log and retries on the existing once-per-minute scheduled job. This does not send duplicate subscriber emails. Newsletters, inbox status and private drafts are runtime records, not public repository content.

GITHUB_SYNC_REQUIRED=true prevents a new content publication without GitHub access. Missing/expired credentials and failed/conflicting commits leave drafts saved and expose a clear error. A successful Git commit followed by a database failure can be retried without making an identical second commit. GitHub/Cloudflare deployment failures should be inspected in their existing build checks; a Git commit alone is not proof of a completed live deployment.

Verification includes isolated GitHub API tests for encryption, authentication, concurrent updates, no-op retries, unrelated file preservation, and stale editor conflicts; native workerd HTML exports for all CMS content sections; and the existing control-room, form, and nonmutating deployment tests. Actual production GitHub publication requires completing the token connection and verifying its resulting Cloudflare build.
