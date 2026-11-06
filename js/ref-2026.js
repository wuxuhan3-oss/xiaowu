/* =============================================================================
 * ref-2026.js — BLACK BOX ARCHIVE / 「静默展陈」2026 动效层
 *
 * 与 CSS（css/ref-2026.css，visual-designer 负责）的类名契约：
 *   html.ref-2026                 本层启用（脚本解析即加，供 CSS 作用域）
 *   html.ref-reduced              prefers-reduced-motion：CSS 可据此兜底
 *   .ref-reveal                   标题目标「待揭示」（仅 JS 加；CSS 负责初始隐藏态）
 *   .ref-in                       进入视口（一次性；CSS 负责终态/动画）
 *   html.ref-hero-ready           Hero 静帧就绪（CSS 从 scale(1.06) → 1，1.6s）
 *   .hero 上的 --ref-hero-y       滚动视差位移百分比（CSS 用于 .hero-still 的 translateY）
 *   .site-header.ref-header-hidden  向下滚动隐藏 / 向上显示
 *
 * 设计原则：位移、缩放、时长全部交给 CSS；本脚本只负责状态类与 CSS 变量。
 * 尊重 prefers-reduced-motion：不加 .ref-reveal，不启用视差与页头隐藏。
 * 不改 art-motion.js / art-core.js，不碰 [data-reveal] 既有逻辑；
 * 独立 IIFE + try/catch，任何异常都不会白屏。
 * ========================================================================== */
