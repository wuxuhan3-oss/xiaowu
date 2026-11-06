/* ============================================================
   试做 TRIAL — 左侧粘性身份卡
   收起为窄条（INDEX + 朱砂点），悬停/聚焦展开为身份 + 章节索引 + 简历入口
   ============================================================ */
(function () {
  'use strict';

  var ITEMS = [
    { id: 'works', key: 'nav.works', no: '01', dflt: '展映' },
    { id: 'collection', key: 'nav.collection', no: '02', dflt: '合集' },
    { id: 'experience', key: 'nav.exp', no: '03', dflt: '履历' },
    { id: 'contact', key: 'nav.contact', no: '04', dflt: '联络' }
  ];

  function T(k, fb) {
    var v = window.I18N ? window.I18N.t(k) : null;
    return (typeof v === 'string' && v && v !== k) ? v : fb;
  }

  var rail = document.createElement('aside');
  rail.className = 'rail';
  rail.setAttribute('aria-label', '身份与章节索引');

  var stub = document.createElement('div');
  stub.className = 'rail-stub';
  stub.innerHTML = '<i></i><span>INDEX · 吴旭涵</span>';

  var body = document.createElement('div');
  body.className = 'rail-body';

  var head = document.createElement('div');
  head.className = 'rail-head';
  var kick = document.createElement('span');
  kick.className = 'rail-kicker';
  kick.textContent = 'INDEX';
  var idx = document.createElement('span');
  idx.className = 'rail-idx';
  idx.textContent = '01 / 06';
  head.appendChild(kick);
  head.appendChild(idx);

  var name = document.createElement('p');
  name.className = 'rail-name';

  var role = document.createElement('p');
  role.className = 'rail-role';

  var line = document.createElement('div');
  line.className = 'rail-line';

  var nav = document.createElement('nav');
  nav.className = 'rail-nav';

  var links = ITEMS.map(function (it) {
    var a = document.createElement('a');
    a.className = 'rail-link';
    a.href = '#' + it.id;
    a.setAttribute('data-rail', it.id);
    var b = document.createElement('b');
    b.textContent = it.no;
    var s = document.createElement('span');
    s.textContent = it.dflt;
    var e = document.createElement('em');
    e.textContent = '↗';
    a.appendChild(b); a.appendChild(s); a.appendChild(e);
    nav.appendChild(a);
    return a;
  });

  var pdf = document.createElement('a');
  pdf.className = 'rail-pdf';
  pdf.href = 'assets/resume/%E5%90%B4%E6%97%AD%E6%B6%B5_%E7%AE%80%E5%8E%86.pdf';
  pdf.setAttribute('download', '吴旭涵_简历.pdf');
  pdf.innerHTML = '<span>RESUME — PDF</span><b>↓</b>';

  body.appendChild(head);
  body.appendChild(name);
  body.appendChild(role);
  body.appendChild(line);
  body.appendChild(nav);
  body.appendChild(pdf);

  rail.appendChild(stub);
  rail.appendChild(body);
  document.body.appendChild(rail);

  function label() {
    name.textContent = T('hero.name', '吴旭涵');
    role.textContent = T('hero.top2', '影视后期 · 短视频运营 · AIGC');
    stub.querySelector('span').textContent = 'INDEX · ' + name.textContent;
    links.forEach(function (a, i) {
      a.querySelector('span').textContent = T(ITEMS[i].key, ITEMS[i].dflt);
    });
  }
  label();
  document.addEventListener('lang:change', label);

  /* 章节高亮 */
  var ticking = false;
  function update() {
    ticking = false;
    var on = window.scrollY > window.innerHeight * 0.55;
    rail.classList.toggle('is-on', on);
    if (!on) return;

    var mid = window.innerHeight * 0.42;
    var current = null;
    ITEMS.forEach(function (it) {
      var el = document.getElementById(it.id);
      if (!el) return;
      var r = el.getBoundingClientRect();
      if (r.top <= mid) current = it.id;
    });
    links.forEach(function (a) {
      a.classList.toggle('is-active', a.getAttribute('data-rail') === current);
    });
    /* 页码：从当前章节的 data-page 读取（dockCurrent 内部是滚动数字列，不可直接取 textContent） */
    var pageNo = current ? (document.getElementById(current).getAttribute('data-page') || '02') : '02';
    idx.textContent = pageNo + ' / 06';
  }
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();
