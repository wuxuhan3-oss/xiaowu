/* ============================================================
   art-core.js — 作品档案、筛选、索引、展映弹窗、轻提示
   暴露 window.UI；渲染后广播 works:render
   ============================================================ */
(function () {
  'use strict';

  var works = Array.isArray(window.WORKS) ? window.WORKS : [];
  var cats = window.CATEGORIES || {};
  var state = { filter: 'all', view: 'wall', current: -1, visible: [], order: [], pos: -1 };

  var byId = function (id) { return document.getElementById(id); };
  var all = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var T = function (key, vars) { return window.I18N ? window.I18N.t(key, vars) : key; };
  function tr(w, field) {
    var l = (window.I18N && window.I18N.lang) || 'zh';
    if (w && w.i18n && w.i18n[l] && w.i18n[l][field]) return w.i18n[l][field];
    return w && w[field] != null ? w[field] : '';
  }
  function catName(c) { return T('cat.' + c); }

  var wall = byId('worksWall');
  var indexEl = byId('worksIndex');
  var filterBar = byId('filterBar');
  var viewToggle = byId('viewToggle');
  var worksTotal = byId('worksTotal');

  /* ---------------- 轻提示 ---------------- */
  var toastEl = byId('toast');
  var toastTimer = null;
  function toast(text) {
    if (!toastEl) return;
    toastEl.textContent = text;
    toastEl.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-show'); }, 2200);
  }

  /* ---------------- 渲染 ---------------- */
  function listFor(filter) {
    if (filter === 'all') return works.map(function (w, i) { return { w: w, i: i }; });
    return works.map(function (w, i) { return { w: w, i: i }; })
      .filter(function (o) { return o.w.category === filter; });
  }

  function renderCounts() {
    all('.filter-btn', filterBar).forEach(function (btn) {
      var f = btn.getAttribute('data-filter');
      var span = btn.querySelector('.f-count');
      if (!span) return;
      var n = f === 'all' ? works.length : works.filter(function (w) { return w.category === f; }).length;
      span.textContent = n;
    });
    if (worksTotal) worksTotal.textContent = works.length;
  }

  var SPANS = [6, 6, 4, 4, 4];

  function coverHTML(w, gi, pos) {
    var span = SPANS[pos % SPANS.length];
    var no = pad(gi + 1);
    var video = w.videoPath ? ' data-video="' + esc(w.videoPath) + '"' : '';
    var preview = w.preview ? ' data-preview="' + esc(w.preview) + '"' : '';
    var poster = w.poster ? ' data-poster="' + esc(w.poster) + '"' : '';
    var portrait = w.portrait ? ' is-portrait' : '';
    var still = w.poster ? '<img class="cover-still" src="' + esc(w.poster) + '" alt="" decoding="async">' : '';
    var dur = w.duration ? '<span class="cover-time">' + esc(w.duration) + '</span>' : '';
    var title = tr(w, 'title');
    var sub = tr(w, 'sub');
    return '' +
      '<article class="work-card span-' + span + portrait + '" data-index="' + gi + '" data-cat="' + esc(w.category) + '"' + video + preview + poster +
        ' data-cursor="' + esc(T('works.cursor')) + '" tabindex="0" role="button" aria-label="' + esc(T('aria.workOpen', { title: title })) + '">' +
        '<div class="work-cover">' +
          '<div class="cover-art">' + still +
            '<span class="cover-cat">' + esc(catName(w.category)) + '</span>' + dur +
            '<span class="cover-no" aria-hidden="true">' + no + '</span>' +
            '<h3 class="cover-title">' + esc(title) + '</h3>' +
            '<span class="cover-meta">' + esc(sub) + '</span>' +
          '</div>' +
          '<span class="cover-shade" aria-hidden="true"></span>' +
          '<span class="cover-play" aria-hidden="true"><i></i></span>' +
        '</div>' +
        '<div class="work-info">' +
          '<p class="work-line"><span class="work-no">NO.' + no + '</span><span class="work-cat">' + esc(catName(w.category)) + '</span></p>' +
          '<h4 class="work-name">' + esc(title) + '</h4>' +
          '<p class="work-sub">' + esc(sub) + (w.duration ? ' · ' + esc(w.duration) : '') + '</p>' +
          '<span class="work-cta" aria-hidden="true">' + esc(T('works.cta')) + ' <i>↗</i></span>' +
        '</div>' +
      '</article>';
  }

  function renderWall(filter) {
    var list = listFor(filter);
    state.visible = list.map(function (o) { return o.i; });
    var html = '';
    list.forEach(function (o, pos) { html += coverHTML(o.w, o.i, pos); });
    if (!html) html = '<p class="works-empty">' + esc(T('works.empty')) + '</p>';
    wall.innerHTML = html;
  }

  function renderIndex(filter) {
    var list = listFor(filter);
    state.visible = list.map(function (o) { return o.i; });
    var html = '';
    list.forEach(function (o) {
      var w = o.w;
      var no = pad(o.i + 1);
      var title = tr(w, 'title');
      var sub = tr(w, 'sub');
      html +=
        '<div class="index-row" data-index="' + o.i + '" data-cat="' + esc(w.category) + '"' +
          (w.videoPath ? ' data-video="' + esc(w.videoPath) + '"' : '') +
          (w.poster ? ' data-poster="' + esc(w.poster) + '"' : '') +
          ' data-no="' + no + '" data-title="' + esc(title) + '"' +
          ' data-cursor="' + esc(T('works.cursor')) + '" tabindex="0" role="button" aria-label="' + esc(T('aria.workOpen', { title: title })) + '">' +
          '<span class="idx-no">' + no + '</span>' +
          '<span class="idx-cat">' + esc(catName(w.category)) + '</span>' +
          '<h3 class="idx-title">' + esc(title) + '</h3>' +
          '<span class="idx-sub">' + esc(sub) + (w.duration ? ' · ' + esc(w.duration) : '') + '</span>' +
          '<span class="idx-arrow" aria-hidden="true">↗</span>' +
        '</div>';
    });
    indexEl.innerHTML = html || '<p class="works-empty">' + esc(T('works.empty')) + '</p>';
  }

  function render() {
    if (state.view === 'index') {
      wall.hidden = true;
      indexEl.hidden = false;
      renderIndex(state.filter);
    } else {
      indexEl.hidden = true;
      wall.hidden = false;
      renderWall(state.filter);
    }
    document.dispatchEvent(new CustomEvent('works:render', {
      detail: { count: state.visible.length, view: state.view, filter: state.filter }
    }));
  }

  /* ---------------- 筛选 / 视图 ---------------- */
  if (filterBar) {
    filterBar.addEventListener('click', function (e) {
      var btn = e.target.closest('.filter-btn');
      if (!btn) return;
      var f = btn.getAttribute('data-filter');
      if (f === state.filter) return;
      state.filter = f;
      all('.filter-btn', filterBar).forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      render();
      var n = f === 'all' ? works.length : state.visible.length;
      toast(T('toast.filter', { cat: f === 'all' ? T('filters.all') : catName(f), n: n }));
    });
  }

  if (viewToggle) {
    viewToggle.addEventListener('click', function (e) {
      var btn = e.target.closest('.view-btn');
      if (!btn) return;
      var v = btn.getAttribute('data-view');
      if (v === state.view) return;
      state.view = v;
      all('.view-btn', viewToggle).forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      render();
      toast(v === 'index' ? T('toast.viewIndex') : T('toast.viewWall'));
    });
  }

  /* ---------------- 展映弹窗 ---------------- */
  var modal = byId('workModal');
  var stage = byId('modalStage');
  var stageArt = byId('stageArt');
  var stageNo = byId('stageNo');
  var stageCat = byId('stageCat');
  var stageTitle = byId('stageTitle');
  var stageNote = byId('stageNote');
  var video = byId('stageVideo');
  var stagePlay = byId('stagePlay');
  var ctrlPlay = byId('ctrlPlay');
  var ctrlCurrent = byId('ctrlCurrent');
  var ctrlDuration = byId('ctrlDuration');
  var ctrlProgress = byId('ctrlProgress');
  var ctrlBar = byId('ctrlBar');
  var ctrlKnob = byId('ctrlKnob');
  var ctrlMute = byId('ctrlMute');
  var ctrlVolume = byId('ctrlVolume');
  var ctrlVolVal = byId('ctrlVolVal');
  var modeBtns = all('.mode-btn');
  var modalNo = byId('modalNo');
  var modalTotal = byId('modalTotal');
  var modalCat = byId('modalCat');
  var modalTitle = byId('modalTitle');
  var modalSub = byId('modalSub');
  var modalDesc = byId('modalDesc');
  var metaCat = byId('metaCat');
  var metaNo = byId('metaNo');
  var metaDur = byId('metaDur');
  var stageStill = byId('stageStill');
  var activeIndex = -1;
  var lastFocus = null;
  var modalOpen = false;

  function fmt(t) {
    if (!isFinite(t) || t < 0) t = 0;
    var m = Math.floor(t / 60);
    var s = Math.floor(t % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function updateTime() {
    if (!video) return;
    var d = video.duration || 0;
    var c = video.currentTime || 0;
    if (ctrlCurrent) ctrlCurrent.textContent = fmt(c);
    if (ctrlDuration) ctrlDuration.textContent = fmt(d);
    var p = d ? (c / d) * 100 : 0;
    if (ctrlBar) ctrlBar.style.width = p + '%';
    if (ctrlKnob) ctrlKnob.style.left = p + '%';
    if (ctrlProgress) ctrlProgress.setAttribute('aria-valuenow', Math.round(p));
  }

  var zoomMode = 'original';
  var VOL_KEY = 'bbx-bgm-volume';
  var lastVolume = 0.65;
  try { var savedVol = parseFloat(localStorage.getItem(VOL_KEY)); if (savedVol >= 0 && savedVol <= 1) lastVolume = savedVol; } catch (e) {}

  function syncVolume() {
    if (!video) return;
    var pos = Math.round(video.volume * 100);
    if (ctrlVolume) {
      ctrlVolume.value = String(pos);
      ctrlVolume.style.setProperty('--vol', pos + '%');
    }
    if (ctrlVolVal) ctrlVolVal.textContent = String(pos);
    if (ctrlMute) {
      ctrlMute.textContent = video.muted ? 'VOL' : 'MUTE';
      ctrlMute.classList.toggle('is-muted', video.muted);
      ctrlMute.setAttribute('aria-pressed', video.muted ? 'true' : 'false');
      ctrlMute.setAttribute('aria-label', video.muted ? T('aria.unmute') : T('aria.mute'));
    }
  }

  function applyVolume(pct, unmute) {
    if (!video) return;
    var v = Math.max(0, Math.min(100, pct)) / 100;
    video.volume = v;
    if (v > 0) lastVolume = v;
    video.muted = unmute ? (v === 0) : true;
    try { localStorage.setItem(VOL_KEY, String(lastVolume)); } catch (e) {}
    syncVolume();
  }

  function toggleMute() {
    if (!video) return;
    if (video.muted) {
      applyVolume(Math.round((lastVolume || 0.65) * 100), true);
    } else {
      video.muted = true;
      syncVolume();
    }
  }

  function updateModeBtns() {
    if (!modal) return;
    all('.mode-btn', modal).forEach(function (btn) {
      var on = btn.getAttribute('data-zoom') === zoomMode;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function resetZoom() {
    if (!modal) return;
    modal.classList.remove('zoom-half', 'zoom-full');
    zoomMode = 'original';
    updateModeBtns();
    if (stage) {
      stage.style.transition = '';
      stage.style.transform = '';
      stage.style.transformOrigin = '';
    }
  }

  function setZoom(mode, animate) {
    if (!modal || !stage || mode === zoomMode) return;
    var first = (animate === false) ? null : stage.getBoundingClientRect();
    modal.classList.remove('zoom-half', 'zoom-full');
    if (mode === 'half') modal.classList.add('zoom-half');
    if (mode === 'full') modal.classList.add('zoom-full');
    zoomMode = mode;
    updateModeBtns();
    if (first) {
      var last = stage.getBoundingClientRect();
      if (first.width && first.height && last.width && last.height) {
        var dx = first.left - last.left;
        var dy = first.top - last.top;
        var sx = first.width / last.width;
        var sy = first.height / last.height;
        stage.style.transition = 'none';
        stage.style.transformOrigin = 'top left';
        stage.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + sx + ',' + sy + ')';
        void stage.offsetWidth;
        stage.style.transition = 'transform .58s cubic-bezier(.16,1,.3,1)';
        stage.style.transform = 'none';
        window.setTimeout(function () {
          stage.style.transition = '';
          stage.style.transform = '';
          stage.style.transformOrigin = '';
        }, 620);
      }
    }
  }

  if (video) { video.volume = lastVolume; video.muted = true; }

  function resetVideo() {
    if (!video) return;
    try { video.pause(); } catch (err) {}
    video.removeAttribute('src');
    video.removeAttribute('poster');
    if (stageStill) { stageStill.hidden = true; stageStill.removeAttribute('src'); }
    try { video.load(); } catch (err) {}
    stage.classList.remove('is-ready-video', 'is-playing', 'has-video', 'video-error');
    if (stageNote) { stageNote.textContent = T('modal.stageNote'); stageNote.classList.remove('is-error'); }
    if (stagePlay) stagePlay.disabled = true;
    if (ctrlPlay) ctrlPlay.textContent = '▶';
    updateTime();
  }

  function loadVideo(w) {
    if (!w || !w.videoPath || !video) return;
    stage.classList.add('has-video');
    if (stagePlay) stagePlay.disabled = false;
    if (w.poster) video.setAttribute('poster', w.poster);
    video.src = w.videoPath;
    try { video.load(); } catch (err) {}
  }

  if (video) {
    video.addEventListener('loadedmetadata', function () {
      if (ctrlDuration) ctrlDuration.textContent = fmt(video.duration);
      updateTime();
    });
    video.addEventListener('playing', function () {
      stage.classList.add('is-ready-video');
    });
    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('play', function () {
      stage.classList.add('is-playing');
      if (ctrlPlay) ctrlPlay.textContent = '❚❚';
    });
    video.addEventListener('pause', function () {
      stage.classList.remove('is-playing');
      if (ctrlPlay) ctrlPlay.textContent = '▶';
    });
    video.addEventListener('ended', function () {
      stage.classList.remove('is-playing');
      if (ctrlPlay) ctrlPlay.textContent = '▶';
    });
    video.addEventListener('error', function () {
      stage.classList.remove('is-ready-video', 'has-video');
      stage.classList.add('video-error');
      if (stageNote) {
        stageNote.textContent = T('modal.errorNote');
        stageNote.classList.add('is-error');
      }
      if (stagePlay) stagePlay.disabled = true;
      toast(T('toast.videoError'));
    });
  }

  function togglePlay() {
    if (!video || !video.getAttribute('src')) return;
    if (video.paused) {
      var p = video.play();
      if (p && p.catch) p.catch(function () { toast(T('modal.playBlocked')); });
    } else {
      video.pause();
    }
  }

  function populate(index) {
    var w = works[index];
    if (!w) return;
    resetVideo();
    activeIndex = index;
    var pos = state.order.indexOf(index);
    if (pos < 0) pos = 0;
    state.pos = pos;
    var no = pad(index + 1);
    if (modalNo) modalNo.textContent = pad(pos + 1);
    if (modalTotal) modalTotal.textContent = state.order.length < 10 ? pad(state.order.length) : String(state.order.length);
    if (modalCat) modalCat.textContent = catName(w.category);
    if (modalTitle) modalTitle.textContent = tr(w, 'title');
    if (modalSub) modalSub.textContent = (catName(w.category)) + ' · ' + tr(w, 'sub');
    if (modalDesc) modalDesc.textContent = tr(w, 'desc');
    if (metaCat) metaCat.textContent = catName(w.category);
    if (metaDur) metaDur.textContent = w.duration || '—';
    if (metaNo) metaNo.textContent = 'NO.' + no;
    if (stage) stage.setAttribute('data-cat', w.category);
    if (stageNo) stageNo.textContent = no;
    if (stageCat) stageCat.textContent = catName(w.category);
    if (stageTitle) stageTitle.textContent = tr(w, 'title');
    if (stageNote) {
      stageNote.classList.remove('is-error');
      stageNote.textContent = w.videoPath ? T('modal.stageNote') : T('modal.stageNoteMov');
    }
    if (stageStill) {
      if (w.poster) { stageStill.src = w.poster; stageStill.hidden = false; }
      else { stageStill.hidden = true; stageStill.removeAttribute('src'); }
    }
    loadVideo(w);
    syncVolume();
  }

  var FOCUSABLE = 'button:not([disabled]),a[href],video,[tabindex]:not([tabindex="-1"])';

  function openWork(index) {
    if (!modal || modalOpen) return;
    if (index < 0 || index >= works.length) return;
    lastFocus = document.activeElement;
    state.order = (state.visible.indexOf(index) >= 0 ? state.visible.slice() : works.map(function (_, i) { return i; }));
    state.pos = Math.max(state.order.indexOf(index), 0);
    populate(index);
    resetZoom();
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-modal-open');
    modalOpen = true;
    var closeBtn = byId('modalClose');
    if (closeBtn) setTimeout(function () { closeBtn.focus(); }, 80);
    document.dispatchEvent(new CustomEvent('work:open', { detail: { index: index } }));
  }

  function closeWork() {
    if (!modal || !modalOpen) return;
    resetZoom();
    resetVideo();
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-modal-open');
    modalOpen = false;
    activeIndex = -1;
    document.dispatchEvent(new CustomEvent('work:close'));
    if (lastFocus && lastFocus.isConnected && lastFocus.focus) lastFocus.focus();
  }

  function step(dir) {
    if (!modalOpen) return;
    var order = state.order.length ? state.order : works.map(function (_, i) { return i; });
    var pos = (state.pos + dir + order.length) % order.length;
    populate(order[pos]);
  }

  function onCardActivate(e) {
    var card = e.target.closest('.work-card, .index-row');
    if (!card) return;
    var idx = parseInt(card.getAttribute('data-index'), 10);
    if (isNaN(idx)) return;
    openWork(idx);
  }
  if (wall) {
    wall.addEventListener('click', onCardActivate);
    wall.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        if (e.target.closest('.work-card')) { e.preventDefault(); onCardActivate(e); }
      }
    });
  }
  if (indexEl) {
    indexEl.addEventListener('click', onCardActivate);
    indexEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        if (e.target.closest('.index-row')) { e.preventDefault(); onCardActivate(e); }
      }
    });
  }

  if (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target.closest('[data-close]') || e.target.closest('#modalClose')) {
        e.preventDefault();
        closeWork();
      }
    });
    var prevBtn = byId('prevWork');
    var nextBtn = byId('nextWork');
    var closeBtn = byId('modalClose');
    if (prevBtn) prevBtn.addEventListener('click', function () { step(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { step(1); });
    if (closeBtn) closeBtn.addEventListener('click', closeWork);
    if (stagePlay) stagePlay.addEventListener('click', togglePlay);
    if (ctrlPlay) ctrlPlay.addEventListener('click', togglePlay);
    if (stage) stage.addEventListener('click', function (e) {
      if (e.target.closest('.stage-controls') || e.target.closest('.stage-play')) return;
      if (video && video.getAttribute('src')) togglePlay();
    });
    if (ctrlMute) ctrlMute.addEventListener('click', toggleMute);
    if (ctrlVolume) ctrlVolume.addEventListener('input', function () {
      applyVolume(parseInt(ctrlVolume.value, 10) || 0, true);
    });
    all('.mode-btn', modal).forEach(function (btn) {
      btn.addEventListener('click', function () {
        setZoom(btn.getAttribute('data-zoom') || 'original');
      });
    });
    if (video) video.addEventListener('volumechange', syncVolume);
    if (ctrlProgress) {
      var seekFromEvent = function (e) {
        var r = ctrlProgress.getBoundingClientRect();
        var ratio = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);
        if (video && isFinite(video.duration)) video.currentTime = ratio * video.duration;
      };
      var dragging = false;
      ctrlProgress.addEventListener('pointerdown', function (e) {
        dragging = true;
        ctrlProgress.setPointerCapture && ctrlProgress.setPointerCapture(e.pointerId);
        seekFromEvent(e);
      });
      ctrlProgress.addEventListener('pointermove', function (e) { if (dragging) seekFromEvent(e); });
      ctrlProgress.addEventListener('pointerup', function () { dragging = false; });
      ctrlProgress.addEventListener('pointercancel', function () { dragging = false; });
      ctrlProgress.addEventListener('keydown', function (e) {
        if (!video) return;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          video.currentTime = Math.min(Math.max(video.currentTime + (e.key === 'ArrowRight' ? 5 : -5), 0), video.duration || 0);
        }
      });
    }

    document.addEventListener('keydown', function (e) {
      if (!modalOpen) return;
      if (e.key === 'Escape') { e.preventDefault(); if (zoomMode !== 'original') { setZoom('original'); return; } closeWork(); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); return; }
      if (e.key === ' ' || e.key === 'Spacebar') {
        var tag = (e.target && e.target.tagName) || '';
        if (tag === 'VIDEO' || tag === 'BUTTON' || tag === 'A') return;
        e.preventDefault();
        togglePlay();
      }
      if (e.key === 'Tab') {
        var nodes = all(FOCUSABLE, modal).filter(function (n) { return n.offsetParent !== null; });
        if (!nodes.length) return;
        var first = nodes[0], last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ---------------- 语言切换 ---------------- */
  document.addEventListener('lang:change', function () {
    renderCounts();
    render();
    if (modalOpen && activeIndex >= 0) populate(activeIndex);
    syncVolume();
  });

  /* ---------------- 初始化 ---------------- */
  renderCounts();
  render();

  /* 兜底：即使动效层异常，也解锁首屏；并在入场后统一揭示，保证全页可截图/可读 */
  setTimeout(function () {
    document.body.classList.add('is-ready');
    var els = document.querySelectorAll('[data-reveal], .work-card');
    for (var i = 0; i < els.length; i++) els[i].classList.add('is-in');
  }, 3600);
  setTimeout(function () {
    var els = document.querySelectorAll('[data-reveal], .work-card');
    for (var i = 0; i < els.length; i++) els[i].classList.add('is-in');
  }, 1700);

  window.UI = {
    toast: toast,
    openWork: openWork,
    closeWork: closeWork,
    state: state
  };
})();