/* ============================================================
   collection.js — 视频合集
   按类目分组列出全部作品，支持：
     · 点击单条 → 复用展映播放器（window.UI.openWork）
     · 每组超过 COLLAPSED 条时折叠，提供「展开更多 / 收起」
     · 顶部「展开全部 / 全部收起」总控
   数据源：window.WORKS（js/works-data.js），新增作品只需往那里追加。
   ============================================================ */
(function () {
  'use strict';

  var COLLAPSED = 4;                 /* 折叠时每组显示条数 */
  var CAT_ORDER = ['ad', 'ai', 'drama', 'doc', 'city'];

  var root = document.getElementById('colGroups');
  if (!root) return;

  var allBtn = document.getElementById('colToggleAll');
  var countEl = document.getElementById('colCount');
  var groupCountEl = document.getElementById('colGroupCount');

  var groups = [];                   /* [{ cat, total, open, moreEl, btn, nameEl, countEl }] */

  function T(key, fallback, vars) {
    var s = fallback;
    try {
      if (window.I18N) {
        var v = window.I18N.t(key, vars);
        if (v && typeof v === 'string' && v.indexOf(key) !== 0) s = v;
      }
    } catch (e) {}
    if (vars && s === fallback) {
      Object.keys(vars).forEach(function (k) { s = s.split('{' + k + '}').join(vars[k]); });
    }
    return s;
  }

  function tr(item, field) {
    var lang = (window.I18N && window.I18N.lang) || 'zh';
    if (lang === 'zh') return item[field] || '';
    var pack = item.i18n && item.i18n[lang];
    return (pack && pack[field]) || item[field] || '';
  }

  function catName(cat) {
    return T('filters.' + cat, cat);
  }

  function pad2(n) { return n < 10 ? '0' + n : String(n); }

  /* ---------- 单条卡片 ---------- */
  function buildCard(item, index) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'col-card';
    btn.setAttribute('data-index', String(index));
    btn.setAttribute('data-cat', item.category || '');
    btn.setAttribute('aria-label', T('col.playAria', '播放：{title}', { title: tr(item, 'title') }));
    btn.setAttribute('data-cursor', 'PLAY');

    var thumb = document.createElement('span');
    thumb.className = 'col-thumb';
    if (item.poster) {
      var img = document.createElement('img');
      img.src = item.poster;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.addEventListener('error', function () { thumb.classList.add('is-nothumb'); });
      thumb.appendChild(img);
    } else {
      thumb.classList.add('is-nothumb');
    }
    var play = document.createElement('span');
    play.className = 'col-play';
    play.setAttribute('aria-hidden', 'true');
    play.innerHTML = '<i></i>';
    thumb.appendChild(play);
    if (item.duration) {
      var dur = document.createElement('span');
      dur.className = 'col-dur';
      dur.textContent = item.duration;
      thumb.appendChild(dur);
    }

    var body = document.createElement('span');
    body.className = 'col-body';

    var no = document.createElement('span');
    no.className = 'col-no';
    no.textContent = 'NO.' + pad2(index + 1);

    var title = document.createElement('span');
    title.className = 'col-title';
    title.textContent = tr(item, 'title');

    var sub = document.createElement('span');
    sub.className = 'col-sub';
    sub.textContent = tr(item, 'sub') || catName(item.category);

    body.appendChild(no);
    body.appendChild(title);
    body.appendChild(sub);

    var arrow = document.createElement('span');
    arrow.className = 'col-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '↗';

    btn.appendChild(thumb);
    btn.appendChild(body);
    btn.appendChild(arrow);

    btn.addEventListener('click', function () {
      if (window.UI && typeof window.UI.openWork === 'function') {
        window.UI.openWork(index);
      } else {
        var hash = '#works';
        if (window.location.hash !== hash) window.location.hash = hash;
      }
    });

    return btn;
  }

  /* ---------- 折叠标签 ---------- */
  function syncGroupLabel(g) {
    if (!g.btn) return;
    var hidden = g.total - Math.min(g.total, COLLAPSED);
    var label = g.btn.querySelector('span');
    var icon = g.btn.querySelector('i');
    if (g.open) {
      if (label) label.textContent = T('col.less', '收起');
      if (icon) icon.textContent = '－';
      g.btn.setAttribute('aria-expanded', 'true');
      g.group.classList.add('is-open');
    } else {
      if (label) label.textContent = T('col.more', '展开更多 {n} 支', { n: hidden });
      if (icon) icon.textContent = '＋';
      g.btn.setAttribute('aria-expanded', 'false');
      g.group.classList.remove('is-open');
    }
  }

  function syncAllLabel() {
    if (!allBtn) return;
    var expandable = groups.filter(function (g) { return g.total > COLLAPSED; });
    var allOpen = expandable.length > 0 && expandable.every(function (g) { return g.open; });
    var label = allBtn.querySelector('span');
    var icon = allBtn.querySelector('i');
    if (label) label.textContent = allOpen ? T('col.collapseAll', '全部收起') : T('col.expandAll', '展开全部');
    if (icon) icon.textContent = allOpen ? '－' : '＋';
    allBtn.setAttribute('aria-expanded', allOpen ? 'true' : 'false');
    allBtn.disabled = expandable.length === 0;
    allBtn.classList.toggle('is-hidden', expandable.length === 0);
  }

  /* ---------- 渲染 ---------- */
  function render() {
    var works = window.WORKS || [];
    var buckets = {};
    CAT_ORDER.forEach(function (c) { buckets[c] = []; });

    works.forEach(function (w, i) {
      var c = w.category || 'other';
      if (!buckets[c]) buckets[c] = [];
      buckets[c].push({ w: w, i: i });
    });

    var order = CAT_ORDER.concat(Object.keys(buckets).filter(function (c) { return CAT_ORDER.indexOf(c) < 0; }));

    root.innerHTML = '';
    groups = [];

    order.forEach(function (cat) {
      var items = buckets[cat] || [];
      if (!items.length) return;

      var group = document.createElement('section');
      group.className = 'col-group';
      group.setAttribute('data-cat', cat);

      var head = document.createElement('header');
      head.className = 'col-group-head';

      var h3 = document.createElement('h3');
      var dot = document.createElement('i');
      dot.className = 'cg-dot';
      dot.setAttribute('aria-hidden', 'true');
      var name = document.createElement('span');
      name.className = 'cg-name';
      name.textContent = catName(cat);
      var cnt = document.createElement('span');
      cnt.className = 'cg-count';
      cnt.textContent = pad2(items.length);
      h3.appendChild(dot);
      h3.appendChild(name);
      h3.appendChild(cnt);

      var line = document.createElement('i');
      line.className = 'cg-line';
      line.setAttribute('aria-hidden', 'true');
      head.appendChild(h3);
      head.appendChild(line);

      var grid = document.createElement('div');
      grid.className = 'col-grid';

      var head_items = items.slice(0, COLLAPSED);
      var rest_items = items.slice(COLLAPSED);

      head_items.forEach(function (it) { grid.appendChild(buildCard(it.w, it.i)); });

      var moreWrap = null;
      if (rest_items.length) {
        moreWrap = document.createElement('div');
        moreWrap.className = 'col-more';
        moreWrap.id = 'colMore-' + cat;
        var inner = document.createElement('div');
        inner.className = 'col-more-inner';
        var grid2 = document.createElement('div');
        grid2.className = 'col-grid';
        rest_items.forEach(function (it) { grid2.appendChild(buildCard(it.w, it.i)); });
        inner.appendChild(grid2);
        moreWrap.appendChild(inner);
      }

      group.appendChild(head);
      group.appendChild(grid);
      if (moreWrap) group.appendChild(moreWrap);

      var btn = null;
      if (rest_items.length) {
        btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'col-toggle';
        btn.setAttribute('aria-controls', moreWrap.id);
        btn.innerHTML = '<span></span><i aria-hidden="true">＋</i>';
        group.appendChild(btn);
      }

      root.appendChild(group);

      var g = {
        cat: cat, total: items.length, open: false,
        group: group, btn: btn, moreEl: moreWrap, nameEl: name, countEl: cnt
      };
      groups.push(g);

      if (btn) {
        btn.addEventListener('click', function () {
          g.open = !g.open;
          syncGroupLabel(g);
          syncAllLabel();
          /* 折叠时把焦点/滚动收回到组标题，避免视口跳到空白 */
          if (!g.open) {
            var top = group.getBoundingClientRect().top;
            if (top < 80) group.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      }
      syncGroupLabel(g);
    });

    if (countEl) countEl.textContent = String(works.length);
    if (groupCountEl) groupCountEl.textContent = String(groups.length);
    syncAllLabel();
  }

  if (allBtn) {
    allBtn.addEventListener('click', function () {
      var expandable = groups.filter(function (g) { return g.total > COLLAPSED; });
      var allOpen = expandable.length > 0 && expandable.every(function (g) { return g.open; });
      expandable.forEach(function (g) {
        g.open = !allOpen;
        syncGroupLabel(g);
      });
      syncAllLabel();
    });
  }

  /* 语言切换：文案与 aria 重绘 */
  document.addEventListener('lang:change', function () {
    root.querySelectorAll('.col-card').forEach(function (card) {
      var idx = parseInt(card.getAttribute('data-index'), 10);
      var item = (window.WORKS || [])[idx];
      if (!item) return;
      var title = card.querySelector('.col-title');
      var sub = card.querySelector('.col-sub');
      if (title) title.textContent = tr(item, 'title');
      if (sub) sub.textContent = tr(item, 'sub') || catName(item.category);
      card.setAttribute('aria-label', T('col.playAria', '播放：{title}', { title: tr(item, 'title') }));
    });
    groups.forEach(function (g) {
      g.nameEl.textContent = catName(g.cat);
      syncGroupLabel(g);
    });
    syncAllLabel();
  });

  /* 快门显影：进入视口后揭开封面（配合 CSS clip-path 过渡） */
  function observeCards() {
    if (!('IntersectionObserver' in window)) {
      root.querySelectorAll('.col-card').forEach(function (c) { c.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    root.querySelectorAll('.col-card').forEach(function (c) { io.observe(c); });
  }

  render();
  observeCards();
})();
