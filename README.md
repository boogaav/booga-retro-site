# booga.me

Personal site of Andriy (BOOGA) Bugayevskyy — career, media, and builder work
plotted as a minimal math diagram. Physicist (MSc), ecosystem operator.

Live at **https://booga.me/** via GitHub Pages (`main` branch, root).

## Structure

- `index.html` — the whole site. No build step, no dependencies. Open it directly.
- `previews.js` — hover-preview screenshots, embedded as WebP data URIs.
- `CNAME` — custom domain binding. **Do not delete** or the domain detaches on push.

## The diagram

Three series, switched by the tabs above the plot. In every one, `x` is time and each
project is a piecewise segment: closed dots at both ends, an arrow where it is ongoing.
Clicking a segment expands its card; hovering shows a preview.

| Series  | `y` axis            | From |
|---------|---------------------|------|
| Career  | scope of ownership  | 2017 |
| Media   | format              | 2023 |
| Builder | domain              | 2021 |

Pulsing accent dots on the Career plot mark the milestones.

## Previous site

The retro CRT terminal site that lived here until July 2026 is preserved in the git
history — `git show 44a2ceb:index.html` restores it.
