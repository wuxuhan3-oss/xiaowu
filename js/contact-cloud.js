/* =============================================================================
 * contact-cloud.js — 云服务界面接线
 *
 *   1. 留言板：读写云数据库 guest_messages（公开可见，匿名可写）
 *   2. 简历下载热度：每次下载写入 resume_downloads，并显示累计次数
 *
 * 设计原则：
 *   - 云服务不可用时不显示这些区块，页面其余部分完全照常（绝不假装成功）
 *   - 所有失败都有可见文案，不留静默失败
 *   - 文本一律用 textContent 写入，不拼 HTML
 * ========================================================================== */
(function () {
  'use strict';

  var C = window.PortfolioCloud;
  if (!C) return;

  var RATE_KEY = 'bbx-gb-last';
  var RATE_MS = 30000;

  function tr(key, fallback, vars) {
    var s = null;
    try {
      if (window.I18N && typeof window.I18N.t === 'function') s = window.I18N.t(key, vars);
    } catch (e) {}
    if (typeof s === 'string' && s && s.indexOf(key) !== 0) return s;
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        fallback = String(fallback).split('{' + k + '}').join(vars[k]);
      });
    }
    return fallback;
  }

  function toast(msg) {
    try {
      if (window.UI && typeof window.UI.toast === 'function') { window.UI.toast(msg); return; }
    } catch (e) {}
  }

  function lang() {
    try {
      return (document.documentElement.getAttribute('data-lang') || 'zh');
    } catch (e) { return 'zh'; }
  }

  function relTime(iso) {
    var t = Date.parse(iso);
    if (!t) return '';
    var diff = Math.max(0, Date.now() - t);
    var min = Math.floor(diff / 60000);
    var L = lang();
    var unit = {
      zh: ['刚刚', '分钟前', '小时前', '天前'],
      en: ['just now', 'min ago', 'h ago', 'd ago'],
      ko: ['방금', '분 전', '시간 전', '일 전'],
      ja: ['たった今', '分前', '時間前', '日前']
    }[L] || ['刚刚', '分钟前', '小时前', '天前'];
    if (min < 1) return unit[0];
    if (min < 60) return min + ' ' + unit[1];
    var h = Math.floor(min / 60);
    if (h < 24) return h + ' ' + unit[2];
    return Math.floor(h / 24) + ' ' + unit[3];
  }

  /* 把数据库错误翻译成用户能看懂的提示 */
  function reason(err) {
    var code = err && err.code;
    if (code === '23514' || code === '42501') return tr('gb.errDenied', '内容不符合要求，请检查字数后重试');
    if (err && err.message === 'content-too-short') return tr('gb.errShort', '请至少写 2 个字');
    if (err && /Failed to fetch|NetworkError|network/i.test(err.message || '')) {
      return tr('gb.errNet', '网络中断，留言未发送');
    }
    return tr('gb.errGeneric', '发送失败，请稍后再试');
  }

  /* ---------------------------------------------------------------- 留言板 */
  var gb = {
    root: null, list: null, form: null,
    name: null, identity: null, content: null, submit: null, hint: null
  };

  function buildItem(row) {
    var li = document.createElement('li');
    li.className = 'gb-item';

    var head = document.createElement('p');
    head.className = 'gb-item-head';

    var who = document.createElement('span');
    who.className = 'gb-item-name';
    who.textContent = row.name || tr('gb.anon', '匿名访客');
    head.appendChild(who);

    if (row.identity) {
      var idt = document.createElement('span');
      idt.className = 'gb-item-id';
      idt.textContent = row.identity;
      head.appendChild(idt);
    }

    var time = document.createElement('span');
    time.className = 'gb-item-time';
    time.textContent = relTime(row.created_at);
    head.appendChild(time);

    var body = document.createElement('p');
    body.className = 'gb-item-text';
    body.textContent = row.content;

    li.appendChild(head);
    li.appendChild(body);
    return li;
  }

  function renderList(rows) {
    if (!gb.list) return;
    gb.list.textContent = '';
    rows.forEach(function (row) { gb.list.appendChild(buildItem(row)); });

    var empty = gb.root.querySelector('.gb-empty');
    if (empty) empty.hidden = rows.length > 0;

    var count = gb.root.querySelector('#gbCount');
    if (count) count.textContent = rows.length ? String(rows.length).padStart(2, '0') : '';
  }

  function refresh() {
    return C.listMessages(6).then(renderList).catch(function () {
      var empty = gb.root.querySelector('.gb-empty');
      if (empty) {
        empty.hidden = false;
        empty.textContent = tr('gb.loadFail', '留言暂时加载不出来，稍后刷新即可');
      }
    });
  }

  function setHint(text, tone) {
    if (!gb.hint) return;
    gb.hint.textContent = text || '';
    gb.hint.setAttribute('data-tone', tone || '');
  }

  function busy(on) {
    if (!gb.submit) return;
    gb.submit.disabled = !!on;
    gb.submit.classList.toggle('is-busy', !!on);
  }

  function onSubmit(ev) {
    ev.preventDefault();
    var content = gb.content ? gb.content.value : '';
    if (content.trim().length < 2) {
      setHint(tr('gb.errShort', '请至少写 2 个字'), 'err');
      if (gb.content) gb.content.focus();
      return;
    }

    var last = 0;
    try { last = parseInt(localStorage.getItem(RATE_KEY) || '0', 10) || 0; } catch (e) {}
    if (Date.now() - last < RATE_MS) {
      setHint(tr('gb.errRate', '刚发过一条，稍等一会儿再留言'), 'err');
      return;
    }

    busy(true);
    setHint(tr('gb.sending', '发送中…'), '');

    C.addMessage({
      name: gb.name ? gb.name.value : '',
      identity: gb.identity ? gb.identity.value : '',
      content: content
    }).then(function (row) {
      try { localStorage.setItem(RATE_KEY, String(Date.now())); } catch (e) {}
      if (gb.content) gb.content.value = '';
      if (gb.name) gb.name.value = '';
      if (gb.identity) gb.identity.value = '';
      setHint(tr('gb.sent', '已发布，感谢留言'), 'ok');
      toast(tr('gb.sent', '已发布，感谢留言'));
      if (row && gb.list) {
        gb.list.insertBefore(buildItem(row), gb.list.firstChild);
        var empty = gb.root.querySelector('.gb-empty');
        if (empty) empty.hidden = true;
      }
      refresh();
    }).catch(function (err) {
      setHint(reason(err), 'err');
    }).then(function () {
      busy(false);
    });
  }

  function mountGuestbook() {
    gb.root = document.getElementById('guestbook');
    if (!gb.root) return;

    gb.list = gb.root.querySelector('#gbList');
    gb.form = gb.root.querySelector('#gbForm');
    gb.name = gb.root.querySelector('#gbName');
    gb.identity = gb.root.querySelector('#gbIdentity');
    gb.content = gb.root.querySelector('#gbContent');
    gb.submit = gb.root.querySelector('#gbSubmit');
    gb.hint = gb.root.querySelector('#gbHint');

    if (gb.form) gb.form.addEventListener('submit', onSubmit);
    if (gb.content) {
      gb.content.addEventListener('input', function () {
        var n = gb.content.value.length;
        var counter = gb.root.querySelector('#gbCounter');
        if (counter) counter.textContent = n + ' / 300';
        if (n > 0) setHint('', '');
      });
    }
    gb.root.hidden = false;
    refresh();
  }

  /* ------------------------------------------------------- 简历下载热度 */
  var dl = { box: null, num: null, ready: false };

  function renderCount(n) {
    if (!dl.box || !dl.num) return;
    dl.num.textContent = String(n);
    dl.box.hidden = n <= 0;
  }

  function refreshCount() {
    C.countDownloads().then(renderCount).catch(function () { /* 静默：计数只是装饰 */ });
  }

  function langOfLink(a) {
    var href = (a.getAttribute('href') || '') + ' ' + (a.getAttribute('download') || '');
    return /EN|en-|English|WuXuhan_Resume_EN/i.test(href) ? 'en' : 'zh';
  }

  function mountDownloadCount() {
    dl.box = document.getElementById('dlCount');
    dl.num = document.getElementById('dlNum');
    if (!dl.box || !dl.num) return;

    document.addEventListener('click', function (ev) {
      var t = ev.target;
      var a = (t && t.closest) ? t.closest('a[download]') : null;
      if (!a) return;
      if (ev.button !== undefined && ev.button !== 0) return;
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      C.logDownload(langOfLink(a)).then(function () {
        window.setTimeout(refreshCount, 600);
      }).catch(function () { /* 统计失败不影响下载本身 */ });
    }, true);

    refreshCount();
  }

  /* ------------------------------------------------------------ 启动 */
  C.ready.then(function (client) {
    if (!client) return; /* SDK 不可用：保持区块隐藏，页面照常 */
    mountGuestbook();
    mountDownloadCount();
  });

  document.addEventListener('lang:change', function () {
    if (gb.root && !gb.root.hidden) refresh();
  });
})();
