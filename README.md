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

## SEO
- Domain: **https://gayratmotion.uz** — hard-coded in `index.html` (canonical, OG/Twitter, JSON-LD),
  `robots.txt`, `sitemap.xml`. If the domain changes: `grep -rl gayratmotion.uz . | xargs sed -i 's#gayratmotion.uz#NEW#g'`.
- OG image: `assets/og-2.jpg` (1200×630, semibold type + portrait). Rendered from an HTML template in the hero style; after changing
  it, bump the filename (e.g. `og-3.jpg`) so Telegram/Facebook refetch.
- JSON-LD: WebSite + Person + ProfessionalService (3 services). No ratings/reviews — add only real ones.
- `_headers` (Cloudflare Pages): security headers + cache (assets 7 days, css/js 1 day). `404.html` is served automatically.
- Lighthouse (2026-09-24, local): SEO 100 · Accessibility 100 · Best Practices 100 · Performance 85
  (mobile throttling; the intro loader and Google Fonts are the main cost).

## Cache busting
`index.html` loads `css/style.css?v=<hash>` and `js/main.js?v=<hash>`. After editing CSS/JS run
`python bump.py` (a local `.git/hooks/pre-commit` does it automatically on commit — re-create the hook
on a fresh clone). Without it, returning visitors can see new HTML with old CSS (broken layout).
