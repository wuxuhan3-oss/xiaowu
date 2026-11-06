/* =============================================================================
 * actions.js — 简历下载加固
 *
 * 问题：站点开启了分享码门禁（?sharecode=xxx），而 <a download> 指向的 PDF
 * 地址本身不带 sharecode。分享码不在 URL 上时服务端返回 403 HTML，浏览器
 * 表现为「点了完全没反应」。
 *
 * 方案（按可靠性排序，全部同步完成，保住用户手势）：
 *   1. 点击捕获阶段，把 a 的 href 同步改写成带当前页面 sharecode 的地址
 *      —— 原生下载照常进行，浏览器下载管理器全权处理，兼容性最好
 *      （iOS Safari / 微信 WebView 也能正常存文件）。
 *   2. 不 preventDefault、不拦截默认行为，避免出现「被脚本吃掉点击」的情况。
 *   3. 点击即给按钮加 is-busy 状态与 toast 回执，绝不留无反馈的空白。
 *   4. 同时发一个 Range 探测请求：若服务端仍拒绝（403/404），立即提示并
 *      改用新窗口打开，保证用户一定能拿到文件。
 * ========================================================================== */
(function () {
  'use strict';

  var HAS_FETCH = !!window.fetch;

  function tr(key, fallback, vars) {
    try {
      if (window.I18N && typeof window.I18N.t === 'function') {
        var s = window.I18N.t('toast.' + key, vars);
        if (s && typeof s === 'string' && s.indexOf('toast.') !== 0) return s;
      }
    } catch (e) {}
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        fallback = fallback.split('{' + k + '}').join(vars[k]);
      });
    }
    return fallback;
  }

  function toast(msg) {
    try {
      if (window.UI && typeof window.UI.toast === 'function') {
        window.UI.toast(msg);
        return;
      }
    } catch (e) {}
  }

  function pageSharecode() {
    try {
      var p = new URLSearchParams(location.search);
      return p.get('sharecode') || p.get('shareCode') || p.get('code') || '';
    } catch (e) {
      var m = /[?&](?:sharecode|shareCode|code)=([^&#]+)/.exec(location.search || '');
      return m ? decodeURIComponent(m[1]) : '';
    }
  }

  function absUrl(a) {
    var h = a.getAttribute('href') || '';
    try { return new URL(h, location.href).href; } catch (e) { return h; }
  }

  /* 把当前页面的 sharecode 追加到资源地址上（幂等） */
  function sign(url) {
    var sc = pageSharecode();
    if (!sc) return url;
    if (/[?&](?:sharecode|shareCode)=/i.test(url)) return url;
    return url + (url.indexOf('?') < 0 ? '?' : '&') + 'sharecode=' + encodeURIComponent(sc);
  }

  function fileNameOf(a) {
    var d = a.getAttribute('download');
    if (d) return d;
    try {
      return decodeURIComponent(absUrl(a).split('?')[0].split('/').pop()) || 'resume.pdf';
    } catch (e) { return 'resume.pdf'; }
  }

  /* 探测资源是否真的可取：只拉 2 个字节，代价极小 */
  function probe(url, a) {
    if (!HAS_FETCH) return;
    var ctrl = null;
    try { ctrl = new AbortController(); } catch (e) {}

    var opts = {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Range: 'bytes=0-1' }
    };
    if (ctrl) opts.signal = ctrl.signal;

    fetch(url, opts).then(function (res) {
      if (res.ok || res.status === 206) return;
      throw new Error('status ' + res.status);
    }).catch(function () {
      /* 探测失败：可能是门禁拒绝，也可能是网络抖动。直接开新窗口兜底 */
      try {
        a.classList.remove('is-busy');
        a.removeAttribute('aria-busy');
      } catch (e) {}
      toast(tr('dlFail', '下载被拦截，已为你打开文件'));
      try {
        var w = window.open(url, '_blank');
        if (!w) location.href = url;
        else { try { w.opener = null; } catch (e) {} }
      } catch (e2) {
        try { location.href = url; } catch (e3) {}
      }
    });
  }

  function onClick(ev) {
    var t = ev.target;
    var a = (t && t.closest) ? t.closest('a[download]') : null;
    if (!a) return;

    /* 中键 / 组合键：尊重浏览器原生行为，不介入 */
    if (ev.button !== undefined && ev.button !== 0) return;
    if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;

    var href = a.getAttribute('href');
    if (!href) return;

    /* 关键一步：同步修正 href，让原生下载带上 sharecode。
       这里刻意不 preventDefault —— 下载交给浏览器，成功率最高。 */
    try {
      var signed = sign(absUrl(a));
      if (signed !== absUrl(a)) a.setAttribute('href', signed);
    } catch (e) {}

    var name = fileNameOf(a);
    try {
      a.classList.add('is-busy');
      a.setAttribute('aria-busy', 'true');
      window.setTimeout(function () {
        a.classList.remove('is-busy');
        a.removeAttribute('aria-busy');
      }, 1400);
    } catch (e) {}

    toast(tr('dlDone', '已开始下载：{v}', { v: name }));

    /* 异步确认资源可用，不可用时另开窗口 */
    try { probe(absUrl(a), a); } catch (e) {}
  }

  function bind() {
    /* 用捕获阶段：确保在其它脚本改动 href 之前完成签名 */
    document.addEventListener('click', onClick, true);

    /* 页面加载后预先签名一次，让「右键另存 / 复制链接」也带上分享码 */
    try {
      Array.prototype.forEach.call(document.querySelectorAll('a[download]'), function (a) {
        try { a.setAttribute('href', sign(absUrl(a))); } catch (e) {}
      });
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();
