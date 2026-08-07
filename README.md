# booga.me

Personal site of BOOGA — career, media, and tools
plotted as a minimal math diagram. Physicist (MSc), ecosystem operator.

Live at **https://booga.me/** via GitHub Pages (`main` branch, root).

## Structure

- `index.html` — the whole site. No build step, no dependencies. Open it directly.
- `previews.js` — hover-preview screenshots and shelf cover art, embedded as WebP data URIs
  (`window.PREVIEWS` and `window.COVERS`).
- `portrait.webp`, `og.png` — portrait and the social share card (1200x630).
- `CNAME` — custom domain binding. **Do not delete** or the domain detaches on push.

## The diagram

Three series, switched by the tabs above the plot. In every one, `x` is time and each
project is a piecewise segment: closed dots at both ends, an arrow where it is ongoing.
Clicking a segment expands its card; hovering shows a preview.

| Series  | `y` axis            | From |
|---------|---------------------|------|
| Career  | scope of ownership  | 2017 |
| Media   | *(shelf, not plotted)* | —    |
| Tools   | *(bench, not plotted)* | —    |

Pulsing accent dots on the Career plot mark the milestones.

**Tools is a bench, not a plot**: each app sits on an old laptop screen showing a
real screenshot of it running, and links out. Screens live in `window.SCREENS`.

**Media is the landing view and is a shelf, not a plot**: the video projects are
VHS cassettes — click one to play its trailer and reach its links — and the books
are physical books that preview on hover and link out, and the AI-made videos are film
strips that open their trailer (YouTube inline, Instagram via its own embed). Cover art comes from the
real thing: YouTube thumbnails for the shows, the printed cover for Jackie Chain
Adventure. Career and Tools are plotted as described above.

## Share card

`og.png` is rendered from the live page itself, not mocked up. With the dev server
running, `node render-og.mjs` loads the site at a 1200x630 viewport, hides the
interactive furniture, fits the plot to the remaining height, and writes og.png.
Re-run it whenever the masthead or the career plot changes.

## Previous site

The retro CRT terminal site that lived here until July 2026 is preserved in the git
history — `git show 44a2ceb:index.html` restores it.
