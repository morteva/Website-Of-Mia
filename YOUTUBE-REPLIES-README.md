# My Best uTube Replies

Current page: https://morteva.com/youtube-replies

Editable page source: `public/youtube-replies.html`.
Shared styling: `public/styles.css`.
Original screenshot assets: `public/images/youtube-replies/`.

## Page structure

- Keep the site's existing navigation, background, shared Content cards and footer.
- The page heading is half the site's normal intro heading size, using `.youtube-replies-intro h1`.
- The italic quote is centered above the table and aligned with its 880px maximum width. Keep its quotation marks and current wording unchanged unless Mia requests a change.
- Between the quote and pictures, keep the small, bold, centered red notice: “Over 2,000+ comments coming soon once my google package is ready.”
- Entries use a single-column HTML table, with one bordered box per row.
- Put every picture entry first, newest additions above older pictures.
- Put direct text entries after all picture entries, newest additions above older text entries.
- Entry numbers stay attached to their entries: first entry is 1, second is 2, and so on. Do not renumber older entries when adding a new one.
- Picture rows have a tiny `[in reply to this youtube vid]` caption above the screenshot. Link only “youtube vid” to that entry's supplied YouTube URL; do not display the raw URL. External links open a new tab.
- Preserve uploaded screenshots as supplied. Images scale down to fit the box without cropping or distortion, retaining their actual aspect ratio.
- The two empty text boxes are intentional. Keep them, including their spacing, without visible placeholder words, numbers, “Newest” or “Oldest” labels. Populate them only when Mia supplies actual text. Do not publish invented replies.

## Adding entries

Add a picture row at the top of the first `tbody`; save its original asset in the screenshot folder and use its own video link, accurate dimensions and descriptive alt text.

Add a text row at the top of the second `tbody`, or fill an existing empty box when Mia requests it. Preserve Mia's supplied wording unless she asks for editing.

The Content card uses the matching pink exclusive-content design, with a smaller two-line title: “My Best” above “uTube Replies”. It appears in the shared Content section across the public pages and links to `/youtube-replies`. Its public content export is `public/cms-published/shared.json`.

## Publishing

Follow `AGENTS.md` and `DEPLOYMENT.md`: edit this canonical repo, review changes, run relevant checks, commit and push GitHub main, then use `npm run deploy`. Verify the live page and assets. GitHub must contain every site change so Mira Site Editor stays current. Keep this README in the repository, outside `public`, so it is maintenance documentation rather than a public page.
