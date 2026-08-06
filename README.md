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
| Media   | format              | 2023 |
| Tools   | domain              | 2021 |

Pulsing accent dots on the Career plot mark the milestones.

Media has a second view, toggled at the right of the tab row. **Shelf** shows the
video projects as VHS cassettes — click one to play its trailer — and the books as
physical books, which preview on hover. Cover art comes from the real thing:
YouTube thumbnails for the shows, the printed cover for Jackie Chain Adventure.

## Share card

`og.png` is rendered from the live page itself, not mocked up. With the dev server
running, `node render-og.mjs` loads the site at a 1200x630 viewport, hides the
interactive furniture, fits the plot to the remaining height, and writes og.png.
Re-run it whenever the masthead or the career plot changes.

## Previous site

The retro CRT terminal site that lived here until July 2026 is preserved in the git
history — `git show 44a2ceb:index.html` restores it.
