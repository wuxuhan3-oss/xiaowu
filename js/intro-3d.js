
/* ============================================================
   BLACK BOX ARCHIVE · 3D OPENING — intro-3d.js (2026-11-06)
   - 黑玻璃档案碑 + 悬浮印相 + 尘埃（CSS 3D + Canvas 2D）
   - 指针/触摸拖拽旋转；点击/回车开启；Esc/跳过退出
   - 尊重 prefers-reduced-motion；?nointro=1 可禁用
   独立 IIFE；任何异常都会直接放行页面，绝不白屏。
   ============================================================ */
(function () {
  'use strict';

  var docEl = document.documentElement;
  var intro = document.getElementById('intro3d');
  if (!intro) return;

  var reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  var noIntro = false;
  try { noIntro = /(?:^|[?&])nointro=1(?:&|$)/.test(location.search); } catch (e) {}

  var rig = document.getElementById('introRig');
  var scene = document.getElementById('introScene');
  var canvas = document.getElementById('introDust');
  var enterBtn = document.getElementById('introEnter');
  var skipBtn = document.getElementById('introSkip');
  var mono = document.getElementById('introMono');

  var opened = false;
  var done = false;
  var timers = [];
  var raf = 0;
  var dustRaf = 0;
  var cleanupFns = [];

  function later(fn, ms) { var t = setTimeout(function () { try { fn(); } catch (e) {} }, ms); timers.push(t); return t; }
  function clearTimers() { timers.forEach(function (t) { clearTimeout(t); }); timers = []; }

  function finish(immediate) {
    if (done) return;
    done = true;
    clearTimers();
    try { intro.setAttribute('aria-hidden', 'true'); } catch (e) {}
    try { intro.classList.add('is-leaving'); } catch (e) {}
    try { docEl.classList.remove('is-intro'); } catch (e) {}
    try { docEl.classList.add('intro-done'); } catch (e) {}
    try { document.body.classList.remove('is-intro'); } catch (e) {}
    try { if (scene) scene.setAttribute('inert', ''); } catch (e) {}
    stopDust();
    try { window.dispatchEvent(new CustomEvent('intro:done')); } catch (e) {}
    var hide = function () {
      try { intro.style.display = 'none'; } catch (e) {}
      try { if (document.body) document.body.focus({ preventScroll: true }); } catch (e) {}
    };
    if (immediate) hide(); else later(hide, 700);
  }

  function dismissNow() {
    try { intro.style.display = 'none'; intro.setAttribute('aria-hidden', 'true'); } catch (e) {}
    try { docEl.classList.add('intro-done'); } catch (e) {}
    try { docEl.classList.remove('is-intro'); } catch (e) {}
    try { document.body.classList.remove('is-intro'); } catch (e) {}
    stopDust();
    done = true;
    try { window.dispatchEvent(new CustomEvent('intro:done')); } catch (e) {}
  }

  function skip() {
    if (opened || done) return;
    opened = true;
    try { intro.classList.add('is-skipping'); } catch (e) {}
    finish(false);
  }

  function open() {
    if (opened || done) return;
    opened = true;
    try { intro.classList.add('is-opening'); } catch (e) {}
    try { enterBtn.disabled = true; skipBtn.disabled = true; } catch (e) {}
    stopDust();
    later(function () { try { intro.classList.add('is-leaving'); } catch (e) {} }, 1550);
    later(function () { finish(false); }, 3150);
  }

  /* ---------- 图片预载 ---------- */
  function preload() {
    var imgs = Array.prototype.slice.call(intro.querySelectorAll('.intro-card img'));
    var hero = document.querySelector('.hero-still img');
    if (hero) imgs.push(hero);
    var jobs = imgs.map(function (img) {
      return new Promise(function (res) {
        try {
          if (img.complete && img.naturalWidth > 0) return res();
          img.addEventListener('load', res, { once: true });
          img.addEventListener('error', res, { once: true });
          setTimeout(res, 2600);
        } catch (e) { res(); }
      });
    });
    Promise.all(jobs).then(function () {
      try { intro.classList.add('is-loaded'); } catch (e) {}
    });
    setTimeout(function () { try { intro.classList.add('is-loaded'); } catch (e) {} }, 1600);
  }

  /* ---------- 尘埃 ---------- */
  var dust = { ctx: null, w: 0, h: 0, dpr: 1, parts: [], mx: 0, my: 0, tx: 0, ty: 0, last: 0 };

  function setupDust() {
    if (!canvas) return;
    try { dust.ctx = canvas.getContext('2d'); } catch (e) { return; }
    if (!dust.ctx) return;
    var coarse = false;
    try { coarse = window.matchMedia('(pointer: coarse)').matches; } catch (e) {}
    var count = coarse ? 28 : 42;
    if (window.innerWidth < 700) count = 32;
    for (var i = 0; i < count; i++) {
      var z = 0.15 + Math.random() * 0.85;
      dust.parts.push({
        x: Math.random(), y: Math.random(), z: z,
        r: 0.35 + z * 1.5,
        vy: -(0.006 + Math.random() * 0.012) * (0.5 + z),
        vx: (Math.random() - 0.5) * 0.004,
        a: 0.05 + Math.random() * 0.32 * z,
        tw: Math.random() * Math.PI * 2
      });
    }
    resizeDust();
    dust.last = 0;
    dustRaf = requestAnimationFrame(drawDust);
  }

  function resizeDust() {
    if (!canvas || !dust.ctx) return;
    var rect = intro.getBoundingClientRect();
    var w = Math.max(1, Math.round(rect.width));
    var h = Math.max(1, Math.round(rect.height));
    dust.dpr = Math.min(window.devicePixelRatio || 1, 1.2);
    dust.w = w; dust.h = h;
    canvas.width = Math.round(w * dust.dpr);
    canvas.height = Math.round(h * dust.dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    dust.ctx.setTransform(dust.dpr, 0, 0, dust.dpr, 0, 0);
  }

  var lastRotAt = 0;
  var lastDustPaint = 0;

  function drawDust(ts) {
    if (!dust.ctx || done || opened) return;
    if (ts - lastDustPaint < 30) { dustRaf = requestAnimationFrame(drawDust); return; }
    lastDustPaint = ts;
    var dt = dust.last ? Math.min(48, ts - dust.last) : 16;
    dust.last = ts;
    var f = dt / 16.67;
    dust.mx += (dust.tx - dust.mx) * 0.05 * f;
    dust.my += (dust.ty - dust.my) * 0.05 * f;
    if (!drag.active && !opened && fine && ts - lastRotAt > 38) {
      lastRotAt = ts;
      var tt = ts / 1000;
      setRot(baseRx + dust.my * -3.2 + Math.sin(tt * 0.42) * 1.3, baseRy + dust.mx * 4.6 + Math.cos(tt * 0.28) * 2.2);
    }
    var ctx = dust.ctx, w = dust.w, h = dust.h;
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < dust.parts.length; i++) {
      var p = dust.parts[i];
      p.y += p.vy * f;
      p.x += p.vx * f;
      p.tw += 0.01 * f;
      if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); }
      if (p.x < -0.02) p.x = 1.02;
      if (p.x > 1.02) p.x = -0.02;
      var px = (p.x + dust.mx * p.z * 0.035) * w;
      var py = (p.y + dust.my * p.z * 0.025) * h;
      var tw = 0.7 + 0.3 * Math.sin(p.tw);
      ctx.beginPath();
      ctx.arc(px, py, p.r * (0.7 + p.z * 0.6), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(245,245,245,' + (p.a * tw).toFixed(3) + ')';
      ctx.fill();
    }
    dustRaf = requestAnimationFrame(drawDust);
  }

  function stopDust() {
    if (dustRaf) { try { cancelAnimationFrame(dustRaf); } catch (e) {} dustRaf = 0; }
  }

  /* ---------- 指针 / 拖拽 ---------- */
  var drag = { active: false, id: null, sx: 0, sy: 0, bx: 0, by: 0, rx: 0, ry: 0, vx: 0, vy: 0, lastX: 0, lastY: 0, lastT: 0, inertia: 0, startT: 0, moved: 0 };
  var baseRx = 0, baseRy = 0;
  var fine = true;
  try { fine = window.matchMedia('(pointer: fine)').matches; } catch (e) {}

  function setRot(rx, ry) {
    drag.rx = Math.max(-14, Math.min(14, rx));
    drag.ry = Math.max(-26, Math.min(26, ry));
    try {
      rig.style.setProperty('--rx', drag.rx.toFixed(2) + 'deg');
      rig.style.setProperty('--ry', drag.ry.toFixed(2) + 'deg');
      if (mono) mono.style.setProperty('--mono-ry', (-13 - drag.ry * 0.42).toFixed(2) + 'deg');
    } catch (e) {}
  }

  function onPointerMove(e) {
    if (done || opened) return;
    var rect = intro.getBoundingClientRect();
    dust.tx = (e.clientX / rect.width - 0.5) * 2;
    dust.ty = (e.clientY / rect.height - 0.5) * 2;
    try { if (mono) { mono.style.setProperty('--mx', (e.clientX / rect.width * 100).toFixed(1) + '%'); mono.style.setProperty('--my', (e.clientY / rect.height * 100).toFixed(1) + '%'); } } catch (e2) {}
  }

  function onPointerDown(e) {
    if (done || opened) return;
    if (e.target.closest && e.target.closest('button')) return;
    drag.active = true; drag.id = e.pointerId;
    drag.sx = e.clientX; drag.sy = e.clientY;
    drag.bx = baseRy; drag.by = baseRx;
    drag.lastX = e.clientX; drag.lastY = e.clientY; drag.lastT = performance.now();
    drag.startT = performance.now(); drag.moved = 0;
    drag.vx = 0; drag.vy = 0;
    try { intro.classList.add('is-dragging'); intro.setPointerCapture(e.pointerId); } catch (err) {}
    if (drag.inertia) { cancelAnimationFrame(drag.inertia); drag.inertia = 0; }
  }

  function onPointerUp(e) {
    if (!drag.active) return;
    drag.active = false;
    try { intro.classList.remove('is-dragging'); intro.releasePointerCapture(e.pointerId); } catch (err) {}

    // 拖动结束后保留当前角度（不再回弹）；位移很小则视为点击开启
    baseRx = drag.rx; baseRy = drag.ry;
    var quick = performance.now() - drag.startT < 650;
    var isButton = !!(e.target && e.target.closest && e.target.closest('button'));
    if (drag.moved < 8 && quick && !isButton) { try { open(); } catch (err) {} return; }

    var vx = drag.vx, vy = drag.vy;
    if (Math.abs(vx) < 0.02 && Math.abs(vy) < 0.02) return;
    var settle = function () {
      vx *= 0.92; vy *= 0.92;
      baseRx += vy; baseRy += vx;
      setRot(baseRx, baseRy);
      if (Math.abs(vx) > 0.02 || Math.abs(vy) > 0.02) drag.inertia = requestAnimationFrame(settle);
      else { drag.inertia = 0; baseRx = drag.rx; baseRy = drag.ry; }
    };
    drag.inertia = requestAnimationFrame(settle);
  }

  function onDragMove(e) {
    if (!drag.active || e.pointerId !== drag.id) return;
    if (e.cancelable) e.preventDefault();
    var now = performance.now();
    var dx = e.clientX - drag.sx;
    var dy = e.clientY - drag.sy;
    var dt = Math.max(1, now - drag.lastT);
    drag.vx = (e.clientX - drag.lastX) / dt * 2.4;
    drag.vy = (e.clientY - drag.lastY) / dt * 2.0;
    drag.lastX = e.clientX; drag.lastY = e.clientY; drag.lastT = now;
    drag.moved = Math.max(drag.moved, Math.sqrt(dx * dx + dy * dy));
    setRot(drag.by - dy * 0.12, drag.bx + dx * 0.18);
  }

  function bindPointer() {
    intro.style.touchAction = 'none';
    intro.addEventListener('pointermove', onPointerMove, { passive: true });
    intro.addEventListener('pointerdown', onPointerDown, { passive: true });
    intro.addEventListener('pointermove', onDragMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerUp, { passive: true });
    cleanupFns.push(function () {
      intro.removeEventListener('pointermove', onPointerMove);
      intro.removeEventListener('pointerdown', onPointerDown);
      intro.removeEventListener('pointermove', onDragMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    });
  }

  /* ---------- 键盘 ---------- */
  function onKey(e) {
    if (done) return;
    if (e.key === 'Escape') { e.preventDefault(); skip(); return; }
    if (e.key === 'Enter' || e.key === ' ') {
      if (e.target && /button/i.test(e.target.tagName)) return; // 按钮自身处理
      e.preventDefault(); open(); return;
    }
    if (e.key === 'Tab') {
      // 简单焦点环
      var focusables = [enterBtn, skipBtn].filter(Boolean);
      if (!focusables.length) return;
      var idx = focusables.indexOf(document.activeElement);
      var next = e.shiftKey ? idx - 1 : idx + 1;
      if (next < 0) next = focusables.length - 1;
      if (next >= focusables.length) next = 0;
      e.preventDefault(); focusables[next].focus();
    }
  }

  /* ---------- 生命周期 ---------- */
  function bindUI() {
    enterBtn.addEventListener('click', open);
    skipBtn.addEventListener('click', skip);
    document.addEventListener('keydown', onKey);
    var onResize = function () { resizeDust(); };
    window.addEventListener('resize', onResize, { passive: true });
    var onVis = function () {
      if (document.hidden) { stopDust(); }
      else if (!done && !opened && !dustRaf) { dust.last = 0; dustRaf = requestAnimationFrame(drawDust); }
    };
    document.addEventListener('visibilitychange', onVis);
    cleanupFns.push(function () {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
    });
  }

  function bindReplay() {
    var replayBtn = document.querySelector('[data-replay-intro]');
    if (replayBtn && !replayBtn.__refBound) {
      replayBtn.__refBound = true;
      replayBtn.addEventListener('click', function (e) { e.preventDefault(); try { window.ArchiveIntro.replay(); } catch (err) {} });
    }
  }

  function start() {
    try {
      bindReplay();
      docEl.classList.add('has-intro');
      if (reduce || noIntro) { dismissNow(); return; }
      docEl.classList.add('is-intro');
      document.body.classList.add('is-intro');
      preload();
      setupDust();
      bindPointer();
      bindUI();
      if (fine) later(function () { try { enterBtn.focus({ preventScroll: true }); } catch (e) {} }, 1500);
      // 引擎兜底：12 秒后若仍未操作，仍允许页面（不自动跳，仅解除滚动限制风险）
      later(function () { if (!opened && !done) { try { intro.classList.add('is-loaded'); } catch (e) {} } }, 1200);
    } catch (err) {
      dismissNow();
    }
  }

  // 对外：重播
  window.ArchiveIntro = {
    replay: function () {
      try {
        done = false; opened = false;
        intro.style.display = '';
        intro.removeAttribute('aria-hidden');
        intro.classList.remove('is-opening', 'is-leaving', 'is-skipping', 'is-loaded', 'is-dragging');
        docEl.classList.remove('intro-done');
        docEl.classList.add('has-intro', 'is-intro');
        document.body.classList.add('is-intro');
        if (scene) scene.removeAttribute('inert');
        baseRx = 0; baseRy = 0;
        setRot(0, 0);
        try { if (enterBtn) enterBtn.disabled = false; if (skipBtn) skipBtn.disabled = false; } catch (e2) {}
        dust.parts = [];
        preload(); setupDust();
        later(function () { try { enterBtn.focus({ preventScroll: true }); } catch (e) {} }, 700);
      } catch (e) {}
    },
    open: open,
    skip: skip
  };

  bindReplay();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
