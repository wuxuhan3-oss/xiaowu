/* 作品集主逻辑：网格渲染、分类筛选、详情弹窗、视频播放 + 视觉交互增强 */
(function () {
  var works = window.WORKS || [];
  var categories = window.CATEGORIES || {};
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var grid = document.getElementById("worksGrid");
  var filterBar = document.getElementById("filterBar");
  var modal = document.getElementById("workModal");
  var modalMedia = document.getElementById("modalMedia");
  var modalTitle = document.getElementById("modalTitle");
  var modalDesc = document.getElementById("modalDesc");
  var modalTag = document.getElementById("modalTag");
  var modalSpecs = document.getElementById("modalSpecs");
  var modalClose = document.getElementById("modalClose");
  var modalBackdrop = document.getElementById("modalBackdrop");
  var prevBtn = document.getElementById("prevWork");
  var nextBtn = document.getElementById("nextWork");

  var currentFilter = "all";
  var visibleList = [];
  var currentIndex = -1;
  var lastFocus = null;

  /* ---------- 工具 ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function hasVideo(w) { return !!w.videoPath; }

  /* ---------- 计数徽标 ---------- */
  (function counts() {
    var by = { all: works.length };
    Object.keys(categories).forEach(function (k) { by[k] = 0; });
    works.forEach(function (w) { if (by[w.category] != null) by[w.category]++; });
    [["All", "all"], ["Ad", "ad"], ["Ai", "ai"], ["Drama", "drama"],
     ["Trailer", "trailer"], ["Doc", "doc"], ["City", "city"], ["Anim", "anim"]]
      .forEach(function (p) {
        var el = document.getElementById("count" + p[0]);
        if (el) el.textContent = by[p[1]] != null ? by[p[1]] : 0;
      });
  })();

  /* ---------- 渲染网格 ---------- */
  function renderGrid() {
    visibleList = [];
    var html = "";
    works.forEach(function (w, i) {
      if (currentFilter !== "all" && w.category !== currentFilter) return;
      visibleList.push(i);
      var catName = categories[w.category] || "作品";
      var thumb;
      if (w.thumb) {
        thumb = w.vertical
          ? '<img class="bg-blur" src="' + esc(w.thumb) + '" alt="" aria-hidden="true">' +
            '<img class="fg" src="' + esc(w.thumb) + '" alt="' + esc(w.title) + '" loading="lazy">'
          : '<img src="' + esc(w.thumb) + '" alt="' + esc(w.title) + '" loading="lazy">';
      } else if (hasVideo(w)) {
        thumb = '<video src="' + esc(w.videoPath) + '#t=1.5" preload="metadata" muted playsinline ' +
          'onerror="this.parentElement.innerHTML=\'<div class=\\\'ph\\\'>▶</div>\'"></video>';
      } else {
        thumb = '<div class="ph">▶</div>';
      }
      html +=
        '<article class="work-card reveal" data-index="' + i + '" tabindex="0" role="button" aria-label="查看作品：' + esc(w.title) + '">' +
          '<div class="work-thumb' + (w.vertical ? " portrait" : "") + '">' + thumb +
            '<div class="play-badge"><div class="play-circle">' +
              '<svg width="20" height="22" viewBox="0 0 20 22"><path d="M18.5 9.27 3.6.7C2.3-.05.75.9.75 2.43v17.14c0 1.53 1.55 2.48 2.85 1.73l14.9-8.57a2 2 0 0 0 0-3.46z" fill="#1a1d23"/></svg>' +
            '</div></div>' +
            (w.vertical ? '<span class="vertical-badge">竖屏</span>' : "") +
            (w.duration ? '<span class="work-duration">' + esc(w.duration) + "</span>" : "") +
          "</div>" +
          '<div class="work-meta">' +
            '<span class="work-tag">' + esc(catName) + "</span>" +
            '<h3 class="work-title">' + esc(w.title) + "</h3>" +
            '<p class="work-sub">' + esc(w.sub) + "</p>" +
          "</div>" +
        "</article>";
    });
    grid.innerHTML = html;
    revealElems(grid.querySelectorAll(".reveal"), 60); // 卡片交错显现
  }

  /* ---------- 滚动显现 ---------- */
  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) {
        en.target.classList.add("in-view");
        revealObserver.unobserve(en.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

  function revealElems(elems, stagger) {
    var i = 0;
    elems.forEach(function (el) {
      if (stagger) {
        el.style.transitionDelay = Math.min(i * stagger, 420) + "ms";
        i++;
      }
      if (reduceMotion) { el.classList.add("in-view"); return; }
      revealObserver.observe(el);
    });
  }
  // 页面各区块依次显现
  revealElems(document.querySelectorAll(
    ".section-head, .about-main, .side-card, .filter-bar, .timeline, .cta-inner, .hero-eyebrow, .hero-title, .hero-sub, .hero-actions, .hero-stats"
  ), 90);

  /* ---------- Hero 数字滚动 ---------- */
  (function countUp() {
    var nums = document.querySelectorAll("[data-count]");
    var done = false;
    function animate(el) {
      var target = parseInt(el.dataset.count, 10) || 0;
      var prefix = el.dataset.prefix || "";
      var suffix = el.dataset.suffix || "";
      if (reduceMotion) { el.textContent = prefix + target + suffix; return; }
      var dur = 1400, start = null;
      function frame(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = prefix + Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && !done) {
          done = true;
          nums.forEach(animate);
          io.disconnect();
        }
      });
    }, { threshold: 0.4 });
    if (nums.length) io.observe(nums[0].closest(".hero-stats") || nums[0]);
  })();

  /* ---------- 滚动进度条 / 返回顶部 / 导航阴影 ---------- */
  var progress = document.getElementById("scrollProgress");
  var backTop = document.getElementById("backTop");
  var header = document.getElementById("siteHeader");

  function onScroll() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    var p = max > 0 ? (window.scrollY / max) * 100 : 0;
    progress.style.width = p + "%";
    backTop.classList.toggle("show", window.scrollY > 480);
    header.classList.toggle("scrolled", window.scrollY > 8);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  backTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  });

  /* ---------- 按钮涟漪 ---------- */
  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".btn");
    if (!btn || reduceMotion) return;
    var rect = btn.getBoundingClientRect();
    var size = Math.max(rect.width, rect.height);
    var r = document.createElement("span");
    r.className = "ripple";
    r.style.width = r.style.height = size + "px";
    r.style.left = (e.clientX - rect.left - size / 2) + "px";
    r.style.top = (e.clientY - rect.top - size / 2) + "px";
    btn.appendChild(r);
    setTimeout(function () { r.remove(); }, 650);
  });

  /* ---------- 弹窗 ---------- */
  function openModal(pos) {
    if (pos < 0 || pos >= visibleList.length) return;
    currentIndex = pos;
    var w = works[visibleList[pos]];
    lastFocus = document.activeElement;
    modalTitle.textContent = w.title;
    modalDesc.textContent = w.desc;
    modalTag.textContent = (categories[w.category] || "作品") +
      (w.duration ? " · " + w.duration : "") + (w.ratio ? " · " + w.ratio : "");
    modalMedia.className = "modal-media" + (w.vertical ? " portrait" : "");

    // 角色 / 流程 / 风格 / 交付规格
    var specs = [
      ["角色", window.WORK_ROLE || "剪辑师"],
      ["后期流程", window.WORK_FLOW || "素材整理 → 粗剪 → 精剪 → 调色 → 音效 → 字幕 → 特效包装 → 成片输出"],
      ["风格", w.style || "—"],
      ["交付规格", [w.ratio, w.duration, "H.264 / AAC", "MP4 + faststart"].filter(Boolean).join(" · ")]
    ];
    modalSpecs.innerHTML = specs.map(function (row) {
      return '<div class="spec-row"><span class="spec-key">' + esc(row[0]) +
        '</span><span class="spec-val">' + esc(row[1]) + "</span></div>";
    }).join("");
    if (hasVideo(w)) {
      modalMedia.innerHTML =
        '<video src="' + esc(w.videoPath) + '"' + (w.thumb ? ' poster="' + esc(w.thumb) + '"' : "") +
        ' controls playsinline preload="metadata" autoplay></video>';
    } else if (w.thumb) {
      modalMedia.innerHTML = '<img src="' + esc(w.thumb) + '" alt="' + esc(w.title) + '">';
    } else {
      modalMedia.innerHTML =
        '<div class="media-placeholder"><span style="font-size:34px">🎬</span>' +
        "<span>视频素材整理中，敬请期待</span></div>";
    }
    modal.classList.remove("closing");
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    modalClose.focus();
  }
  function closeModal() {
    var v = modalMedia.querySelector("video");
    if (v) { v.pause(); v.removeAttribute("src"); v.load(); }
    modal.classList.add("closing");
    var end = function () {
      modal.classList.remove("open", "closing");
      modal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    };
    if (reduceMotion) { end(); } else { setTimeout(end, 220); }
  }
  function step(dir) {
    var next = (currentIndex + dir + visibleList.length) % visibleList.length;
    openModal(next);
  }

  /* ---------- 事件绑定 ---------- */
  grid.addEventListener("click", function (e) {
    var card = e.target.closest(".work-card");
    if (!card) return;
    var pos = visibleList.indexOf(Number(card.dataset.index));
    if (pos > -1) openModal(pos);
  });
  grid.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    var card = e.target.closest(".work-card");
    if (!card) return;
    e.preventDefault();
    var pos = visibleList.indexOf(Number(card.dataset.index));
    if (pos > -1) openModal(pos);
  });

  filterBar.addEventListener("click", function (e) {
    var btn = e.target.closest(".filter-btn");
    if (!btn) return;
    filterBar.querySelectorAll(".filter-btn").forEach(function (b) { b.classList.remove("active"); });
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    renderGrid();
  });

  modalClose.addEventListener("click", closeModal);
  modalBackdrop.addEventListener("click", closeModal);
  prevBtn.addEventListener("click", function () { step(-1); });
  nextBtn.addEventListener("click", function () { step(1); });

  document.addEventListener("keydown", function (e) {
    if (!modal.classList.contains("open")) return;
    if (e.key === "Escape") closeModal();
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
  });

  /* ---------- 移动端导航 ---------- */
  var navToggle = document.getElementById("navToggle");
  var mainNav = document.getElementById("mainNav");
  navToggle.addEventListener("click", function () {
    navToggle.classList.toggle("open");
    mainNav.classList.toggle("open");
  });
  mainNav.addEventListener("click", function (e) {
    if (e.target.closest("a")) {
      navToggle.classList.remove("open");
      mainNav.classList.remove("open");
    }
  });

  /* ---------- 导航高亮 ---------- */
  var navLinks = {};
  mainNav.querySelectorAll(".nav-link").forEach(function (a) {
    var id = (a.getAttribute("href") || "").replace("#", "");
    if (id) navLinks[id] = a;
  });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting && navLinks[en.target.id]) {
        mainNav.querySelectorAll(".nav-link").forEach(function (a) { a.classList.remove("active"); });
        navLinks[en.target.id].classList.add("active");
      }
    });
  }, { rootMargin: "-40% 0px -55% 0px" });
  ["works", "about", "experience", "deliverables", "contact"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) io.observe(el);
  });

  /* ---------- 启动 ---------- */
  renderGrid();
})();
