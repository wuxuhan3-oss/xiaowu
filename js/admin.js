/* =============================================================================
 * admin.js — 管理端（留言管理）
 *
 * 分工：权限全部由数据库判定（is_admin() / claim_admin() + guest_messages 的
 * DELETE 策略），本文件只负责把服务端结果渲染出来，不做任何本地权限判断，
 * 也不缓存"我是管理员"这类状态。
 * ========================================================================== */
(function () {
  'use strict';

  var C = window.PortfolioCloud;
  var byId = function (id) { return document.getElementById(id); };

  var views = {
    loading: byId('viewLoading'),
    login: byId('viewLogin'),
    claim: byId('viewClaim'),
    panel: byId('viewPanel')
  };

  function show(name) {
    Object.keys(views).forEach(function (k) {
      if (views[k]) views[k].classList.toggle('hidden', k !== name);
    });
  }

  function say(node, text, tone) {
    if (!node) return;
    node.textContent = text || '';
    if (tone) node.setAttribute('data-tone', tone);
    else node.removeAttribute('data-tone');
  }

  /* 保留 ?sharecode=... 等参数，否则返回站点会被门禁拦成 403 */
  var search = location.search || '';
  var backLink = byId('backLink');
  if (backLink) backLink.href = 'index.html' + search;

  function fmtTime(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso).slice(0, 16).replace('T', ' ');
    var p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '.' + p(d.getMonth() + 1) + '.' + p(d.getDate()) +
      ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function maskUid(uid) {
    var s = String(uid || '');
    return s.length > 10 ? s.slice(0, 6) + '…' + s.slice(-4) : s;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------------------------------------------------------------- 面板 */

  var current = [];

  function renderList() {
    var list = byId('msgList');
    var empty = byId('msgEmpty');
    if (!list) return;
    list.innerHTML = '';
    if (!current.length) {
      if (empty) empty.classList.remove('hidden');
      return;
    }
    if (empty) empty.classList.add('hidden');

    current.forEach(function (m) {
      var li = document.createElement('li');
      li.className = 'item';
      li.setAttribute('data-id', m.id);
      li.innerHTML =
        '<div>' +
          '<div class="item-head">' +
            (m.name ? '<span class="who">' + esc(m.name) + '</span>' : '<span class="who who-none">匿名访客</span>') +
            (m.identity ? '<span class="tag">' + esc(m.identity) + '</span>' : '') +
            '<span class="when">' + esc(fmtTime(m.created_at)) + '</span>' +
          '</div>' +
          '<p class="text">' + esc(m.content) + '</p>' +
        '</div>' +
        '<button class="del" type="button" data-del="' + esc(m.id) + '">删除</button>';
      list.appendChild(li);
    });
  }

  async function renderPanel() {
    show('panel');
    byId('logoutBtn').classList.remove('hidden');
    var panelMsg = byId('panelMsg');
    say(panelMsg, '正在读取…');

    var session = null;
    try { session = await C.getSession(); } catch (e) { session = null; }
    var uid = session && session.user ? session.user.id : '';
    byId('statWho').textContent = uid ? maskUid(uid) : '—';

    var dl = 0;
    try { dl = await C.countDownloads(); } catch (e) { dl = 0; }
    byId('statDl').textContent = dl;

    try {
      current = await C.listAllMessages(200);
    } catch (e) {
      current = [];
      say(panelMsg, '留言读取失败：' + (e && (e.message || e.code) || '未知错误'), 'err');
    }
    byId('statMsgs').textContent = current.length;
    renderList();
    if (panelMsg.getAttribute('data-tone') !== 'err') say(panelMsg, '');
  }

  /* ------------------------------------------------------------ 交互绑定 */

  var loginBtn = byId('loginBtn');
  if (loginBtn) {
    loginBtn.addEventListener('click', function () {
      var loginMsg = byId('loginMsg');
      loginBtn.disabled = true;
      say(loginMsg, '正在前往 WorkBuddy 授权…');
      C.signInUrl().then(function (url) {
        if (!url) throw new Error('未拿到授权地址');
        location.assign(url);
      }).catch(function (e) {
        loginBtn.disabled = false;
        say(loginMsg, '无法发起登录：' + (e && e.message ? e.message : '请稍后重试'), 'err');
      });
    });
  }

  var claimBtn = byId('claimBtn');
  if (claimBtn) {
    claimBtn.addEventListener('click', async function () {
      var claimMsg = byId('claimMsg');
      var token = byId('tokenInput').value;
      if (!token || token.trim().length < 6) {
        say(claimMsg, '请输入完整的绑定口令', 'err');
        return;
      }
      claimBtn.disabled = true;
      say(claimMsg, '正在校验口令…');
      try {
        var status = await C.claimAdmin(token);
        if (status === 'ok') {
          say(claimMsg, '绑定成功，正在进入管理面板…', 'ok');
          byId('tokenInput').value = '';
          await renderPanel();
        } else if (status === 'already_admin') {
          await renderPanel();
        } else if (status === 'taken') {
          say(claimMsg, '此站点已绑定过管理员，当前账号无管理权限。', 'err');
        } else if (status === 'bad_token') {
          say(claimMsg, '口令不正确，请核对后重试。', 'err');
        } else if (status === 'no_session') {
          say(claimMsg, '登录状态已失效，请重新登录。', 'err');
        } else {
          say(claimMsg, '绑定未完成（' + status + '）', 'err');
        }
      } catch (e) {
        say(claimMsg, '绑定失败：' + (e && (e.message || e.code) || '请稍后重试'), 'err');
      } finally {
        claimBtn.disabled = false;
      }
    });
  }

  var msgList = byId('msgList');
  if (msgList) {
    msgList.addEventListener('click', async function (ev) {
      var btn = ev.target.closest('[data-del]');
      if (!btn) return;
      var id = btn.getAttribute('data-del');
      var row = current.filter(function (m) { return String(m.id) === String(id); })[0];
      var label = row ? (row.name || '匿名访客') + '：' + String(row.content).slice(0, 24) : id;
      if (!window.confirm('确认删除这条留言？删除后不可恢复。\n\n' + label)) return;

      var panelMsg = byId('panelMsg');
      btn.disabled = true;
      say(panelMsg, '正在删除…');
      try {
        await C.deleteMessage(id);
        current = current.filter(function (m) { return String(m.id) !== String(id); });
        byId('statMsgs').textContent = current.length;
        renderList();
        say(panelMsg, '已删除。', 'ok');
      } catch (e) {
        btn.disabled = false;
        say(panelMsg, '删除失败：' + (e && (e.message || e.code) || '权限不足或网络异常'), 'err');
      }
    });
  }

  var logoutBtn = byId('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async function () {
      logoutBtn.disabled = true;
      try { await C.signOut(); } catch (e) {}
      location.replace('admin.html' + search);
    });
  }

  /* ---------------------------------------------------------------- 启动 */

  async function boot() {
    if (!C || !C.ready) {
      show('login');
      say(byId('loginMsg'), '云服务脚本未加载，请刷新重试。', 'err');
      return;
    }
    show('loading');

    /* 回调必须先于任何登录守卫处理：code 是一次性的 */
    var cb;
    try { cb = await C.handleCallback(); } catch (e) { cb = { error: e && e.message || 'callback-failed' }; }
    if (cb.error) {
      show('login');
      say(byId('loginMsg'), '登录未完成：' + cb.error, 'err');
      return;
    }

    var session = cb.session || null;
    if (!session) {
      try { session = await C.getSession(); } catch (e) { session = null; }
    }
    if (!session) { show('login'); return; }

    var admin = false;
    try { admin = await C.isAdmin(); } catch (e) { admin = false; }

    if (!admin) {
      show('claim');
      var t = byId('tokenInput');
      if (t) t.focus();
      return;
    }
    await renderPanel();
  }

  boot();
})();
