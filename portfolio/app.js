/* ============================================================
   Eric Armstrong — landing page
   A 3D particle depth field + layered scroll parallax.
   Scroll-driven, so it behaves identically on touch and desktop;
   pointer movement is an extra flourish where a pointer exists.
   ============================================================ */

(() => {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- scroll reveals ---------- */

  const reveals = Array.from(document.querySelectorAll('.reveal'));
  reveals.forEach((el, i) => el.style.setProperty('--i', String(i)));

  if (reduced || !('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('is-visible'));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px 10% 0px', threshold: 0.05 }
    );
    reveals.forEach((el) => io.observe(el));
  }

  /* ---------- the depth field ---------- */

  const canvas = document.getElementById('field');
  const ctx = canvas && canvas.getContext('2d');
  if (!ctx) return;

  const aurora = document.getElementById('aurora');
  const heroInner = document.getElementById('heroInner');
  const cue = document.getElementById('cue');

  const Z_NEAR = 0.34;
  const Z_FAR = 2.4;
  const DRIFT = 0.07;        // world-units per second toward the viewer
  const SCROLL_DEPTH = 0.7;  // how far the field pans over a full page scroll
  const POINTER_DEPTH = 26;

  let W = 0, H = 0, cx = 0, cy = 0, dpr = 1;
  let lastW = 0, lastH = 0;
  let particles = [];

  // smoothed inputs
  let scrollT = 0, scrollS = 0;
  let ptrXT = 0, ptrXS = 0, ptrYT = 0, ptrYS = 0;

  /* --- soft dot sprites, pre-rendered once --- */
  function makeSprite(r, g, b) {
    const size = 64, half = size / 2;
    const s = document.createElement('canvas');
    s.width = s.height = size;
    const c = s.getContext('2d');
    const grad = c.createRadialGradient(half, half, 0, half, half, half);
    grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
    grad.addColorStop(0.25, `rgba(${r},${g},${b},0.5)`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    c.fillStyle = grad;
    c.fillRect(0, 0, size, size);
    return s;
  }

  const SPRITES = [
    makeSprite(255, 255, 255),
    makeSprite(255, 255, 255),
    makeSprite(255, 255, 255),
    makeSprite(186, 230, 253), // pale blue
    makeSprite(196, 181, 253), // violet
    makeSprite(153, 246, 228), // teal
  ];

  function makeParticle(atFar) {
    return {
      x: (Math.random() * 2 - 1) * W * 1.15,
      y: (Math.random() * 2 - 1) * H * 1.7,
      z: atFar ? Z_FAR : Z_NEAR + Math.random() * (Z_FAR - Z_NEAR),
      r: 0.5 + Math.random() * 1.7,
      sprite: SPRITES[(Math.random() * SPRITES.length) | 0],
      phase: Math.random() * Math.PI * 2,
      twinkle: 0.4 + Math.random() * 0.9,
    };
  }

  function build() {
    const count = Math.round(Math.min(320, Math.max(90, (W * H) / 5200)));
    particles = new Array(count);
    for (let i = 0; i < count; i++) particles[i] = makeParticle(false);
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Mobile browsers resize on URL-bar collapse. Rebuilding the field on
    // every one of those pops visibly, so only rebuild on a real change.
    const rebuild = w !== lastW || Math.abs(h - lastH) > 160 || !particles.length;
    lastW = w;
    lastH = h;

    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = w;
    H = h;
    cx = W / 2;
    cy = H / 2;

    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (rebuild) build();
  }

  function scrollable() {
    return Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  }

  function draw(dt, now) {
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';

    const panY = scrollS * H * SCROLL_DEPTH;
    const offX = ptrXS * POINTER_DEPTH;
    const offY = ptrYS * POINTER_DEPTH;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      p.z -= DRIFT * dt;
      if (p.z <= Z_NEAR) {
        particles[i] = makeParticle(true);
        continue;
      }

      const k = 1 / p.z;
      const sx = cx + (p.x - offX) * k;
      const sy = cy + (p.y - panY - offY) * k;
      const r = p.r * k * 3.2;

      if (sx < -r || sx > W + r || sy < -r || sy > H + r) continue;

      // fade in from the far plane, fade out as it passes the camera
      const depth = (Z_FAR - p.z) / (Z_FAR - Z_NEAR);
      let a = Math.min(1, depth * 2.6) * Math.min(1, (p.z - Z_NEAR) * 3.4);
      a *= 0.55 + 0.45 * Math.sin(now * 0.0009 * p.twinkle + p.phase);

      if (a <= 0.01) continue;

      ctx.globalAlpha = a * 0.95;
      ctx.drawImage(p.sprite, sx - r, sy - r, r * 2, r * 2);
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  /* ---------- parallax on the DOM layers ---------- */

  function paintLayers(y) {
    if (aurora) {
      aurora.style.transform = `translate3d(0, ${(-y * 0.12).toFixed(2)}px, 0)`;
    }
    if (heroInner) {
      const fade = Math.max(0, 1 - y / (H * 0.62));
      heroInner.style.transform = `translate3d(0, ${(y * 0.32).toFixed(2)}px, 0)`;
      heroInner.style.opacity = fade.toFixed(3);
    }
    if (cue) {
      cue.style.opacity = String(Math.max(0, 1 - y / 220));
    }
  }

  /* ---------- loop ---------- */

  let raf = 0;
  let last = 0;

  function frame(now) {
    raf = requestAnimationFrame(frame);

    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
    last = now;

    const y = window.scrollY || window.pageYOffset || 0;
    scrollT = y / scrollable();

    // critically-damped-ish smoothing keeps motion buttery on both platforms
    scrollS += (scrollT - scrollS) * 0.085;
    ptrXS += (ptrXT - ptrXS) * 0.055;
    ptrYS += (ptrYT - ptrYS) * 0.055;

    paintLayers(y);
    draw(dt, now);
  }

  function start() {
    if (raf) return;
    last = 0;
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
  }

  /* ---------- wiring ---------- */

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resize();
      if (reduced) staticFrame();
    }, 150);
  });

  window.addEventListener('pointermove', (e) => {
    ptrXT = (e.clientX / W) * 2 - 1;
    ptrYT = (e.clientY / H) * 2 - 1;
  }, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (!reduced) start();
  });

  function staticFrame() {
    const y = window.scrollY || 0;
    scrollS = scrollT = y / scrollable();
    paintLayers(y);
    draw(0, 0);
  }

  resize();

  if (reduced) {
    staticFrame();
    window.addEventListener('scroll', staticFrame, { passive: true });
  } else {
    start();
  }
})();
