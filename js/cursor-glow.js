
/* ============================================================
   CURSOR GLOW — 开场光标可见 + 发光尾迹 (2026-11-06 · v3)
   细指针启用；Canvas 分段渐变描边（无 shadowBlur）
   ============================================================ */
(function () {
  'use strict';

  var docEl = document.documentElement;
  var cursor = null;
  var trail = null;
  var ctx = null;
  var fine = false;
  var reduce = false;
  var centerMode = false;
  var firstRealMove = false;
  var W = 0, H = 0, DPR = 1;

  try {
    fine = window.matchMedia('(pointer: fine)').matches && !window.matchMedia('(pointer: coarse)').matches;
    reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {}
  if (!fine) return;

  var points = [];
  var LIFE = 360;
  var MAX = 32;
  var last = { x: 0, y: 0, has: false };
  var running = false;
  var idleTimer = 0;
  var lastMoveAt = 0;
  var DEBUG = { moves: 0, points: 0, frames: 0 };
  try { window.__cursorGlow = DEBUG; } catch (e) {}

  function now() { return window.performance && window.performance.now ? window.performance.now() : Date.now(); }

  /* ---------- 开场光标 ---------- */
  function centerCursor() {
    if (!cursor) return;
    if (!docEl.classList.contains('is-intro')) return;
    if (firstRealMove) return;
    centerMode = true;
    try {
      cursor.classList.remove('is-hidden');
      cursor.style.opacity = '1';
      cursor.style.transform = 'translate3d(' + Math.round(window.innerWidth / 2) + 'px,' + Math.round(window.innerHeight / 2) + 'px,0)';
    } catch (e) {}
  }

  function bindCursorCenter() {
    cursor = document.getElementById('cursor');
    if (!cursor) return;
    if (docEl.classList.contains('is-intro')) centerCursor();
    try {
      new MutationObserver(function () {
        if (docEl.classList.contains('is-intro')) centerCursor();
      }).observe(docEl, { attributes: true, attributeFilter: ['class'] });
    } catch (e) {}
    window.addEventListener('mousemove', function () {
      if (firstRealMove) return;
      firstRealMove = true;
      try { if (centerMode) cursor.style.transform = ''; } catch (err) {}
      centerMode = false;
      try { cursor.classList.remove('is-hidden'); cursor.style.opacity = '1'; } catch (err) {}
    }, { capture: true, passive: true });
  }

  /* ---------- 画布 ---------- */
  function setupCanvas() {
    trail = document.createElement('canvas');
    trail.className = 'cursor-trail';
    trail.setAttribute('aria-hidden', 'true');
    document.body.appendChild(trail);
    ctx = trail.getContext('2d');
    if (!ctx) { trail = null; return; }
    resize();
    window.addEventListener('resize', resize, { passive: true });
  }

  function resize() {
    if (!ctx || !trail) return;
    DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth;
    H = window.innerHeight;
    var renderScale = 0.6;
    trail.width = Math.round(W * DPR * renderScale);
    trail.height = Math.round(H * DPR * renderScale);
    trail.style.width = W + 'px';
    trail.style.height = H + 'px';
    ctx.setTransform(DPR * renderScale, 0, 0, DPR * renderScale, 0, 0);
  }

  function addPoint(x, y, t) {
    if (last.has) {
      var dx = x - last.x, dy = y - last.y;
      if (dx * dx + dy * dy < 1.0) return;
    }
    last.x = x; last.y = y; last.has = true;
    points.push({ x: x, y: y, t: t });
    if (points.length > MAX) points.shift();
    lastMoveAt = t;
    DEBUG.moves++;
    DEBUG.points = points.length;
    if (!running) { running = true; requestAnimationFrame(frame); }
    if (idleTimer) { clearTimeout(idleTimer); idleTimer = 0; }
    idleTimer = setTimeout(function () { if (trail) trail.classList.add('is-off'); }, 170);
  }

  function strokeChunk(i0, i1, width, alphaStart, alphaEnd) {
    if (i1 - i0 < 1) return;
    var a = points[i0], b = points[i1];
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    for (var i = i0 + 1; i <= i1; i++) ctx.lineTo(points[i].x, points[i].y);
    var g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
    g.addColorStop(0, 'rgba(255,150,120,' + alphaStart.toFixed(3) + ')');
    g.addColorStop(0.55, 'rgba(255,214,200,' + ((alphaStart + alphaEnd) * 0.5).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(255,255,255,' + alphaEnd.toFixed(3) + ')');
    ctx.strokeStyle = g;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  var lastPaint = 0;
  function frame() {
    if (!ctx) return;
    var nowTs = now();
    if (nowTs - lastPaint < 21) { requestAnimationFrame(frame); return; }
    lastPaint = nowTs;
    DEBUG.frames++;
    var t = now();
    ctx.clearRect(0, 0, W, H);
    while (points.length && t - points[0].t > LIFE) points.shift();
    DEBUG.points = points.length;
    if (points.length < 2) { running = false; return; }

    // 速度系数：快速挥动时更亮更有力，慢速时柔和
    var total = 0;
    for (var k = 1; k < points.length; k++) {
      var dx = points[k].x - points[k - 1].x, dy = points[k].y - points[k - 1].y;
      total += Math.sqrt(dx * dx + dy * dy);
    }
    var speed = Math.min(1.3, Math.max(0.75, total / Math.max(1, points.length - 1) / 22));
    var n = points.length;
    var cut1 = Math.max(1, Math.floor(n * 0.42));
    var cut2 = Math.max(cut1 + 1, Math.floor(n * 0.74));
    if (cut2 > n - 1) cut2 = n - 2;
    if (cut1 >= n - 1) { cut1 = n - 2; cut2 = n - 1; }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'lighter';

    var chunks = [
      { a: 0, b: cut1, base: 0.6 },
      { a: Math.max(0, cut1 - 1), b: cut2, base: 1.05 },
      { a: Math.max(0, cut2 - 2), b: n - 1, base: 1.6 }
    ];
    for (var c = 0; c < chunks.length; c++) {
      var ch = chunks[c];
      var head = (ch.b === n - 1) ? 1 : (0.35 + 0.3 * c);
      var w = ch.base * speed;
      // 外层柔光
      strokeChunk(ch.a, ch.b, w * 4.0, 0, 0.05 + 0.035 * head);
      // 中层
      strokeChunk(ch.a, ch.b, w * 1.8, 0.04, 0.18 + 0.14 * head);
      // 亮芯
      strokeChunk(ch.a, ch.b, Math.max(0.45, w * 0.76), 0.12, 0.55 + 0.35 * head);
    }

    // 光标头部的一点柔光，让尾迹与光标自然衔接
    (function () {
      var hp = points[points.length - 1];
      var rg = ctx.createRadialGradient(hp.x, hp.y, 0, hp.x, hp.y, 16);
      rg.addColorStop(0, 'rgba(255,255,255,.28)');
      rg.addColorStop(0.45, 'rgba(255,226,214,.10)');
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(hp.x, hp.y, 16, 0, Math.PI * 2);
      ctx.fill();
    })();

    if (t - lastMoveAt < 380) requestAnimationFrame(frame);
    else {
      running = false;
      setTimeout(function () {
        if (!running && ctx) { try { ctx.clearRect(0, 0, W, H); } catch (e) {} }
      }, 260);
    }
  }

  function bindTrail() {
    if (reduce) return;
    setupCanvas();
    if (!ctx) return;
    window.addEventListener('mousedown', function (e) { addPoint(e.clientX, e.clientY, now()); }, { passive: true });
    window.addEventListener('mousemove', function (e) {
      if (!trail) return;
      trail.classList.remove('is-off');
      addPoint(e.clientX, e.clientY, now());
    }, { passive: true });
    window.addEventListener('mouseleave', function () {
      last.has = false;
      if (trail) trail.classList.add('is-off');
    }, { passive: true });
    window.addEventListener('blur', function () {
      last.has = false;
      if (trail) trail.classList.add('is-off');
    });
  }

  function start() {
    try {
      bindCursorCenter();
      bindTrail();
      window.addEventListener('intro:done', function () {
        try {
          if (!cursor) return;
          cursor.classList.remove('is-hidden');
          cursor.style.opacity = '1';
          if (!firstRealMove) centerCursor();
        } catch (e) {}
      });
    } catch (e) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