(function () {
  'use strict';

  if (window.__REF2026_MOTION__) return;
  window.__REF2026_MOTION__ = true;

  var docEl = document.documentElement;
  var TITLE_SEL = '.hero-brand, .section-title, .contact-title, .about-quote';

  /* ------------------------------ 环境探测 ------------------------------ */

  function mq(query) {
    try { return window.matchMedia ? window.matchMedia(query) : null; } catch (e) { return null; }
  }
  function matches(m) { return !!(m && m.matches); }

  var mqReduce = mq('(prefers-reduced-motion: reduce)');
  var mqFine = mq('(pointer: fine)');
  var mqCoarse = mq('(pointer: coarse)');

  var reduce = matches(mqReduce);
  var fine = matches(mqFine);
  var coarse = matches(mqCoarse);
  var pointerFine = fine && !coarse;      // 触屏 / 粗指针不启用视差
  var parallaxOK = pointerFine && !reduce;

  /* ------------------------------ 工具 ------------------------------ */

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) {
    try {
      return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
    } catch (e) { return []; }
  }
  function listen(target, type, fn, opts) {
    if (!target) return;
    var options = (opts === undefined) ? { passive: true } : opts;
    try { target.addEventListener(type, fn, options); }
    catch (e) {
      try { target.addEventListener(type, fn, false); } catch (e2) { /* 放弃 */ }
    }
  }
  function ready(fn) {
    try {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fn, { once: true });
      } else { fn(); }
    } catch (e) { try { fn(); } catch (e2) {} }
  }

  /* 解析阶段就加上作用域类，供 CSS 尽早生效（幂等） */
  try {
    docEl.classList.add('ref-2026');
    if (reduce) docEl.classList.add('ref-reduced');
  } catch (e) { /* 忽略 */ }

  /* -------------------------- 过渡兜底样式 -------------------------- */
  /* 仅当 css/ref-2026.css 尚未就绪（未加载或规则为空）时注入，
   * 用于验证类行为；一旦设计 CSS 落地即不再注入。最终视觉以 CSS 为准。 */

  function hasDesignCss() {
    try {
      var sheets = document.styleSheets || [];
      for (var i = 0; i < sheets.length; i++) {
        var href = sheets[i].href || '';
        if (href.indexOf('ref-2026.css') === -1) continue;
        try {
          if (sheets[i].cssRules && sheets[i].cssRules.length) return true;
        } catch (e) {
          return true; // 跨域读不到规则，视作已就绪
        }
        return false; // 找到样式表但还没有规则
      }
    } catch (e) { /* 忽略 */ }
    return false;
  }

  function injectFallback() {
    if (hasDesignCss()) return false;
    var css = [
      '/* ref-2026.js 过渡兜底（CSS 就绪后不再注入） */',
      'html.ref-2026 .ref-reveal:not(.ref-in){',
      '  opacity:1;',
      '  clip-path:inset(0 0 100% 0);',
      '  transform:translateY(28px);',
      '  transition:clip-path .9s cubic-bezier(.16,1,.3,1) var(--d,0ms),',
      '             transform .9s cubic-bezier(.16,1,.3,1) var(--d,0ms);',
      '}',
      'html.ref-2026 .ref-reveal.ref-in{opacity:1;clip-path:inset(0 0 0 0);transform:none}',
      'html.ref-2026 .hero-still{transform:translateY(var(--ref-hero-y,0));will-change:transform}',
      'html.ref-2026 .hero-still img{animation:none;transform:scale(1.06);',
      '  transition:transform 1.6s cubic-bezier(.16,1,.3,1)}',
      'html.ref-2026.ref-hero-ready .hero-still img{transform:scale(1)}',
      'html.ref-2026 .site-header{transition:transform .4s cubic-bezier(.16,1,.3,1),',
      '  background .5s cubic-bezier(.16,1,.3,1),color .5s cubic-bezier(.16,1,.3,1),',
      '  padding .5s cubic-bezier(.16,1,.3,1),border-color .5s ease}',
      'html.ref-2026 .site-header.ref-header-hidden{transform:translateY(-101%)}',
      '@media(prefers-reduced-motion:reduce){',
      '  html.ref-2026 .ref-reveal:not(.ref-in),html.ref-2026 .ref-reveal.ref-in{',
      '    clip-path:none;transform:none;transition:none;opacity:1}',
      '  html.ref-2026 .hero-still,html.ref-2026 .hero-still img,',
      '  html.ref-2026.ref-hero-ready .hero-still img{',
      '    transform:none;transition:none;animation:none}',
      '  html.ref-2026 .site-header{transform:none;transition:none}',
      '}'
    ].join('\n');
    try {
      var style = document.createElement('style');
      style.id = 'ref-2026-fallback';
      style.setAttribute('data-ref2026-fallback', '1');
      style.textContent = css;
      (document.head || docEl).appendChild(style);
      return true;
    } catch (e) { return false; }
  }

  /* -------------------------- 就绪闸门（复用 is-ready） -------------------------- */

  function whenPageReady(fn) {
    var done = false;
    function fire() { if (done) return; done = true; try { fn(); } catch (e) {} }
    if (document.body && document.body.classList.contains('is-ready')) { fire(); return; }
    var tries = 0;
    var timer = window.setInterval(function () {
      tries++;
      if (!document.body || document.body.classList.contains('is-ready') || tries > 40) {
        window.clearInterval(timer);
        fire();
      }
    }, 120);
  }

  /* -------------------------- 1. 标题遮罩揭示 -------------------------- */
  /* 关键实现说明：Chrome 的 IntersectionObserver 会把目标元素自身的 clip-path
   * 计入交叉矩形——标题被 .ref-reveal 的 inset(0 0 100% 0) 裁掉后 ratio 恒为 0，
   * 直接观察被遮罩元素永远不会触发（实测 Chrome 156）。因此这里：
   *   1) IO 观察标题的父容器（不被遮罩），threshold 0.15，作为主触发；
   *   2) 再按设计语义对标题自身做「可见面积 ≥ 15%」校验（滚动 / resize / 定时），
   *      覆盖父容器过高 ratio 到不了 0.15、以及无 IO / rAF 被节流的场景。
   * 两条路径都只加一次 .ref-in；CSS 契约不变。 */

  var revealIO = null;
  var revealItems = [];
  var lastCheck = 0;
  var firstScanDone = false;

  function addClassSafe(el, cls) { try { el.classList.add(cls); } catch (e) {} }

  /* delay：同批 stagger 毫秒（上限 320ms）；hero-brand 恒为 0 */
  function markShown(item, delay) {
    if (!item || item.shown) return;
    item.shown = true;
    try {
      var d = item.isHero ? 0 : Math.min(delay || 0, 320);
      item.el.style.setProperty('--d', d + 'ms');
    } catch (e) {}
    addClassSafe(item.el, 'ref-in');
    if (item.trigger && revealIO) { try { revealIO.unobserve(item.trigger); } catch (e) {} }
  }

  function revealAllNow() {
    for (var i = 0; i < revealItems.length; i++) markShown(revealItems[i], i * 80);
    try { if (revealIO) revealIO.disconnect(); } catch (e) {}
  }

  function findItemByTrigger(trigger) {
    for (var j = 0; j < revealItems.length; j++) {
      if (revealItems[j].trigger === trigger) return revealItems[j];
    }
    return null;
  }

  function onReveal(entries) {
    var batch = 0;
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      if (!entry.isIntersecting) continue;
      var item = findItemByTrigger(entry.target);
      if (!item || item.shown) {
        try { revealIO.unobserve(entry.target); } catch (e) {}
        continue;
      }
      markShown(item, batch * 80);
      batch++;
    }
  }

  /* 标题自身可见面积比例 ≥ 0.15 即揭示（与 IO threshold 0.15 对齐） */
  function checkVisibility() {
    var vw = window.innerWidth || docEl.clientWidth || 0;
    var vh = window.innerHeight || docEl.clientHeight || 0;
    if (!vw || !vh) return;
    var batch = 0;
    for (var i = 0; i < revealItems.length; i++) {
      var item = revealItems[i];
      if (item.shown) continue;
      var rect;
      try { rect = item.el.getBoundingClientRect(); } catch (e) { continue; }
      if (!rect.width || !rect.height) continue;
      var left = Math.max(rect.left, 0);
      var top = Math.max(rect.top, 0);
      var right = Math.min(rect.right, vw);
      var bottom = Math.min(rect.bottom, vh);
      if (right <= left || bottom <= top) continue;
      var ratio = ((right - left) * (bottom - top)) / (rect.width * rect.height);
      if (ratio >= 0.15) { markShown(item, batch * 80); batch++; }
    }
  }

  /* 与视口有任意相交即揭示（兜底口径：首屏 / 异常场景不让标题停留在隐藏态） */
  function revealVisibleNow() {
    var vw = window.innerWidth || docEl.clientWidth || 0;
    var vh = window.innerHeight || docEl.clientHeight || 0;
    if (!vw || !vh) return;
    var batch = 0;
    for (var i = 0; i < revealItems.length; i++) {
      var item = revealItems[i];
      if (item.shown) continue;
      var rect;
      try { rect = item.el.getBoundingClientRect(); } catch (e) { continue; }
      if (!rect.width || !rect.height) continue;
      if (rect.top >= vh || rect.bottom <= 0 || rect.left >= vw || rect.right <= 0) continue;
      markShown(item, batch * 80);
      batch++;
    }
  }

  /* 首次扫描：同步揭示首屏目标，再观察剩余元素（只做一次） */
  function firstScan() {
    if (firstScanDone) return;
    firstScanDone = true;
    try { checkVisibility(); } catch (e) {}
    try { revealVisibleNow(); } catch (e) {}   // 已在视口内的直接加 .ref-in
    if (!revealIO) return;
    for (var j = 0; j < revealItems.length; j++) {
      var item = revealItems[j];
      if (!item.trigger || item.shown) continue;
      try { revealIO.observe(item.trigger); } catch (e) {}
    }
  }

  function initReveal() {
    var els = $$(TITLE_SEL);
    revealItems = [];
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (!el) continue;
      var parent = el.parentElement;
      revealItems.push({
        el: el,
        trigger: (parent && parent !== document.body && parent !== docEl) ? parent : null,
        isHero: el.classList.contains('hero-brand'),
        shown: el.classList.contains('ref-in')
      });
    }
    if (!revealItems.length) return;

    if (reduce) { revealAllNow(); return; }          // 减动效：直接终态

    // 先标记“待揭示”，CSS 据此设置初始隐藏态（无该 CSS 时什么也不隐藏）
    for (var k = 0; k < revealItems.length; k++) addClassSafe(revealItems[k].el, 'ref-reveal');

    if ('IntersectionObserver' in window) {
      try {
        revealIO = new IntersectionObserver(onReveal, { threshold: 0.15 });
      } catch (e) { revealIO = null; }
    }

    // 主路径：立即同步扫描首屏（不受 body.is-ready 迟到 / 定时器节流影响），
    // 再观察剩余元素。firstScan 幂等，以下两路只是补扫。
    firstScan();
    whenPageReady(firstScan);
    window.setTimeout(firstScan, 600);

    // 滚动 / resize 时按标题自身 0.15 可见比例校验（100ms 节流）
    function onScroll() {
      var now = (Date.now ? Date.now() : new Date().getTime());
      if (now - lastCheck < 100) return;
      lastCheck = now;
      checkVisibility();
    }
    listen(window, 'scroll', onScroll, { passive: true });
    listen(window, 'resize', onScroll, { passive: true });

    // 兜底定时器：1.5s / 3.2s 后把视口内仍未揭示的元素全部揭示
    window.setTimeout(revealVisibleNow, 1500);
    window.setTimeout(revealVisibleNow, 3200);

    // 页面恢复可见 / 从往返缓存恢复时补扫
    function onWake() {
      try {
        if (!firstScanDone) firstScan();
        else { checkVisibility(); revealVisibleNow(); }
      } catch (e) {}
    }
    listen(document, 'visibilitychange', onWake, { passive: true });
    listen(window, 'pageshow', onWake, { passive: true });
  }

  /* -------------------------- 2. Hero 静帧入场 -------------------------- */

  function initHero() {
    var img = $('.hero-still img');
    var fired = false;
    function enter() {
      if (fired) return;
      fired = true;
      whenPageReady(function () {
        try { docEl.classList.add('ref-hero-ready'); } catch (e) {}
      });
    }
    if (img) {
      if (img.complete && img.naturalWidth > 0) {
        enter();
      } else {
        listen(img, 'load', enter, { once: true });
        listen(img, 'error', enter, { once: true });
      }
    }
    // 最终兜底：无论如何 5s 内呈现终态
    window.setTimeout(function () {
      try { docEl.classList.add('ref-hero-ready'); } catch (e) {}
    }, 5000);
  }

  /* -------------------------- 3. Hero 视差 0—70vh -------------------------- */

  function initParallax() {
    if (!parallaxOK) return;                          // 触屏 / 减动效跳过
    var hero = document.getElementById('hero') || $('.hero');
    if (!hero) return;

    var scheduled = false;
    function apply() {
      scheduled = false;
      var y = window.pageYOffset || docEl.scrollTop || 0;
      var vh = window.innerHeight || docEl.clientHeight || 0;
      var range = vh * 0.7;
      if (range <= 0) range = 1;
      var p = y <= 0 ? 0 : (y >= range ? 1 : y / range);
      try { hero.style.setProperty('--ref-hero-y', (-8 * p).toFixed(2) + '%'); } catch (e) {}
    }
    function schedule() {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(apply);
    }
    listen(window, 'scroll', schedule, { passive: true });
    listen(window, 'resize', schedule, { passive: true });
    apply();
  }

  /* -------------------------- 4. 页头：下隐上现 -------------------------- */
  /* 只加 .ref-header-hidden；.is-scrolled / .on-light 仍由 art-motion 负责。 */

  function initHeaderHide() {
    if (reduce) return;                               // 减动效跳过
    var header = document.getElementById('siteHeader') || $('.site-header');
    if (!header) return;

    var lastY = window.pageYOffset || docEl.scrollTop || 0;
    var scheduled = false;
    var hidden = false;

    function setHidden(next) {
      if (next === hidden) return;
      hidden = next;
      try { header.classList.toggle('ref-header-hidden', next); } catch (e) {}
    }

    function apply() {
      scheduled = false;
      var y = window.pageYOffset || docEl.scrollTop || 0;
      if (header.classList.contains('is-menu-open')) { lastY = y; setHidden(false); return; }
      if (y < 120) { lastY = y; setHidden(false); return; }
      var dy = y - lastY;
      if (Math.abs(dy) < 6) return;                   // 抖动过滤，同时累积小位移
      lastY = y;
      if (dy > 0) setHidden(true);
      else setHidden(false);
    }
    function schedule() {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(apply);
    }

    listen(window, 'scroll', schedule, { passive: true });
    listen(window, 'resize', schedule, { passive: true });
    apply();
  }

  /* -------------------------- 5. 偏好实时切换 -------------------------- */

  function bindPrefs() {
    function onChange(e) {
      reduce = !!(e && e.matches);
      if (!reduce) {
        try { docEl.classList.remove('ref-reduced'); } catch (err) {}
        return;
      }
      try { docEl.classList.add('ref-reduced'); } catch (err) {}
      try { revealAllNow(); } catch (err) {}
      try {
        var header = document.getElementById('siteHeader');
        if (header) header.classList.remove('ref-header-hidden');
        var hero = document.getElementById('hero') || $('.hero');
        if (hero) hero.style.setProperty('--ref-hero-y', '0%');
        docEl.classList.add('ref-hero-ready');
      } catch (err) {}
    }
    try {
      if (mqReduce && mqReduce.addEventListener) mqReduce.addEventListener('change', onChange);
      else if (mqReduce && mqReduce.addListener) mqReduce.addListener(onChange);
    } catch (e) { /* 忽略 */ }
  }

  /* ------------------------------ 初始化 ------------------------------ */

  var usingFallback = false;

  function init() {
    try {
      usingFallback = injectFallback();
      docEl.classList.add('ref-2026');
      if (reduce) docEl.classList.add('ref-reduced');
      bindPrefs();
      initReveal();
      initHero();
      initParallax();
      initHeaderHide();
    } catch (err) {
      // 任何异常都不得让内容停留在隐藏态：直接呈现终态
      try { revealAllNow(); } catch (e) {}
      try { docEl.classList.add('ref-hero-ready'); } catch (e) {}
    }
  }

  try {
    window.Ref2026 = {
      get usingFallback() { return usingFallback; },
      refresh: function () { try { initReveal(); } catch (e) {} },
      revealAll: function () { try { revealAllNow(); } catch (e) {} }
    };
  } catch (e) { /* 忽略 */ }

  ready(init);
})();
