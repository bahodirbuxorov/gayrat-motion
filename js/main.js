/* gayrat.motion — interactions */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const pad = n => String(n).padStart(2, '0');

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const desktopMq = matchMedia('(min-width: 861px)');

  const root = document.documentElement;
  const body = document.body;
  let vw = innerWidth, vh = innerHeight;

  // 24fps timecode HH:MM:SS:FF
  const timecode = frames => {
    const f = frames % 24, s = Math.floor(frames / 24);
    return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}:${pad(f)}`;
  };

  /* ---------------------------------------------------------
     Smooth scroll (Lenis, optional)
     --------------------------------------------------------- */
  let lenis = null;
  if (window.Lenis && !reduce) {
    lenis = new window.Lenis({ lerp: .09, smoothWheel: true, wheelMultiplier: 1 });
  }
  const lockScroll = on => {
    if (lenis) on ? lenis.stop() : lenis.start();
    else body.style.overflow = on ? 'hidden' : '';
  };
  const scrollToEl = el => {
    if (lenis) lenis.scrollTo(el, { duration: 1.4, easing: t => 1 - Math.pow(1 - t, 4) });
    else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  };

  /* ---------------------------------------------------------
     Reveal — Slides-style: container gets .is-in when it enters,
     loses it when fully out, so the text animation replays.
     --------------------------------------------------------- */
  const reveals = $$('.reveal').filter(el => el.id !== 'menu');
  let revealReady = false;

  const enterIO = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting && revealReady) e.target.classList.add('is-in'); });
  }, { rootMargin: '0px 0px -12% 0px' });

  const leaveIO = new IntersectionObserver(entries => {
    entries.forEach(e => { if (!e.isIntersecting) e.target.classList.remove('is-in'); });
  });

  reveals.forEach(el => { enterIO.observe(el); leaveIO.observe(el); });

  const startReveals = () => {
    revealReady = true;
    reveals.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.top < vh * .88 && r.bottom > 0) el.classList.add('is-in');
    });
  };

  /* ---------------------------------------------------------
     Loader
     --------------------------------------------------------- */
  const loader = $('#loader');
  const runLoader = () => {
    body.classList.add('is-loading');
    lockScroll(true);
    const pct = $('#loaderPct'), bar = $('#loaderBar'), tc = $('#loaderTc');
    const dur = reduce ? 10 : 1700;
    const t0 = performance.now();
    let fontsDone = false;
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { fontsDone = true; });
    setTimeout(() => { fontsDone = true; }, 3000);

    const tick = now => {
      const t = clamp((now - t0) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      pct.textContent = Math.round(e * 100);
      bar.style.transform = `scaleX(${e})`;
      tc.textContent = timecode(Math.round(e * 48));
      if (t < 1 || !fontsDone) return requestAnimationFrame(tick);
      loader.classList.add('is-done');
      body.classList.remove('is-loading');
      lockScroll(false);
      measure();
      setTimeout(startReveals, reduce ? 0 : 350);
      setTimeout(() => loader.remove(), 1200);
    };
    requestAnimationFrame(tick);
  };

  /* ---------------------------------------------------------
     Cursor — spring dot that morphs into a labelled pill
     --------------------------------------------------------- */
  const cursor = $('#cursor');
  const cBody = $('.cursor__body', cursor);
  const cLabel = $('.cursor__label', cursor);
  const themed = $$('[data-theme]');
  const pointer = { x: -100, y: -100, seen: false };
  const cur = { x: -100, y: -100, vx: 0, vy: 0 };
  let cState = '', cText = '', cTheme = '', frame = 0;

  const setCursorState = (state, text = '') => {
    if (state === cState && text === cText) return;
    cState = state; cText = text;
    cursor.classList.toggle('is-link', state === 'link');
    cursor.classList.toggle('is-label', state === 'label');
    if (state === 'label') {
      cLabel.textContent = text;
      cursor.style.setProperty('--lw', `${Math.ceil(cLabel.scrollWidth) + 36}px`);
    }
  };

  const detectCursor = () => {
    const el = document.elementFromPoint(pointer.x, pointer.y);
    if (!el) return;
    const labelled = el.closest('[data-cursor]');
    if (labelled && labelled.dataset.cursor !== 'none') setCursorState('label', labelled.dataset.cursor);
    else if (!labelled && el.closest('a, button, [role="button"], label, video')) setCursorState('link');
    else setCursorState('');

    // theme: overlays are dark; otherwise the section under the pointer
    let theme = 'dark';
    if (!body.classList.contains('menu-open') && $('#lightbox').hidden) {
      const hit = el.closest('[data-theme]') || themed.find(s => {
        const r = s.getBoundingClientRect();
        return r.top <= pointer.y && r.bottom >= pointer.y && !s.hidden;
      });
      theme = hit ? hit.dataset.theme : 'dark';
    }
    if (theme !== cTheme) { cTheme = theme; cursor.classList.toggle('on-light', theme === 'light'); }
  };

  const updateCursor = () => {
    if (!pointer.seen) return;
    // spring
    cur.vx += (pointer.x - cur.x) * .2; cur.vy += (pointer.y - cur.y) * .2;
    cur.vx *= .6; cur.vy *= .6;
    cur.x += cur.vx; cur.y += cur.vy;
    cursor.style.transform = `translate3d(${cur.x}px, ${cur.y}px, 0)`;

    // squash & stretch along the direction of travel (text stays upright)
    const speed = Math.hypot(cur.vx, cur.vy);
    const k = Math.min(speed / 60, cState === 'label' ? .12 : .45);
    const a = Math.atan2(cur.vy, cur.vx);
    cBody.style.transform = `translate(-50%, -50%) rotate(${a}rad) scale(${1 + k}, ${1 - k * .6}) rotate(${-a}rad)`;

    if (++frame % 3 === 0) detectCursor();
  };

  if (finePointer) {
    root.classList.add('has-cursor');
    addEventListener('mousemove', e => {
      pointer.x = e.clientX; pointer.y = e.clientY;
      if (!pointer.seen) { pointer.seen = true; cur.x = pointer.x; cur.y = pointer.y; detectCursor(); }
      cursor.classList.add('is-visible');
    }, { passive: true });
    document.addEventListener('mouseleave', () => cursor.classList.remove('is-visible'));
    addEventListener('mousedown', () => cursor.classList.add('is-down'));
    addEventListener('mouseup', () => cursor.classList.remove('is-down'));

    // magnetic buttons
    $$('[data-magnetic]').forEach(el => {
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${dx * .28}px, ${dy * .38}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------------------------------------------------------
     Hero — graph-editor keyframe curves (canvas)
     --------------------------------------------------------- */
  const canvas = $('#curves');
  const ctx = canvas.getContext('2d');
  const hero = $('.hero');
  let heroVisible = true, cw = 0, ch = 0, dpr = 1;
  const heroMouse = { x: .5, y: .5, tx: .5, ty: .5 };

  const curves = Array.from({ length: 5 }, (_, i) => ({
    base: .22 + i * .14,
    amp: .05 + (i % 3) * .025,
    speed: .25 + i * .07,
    phase: i * 1.7,
    keys: 6 + (i % 2),
    hot: i === 2,
  }));

  const sizeCanvas = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    cw = hero.clientWidth; ch = hero.clientHeight;
    canvas.width = cw * dpr; canvas.height = ch * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const diamond = (x, y, s, fill) => {
    ctx.beginPath();
    ctx.moveTo(x, y - s); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s, y); ctx.closePath();
    fill ? ctx.fill() : ctx.stroke();
  };

  const drawCurves = t => {
    heroMouse.x += (heroMouse.tx - heroMouse.x) * .06;
    heroMouse.y += (heroMouse.ty - heroMouse.y) * .06;
    ctx.clearRect(0, 0, cw, ch);

    // graph grid
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(182,176,159,.06)';
    const step = Math.max(64, cw / 18);
    ctx.beginPath();
    for (let x = (t * 12) % step; x < cw; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, ch); }
    for (let y = 0; y < ch; y += step) { ctx.moveTo(0, y); ctx.lineTo(cw, y); }
    ctx.stroke();

    curves.forEach(c => {
      const pts = [];
      for (let i = 0; i < c.keys; i++) {
        const u = i / (c.keys - 1);
        const x = -40 + u * (cw + 80);
        const pull = Math.exp(-Math.pow((u - heroMouse.x) * 3.2, 2)) * (heroMouse.y - c.base) * .35;
        const y = (c.base + c.amp * Math.sin(t * c.speed + i * 1.25 + c.phase) + pull) * ch;
        pts.push([x, y]);
      }
      // easy-ease: flat tangents at every keyframe
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
        const d = (x1 - x0) * .42;
        ctx.bezierCurveTo(x0 + d, y0, x1 - d, y1, x1, y1);
      }
      ctx.lineWidth = c.hot ? 2 : 1.2;
      ctx.strokeStyle = c.hot ? 'rgba(234,228,213,.75)' : 'rgba(182,176,159,.22)';
      ctx.stroke();

      pts.forEach(([x, y], i) => {
        if (c.hot) {
          const d = (cw + 80) / (c.keys - 1) * .42;
          ctx.strokeStyle = 'rgba(234,228,213,.35)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(x - d * .6, y); ctx.lineTo(x + d * .6, y); ctx.stroke();
          ctx.fillStyle = 'rgba(234,228,213,.8)';
          ctx.beginPath(); ctx.arc(x - d * .6, y, 3, 0, 7); ctx.arc(x + d * .6, y, 3, 0, 7); ctx.fill();
          ctx.fillStyle = i % 2 ? '#EAE4D5' : '#B6B09F';
          diamond(x, y, 7, true);
        } else {
          ctx.strokeStyle = 'rgba(182,176,159,.35)'; ctx.lineWidth = 1;
          diamond(x, y, 4, false);
        }
      });
    });
  };

  new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; }).observe(hero);
  hero.addEventListener('mousemove', e => {
    heroMouse.tx = e.clientX / cw; heroMouse.ty = e.clientY / ch;
  }, { passive: true });

  /* ---------------------------------------------------------
     Scroll-driven sections
     --------------------------------------------------------- */
  const progressBar = $('#progress');
  const nav = $('#nav');
  const reel = $('#reel'), reelFrame = $('#reelFrame'), reelHead = $('.reel__head');
  const services = $('#services');
  const proc = $('#process'), tl = $('#timeline'), tracks = $('.tl__tracks'), clips = $$('.tl__clip');
  const playTc = $('#playTc'), playhead = $('#playhead');
  const marquee = $('#marquee');

  let mqWidth = 0, mqX = 0, mqDir = -1;
  let lastY = scrollY, navY = scrollY;

  const measure = () => {
    vw = innerWidth; vh = innerHeight;
    sizeCanvas();
    mqWidth = marquee.firstElementChild.offsetWidth;
    tl.style.setProperty('--tl-w', `${tracks.offsetWidth}px`);
  };

  const sectionProgress = el => {
    const r = el.getBoundingClientRect();
    return clamp(-r.top / Math.max(1, r.height - vh));
  };

  const onScroll = () => {
    const y = scrollY;
    const max = root.scrollHeight - vh;
    progressBar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;

    // nav hide on scroll-down
    if (!body.classList.contains('menu-open')) {
      if (y > navY + 8 && y > 240) { nav.classList.add('is-hidden'); navY = y; }
      else if (y < navY - 8 || y < 240) { nav.classList.remove('is-hidden'); navY = y; }
    }

    const desktop = desktopMq.matches && !reduce;

    // showreel zoom
    if (desktop) {
      const p = easeInOut(clamp(sectionProgress(reel) / .75));
      reelFrame.style.setProperty('--s', (.55 + .45 * p).toFixed(4));
      reelFrame.style.setProperty('--y', `${(12 * (1 - p)).toFixed(3)}%`);
      reelFrame.style.setProperty('--r', (28 * (1 - p)).toFixed(2));
      reelHead.style.opacity = clamp(1 - p * 2.2);
    } else {
      reelHead.style.opacity = '';
    }

    // process playhead
    if (desktop) {
      const p = clamp(sectionProgress(proc) * 1.15 - .05);
      tl.style.setProperty('--p', p.toFixed(4));
      playhead.classList.toggle('is-end', p > .82);
      playTc.textContent = timecode(Math.round(p * 24 * 24));
      clips.forEach(c => c.classList.toggle('is-on', p * 100 >= parseFloat(c.style.getPropertyValue('--s')) + 2));
    } else {
      clips.forEach(c => c.classList.add('is-on'));
    }
  };

  // marquee reacts to scroll velocity + direction
  const updateMarquee = vel => {
    if (reduce || !mqWidth) return;
    if (Math.abs(vel) > .5) mqDir = vel > 0 ? -1 : 1;
    mqX += (1.1 + Math.min(Math.abs(vel), 80) * .35) * mqDir;
    if (mqX <= -mqWidth) mqX += mqWidth;
    if (mqX > 0) mqX -= mqWidth;
    marquee.style.transform = `translate3d(${mqX}px, 0, 0)`;
  };

  /* ---------------------------------------------------------
     HUD timecode + clock
     --------------------------------------------------------- */
  const tcEl = $('#tc');
  const t0 = performance.now();
  const clockEl = $('#clock');
  const clockFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit', hour12: false });
  const tickClock = () => { clockEl.textContent = clockFmt.format(new Date()); };
  tickClock(); setInterval(tickClock, 10000);
  $('#year').textContent = new Date().getFullYear();

  /* ---------------------------------------------------------
     Main loop
     --------------------------------------------------------- */
  const loop = now => {
    if (lenis) lenis.raf(now);
    const y = scrollY, vel = y - lastY;
    lastY = y;

    onScroll();
    updateMarquee(vel);
    if (heroVisible && !reduce) drawCurves(now / 1000);
    if (heroVisible) tcEl.textContent = timecode(Math.floor((now - t0) / 1000 * 24));
    if (finePointer) updateCursor();
    requestAnimationFrame(loop);
  };

  /* ---------------------------------------------------------
     Menu
     --------------------------------------------------------- */
  const burger = $('#burger'), menu = $('#menu');
  const setMenu = open => {
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Menyuni yopish' : 'Menyuni ochish');
    body.classList.toggle('menu-open', open);
    lockScroll(open);
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('is-open', 'is-in')));
    } else {
      menu.classList.remove('is-open', 'is-in');
      setTimeout(() => { if (!body.classList.contains('menu-open')) menu.hidden = true; }, 700);
    }
  };
  burger.addEventListener('click', () => setMenu(!body.classList.contains('menu-open')));

  /* ---------------------------------------------------------
     Anchor links
     --------------------------------------------------------- */
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    const target = id === '#top' ? hero : $(id);
    if (!target) return;
    e.preventDefault();
    if (body.classList.contains('menu-open')) setMenu(false);
    scrollToEl(target);
  });

  /* ---------------------------------------------------------
     Lightbox (showreel + service videos)
     --------------------------------------------------------- */
  const lb = $('#lightbox'), lbVideo = $('#lbVideo'), lbEmpty = $('#lbEmpty'), lbClose = $('#lbClose');
  let lastFocus = null;
  const REEL_SRC = 'assets/showreel.mp4';

  const openReel = (src = REEL_SRC) => {
    lastFocus = document.activeElement;
    lb.hidden = false;
    lbEmpty.hidden = true; lbVideo.hidden = false;
    lbVideo.src = src;
    lbVideo.play().catch(() => {});
    lockScroll(true);
    requestAnimationFrame(() => requestAnimationFrame(() => lb.classList.add('is-open')));
    lbClose.focus();
  };
  const closeReel = () => {
    lb.classList.remove('is-open');
    lbVideo.pause();
    lockScroll(false);
    setTimeout(() => { lb.hidden = true; lbVideo.removeAttribute('src'); lbVideo.load(); }, 400);
    if (lastFocus) lastFocus.focus();
  };
  lbVideo.addEventListener('error', () => { lbVideo.hidden = true; lbEmpty.hidden = false; });
  $$('[data-open-reel]').forEach(b => b.addEventListener('click', () => openReel()));
  lbClose.addEventListener('click', closeReel);
  lb.addEventListener('click', e => { if (e.target === lb || e.target.classList.contains('lightbox__stage')) closeReel(); });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!lb.hidden) closeReel();
    else if (body.classList.contains('menu-open')) setMenu(false);
  });

  /* ---------------------------------------------------------
     Service videos — data-video on a .media replaces the CSS
     placeholder: preview on hover (in view on touch), open on click
     --------------------------------------------------------- */
  const previewIO = new IntersectionObserver(entries => {
    entries.forEach(e => { const v = e.target.querySelector('video'); if (v) e.isIntersecting ? v.play().catch(() => {}) : v.pause(); });
  }, { threshold: .6 });

  $$('.media[data-video]').forEach(m => {
    const src = m.dataset.video;
    const v = document.createElement('video');
    Object.assign(v, { src, muted: true, loop: true, playsInline: true, preload: 'metadata' });
    v.setAttribute('aria-hidden', 'true');
    if (m.dataset.poster) v.poster = m.dataset.poster;
    const art = $('.card__art', m);
    art ? art.replaceWith(v) : m.prepend(v);
    if (finePointer) {
      m.addEventListener('mouseenter', () => v.play().catch(() => {}));
      m.addEventListener('mouseleave', () => v.pause());
    } else if (!reduce) {
      previewIO.observe(m);
    }
    m.addEventListener('click', e => { e.preventDefault(); openReel(src); });
  });
  new IntersectionObserver(([e]) => services.classList.toggle('is-playing', e.isIntersecting && !reduce)).observe(services);

  /* ---------------------------------------------------------
     Init
     --------------------------------------------------------- */
  let resizeT;
  addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => { measure(); onScroll(); }, 120); });
  desktopMq.addEventListener('change', () => {
    reelFrame.removeAttribute('style');
    measure(); onScroll();
  });

  measure();
  if (document.fonts) document.fonts.ready.then(measure);
  runLoader();
  requestAnimationFrame(loop);
})();
