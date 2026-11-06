/* =============================================================================
 * cloud.js — WorkBuddy 云服务客户端（数据库模块）
 *
 * 初始化参数全部来自开通云服务时下发的 publicConfig：
 *   endpoint         —— 本应用发布域名的数据面入口（不可替换、不可硬编码别的域名）
 *   oauthRelayBaseUrl —— 统一登录中继（本站暂不做登录，保留以备用）
 *   publishableKey    —— 只标识「哪个应用」，本身不含权限；服务端按 Origin 精确校验
 *
 * 数据表（已在云数据库建好，含 RLS）：
 *   guest_messages    —— 访客留言：公开读、匿名可写（内容 2–300 字，称呼/身份 ≤40 字）
 *   resume_downloads  —— 简历下载记录：公开读（用于计数）、匿名可写（lang ∈ zh/en）
 *
 * 本文件只做数据访问，不碰 DOM；界面接线在 contact-cloud.js。
 * ========================================================================== */
(function () {
  'use strict';

  var CONFIG = {
    endpoint: 'https://wuxuhan-portfolio.app.workbuddy.host',
    oauthRelayBaseUrl: 'https://www.workbuddy.cn/v2/as/genie-baas/oauth',
    publishableKey: 'wbpk_V4TLWYZskT1dU7EiIu2Z16_v7Tc44vqf30U1gKMXmbZa44gq7ClGcR1'
  };

  var MAX = { name: 40, identity: 40, content: 300 };

  var client = null;
  var initError = null;
  var resolveReady;
  var ready = new Promise(function (resolve) { resolveReady = resolve; });
  var started = false;

  function init() {
    if (started) return;
    started = true;

    var lib = window.WorkBuddyCloud;
    if (!lib || typeof lib.createWorkBuddyCloud !== 'function') {
      initError = new Error('cloud-sdk-unavailable');
      resolveReady(null);
      return;
    }
    try {
      client = lib.createWorkBuddyCloud({
        endpoint: CONFIG.endpoint,
        oauthRelayBaseUrl: CONFIG.oauthRelayBaseUrl,
        publishableKey: CONFIG.publishableKey
      });
    } catch (e) {
      initError = e;
      client = null;
    }
    resolveReady(client);
  }

  /* SDK 通过 CDN <script> 在本文件之前加载；若尚未就绪，等 load 事件后初始化 */
  if (window.WorkBuddyCloud) init();
  else if (document.readyState === 'complete') init();
  else window.addEventListener('load', init, { once: true });

  function api() {
    return ready.then(function (c) {
      if (!c) throw initError || new Error('cloud-unavailable');
      return c;
    });
  }

  /* 去掉控制字符并裁剪长度；空白一律视为「未填写」 */
  function clean(value, max) {
    var s = (value == null ? '' : String(value))
      .replace(/[\u0000-\u001f\u007f]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return s ? s.slice(0, max) : null;
  }

  window.PortfolioCloud = {
    /** 客户端就绪句柄：resolve 为 SDK 客户端，SDK 不可用时为 null */
    ready: ready,

    available: function () { return !!client; },

    /** 最近留言（默认 6 条，倒序） */
    listMessages: function (limit) {
      return api().then(function (c) {
        return c.database
          .from('guest_messages')
          .select('id, name, identity, content, created_at')
          .order('created_at', { ascending: false })
          .limit(limit || 6)
          .then(function (res) {
            if (res.error) throw res.error;
            return res.data || [];
          });
      });
    },

    /** 写入一条留言：返回新行；校验失败以 rejected promise 抛出 */
    addMessage: function (msg) {
      var row = {
        content: clean(msg && msg.content, MAX.content),
        name: clean(msg && msg.name, MAX.name),
        identity: clean(msg && msg.identity, MAX.identity)
      };
      if (!row.content || row.content.length < 2) {
        return Promise.reject(new Error('content-too-short'));
      }
      return api().then(function (c) {
        return c.database
          .from('guest_messages')
          .insert(row)
          .select()
          .then(function (res) {
            if (res.error) throw res.error;
            return (res.data || [])[0] || null;
          });
      });
    },

    /** 记录一次简历下载（lang: 'zh' | 'en'） */
    logDownload: function (lang) {
      return api().then(function (c) {
        return c.database
          .from('resume_downloads')
          .insert({ lang: lang === 'en' ? 'en' : 'zh' })
          .then(function (res) {
            if (res.error) throw res.error;
            return true;
          });
      });
    },

    /* ---------------- 登录态 ----------------
     * 仅管理端使用。站点前台不要求任何登录。
     */

    /** 当前会话：未登录返回 null */
    getSession: function () {
      return api().then(function (c) {
        return c.auth.getSession().then(function (res) {
          if (res.error) return null;
          return res.data || null;
        });
      });
    },

    /** 生成 WorkBuddy 登录跳转地址（同标签页跳转，SDK 依赖本标签页的 PKCE 凭据） */
    signInUrl: function () {
      return api().then(function (c) {
        var back = new URL(location.href);
        back.pathname = location.pathname;
        ['code', 'state', 'provider'].forEach(function (k) { back.searchParams.delete(k); });
        return c.auth
          .signInWithOAuth({ provider: 'workbuddy', redirectTo: back.toString() })
          .then(function (res) {
            if (res.error) throw new Error(res.error.message || 'signin-start-failed');
            return res.data && res.data.url;
          });
      });
    },

    /** 处理授权回调；返回 { session } / { empty } / { error } */
    handleCallback: function () {
      var url = new URL(location.href);
      if (!url.searchParams.has('code') && !url.searchParams.has('error')) {
        return Promise.resolve({ empty: true });
      }
      var provider = url.searchParams.get('provider');
      if (provider !== 'workbuddy') return Promise.resolve({ error: 'unsupported-provider' });
      return api().then(function (c) {
        if (typeof c.auth.handleWorkBuddyCallback !== 'function') {
          return { error: 'callback-handler-missing' };
        }
        return c.auth.handleWorkBuddyCallback().then(function (res) {
          if (res.error) return { error: res.error.message || 'callback-failed' };
          if (!res.data) return { empty: true };
          ['code', 'state', 'provider'].forEach(function (k) { url.searchParams.delete(k); });
          history.replaceState(null, '', url.pathname + url.search + url.hash);
          return { session: res.data };
        });
      });
    },

    signOut: function () {
      return api().then(function (c) { return c.auth.signOut(); }).then(function () { return true; });
    },

    /* ---------------- 管理员 ----------------
     * 权限在数据库侧判定：is_admin() 读 app_admins 表，claim_admin() 凭一次性口令绑定唯一管理员。
     * 前端不做任何权限判断，只展示服务端返回的结果。
     */

    isAdmin: function () {
      return api().then(function (c) {
        return c.database.rpc('is_admin').then(function (res) {
          if (res.error) throw res.error;
          return res.data === true || res.data === 'true';
        });
      });
    },

    /** 返回 'ok' | 'already_admin' | 'taken' | 'bad_token' | 'no_session' */
    claimAdmin: function (token) {
      return api().then(function (c) {
        return c.database.rpc('claim_admin', { p_token: String(token == null ? '' : token).trim() })
          .then(function (res) {
            if (res.error) throw res.error;
            return res.data;
          });
      });
    },

    /** 管理员视角的完整留言列表（含 id，用于删除） */
    listAllMessages: function (limit) {
      return api().then(function (c) {
        return c.database
          .from('guest_messages')
          .select('id, name, identity, content, created_at')
          .order('created_at', { ascending: false })
          .limit(limit || 200)
          .then(function (res) {
            if (res.error) throw res.error;
            return res.data || [];
          });
      });
    },

    /** 删除一条留言（RLS 只允许管理员） */
    deleteMessage: function (id) {
      return api().then(function (c) {
        return c.database.from('guest_messages').delete().eq('id', id).then(function (res) {
          if (res.error) throw res.error;
          return res.data || [];
        });
      });
    },

    /**
     * 简历累计下载次数
     * 该数据面的 select(count) 不返回计数（count 恒为 null），改用库内计数函数
     * resume_download_count()（SECURITY DEFINER，仅出总数、不出明细）。
     */
    countDownloads: function () {
      return api().then(function (c) {
        return c.database.rpc('resume_download_count').then(function (res) {
          if (res.error) throw res.error;
          var n = res.data;
          if (Array.isArray(n)) n = n[0] && (n[0].resume_download_count != null ? n[0].resume_download_count : n[0].count);
          n = Number(n);
          return isFinite(n) && n > 0 ? n : 0;
        });
      });
    }
  };
})();
