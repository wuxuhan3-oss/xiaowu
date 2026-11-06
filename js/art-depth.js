/* ============================================================
   art-depth.js — 标题粒子碎片 / 3D 空间层 / 滚动缩放纵深
   ============================================================ */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia('(pointer: coarse)').matches;
  var byId = function (id) { return document.getElementById(id); };
  var all = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* =========================================================
     1. 标题粒子碎片（画布）
     ========================================================= */
  var hero = byId('hero');
  var headline = document.querySelector('.hero-headline');
  var titleEl = byId('heroTitle');
  var canvas = null;
  var ctx = null;
  var W = 0, H = 0;
  var MARGIN = 46;
  var dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  var particles = [];
  var raf = 0;
  var startTs = 0;
  var hover = { x: -9999, y: -9999, active: false };
  var heroVisible = true;
  var canvasVisible = false;
  var lastLang = '';

  function titleFont(cs) {
    return (cs.fontStyle || 'normal') + ' ' + (cs.fontWeight || '400') + ' ' +
      cs.fontSize + ' ' + (cs.fontFamily || 'serif');
  }

  function samplePoints() {
    if (!headline || !titleEl) return [];
    var hr = headline.getBoundingClientRect();
    W = Math.ceil(hr.width + MARGIN * 2);
    H = Math.ceil(hr.height + MARGIN * 2);
    if (!W || !H) return [];

    var off = document.createElement('canvas');
    off.width = Math.ceil(W);
    off.height = Math.ceil(H);
    var oc = off.getContext('2d');
    oc.fillStyle = '#fff';
    oc.textBaseline = 'middle';

    all('.title-inner, .title-mark', titleEl).forEach(function (el) {
      var txt = (el.textContent || '').trim();
      if (!txt) return;
      var cs = window.getComputedStyle(el);
      var r = el.getBoundingClientRect();
      oc.font = titleFont(cs);
      oc.fillStyle = '#fff';
      var x = r.left - hr.left + MARGIN;
      var y = r.top - hr.top + MARGIN + r.height * 0.52;
      oc.fillText(txt, x, y);
    });

    var data = oc.getImageData(0, 0, off.width, off.height).data;
    function alphaAt(x, y) {
      if (x < 0 || y < 0 || x >= off.width || y >= off.height) return 0;
      return data[(y * off.width + x) * 4 + 3];
    }

    var pts = [];
    var step = 3;
    for (var y = 0; y < off.height; y += step) {
      for (var x = 0; x < off.width; x += step) {
        var a = alphaAt(x, y);
        if (a < 100) continue;
        var left = alphaAt(x - step, y), right = alphaAt(x + step, y);
        var up = alphaAt(x, y - step), down = alphaAt(x, y + step);
        var isEdge = left < 70 || right < 70 || up < 70 || down < 70;
        if (!isEdge) continue;
        var nx = (left < 70 ? -1 : 0) + (right < 70 ? 1 : 0);
        var ny = (up < 70 ? -1 : 0) + (down < 70 ? 1 : 0);
        var len = Math.hypot(nx, ny) || 1;
        nx /= len; ny /= len;
        var offd = 1.5 + Math.random() * 8;
        pts.push({
          x: x + nx * offd + (Math.random() - 0.5) * 4,
          y: y + ny * offd + (Math.random() - 0.5) * 4,
          nx: nx, ny: ny
        });
      }
    }

    for (var i = pts.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = pts[i]; pts[i] = pts[j]; pts[j] = t;
    }
    var cap = coarse ? 620 : Math.max(900, Math.min(2400, Math.round((W * H) / 430)));
    return pts.slice(0, cap);
  }

  function buildParticles() {
    var pts = samplePoints();
    if (!canvas) return;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';

    particles = pts.map(function (p) {
      var ang = Math.random() * Math.PI * 2;
      var scatter = 80 + Math.random() * 240;
      var red = Math.random() < 0.18;
      var big = Math.random() < 0.09;
      return {
        tx: p.x, ty: p.y,
        sx: p.x + Math.cos(ang) * scatter,
        sy: p.y + Math.sin(ang) * scatter,
        x: p.x + Math.cos(ang) * scatter,
        y: p.y + Math.sin(ang) * scatter,
        vx: 0, vy: 0,
        size: big ? 2.4 + Math.random() * 2.0 : 0.7 + Math.random() * 1.1,
        red: red,
        depth: 0.35 + Math.random() * 1.0,
        phase: Math.random() * Math.PI * 2
      };
    });

    if (reduce) {
      particles.forEach(function (p) { p.x = p.ty === 0 ? 0 : p.tx; p.y = p.ty; });
      drawStatic();
    }
  }

  function drawFrame(ts) {
    if (!ctx || !particles.length) { raf = 0; return; }
    if (!startTs) startTs = ts;
    var t = (ts - startTs) / 1000;
    var intro = Math.min(t / 1.7, 1);
    var ease = 1 - Math.pow(1 - intro, 3);

    var cr = canvas.getBoundingClientRect();
    var mx = hover.active ? hover.x - cr.left : -9999;
    var my = hover.active ? hover.y - cr.top : -9999;
    var pxN = hover.active ? (hover.x - cr.left) / Math.max(cr.width, 1) - 0.5 : 0;
    var pyN = hover.active ? (hover.y - cr.top) / Math.max(cr.height, 1) - 0.5 : 0;

    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var tx = p.tx + pxN * 26 * p.depth;
      var ty = p.ty + pyN * 16 * p.depth;

      if (intro < 1) {
        p.x = tx + (p.sx - p.tx) * (1 - ease) + Math.sin(t * 1.4 + p.phase) * 9 * (1 - ease);
        p.y = ty + (p.sy - p.ty) * (1 - ease) + Math.cos(t * 1.1 + p.phase) * 7 * (1 - ease);
      } else {
        var dx = p.x - mx, dy = p.y - my;
        var d2 = dx * dx + dy * dy;
        var rad = 105 + 45 * p.depth;
        if (d2 < rad * rad && d2 > 2) {
          var d = Math.sqrt(d2);
          var force = (1 - d / rad) * 1.05;
          p.vx += (dx / d) * force;
          p.vy += (dy / d) * force;
        }
        p.vx += (tx - p.x) * 0.022;
        p.vy += (ty - p.y) * 0.022;
        p.vx *= 0.9;
        p.vy *= 0.9;
        p.x += p.vx + Math.sin(t * 0.9 + p.phase) * 0.12 * p.depth;
        p.y += p.vy + Math.cos(t * 0.75 + p.phase) * 0.1 * p.depth;
      }

      var a = (p.red ? 0.62 : 0.38) * (0.25 + 0.75 * ease);
      if (p.size > 2) a *= 1.15;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.red ? '#d24a2f' : '#f2ece0';
      var w = p.size, h = p.size * (p.red ? 1.5 : 1.1);
      ctx.fillRect(p.x, p.y, w, h);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    if (intro >= 1) canvas.classList.add('is-on');
    raf = window.requestAnimationFrame(drawFrame);
  }

  function drawStatic() {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    particles.forEach(function (p) {
      ctx.globalAlpha = p.red ? 0.5 : 0.35;
      ctx.fillStyle = p.red ? '#d24a2f' : '#f2ece0';
      ctx.fillRect(p.tx, p.ty, p.size, p.size);
    });
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    canvas.classList.add('is-on');
  }

  function startParticles() {
    if (!canvas || reduce) { if (canvas) drawStatic(); return; }
    if (raf) window.cancelAnimationFrame(raf);
    startTs = 0;
    raf = window.requestAnimationFrame(drawFrame);
  }

  function stopParticles() {
    if (raf) { window.cancelAnimationFrame(raf); raf = 0; }
  }

  /* 等标题入场动画结束后再采样，避免按动画中的位置生成粒子 */
  function deferBuild() {
    var n = 0;
    function tick() {
      if (document.body.classList.contains('is-ready') || n++ > 80) {
        window.setTimeout(function () {
          buildParticles();
          if (reduce) drawStatic(); else startParticles();
        }, 900);
        return;
      }
      window.setTimeout(tick, 100);
    }
    tick();
  }

  function initParticles() {
    return; /* 试做：首屏降噪，粒子已停用 */
    if (!headline || !titleEl) return;
    canvas = document.createElement('canvas');
    canvas.className = 'title-particles';
    canvas.setAttribute('aria-hidden', 'true');
    headline.appendChild(canvas);
    ctx = canvas.getContext('2d');
    deferBuild();

    if (hero) {
      hero.addEventListener('pointermove', function (e) {
        hover.x = e.clientX; hover.y = e.clientY; hover.active = true;
      }, { passive: true });
      hero.addEventListener('pointerleave', function () { hover.active = false; });
      if (titleEl) {
        titleEl.addEventListener('pointerdown', function () {
          particles.forEach(function (p) {
            var ang = Math.random() * Math.PI * 2;
            var sp = 2 + Math.random() * 6;
            p.vx += Math.cos(ang) * sp;
            p.vy += Math.sin(ang) * sp;
          });
        });
      }
    }

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        heroVisible = entries[0].isIntersecting;
        if (heroVisible && !raf && !reduce) startParticles();
        if (!heroVisible) stopParticles();
      }, { threshold: 0.05 });
      io.observe(hero || headline);
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stopParticles();
      else if (heroVisible) startParticles();
    });

    var rebuildTimer = 0;
    function rebuild() {
      if (rebuildTimer) window.clearTimeout(rebuildTimer);
      rebuildTimer = window.setTimeout(function () {
        buildParticles();
        if (reduce) drawStatic();
        else if (!raf) startParticles();
      }, 260);
    }
    window.addEventListener('resize', rebuild, { passive: true });
    document.addEventListener('lang:change', rebuild);
    lastLang = (window.I18N && window.I18N.lang) || 'zh';
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        if (document.body.classList.contains('is-ready')) rebuild();
      });
    }
  }

  /* =========================================================
     2. HERO 3D 视差
     ========================================================= */
  var heroMain = document.querySelector('.hero-main');
  function initHeroParallax() {
    if (!hero || !heroMain || coarse || reduce) return;
    var targetX = 0, targetY = 0, curX = 0, curY = 0, running = false;
    function frame() {
      curX += (targetX - curX) * 0.08;
      curY += (targetY - curY) * 0.08;
      hero.style.setProperty('--hrx', (-curY * 4.5).toFixed(2) + 'deg');
      hero.style.setProperty('--hry', (curX * 5.5).toFixed(2) + 'deg');
      if (Math.abs(targetX - curX) > 0.001 || Math.abs(targetY - curY) > 0.001) {
        window.requestAnimationFrame(frame);
      } else { running = false; }
    }
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      targetX = (e.clientX - r.left) / Math.max(r.width, 1) - 0.5;
      targetY = (e.clientY - r.top) / Math.max(r.height, 1) - 0.5;
      if (!running) { running = true; window.requestAnimationFrame(frame); }
    }, { passive: true });
    hero.addEventListener('pointerleave', function () {
      targetX = 0; targetY = 0;
      if (!running) { running = true; window.requestAnimationFrame(frame); }
    });
  }

  /* =========================================================
     3. 作品卡 3D 倾斜
     ========================================================= */
  var currentCard = null;
  function resetCard(card) {
    if (!card) return;
    card.style.setProperty('--crx', '0deg');
    card.style.setProperty('--cry', '0deg');
    card.style.setProperty('--cz', '0px');
  }
  function initCardTilt() {
    if (coarse || reduce) return;
    var wall = byId('worksWall');
    var indexEl = byId('worksIndex');
    function onMove(e) {
      var card = e.target.closest ? e.target.closest('.work-card') : null;
      if (!card) { if (currentCard) { resetCard(currentCard); currentCard = null; } return; }
      var r = card.getBoundingClientRect();
      if (!r.width) return;
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      card.style.setProperty('--cry', (px * 6).toFixed(2) + 'deg');
      card.style.setProperty('--crx', (-py * 4.5).toFixed(2) + 'deg');
      card.style.setProperty('--cz', '14px');
      if (currentCard && currentCard !== card) resetCard(currentCard);
      currentCard = card;
    }
    [wall, indexEl].forEach(function (root) {
      if (!root) return;
      root.addEventListener('pointermove', onMove, { passive: true });
      root.addEventListener('pointerleave', function () {
        if (currentCard) { resetCard(currentCard); currentCard = null; }
      }, { passive: true });
    });
    document.addEventListener('works:render', function () {
      if (currentCard) { resetCard(currentCard); currentCard = null; }
    });
  }

  /* =========================================================
     4. 滚动缩放纵深
     ========================================================= */
  var depthEls = [];
  function collectDepth() {
    depthEls = all('.section-head, .works-toolbar, .work-card, .works-foot, .about-aside, .about-copy, .toolbox, .about-cards, .exp-item, .contact-title, .contact-lines, .contact-cta, .contact-time');
    depthEls.forEach(function (el) { el.classList.add('depth-block'); });
    updateDepth();
  }
  function updateDepth() {
    var vh = window.innerHeight || 800;
    for (var i = 0; i < depthEls.length; i++) {
      var el = depthEls[i];
      var r = el.getBoundingClientRect();
      if (!r.height) continue;
      var center = r.top + r.height * 0.5;
      var d = Math.min(Math.abs(center - vh * 0.5) / (vh * 0.66), 1);
      var s = 1 - d * d * 0.11;
      el.style.setProperty('--sc', s.toFixed(3));
    }
  }
  var depthTick = false;
  function initDepth() {
    collectDepth();
    window.addEventListener('scroll', function () {
      if (depthTick) return;
      depthTick = true;
      window.requestAnimationFrame(function () { depthTick = false; updateDepth(); });
    }, { passive: true });
    window.addEventListener('resize', updateDepth, { passive: true });
    document.addEventListener('works:render', function () {
      collectDepth();
    });
    document.addEventListener('lang:change', function () {
      window.setTimeout(collectDepth, 240);
    });
  }

  /* =========================================================
     初始化
     ========================================================= */
  function init() {
    initParticles();
    initHeroParallax();
    initCardTilt();
    initDepth();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
