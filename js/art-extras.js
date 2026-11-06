/* ============================================================
   art-extras.js — 数字滚轮 / 页码 HUD / 鼠标光晕 / 放大镜
   ============================================================ */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia('(pointer: coarse)').matches;
  var byId = function (id) { return document.getElementById(id); };
  var all = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------------- 1. 数字滚动（odometer） ---------------- */
  function buildRoll(el, value, prefix, suffix) {
    var text = String(value);
    el.textContent = '';
    el.classList.add('odo');
    var wrap = document.createElement('span');
    wrap.className = 'odo-wrap';
    wrap.setAttribute('aria-hidden', 'true');
    var sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = (prefix || '') + text + (suffix || '');
    el.appendChild(sr);

    if (prefix) {
      var p = document.createElement('span');
      p.className = 'odo-affix';
      p.textContent = prefix;
      wrap.appendChild(p);
    }

    var digits = [];
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      if (!/[0-9]/.test(ch)) {
        var aff = document.createElement('span');
        aff.className = 'odo-affix';
        aff.textContent = ch;
        wrap.appendChild(aff);
        continue;
      }
      var col = document.createElement('span');
      col.className = 'odo-digit';
      var strip = document.createElement('span');
      strip.className = 'odo-strip';
      for (var d = 0; d < 20; d++) {
        var cell = document.createElement('i');
        cell.textContent = String(d % 10);
        strip.appendChild(cell);
      }
      col.appendChild(strip);
      wrap.appendChild(col);
      digits.push({ strip: strip, digit: parseInt(ch, 10), delay: i * 80 });
    }

    if (suffix) {
      var s = document.createElement('span');
      s.className = 'odo-affix';
      s.textContent = suffix;
      wrap.appendChild(s);
    }

    el.appendChild(wrap);

    if (reduce || !window.requestAnimationFrame) {
      digits.forEach(function (o) { o.strip.style.transition = 'none'; o.strip.style.transform = 'translateY(-' + (o.digit + 10) + 'em)'; });
      return;
    }
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        digits.forEach(function (o) {
          o.strip.style.transitionDelay = o.delay + 'ms';
          o.strip.style.transform = 'translateY(-' + (o.digit + 10) + 'em)';
        });
      });
    });
  }

  window.Odometer = { roll: buildRoll };

  /* ---------------- 2. 页码 HUD ---------------- */
  var sections = all('[data-section]');
  var dock = byId('pageDock');
  var dockCurrent = byId('dockCurrent');
  var dockLabel = byId('dockLabel');
  var dockBar = byId('dockBar');
  var dockPrev = byId('dockPrev');
  var dockNext = byId('dockNext');
  var dockIndex = 0;
  var dockReady = false;

  function pad2(n) { return n < 10 ? '0' + n : String(n); }

  function sectionAt() {
    var probe = window.pageYOffset + window.innerHeight * 0.38;
    var idx = 0;
    for (var i = 0; i < sections.length; i++) {
      var top = sections[i].getBoundingClientRect().top + window.pageYOffset;
      if (top <= probe) idx = i;
    }
    return idx;
  }

  function updateDock(force) {
    if (!sections.length || !dock) return;
    var idx = sectionAt();
    var changed = idx !== dockIndex || force;
    dockIndex = idx;
    var page = idx + 1;
    var total = sections.length;
    if (dock) dock.classList.toggle('is-off', (window.matchMedia('(max-width:900px)').matches && page === 1) || page === total);
    if (changed) {
      if (dockCurrent) {
        if (dockReady) buildRoll(dockCurrent, pad2(page));
        else dockCurrent.textContent = pad2(page);
      }
      if (dockLabel) {
        var nameKey = 'section.' + (sections[idx].id || 'hero');
        dockLabel.textContent = window.I18N ? window.I18N.t(nameKey) : '';
      }
      if (dockBar) dockBar.style.width = ((page / total) * 100).toFixed(2) + '%';
    }
    dockReady = true;
  }

  var dockTick = false;
  function onScrollDock() {
    if (dockTick) return;
    dockTick = true;
    window.requestAnimationFrame(function () { dockTick = false; updateDock(false); });
  }

  if (dock) {
    updateDock(true);
    window.addEventListener('scroll', onScrollDock, { passive: true });
    window.addEventListener('resize', updateDock, { passive: true });
    if (dockPrev) dockPrev.addEventListener('click', function () {
      var i = Math.max(dockIndex - 1, 0);
      if (sections[i]) sections[i].scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    });
    if (dockNext) dockNext.addEventListener('click', function () {
      var i = Math.min(dockIndex + 1, sections.length - 1);
      if (sections[i]) sections[i].scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    });
  }

  document.addEventListener('lang:change', function () { updateDock(true); });

  /* ---------------- 3. 鼠标光晕 ---------------- */
  var glow = byId('mouseGlow');
  if (glow && !coarse) {
    var gx = window.innerWidth / 2, gy = window.innerHeight / 2;
    var tx = gx, ty = gy;
    var glowRunning = false;
    var glowShown = false;

    function glowFrame() {
      gx += (tx - gx) * 0.14;
      gy += (ty - gy) * 0.14;
      glow.style.transform = 'translate3d(' + (gx - 320) + 'px,' + (gy - 320) + 'px,0)';
      if (Math.abs(tx - gx) > 0.5 || Math.abs(ty - gy) > 0.5) {
        window.requestAnimationFrame(glowFrame);
      } else {
        glowRunning = false;
      }
    }

    window.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!glowShown) { glowShown = true; glow.classList.add('is-on'); }
      if (!glowRunning) { glowRunning = true; window.requestAnimationFrame(glowFrame); }
    }, { passive: true });
    window.addEventListener('pointerdown', function () { glow.classList.add('is-down'); }, { passive: true });
    window.addEventListener('pointerup', function () { glow.classList.remove('is-down'); }, { passive: true });
    document.addEventListener('pointerleave', function () { glow.classList.remove('is-on'); glowShown = false; });
  }

  /* ---------------- 4. 作品卡放大镜 ---------------- */
  var lensCard = null;
  var lensTimer = 0;
  var wall = byId('worksWall');
  var indexEl = byId('worksIndex');

  function resetLens() {
    if (lensCard) {
      lensCard.classList.remove('is-lensing');
      var cover = lensCard.querySelector('.work-cover');
      var lens = cover && cover.querySelector('.cover-lens');
      if (lens) lens.style.opacity = '0';
    }
    lensCard = null;
  }

  function ensureLens(card) {
    var cover = card.querySelector('.work-cover');
    if (!cover) return null;
    var lens = cover.querySelector('.cover-lens');
    var poster = card.getAttribute('data-poster');
    if (!lens) {
      if (!poster) return null;
      lens = document.createElement('div');
      lens.className = 'cover-lens';
      lens.setAttribute('aria-hidden', 'true');
      var img = document.createElement('img');
      img.alt = '';
      img.src = poster;
      img.decoding = 'async';
      lens.appendChild(img);
      var tag = document.createElement('b');
      tag.textContent = '×1.9';
      lens.appendChild(tag);
      cover.appendChild(lens);
    }
    return lens;
  }

  function lensMove(e) {
    if (coarse || reduce) return;
    var card = e.target.closest ? e.target.closest('.work-card') : null;
    if (!card) return;
    var cover = card.querySelector('.work-cover');
    if (!cover) return;
    var rect = cover.getBoundingClientRect();
    if (!rect.width) return;
    var px = e.clientX - rect.left;
    var py = e.clientY - rect.top;
    if (px < 0 || py < 0 || px > rect.width || py > rect.height) return;
    var lens = ensureLens(card);
    if (!lens) return;
    if (lensCard && lensCard !== card) resetLens();
    lensCard = card;
    card.classList.add('is-lensing');
    var R = Math.max(56, Math.min(84, rect.width * 0.22));
    var img = lens.querySelector('img');
    lens.style.width = lens.style.height = (R * 2) + 'px';
    lens.style.left = (px - R) + 'px';
    lens.style.top = (py - R) + 'px';
    if (img) {
      img.style.width = rect.width + 'px';
      img.style.height = rect.height + 'px';
      img.style.transformOrigin = px + 'px ' + py + 'px';
      img.style.transform = 'translate(' + (-(px - R)) + 'px,' + (-(py - R)) + 'px) scale(1.9)';
    }
    card.style.setProperty('--mx', (px / rect.width * 100).toFixed(2) + '%');
    card.style.setProperty('--my', (py / rect.height * 100).toFixed(2) + '%');
  }

  function lensBind(root) {
    if (!root) return;
    root.addEventListener('pointermove', lensMove, { passive: true });
    root.addEventListener('pointerleave', resetLens, { passive: true });
  }
  lensBind(wall);
  lensBind(indexEl);
  document.addEventListener('work:open', resetLens);
  document.addEventListener('works:render', resetLens);
  document.addEventListener('scroll', function () {
    if (lensTimer) window.clearTimeout(lensTimer);
    lensTimer = window.setTimeout(function () { if (lensCard) resetLens(); }, 120);
  }, { passive: true });

  if (wall) {
    wall.addEventListener('pointerleave', resetLens, { passive: true });
  }

  /* ---------------- 5. 卡片光斑跟随 ---------------- */
  if (!coarse) {
    var cardTick = false;
    document.addEventListener('pointermove', function (e) {
      if (cardTick) return;
      cardTick = true;
      window.requestAnimationFrame(function () {
        cardTick = false;
        var card = e.target.closest ? e.target.closest('.work-card') : null;
        if (!card) return;
        var r = card.getBoundingClientRect();
        if (!r.width || !r.height) return;
        card.style.setProperty('--gx', ((e.clientX - r.left) / r.width * 100).toFixed(2) + '%');
        card.style.setProperty('--gy', ((e.clientY - r.top) / r.height * 100).toFixed(2) + '%');
      });
    }, { passive: true });
  }

  /* ---------------- 6. 语言切换后同步页码名牌 ---------------- */
  window.addEventListener('load', function () { updateDock(true); });
})();
