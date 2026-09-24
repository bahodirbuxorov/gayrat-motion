# gayrat.motion — brand site

Static one-page site for Gʻayratjon (motion designer / video editor). No build step.

```bash
python -m http.server 5510   # open http://127.0.0.1:5510
```

## Structure
- `index.html` — all sections (hero, marquee, showreel, works, services, process, about, contact)
- `css/style.css` — design tokens (palette `#F2F2F2 #EAE4D5 #B6B09F #000`), Montserrat
- `js/main.js` — loader, reveal, cursor, hero canvas, scroll effects, lightbox
- Lenis (smooth scroll) from jsDelivr with SRI; the site works without it

## Adding real media
- **Showreel:** put the file at `assets/showreel.mp4`. Until it exists, the lightbox shows an Instagram fallback.
- **Works:** add `data-video="assets/works/01.mp4"` (optional `data-poster="…jpg"`) to a `.card` in `index.html`.
  The video replaces the CSS motion placeholder and plays on hover. Update the card title/meta too —
  current titles are placeholders.

## Motion notes
- Text reveal is ported from the Slides 4 framework (themewagon *slides-portfolio*): `.ae-1…10` inside a
  `.reveal` container, 50px rise, `cubic-bezier(.25,.1,.2,1)`, .8s, 150ms stagger; replays on re-entry.
- Cursor follows rico.supply: spring dot → pill with the label from `data-cursor="…"`;
  `data-theme="dark|light"` on an ancestor sets its colour. Only on fine pointers.
- Outline text uses `paint-order: stroke fill` with a background-coloured fill (`--fill`) to hide
  Montserrat variable-font contour overlaps — set `--fill` when placing outline text on a new background.
- `prefers-reduced-motion` disables animation; sticky scroll scenes fall back to plain layout below 861px.
