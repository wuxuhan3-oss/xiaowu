/* ============================================================
   art-resume.js — 简历在线预览（PDF 页面渲染图）
   ============================================================ */
(function () {
  'use strict';

  var RESUME = {
    zh: {
      pdf: 'assets/resume/吴旭涵_简历.pdf',
      download: '吴旭涵_简历.pdf',
      titleKey: 'contact.resumeZh',
      images: ['assets/resume/preview/zh-1.jpg']
    },
    en: {
      pdf: 'assets/resume/WuXuhan_Resume_EN.pdf',
      download: 'WuXuhan_Resume_EN.pdf',
      titleKey: 'contact.resumeEn',
      images: ['assets/resume/preview/en-1.jpg']
    }
  };

  var modal = document.getElementById('resumeModal');
  if (!modal) return;
  var title = document.getElementById('resumeTitle');
  var pageNow = document.getElementById('resumePageNow');
  var pageTotal = document.getElementById('resumePageTotal');
  var pagesWrap = document.getElementById('resumePagesWrap');
  var scrollBox = document.getElementById('resumeScroll');
  var dl = document.getElementById('resumeDownload');
  var closeBtn = document.getElementById('resumeClose');
  var current = null;
  var isOpen = false;
  var lastFocus = null;
  var pageEls = [];

  function T(key) { return window.I18N ? window.I18N.t(key) : key; }

  function tf(key, fallback) {
    try {
      var s = T(key);
      if (s && typeof s === 'string' && s.indexOf(key) !== 0) return s;
    } catch (e) {}
    return fallback;
  }

  /* 预览图/PDF 也带上 sharecode，避免无 cookie 环境下 403 */
  function sign(url) {
    var sc = '';
    try {
      var p = new URLSearchParams(location.search);
      sc = p.get('sharecode') || p.get('shareCode') || p.get('code') || '';
    } catch (e) {
      var m = /[?&](?:sharecode|shareCode|code)=([^&#]+)/.exec(location.search || '');
      sc = m ? decodeURIComponent(m[1]) : '';
    }
    if (!sc) return url;
    if (/[?&](?:sharecode|shareCode)=/i.test(url)) return url;
    return url + (url.indexOf('?') < 0 ? '?' : '&') + 'sharecode=' + encodeURIComponent(sc);
  }

  /* 单页加载失败时的降级卡片：提示 + 直开 PDF + 重试 */
  function buildFallback(cfg, retry) {
    var box = document.createElement('div');
    box.className = 'resume-page-fallback';

    var msg = document.createElement('p');
    msg.className = 'rf-msg';
    msg.textContent = tf('contact.resumeLoadFail', '预览图加载失败，网络或门禁拦截所致');

    var open = document.createElement('a');
    open.className = 'rf-btn rf-primary';
    open.href = sign(pdfHref(cfg));
    open.target = '_blank';
    open.rel = 'noopener';
    open.textContent = tf('contact.resumeOpenPdf', '新窗口打开 PDF');

    var again = document.createElement('button');
    again.type = 'button';
    again.className = 'rf-btn';
    again.textContent = tf('contact.resumeRetry', '重试加载');
    again.addEventListener('click', retry);

    box.appendChild(msg);
    box.appendChild(open);
    box.appendChild(again);
    return box;
  }

  function pdfHref(cfg) {
    var parts = cfg.pdf.split('/');
    var file = parts.pop();
    return parts.join('/') + '/' + encodeURIComponent(file);
  }

  function updateLang() {
    if (!isOpen || !current) return;
    if (title) title.textContent = T(RESUME[current].titleKey);
    pageEls.forEach(function (btn, i) {
      btn.setAttribute('aria-label', T(RESUME[current].titleKey) + ' ' + (i + 1) + ' / ' + pageEls.length);
    });
  }

  function updatePageNumber() {
    if (!pageEls.length || !scrollBox) return;
    var top = scrollBox.scrollTop;
    var idx = 0;
    for (var i = 0; i < pageEls.length; i++) {
      if (pageEls[i].offsetTop - 10 <= top) idx = i;
    }
    if (pageNow) pageNow.textContent = String(idx + 1);
  }

  function build(id) {
    var cfg = RESUME[id];
    if (!cfg) return;
    current = id;
    pageEls = [];
    pagesWrap.innerHTML = '';
    cfg.images.forEach(function (src, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'resume-page is-loading';
      btn.setAttribute('aria-pressed', 'false');
      btn.setAttribute('aria-label', T(cfg.titleKey) + ' ' + (i + 1) + ' / ' + cfg.images.length);
      var img = document.createElement('img');
      img.src = sign(src);
      img.alt = T(cfg.titleKey) + ' ' + (i + 1);
      img.draggable = false;
      img.decoding = 'async';

      function retry() {
        btn.classList.add('is-loading');
        btn.classList.remove('is-error');
        var old = btn.querySelector('.resume-page-fallback');
        if (old) old.remove();
        img.src = sign(src) + (sign(src).indexOf('?') < 0 ? '?' : '&') + 'r=' + Date.now();
      }

      img.addEventListener('load', function () {
        btn.classList.remove('is-loading');
      });
      img.addEventListener('error', function () {
        btn.classList.remove('is-loading');
        btn.classList.add('is-error');
        btn.appendChild(buildFallback(cfg, retry));
      });

      btn.appendChild(img);
      btn.addEventListener('click', function (e) {
        if (e.target.closest && e.target.closest('.resume-page-fallback')) return;
        var zoomed = btn.classList.toggle('is-zoomed');
        btn.setAttribute('aria-pressed', zoomed ? 'true' : 'false');
      });
      pagesWrap.appendChild(btn);
      pageEls.push(btn);
    });
    if (title) title.textContent = T(cfg.titleKey);
    if (pageNow) pageNow.textContent = '1';
    if (pageTotal) pageTotal.textContent = String(cfg.images.length);
    if (dl) {
      dl.setAttribute('href', sign(pdfHref(cfg)));
      dl.setAttribute('download', cfg.download);
    }
    if (scrollBox) scrollBox.scrollTop = 0;
  }

  function open(id) {
    var cfg = RESUME[id];
    if (!cfg) return;
    lastFocus = document.activeElement;
    build(id);
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-resume-open');
    isOpen = true;
    if (scrollBox) scrollBox.scrollTop = 0;
    if (closeBtn) setTimeout(function () { closeBtn.focus(); }, 60);
  }

  function close() {
    if (!isOpen) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-resume-open');
    isOpen = false;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.addEventListener('click', function (e) {
    var trigger = e.target.closest ? e.target.closest('[data-resume-preview]') : null;
    if (trigger) {
      e.preventDefault();
      var id = trigger.getAttribute('data-resume-preview');
      if (id === 'auto') id = (window.I18N && window.I18N.lang === 'zh') ? 'zh' : 'en';
      open(id);
      return;
    }
    if (e.target.closest && (e.target.closest('#resumeClose') || e.target.closest('[data-resume-close]'))) {
      e.preventDefault();
      close();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (!isOpen) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === 'Tab') {
      var nodes = Array.prototype.slice.call(modal.querySelectorAll('a[href],button:not([disabled])')).filter(function (n) { return n.offsetParent !== null; });
      if (!nodes.length) return;
      var first = nodes[0], last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  if (scrollBox) {
    var tick = false;
    scrollBox.addEventListener('scroll', function () {
      if (tick) return;
      tick = true;
      window.requestAnimationFrame(function () { tick = false; updatePageNumber(); });
    }, { passive: true });
  }

  document.addEventListener('lang:change', updateLang);
})();
