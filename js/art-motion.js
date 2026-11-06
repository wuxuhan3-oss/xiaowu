/* =============================================================================
 * art-motion.js — BLACK BOX ARCHIVE / 影像档案
 * 动效与交互层。原生 JS，IIFE + 'use strict'，无第三方依赖、无构建。
 *
 * 事实来源：CONTRACT.md 第 5 节（DOM 契约）/ 第 6 节（18 项任务）。
 * 设计原则：
 *   1. 克制：位移与时长交由 CSS（cubic-bezier(.16,1,.3,1) / 0.35—1.2s），
 *      JS 只负责状态类与数值，绝不做逐帧 CSS 属性动画。
 *   2. 性能：滚动与指针回调统一 rAF 节流；显现走 IntersectionObserver；
 *      所有监听 passive；视频预览单例、退出即释放 src。
 *   3. 降级：prefers-reduced-motion 直接呈现终态；pointer: coarse 关闭
 *      自定义光标 / 悬停预览 / 磁吸 / 3D 倾斜 / 视差。
 *   4. 健壮：init 外层 try/catch，2.6s 兜底一定落下 body.is-ready，
 *      任何异常都不会把页面卡在遮幕之后。
 * ========================================================================== */
(function () {
  'use strict';

  /* ============================ 0. 环境探测 ============================ */

  var docEl = document.documentElement;

  var mqReduce = null, mqFine = null, mqCoarse = null;
  try {
    if (window.matchMedia) {
      mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
      mqFine = window.matchMedia('(pointer: fine)');
      mqCoarse = window.matchMedia('(pointer: coarse)');
    }
  } catch (e) { /* 环境不支持 matchMedia 时按桌面无减动效处理 */ }

  var reduce = !!(mqReduce && mqReduce.matches);
  var fine = !!(mqFine && mqFine.matches);
  var coarse = !!(mqCoarse && mqCoarse.matches);
  var pointerFine = fine && !coarse; // 触屏 / 粗指针一律降级

  /* 尽早启用 CSS 的 reveal 初始隐藏态与自定义光标样式，避免首帧闪烁。
   * 脚本位于 body 末尾，此处在 DOM 就绪前执行；init 内重复添加是幂等的。 */
  try {
    docEl.classList.add('is-enhanced');
    if (pointerFine) docEl.classList.add('pointer-fine');
  } catch (e) {}

  /* ------------------------------ 工具 ------------------------------ */

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  }
  function clamp(v, min, max) { return v < min ? min : (v > max ? max : v); }

  /* 统一事件绑定：默认 passive，避免阻塞滚动 */
  function listen(target, type, fn, opts) {
    if (!target) return;
    var options = (opts === undefined) ? { passive: true } : opts;
    try {
      target.addEventListener(type, fn, options);
    } catch (e) {
      try { target.addEventListener(type, fn, false); } catch (e2) { /* 放弃绑定 */ }
    }
  }

  /* rAF 节流：同一帧内只执行一次 */
  function rafThrottle(fn) {
    var scheduled = false;
    return function () {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(function () { scheduled = false; fn(); });
    };
  }

  /* 解析计算样式中的平移分量（matrix / matrix3d），用于保留 CSS 居中偏移 */
  function parseTranslate(transform) {
    if (!transform || transform === 'none') return null;
    try {
      var m3 = transform.match(/matrix3d\(([^)]+)\)/);
      if (m3) {
        var v3 = m3[1].split(',').map(Number);
        return { x: v3[12] || 0, y: v3[13] || 0 };
      }
      var m2 = transform.match(/matrix\(([^)]+)\)/);
      if (m2) {
        var v2 = m2[1].split(',').map(Number);
        return { x: v2[4] || 0, y: v2[5] || 0 };
      }
    } catch (e) { /* 忽略 */ }
    return null;
  }

  /**
   * 读取元素当前 CSS transform。
   * 自定义光标、磁吸按钮只追加 translate3d，同时保留 CSS 自带的
   * 居中（translate(-50%,-50%)）/ 缩放，避免依赖某个未约定的 CSS 写法。
   */
  function cssTransformOf(el) {
    if (!el) return '';
    try {
      var t = window.getComputedStyle(el).transform;
      if (!t || t === 'none') return '';
      return ' ' + t;
    } catch (e) { return ''; }
  }

  /* ============================ 1. 就绪闸门 ============================ */

  var initialized = false;
  var readyDone = false;
  var readyQueue = [];

  function whenReady(fn) {
    if (readyDone) { try { fn(); } catch (e) {} return; }
    readyQueue.push(fn);
  }

  /* 落下 body.is-ready，并在 delay 后移除遮幕；幂等 */
  function markReady(preloaderDelay) {
    if (readyDone) return;
    readyDone = true;

    try {
      if (document.body) {
        document.body.classList.remove('is-loading');
        document.body.classList.add('is-ready');
      }
    } catch (e) { /* 忽略 */ }

    var pre = document.getElementById('preloader');
    if (pre) {
      try { pre.classList.add('is-done'); } catch (e) {}
      var delay = (typeof preloaderDelay === 'number') ? preloaderDelay : 1000;
      window.setTimeout(function () {
        try { if (pre && pre.parentNode) pre.parentNode.removeChild(pre); } catch (e) {}
      }, delay);
    }

    while (readyQueue.length) {
      var fn = readyQueue.shift();
      try { fn(); } catch (e) {}
    }
  }

  function forceReady() { markReady(320); }

  /* ============================ 2. DOM 缓存 ============================ */

  var dom = {};

  function cacheDom() {
    dom.header = document.getElementById('siteHeader');
    dom.menuToggle = document.getElementById('menuToggle');
    dom.navLinks = $$('#mainNav .nav-link').map(function (a) {
      return { el: a, id: (a.getAttribute('href') || '').replace('#', '') };
    });
    dom.sectionLinks = $$('#sectionNav a[data-target]').map(function (a) {
      return { el: a, id: a.getAttribute('data-target') || '' };
    });
    dom.progress = document.getElementById('progressBar');
    dom.hero = document.getElementById('hero') || $('.hero');
    dom.heroSpot = document.getElementById('heroSpot');
    dom.backTop = document.getElementById('backTop');
    dom.sections = $$('main [data-section]');
    dom.worksWall = document.getElementById('worksWall');
    dom.worksIndex = document.getElementById('worksIndex');
  }

  /* ========================= 3. 入场计数（遮幕） ========================= */
  /* 任务 1：0→100 计数 1.3s 缓出，#loadBar 同步宽度；完成即 body.is-ready；
   * 1s 后移除 preloader；异常/超时 2.6s 兜底；减动效直接完成。 */

  var LOAD_DURATION = 900; // 1.2—1.4s 区间内

  function initPreloader() {
    var pre = document.getElementById('preloader');
    var num = document.getElementById('loadNum');
    var bar = document.getElementById('loadBar');

    if (!pre) { markReady(0); return; }

    function paint(value) {
      var v = clamp(Math.round(value), 0, 100);
      if (num) num.textContent = v < 10 ? '0' + v : String(v);
      if (bar) bar.style.width = v + '%';
    }

    if (reduce) { // 减动效：直接终态
      paint(100);
      markReady(260);
      return;
    }

    var startTime = 0;
    function frame(now) {
      if (!startTime) startTime = now;
      var p = clamp((now - startTime) / LOAD_DURATION, 0, 1);
      var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      paint(eased * 100);
      if (p < 1) {
        window.requestAnimationFrame(frame);
      } else {
        paint(100);
        markReady(520);
      }
    }
    window.requestAnimationFrame(frame);
  }

  /* ========================= 4. 自定义光标 ========================= */
  /* 任务 2：仅细指针启用；dot 立即跟随、ring 插值延迟；交互元素 .is-active；
   * data-cursor 写入 #cursorLabel 并 .is-label；按下 .is-down；离开窗口隐藏。 */

  function initCursor() {
    var cursor = document.getElementById('cursor');
    if (!cursor || !pointerFine) return;

    var dot = $('.cursor-dot', cursor);
    var ring = $('.cursor-ring', cursor);
    var label = document.getElementById('cursorLabel');

    /* 定位策略：
     * .cursor-dot / .cursor-ring 用 transform 定位（合成层，性能优先）。
     * CSS 中二者以 translate(-50%,-50%) 自身居中，且 ring 的宽高会随状态
     * 变化（.is-active / .is-down），因此按元素实时尺寸补偿半宽半高；
     * 若 CSS 改成固定位移居中，则回退到固定补偿，不依赖某一种写法。
     * .cursor-label 用 left/top 定位，完整保留 CSS 里 translate(20px,18px)
     * 的偏移与 .is-label 的过渡（inline transform 会覆盖它）。 */
    function layerOf(el) {
      if (!el) return null;
      var base = null;
      try { base = parseTranslate(window.getComputedStyle(el).transform); } catch (e) { base = null; }
      var layer = { el: el, base: base, percent: false };
      try {
        var w = el.offsetWidth || 0;
        var h = el.offsetHeight || 0;
        if (base && w > 0 && h > 0) {
          layer.percent = Math.abs(base.x + w / 2) < 1.5 && Math.abs(base.y + h / 2) < 1.5;
        }
      } catch (e) { /* 忽略 */ }
      return layer;
    }

    var dotLayer = layerOf(dot);
    var ringLayer = layerOf(ring);

    function placeLayer(layer, x, y) {
      if (!layer) return;
      var el = layer.el;
      var ox = 0, oy = 0;
      if (layer.percent) {
        ox = -(el.offsetWidth || 0) / 2;
        oy = -(el.offsetHeight || 0) / 2;
      } else if (layer.base) {
        ox = layer.base.x;
        oy = layer.base.y;
      }
      el.style.transform = 'translate3d(' + (x + ox).toFixed(1) + 'px,' + (y + oy).toFixed(1) + 'px,0)';
    }

    function placeLabel(x, y) {
      if (!label) return;
      label.style.left = Math.round(x) + 'px';
      label.style.top = Math.round(y) + 'px';
    }

    var mx = (window.innerWidth || 0) / 2;
    var my = (window.innerHeight || 0) / 2;
    var rx = mx, ry = my;
    var LERP = 0.2; // 每帧插值系数，约 0.12s 跟随延迟
    var rafId = 0;
    var shown = false;
    var firstMove = true; // 首次进入时 ring 直接吸附，避免它从屏幕中心滑入
    var settleUntil = 0; // ring 尺寸过渡期间继续做半宽半高补偿的时间点

    function nowMs() {
      return (window.performance && window.performance.now)
        ? window.performance.now()
        : Date.now();
    }

    function schedule() {
      if (!rafId) rafId = window.requestAnimationFrame(paintFrame);
    }

    /* ring 的宽高随 .is-active / .is-down 过渡（34→56→26px），
     * 过渡期间指针可能静止，需要持续按实时尺寸补偿半宽半高，避免偏离中心。 */
    function syncCursor() {
      settleUntil = Math.max(settleUntil, nowMs() + 520);
      schedule();
    }

    function paintFrame() {
      rafId = 0;
      var dx = mx - rx, dy = my - ry;
      if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
        rx = mx; ry = my;
      } else {
        rx += dx * LERP;
        ry += dy * LERP;
      }
      placeLayer(ringLayer, rx, ry);
      placeLabel(rx, ry);
      if (Math.abs(mx - rx) > 0.1 || Math.abs(my - ry) > 0.1 || nowMs() < settleUntil) {
        schedule();
      }
    }

    function show() {
      if (shown) return;
      shown = true;
      cursor.classList.remove('is-hidden');
      cursor.style.opacity = '';
    }

    function hide() {
      shown = false;
      cursor.classList.add('is-hidden');
      cursor.style.opacity = '0';
    }

    hide(); // 首次移动前不显示（避免坐标 (0,0) 闪现）

    /* 立即跟随 + 插值跟随 */
    listen(document, 'mousemove', function (e) {
      mx = e.clientX;
      my = e.clientY;
      if (firstMove) { firstMove = false; rx = mx; ry = my; }
      show();
      placeLayer(dotLayer, mx, my);
      if (reduce) { // 减动效：不做缓动位移
        rx = mx; ry = my;
        placeLayer(ringLayer, rx, ry);
        placeLabel(rx, ry);
      } else {
        schedule();
      }
    }, { passive: true });

    /* 按下 / 抬起 / 失焦 */
    listen(document, 'mousedown', function () {
      cursor.classList.add('is-down');
      syncCursor();
    }, { passive: true });
    listen(document, 'mouseup', function () {
      cursor.classList.remove('is-down');
      syncCursor();
    }, { passive: true });
    listen(window, 'blur', function () { cursor.classList.remove('is-down'); hide(); }, { passive: true });

    /* 离开窗口隐藏 */
    listen(window, 'mouseout', function (e) {
      if (!e.relatedTarget && !e.toElement) hide();
    }, { passive: true });

    /* 交互元素高亮与光标文案 */
    var INTERACTIVE = 'a, button, [data-cursor], .work-card, .index-row, .filter-btn, ' +
      '.view-btn, .copy-row, .exp-row, input, textarea, select';

    function activate(el) {
      if (!el) {
        cursor.classList.remove('is-active');
        cursor.classList.remove('is-label');
        if (label) label.textContent = '';
        syncCursor();
        return;
      }
      cursor.classList.add('is-active');
      var labelled = el.closest ? el.closest('[data-cursor]') : null;
      var text = labelled ? (labelled.getAttribute('data-cursor') || '') : '';
      if (label) label.textContent = text;
      cursor.classList.toggle('is-label', !!text);
      syncCursor();
    }

    listen(document, 'mouseover', function (e) {
      var el = (e.target && e.target.closest) ? e.target.closest(INTERACTIVE) : null;
      if (el) activate(el);
    }, { passive: true });

    listen(document, 'mouseout', function (e) {
      var el = (e.target && e.target.closest) ? e.target.closest(INTERACTIVE) : null;
      if (!el) return;
      var to = e.relatedTarget;
      if (to && el.contains(to)) return;
      activate((to && to.closest) ? to.closest(INTERACTIVE) : null);
    }, { passive: true });
  }

  /* ========================= 5. 滚动显现 ========================= */
  /* 任务 3：IO(threshold .12, rootMargin '0px 0px -6% 0px') 加 .is-in；
   * 组内 --d 80ms 递增、上限 480ms；works:render 后重扫并给卡片编号延迟；
   * 减动效直接全部 .is-in。 */

  var revealIO = null;

  function initReveal() {
    if (reduce) return;
    if (!('IntersectionObserver' in window)) return;
    revealIO = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        try { revealIO.unobserve(entry.target); } catch (e) {}
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  }

  function revealAll() {
    var els = $$('[data-reveal], .work-card');
    for (var i = 0; i < els.length; i++) els[i].classList.add('is-in');
  }

  function scanReveal() {
    var els = $$('[data-reveal], .work-card');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (reduce) { el.classList.add('is-in'); continue; }
      if (el.dataset.motionReveal === '1') continue;
      el.dataset.motionReveal = '1';
      if (revealIO) revealIO.observe(el);
      else el.classList.add('is-in'); // 无 IO 时不做隐藏
    }
  }

  function scanGroups() {
    var groups = $$('[data-reveal-group]');
    for (var i = 0; i < groups.length; i++) {
      var group = groups[i];
      if (group.dataset.motionStagger === '1') continue;
      group.dataset.motionStagger = '1';
      var children = $$('[data-reveal]', group);
      for (var j = 0; j < children.length; j++) {
        children[j].style.setProperty('--d', Math.min(j * 80, 480) + 'ms');
      }
    }
  }

  function scanCardDelays() {
    if (!dom.worksWall && !dom.worksIndex) return;
    var cards = $$('#worksWall .work-card, #worksIndex .index-row');
    for (var i = 0; i < cards.length; i++) {
      cards[i].style.setProperty('--d', Math.min(i * 80, 480) + 'ms');
    }
  }

  /* ========================= 6. Header / 滚动 ========================= */
  /* 任务 4：scroll>24 加 .is-scrolled；section 边界判主题 → .on-light；
   * 同步 section-nav / nav-link 的 .is-active；进度条宽度；rAF 节流。 */

  var lastActiveId = null;
  var lastTheme = null;

  function updateScroll() {
    var y = window.pageYOffset || docEl.scrollTop || 0;
    var vh = window.innerHeight || docEl.clientHeight || 0;
    var header = dom.header;

    if (header) header.classList.toggle('is-scrolled', y > 24);

    var docHeight = Math.max(
      docEl.scrollHeight,
      document.body ? document.body.scrollHeight : 0
    );

    // 主题探针贴近顶部（header 实际覆盖的位置）；高亮探针在视口中部
    var themeProbe = Math.min(vh, 46);
    var activeProbe = vh * 0.38;
    if (docHeight - (y + vh) < 6) activeProbe = vh - 2; // 触底归位到最后章节

    var activeId = null;
    var themeId = null;
    var sections = dom.sections;
    var atBottom = (docHeight - (y + vh) < 6);

    for (var i = 0; i < sections.length; i++) {
      var rect = sections[i].getBoundingClientRect();
      if (rect.height <= 0) continue;
      if (themeId === null && themeProbe >= rect.top && themeProbe < rect.bottom) {
        themeId = sections[i].id;
      }
      if (activeProbe >= rect.top && activeProbe < rect.bottom) {
        activeId = sections[i].id;
      }
    }

    // 触底时若探针落在页脚空隙，直接归位到最后一个章节
    if (activeId === null && atBottom && sections.length) {
      activeId = sections[sections.length - 1].id;
    }

    if (activeId !== null && activeId !== lastActiveId) {
      lastActiveId = activeId;
      var n;
      for (n = 0; n < dom.navLinks.length; n++) {
        dom.navLinks[n].el.classList.toggle('is-active', dom.navLinks[n].id === activeId);
      }
      for (n = 0; n < dom.sectionLinks.length; n++) {
        dom.sectionLinks[n].el.classList.toggle('is-active', dom.sectionLinks[n].id === activeId);
      }
    }

    if (themeId !== null && themeId !== lastTheme) {
      lastTheme = themeId;
      var section = document.getElementById(themeId);
      var theme = section ? section.getAttribute('data-theme') : null;
      if (header && theme) header.classList.toggle('on-light', theme === 'light');
    }

    /* 阅读进度 */
    var maxScroll = docHeight - vh;
    var pct = maxScroll > 0 ? clamp(y / maxScroll, 0, 1) * 100 : 0;
    if (dom.progress) dom.progress.style.width = pct.toFixed(2) + '%';

    /* 返回顶部按钮 */
    if (dom.backTop) dom.backTop.classList.toggle('is-show', y > 900);

    /* hero 滚动量（CSS 用 --sy 做背景 / 标题视差） */
    if (dom.hero && !reduce && !coarse) {
      dom.hero.style.setProperty('--sy', Math.round(y) + 'px');
    }
  }

  function initHeader() {
    listen(window, 'scroll', rafThrottle(updateScroll), { passive: true });
    listen(window, 'resize', rafThrottle(updateScroll), { passive: true });
    updateScroll();
  }

  /* ========================= 7. 移动端菜单 ========================= */
  /* 任务 5：切换 .site-header.is-menu-open 与 aria-expanded；
   * 导航点击 / Esc / 宽度 >900 关闭。 */

  function initMenu() {
    var header = dom.header;
    var toggle = dom.menuToggle;
    if (!header || !toggle) return;

    function setOpen(open) {
      header.classList.toggle('is-menu-open', open);
      if (document.body) document.body.classList.toggle('is-menu-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? (window.I18N ? window.I18N.t('nav.closeMenu') : '关闭菜单') : (window.I18N ? window.I18N.t('nav.menu') : '打开菜单'));
    }

    listen(toggle, 'click', function () {
      setOpen(!header.classList.contains('is-menu-open'));
    }, { passive: true });

    var links = $$('#mainNav a');
    for (var i = 0; i < links.length; i++) {
      listen(links[i], 'click', function () { setOpen(false); }, { passive: true });
    }

    listen(document, 'keydown', function (e) {
      if (e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27) setOpen(false);
    }, { passive: true });

    listen(window, 'resize', rafThrottle(function () {
      if ((window.innerWidth || 0) > 900) setOpen(false);
    }), { passive: true });
  }

  /* ========================= 8. Hero 视差 ========================= */
  /* 任务 6：.hero 上写 --px / --py（-1..1）与 --sy；#heroSpot 跟随指针。
   * 减动效 / 触屏跳过。 */

  function initHero() {
    if (!dom.hero || reduce || coarse) return;

    var clientX = 0, clientY = 0, scheduled = false;

    function apply() {
      scheduled = false;
      var hero = dom.hero;
      if (!hero || reduce) return;
      var rect = hero.getBoundingClientRect();
      if (!rect.height || !rect.width) return;
      var vh = window.innerHeight || 0;
      if (rect.bottom < -80 || rect.top > vh + 80) return; // 不在视口内不更新

      var px = clamp(((clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
      var py = clamp(((clientY - rect.top) / rect.height) * 2 - 1, -1, 1);

      hero.style.setProperty('--px', px.toFixed(3));
      hero.style.setProperty('--py', py.toFixed(3));

      if (dom.heroSpot) {
        dom.heroSpot.style.left = ((px + 1) * 50).toFixed(2) + '%';
        dom.heroSpot.style.top = ((py + 1) * 50).toFixed(2) + '%';
      }
    }

    listen(document, 'mousemove', function (e) {
      clientX = e.clientX;
      clientY = e.clientY;
      if (!scheduled) {
        scheduled = true;
        window.requestAnimationFrame(apply);
      }
    }, { passive: true });
  }

  /* ========================= 9. 磁吸按钮 ========================= */
  /* 任务 7：[data-magnetic] 位移 0.18 倍、上限 10px；.is-magnet；离开复位。 */

  function scanMagnetic() {
    if (reduce || coarse) return;
    var els = $$('[data-magnetic]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.dataset.motionMagnet === '1') continue;
      el.dataset.motionMagnet = '1';
      bindMagnetic(el);
    }
  }

  function bindMagnetic(el) {
    var active = false;
    var base = '';

    function reset() {
      active = false;
      base = '';
      el.classList.remove('is-magnet');
      el.style.transform = '';
    }

    listen(el, 'mouseenter', function () {
      if (!pointerFine) return;
      active = true;
      base = cssTransformOf(el);
      el.classList.add('is-magnet');
    }, { passive: true });

    listen(el, 'mousemove', function (e) {
      if (!active || reduce) return;
      var rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      var dx = clamp((e.clientX - (rect.left + rect.width / 2)) * 0.18, -10, 10);
      var dy = clamp((e.clientY - (rect.top + rect.height / 2)) * 0.18, -10, 10);
      el.style.transform = 'translate3d(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px,0)' + base;
    }, { passive: true });

    listen(el, 'mouseleave', reset, { passive: true });
  }

  /* ========================= 10. 3D 倾斜 ========================= */
  /* 任务 8：[data-tilt] 设置 --rx / --ry（±5deg）、--mx / --my（0—100%）。
   * works:render 后对新卡片绑定，dataset 标记防重复。 */

  function scanTilt() {
    if (reduce || coarse) return;
    var els = $$('[data-tilt]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.dataset.motionTilt === '1') continue;
      el.dataset.motionTilt = '1';
      bindTilt(el);
    }
  }

  function bindTilt(el) {
    function reset() {
      el.classList.remove('is-tilt');
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
      el.style.setProperty('--mx', '50%');
      el.style.setProperty('--my', '50%');
    }

    listen(el, 'mouseenter', function () { el.classList.add('is-tilt'); }, { passive: true });

    listen(el, 'mousemove', function (e) {
      if (reduce) return;
      var rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      var px = clamp((e.clientX - rect.left) / rect.width, 0, 1);
      var py = clamp((e.clientY - rect.top) / rect.height, 0, 1);
      el.style.setProperty('--ry', ((px - 0.5) * 10).toFixed(2) + 'deg');   // 左右 ±5deg
      el.style.setProperty('--rx', ((0.5 - py) * 10).toFixed(2) + 'deg');   // 上下 ±5deg
      el.style.setProperty('--mx', (px * 100).toFixed(2) + '%');
      el.style.setProperty('--my', (py * 100).toFixed(2) + '%');
    }, { passive: true });

    listen(el, 'mouseleave', reset, { passive: true });
  }

  /* ========================= 11. 跑马灯 ========================= */
  /* 任务 9：为每个 [data-marquee] 复制一次 track 内容，保证无缝；防重复。 */

  function initMarquees() {
    var list = $$('[data-marquee]');
    for (var i = 0; i < list.length; i++) {
      var marquee = list[i];
      if (marquee.dataset.cloned === '1') continue;
      var track = marquee.querySelector('.marquee-track');
      if (!track) continue;
      var children = Array.prototype.slice.call(track.childNodes);
      if (!children.length) continue;
      for (var j = 0; j < children.length; j++) {
        var clone = children[j].cloneNode(true);
        if (clone.nodeType === 1) {
          clone.setAttribute('aria-hidden', 'true');
          clone.removeAttribute('id');
        }
        track.appendChild(clone);
      }
      marquee.dataset.cloned = '1';
    }
  }

  function refreshMarquees() {
    var list = $$('[data-marquee]');
    for (var i = 0; i < list.length; i++) {
      var track = list[i].querySelector('.marquee-track');
      if (!track) continue;
      var kids = Array.prototype.slice.call(track.children);
      for (var j = 0; j < kids.length; j++) {
        if (kids[j].getAttribute('aria-hidden') === 'true') track.removeChild(kids[j]);
      }
      list[i].dataset.cloned = '';
    }
    initMarquees();
  }
  listen(document, 'lang:change', refreshMarquees, { passive: true });

  /* ========================= 12. 数字滚动 ========================= */
  /* 任务 10：#heroStats 进入视口后，[data-count] 1.6s easeOutExpo 到整数。 */

  function initCounters() {
    var stats = document.getElementById('heroStats');
    if (!stats) return;
    var els = $$('[data-count]', stats);
    if (!els.length) return;

    if (reduce) {
      for (var i = 0; i < els.length; i++) {
        els[i].textContent = String(parseInt(els[i].getAttribute('data-count'), 10) || 0);
      }
      return;
    }

    if (!('IntersectionObserver' in window)) {
      whenReady(function () { runCounters(els); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      for (var k = 0; k < entries.length; k++) {
        if (!entries[k].isIntersecting) continue;
        try { io.disconnect(); } catch (e) {}
        whenReady(function () { runCounters(els); });
        return;
      }
    }, { threshold: 0.25 });

    io.observe(stats);
  }

  function runCounters(els) {
    if (window.Odometer) {
      for (var q = 0; q < els.length; q++) {
        var ov = parseInt(els[q].getAttribute('data-count'), 10) || 0;
        try { window.Odometer.roll(els[q], ov); } catch (e) { els[q].textContent = String(ov); }
      }
      return;
    }
    var DURATION = 1600;
    var items = [];
    var i;

    for (i = 0; i < els.length; i++) {
      items.push({
        el: els[i],
        end: parseInt(els[i].getAttribute('data-count'), 10) || 0,
        start: 0
      });
    }

    function frame(now) {
      var allDone = true;
      for (var k = 0; k < items.length; k++) {
        var item = items[k];
        if (!item.start) item.start = now;
        var p = clamp((now - item.start) / DURATION, 0, 1);
        var eased = (p === 1) ? 1 : 1 - Math.pow(2, -10 * p); // easeOutExpo
        item.el.textContent = String(Math.round(item.end * eased));
        if (p < 1) allDone = false;
      }
      if (!allDone) window.requestAnimationFrame(frame);
    }
    window.requestAnimationFrame(frame);
  }

  /* ========================= 13. 北京时间 ========================= */
  /* 任务 11：#clock / #clock2 每秒更新（Asia/Shanghai，HH:MM:SS）。 */

  var clockFormatter = null;
  try {
    if (window.Intl && window.Intl.DateTimeFormat) {
      clockFormatter = new window.Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Shanghai',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    }
  } catch (e) { clockFormatter = null; }

  function pad2(n) { return n < 10 ? '0' + n : String(n); }

  function beijingTime() {
    if (clockFormatter && clockFormatter.formatToParts) {
      try {
        var parts = clockFormatter.formatToParts(new Date());
        var hour = '00', minute = '00', second = '00';
        for (var i = 0; i < parts.length; i++) {
          var type = parts[i].type;
          var value = parseInt(parts[i].value, 10);
          if (type === 'hour') hour = pad2(value % 24);
          else if (type === 'minute') minute = pad2(value);
          else if (type === 'second') second = pad2(value);
        }
        return hour + ':' + minute + ':' + second;
      } catch (e) { /* 落到手算兜底 */ }
    }
    var now = new Date();
    var utc = now.getTime() + now.getTimezoneOffset() * 60000;
    var d = new Date(utc + 8 * 3600000);
    return pad2(d.getUTCHours()) + ':' + pad2(d.getUTCMinutes()) + ':' + pad2(d.getUTCSeconds());
  }

  function initClock() {
    var a = document.getElementById('clock');
    var b = document.getElementById('clock2');
    if (!a && !b) return;

    function tick() {
      var text = beijingTime();
      if (a) a.textContent = text;
      if (b) b.textContent = text;
    }

    tick();
    window.setInterval(tick, 1000);
  }

  /* ========================= 14. 点击复制 ========================= */
  /* 任务 12：[data-copy] 点击复制；成功后 UI.toast('已复制：' + 内容)；
   * 元素 .is-copied 1.6s。clipboard + execCommand 兜底。 */

  function copyFailed() {
    try {
      if (window.UI && typeof window.UI.toast === 'function') {
        window.UI.toast(window.I18N ? window.I18N.t('toast.copyFail') : '复制失败，请手动选择');
      }
    } catch (e) {}
  }

  var IS_IOS = (function () {
    try {
      return /ipad|iphone|ipod/i.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    } catch (e) { return false; }
  })();

  function legacyCopy(text) {
    var ok = false;
    var area = null;
    try {
      area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      /* 不能用 display:none / visibility:hidden，否则无法选中；用 1px 透明浮层 */
      area.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;' +
        'padding:0;margin:0;border:0;outline:0;box-shadow:none;background:transparent;' +
        'color:transparent;font-size:16px;opacity:0.01;z-index:-1;';
      document.body.appendChild(area);

      if (IS_IOS) {
        /* iOS 必须走 Range + contentEditable 路径，select() 无效 */
        area.contentEditable = 'true';
        area.readOnly = false;
        var range = document.createRange();
        range.selectNodeContents(area);
        var sel = window.getSelection();
        if (sel) { sel.removeAllRanges(); sel.addRange(range); }
        area.setSelectionRange(0, text.length);
      } else {
        area.focus();
        area.select();
        area.setSelectionRange(0, text.length);
      }

      ok = document.execCommand('copy');
    } catch (e) {
      ok = false;
    }
    try { if (area && area.parentNode) area.parentNode.removeChild(area); } catch (e) {}
    return ok;
  }

  /* 复制彻底失败时的最后手段：把该行文字选中，让用户直接 Ctrl/⌘+C */
  function selectRowText(btn) {
    try {
      var target = btn.querySelector('.copy-value') || btn;
      var range = document.createRange();
      range.selectNodeContents(target);
      var sel = window.getSelection();
      if (!sel) return false;
      sel.removeAllRanges();
      sel.addRange(range);
      return true;
    } catch (e) { return false; }
  }

  function flashCopied(btn, ok) {
    var icon = btn.querySelector('.copy-icon');
    if (!icon) return;
    if (!icon.getAttribute('data-orig')) icon.setAttribute('data-orig', icon.textContent || '');
    icon.textContent = ok ? '✓' : '!';
    window.setTimeout(function () {
      var orig = icon.getAttribute('data-orig');
      if (orig !== null) icon.textContent = orig;
    }, 1600);
  }

  function copyValue(btn) {
    var text = btn.getAttribute('data-copy') || '';

    function done() {
      try {
        btn.classList.add('is-copied');
        window.setTimeout(function () { btn.classList.remove('is-copied'); }, 1600);
      } catch (e) {}
      try { flashCopied(btn, true); } catch (e) {}
      try {
        if (window.UI && typeof window.UI.toast === 'function') {
          window.UI.toast(window.I18N ? window.I18N.t('toast.copied', { v: text }) : '已复制：' + text);
        }
      } catch (e) {}
    }

    function fail() {
      var selected = selectRowText(btn);
      try { flashCopied(btn, false); } catch (e) {}
      try {
        if (window.UI && typeof window.UI.toast === 'function') {
          var msg = window.I18N ? window.I18N.t('toast.copyFail') : '复制失败，请手动选择';
          if (selected && window.I18N && window.I18N.t('toast.copyManual')) {
            msg = window.I18N.t('toast.copyManual');
          }
          window.UI.toast(msg);
        }
      } catch (e) {}
    }

    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      var p = null;
      try { p = navigator.clipboard.writeText(text); } catch (e) { p = null; }
      if (p && typeof p.then === 'function') {
        p.then(done, function () {
          if (legacyCopy(text)) done();
          else fail();
        });
        return;
      }
    }

    if (legacyCopy(text)) done();
    else fail();
  }

  function initCopy() {
    listen(document, 'click', function (e) {
      var btn = (e.target && e.target.closest) ? e.target.closest('[data-copy]') : null;
      if (!btn) return;
      copyValue(btn);
    }, { passive: true });
  }

  /* ========================= 15. 履历手风琴 ========================= */
  /* 任务 13：.exp-item > button.exp-row 切换 .is-open，同步 aria-expanded，
   * 同时关闭其他项；面板动画由 CSS 完成。 */

  function initAccordion() {
    listen(document, 'click', function (e) {
      var btn = (e.target && e.target.closest) ? e.target.closest('.exp-row') : null;
      if (!btn) return;
      var item = btn.closest('.exp-item');
      if (!item) return;

      var wasOpen = item.classList.contains('is-open');
      var all = $$('#expList .exp-item');

      for (var i = 0; i < all.length; i++) {
        var other = all[i];
        if (other === item) continue;
        other.classList.remove('is-open');
        var otherBtn = other.querySelector('.exp-row');
        if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
      }

      item.classList.toggle('is-open', !wasOpen);
      btn.setAttribute('aria-expanded', wasOpen ? 'false' : 'true');

      updateScroll(); // 高度变化后重算主题、进度与高亮
    }, { passive: true });
  }

  /* ========================= 16. 交互指南 ========================= */
  /* 任务 14：#guideToggle 切换面板；#guide.is-open；Esc / 点击外部关闭。 */

  function initGuide() {
    var guide = document.getElementById('guide');
    var toggle = document.getElementById('guideToggle');
    var panel = document.getElementById('guidePanel');
    if (!guide || !toggle || !panel) return;

    function setOpen(open) {
      guide.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) panel.removeAttribute('hidden');
      else panel.setAttribute('hidden', '');
    }

    listen(toggle, 'click', function () {
      setOpen(!guide.classList.contains('is-open'));
    }, { passive: true });

    listen(document, 'click', function (e) {
      if (!guide.classList.contains('is-open')) return;
      var target = e.target;
      if (target && guide.contains(target)) return;
      setOpen(false);
    }, { passive: true });

    listen(document, 'keydown', function (e) {
      if (e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27) setOpen(false);
    }, { passive: true });
  }

  /* ========================= 17. 首屏提示 ========================= */
  /* 任务 15：is-ready 后 ~1.2s .is-visible；6s 后或首次滚动隐藏（.is-hidden）。 */

  function initStartHint() {
    var hint = document.getElementById('startHint');
    if (!hint) return;

    var dismissed = false;

    function dismiss() {
      if (dismissed) return;
      dismissed = true;
      hint.classList.remove('is-visible');
      hint.classList.add('is-hidden');
      hint.setAttribute('aria-hidden', 'true');
    }

    whenReady(function () {
      window.setTimeout(function () {
        if (dismissed) return;
        hint.classList.add('is-visible');
        hint.setAttribute('aria-hidden', 'false');
      }, 1200);
      window.setTimeout(dismiss, 7200); // 显示后约 6s
    });

    listen(window, 'scroll', function () {
      var y = window.pageYOffset || docEl.scrollTop || 0;
      if (y > 12) dismiss();
    }, { passive: true });
  }

  /* ========================= 18. 悬停视频预览 ========================= */
  /* 任务 16：.work-card[data-video] 悬停时在 .work-cover 内创建静音预览 video；
   * 移出 / work:open / work:close / 页面隐藏时停止并释放 src；失败静默回退。
   * 触屏与减动效不启用。 */

  var previews = [];

  function findPreview(card) {
    for (var i = 0; i < previews.length; i++) {
      if (previews[i].card === card) return previews[i];
    }
    return null;
  }

  function removePreview(entry) {
    if (!entry || entry.dead) return;
    entry.dead = true;

    if (entry.timer) {
      try { window.clearTimeout(entry.timer); } catch (e) {}
      entry.timer = 0;
    }

    var video = entry.video;
    if (video) {
      try { video.pause(); } catch (e) {}
      try {
        video.removeAttribute('src');
        video.removeAttribute('poster');
        video.load(); // 释放解码与网络资源
      } catch (e) {}
      try { if (video.parentNode) video.parentNode.removeChild(video); } catch (e) {}
    }
    try { if (entry.card) entry.card.classList.remove('is-previewing'); } catch (e) {}

    var idx = previews.indexOf(entry);
    if (idx > -1) previews.splice(idx, 1);
  }

  function stopPreviews() {
    var list = previews.slice();
    for (var i = 0; i < list.length; i++) removePreview(list[i]);
  }

  function stopPreviewOf(card) {
    var list = previews.slice();
    for (var i = 0; i < list.length; i++) {
      if (list[i].card === card) removePreview(list[i]);
    }
  }

  function startPreview(card) {
    if (!pointerFine || reduce) return;
    if (document.body && document.body.classList.contains('is-modal-open')) return;
    if (findPreview(card)) return;

    var src = card.getAttribute('data-preview') || card.getAttribute('data-video');
    if (!src) return;
    var art = card.querySelector('.cover-art');
    if (!art) return;

    stopPreviews(); // 同时只保留一个预览，避免并发解码

    var video = document.createElement('video');
    video.className = 'cover-video';
    video.muted = true;
    video.setAttribute('muted', '');
    video.setAttribute('loop', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('preload', 'metadata');
    video.setAttribute('aria-hidden', 'true');
    video.setAttribute('tabindex', '-1');
    video.loop = true;
    video.playsInline = true;

    /* 首帧到达前必须保持展陈封面：
     * 1) 先挂真实截帧 data-poster 作为 video 的 poster；
     * 2) 只有视频真正输出画面（playing，或 readyState>=3 且 videoWidth>0）
     *    才加 .is-previewing —— CSS 才会把 video 淡入；
     * 3) 4s 未就绪或 error 直接移除 video，不加 class、不 toast。 */
    var poster = card.getAttribute('data-poster');
    if (poster) video.setAttribute('poster', poster);

    var entry = { card: card, video: video, ready: false, timer: 0 };
    previews.push(entry);

    function reveal(force) {
      if (entry.dead || entry.ready) return;
      var v = entry.video;
      if (!v) return;
      var readyState = v.readyState || 0;
      var hasFrame = !!(v.videoWidth && v.videoWidth > 0);
      if (!force && !(readyState >= 3 && hasFrame)) return;
      entry.ready = true;
      if (entry.timer) {
        try { window.clearTimeout(entry.timer); } catch (e) {}
        entry.timer = 0;
      }
      try { card.classList.add('is-previewing'); } catch (e) {}
    }

    function fail() {
      removePreview(entry); // 静默回退：移除 video，保留封面，不 toast
    }

    video.addEventListener('playing', function () { reveal(true); }, { passive: true });
    video.addEventListener('canplay', function () { reveal(false); }, { passive: true });
    video.addEventListener('loadeddata', function () { reveal(false); }, { passive: true });
    video.addEventListener('error', fail, { once: true });

    entry.timer = window.setTimeout(fail, 4000);

    video.setAttribute('src', src);
    art.appendChild(video);

    try {
      var promise = video.play();
      if (promise && typeof promise.catch === 'function') {
        promise.catch(function () { /* 自动播放被拒：保持封面，交 4s 兜底清理 */ });
      }
    } catch (e) { /* 同上 */ }

    // 缓存命中时创建即已就绪，直接判定一次
    reveal(false);
  }

  function initPreviews() {
    if (!pointerFine) return;

    listen(document, 'mouseover', function (e) {
      if (reduce) return;
      var card = (e.target && e.target.closest) ? e.target.closest('.work-card') : null;
      if (card) startPreview(card);
    }, { passive: true });

    listen(document, 'mouseout', function (e) {
      var card = (e.target && e.target.closest) ? e.target.closest('.work-card') : null;
      if (!card) return;
      var to = e.relatedTarget;
      if (to && card.contains(to)) return;
      stopPreviewOf(card);
    }, { passive: true });

    listen(document, 'visibilitychange', function () {
      if (document.hidden) stopPreviews(); // 页面隐藏时停止
    }, { passive: true });

    listen(window, 'blur', stopPreviews, { passive: true });

    // core 打开 / 关闭弹窗时停止预览
    listen(document, 'work:open', stopPreviews, { passive: true });
    listen(document, 'work:close', stopPreviews, { passive: true });
  }

  /* ========================= 19. 返回顶部 ========================= */
  /* 任务 17：平滑回顶；scrollY>900 加 .is-show（在 updateScroll 中）。 */

  function initBackTop() {
    var btn = dom.backTop;
    if (!btn) return;
    listen(btn, 'click', function () {
      try {
        window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      } catch (e) {
        window.scrollTo(0, 0);
      }
    }, { passive: true });
  }

  /* ========================= 20. 偏好实时变化 ========================= */

  function bindPrefs() {
    try {
      if (mqReduce && mqReduce.addEventListener) {
        mqReduce.addEventListener('change', function (e) {
          reduce = !!e.matches;
          if (!reduce) return;
          try { revealAll(); } catch (err) {}
          try { stopPreviews(); } catch (err) {}
        });
      }
    } catch (e) { /* 忽略 */ }
  }

  /* ========================= 21. 扫描 / 刷新 ========================= */
  /* 任务 3 / 8：works:render 后重新扫描新节点，给新卡片编号延迟。 */

  function scan() {
    try { initMarquees(); } catch (e) {}
    try { scanGroups(); } catch (e) {}
    try { scanCardDelays(); } catch (e) {}
    try { scanMagnetic(); } catch (e) {}
    try { scanTilt(); } catch (e) {}
    try { scanReveal(); } catch (e) {}
    try { updateScroll(); } catch (e) {}
  }

  function onWorksRender() {
    if (!initialized) return; // 首个事件可能早于 init，由 init 内的 scan 覆盖
    try { stopPreviews(); } catch (e) {}
    scan();
  }

  /* ========================= 22. 初始化 ========================= */

  function init() {
    try {
      // 尽早启用 CSS 的 reveal 初始隐藏态，避免内容闪烁
      docEl.classList.add('is-enhanced');
      if (pointerFine) docEl.classList.add('pointer-fine');

      cacheDom();
      bindPrefs();

      initPreloader();   // 1
      initCursor();      // 2
      initReveal();      // 3
      initHeader();      // 4
      initMenu();        // 5
      initHero();        // 6
      initCounters();    // 10
      initClock();       // 11
      initCopy();        // 12
      initAccordion();   // 13
      initGuide();       // 14
      initStartHint();   // 15
      initPreviews();    // 16
      initBackTop();     // 17

      initialized = true;
      scan();            // 3 / 7 / 8 / 9
    } catch (err) {
      // 任何异常都不得白屏：直接呈现终态并落 ready
      try { revealAll(); } catch (e) {}
      forceReady();
    }

    // 遮幕兜底：即使 rAF 被挂起、某个模块异常，2.6s 也一定落下 is-ready
    window.setTimeout(function () { markReady(600); }, 2600);
  }

  /* ============================ 23. 启动 ============================ */
  /* 脚本解析阶段就注册，避免错过 core 的 works:render。 */

  listen(document, 'works:render', onWorksRender, { passive: true });

  try {
    window.Motion = {
      refresh: function () { try { scan(); } catch (e) {} },
      stopPreviews: function () { try { stopPreviews(); } catch (e) {} }
    };
  } catch (e) {}

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
