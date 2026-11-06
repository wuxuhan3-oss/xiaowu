/* ============================================================
   i18n.js — 中 / EN / 한국어 / 日本語 四语切换
   用法：data-i18n（纯文本）、data-i18n-html（富文本）、
        data-i18n-aria（aria-label）、data-i18n-cursor（自定义光标文案）、
        data-i18n-text（同步到 data-text 属性，供 CSS 伪元素使用）
   ============================================================ */
(function () {
  'use strict';

  var STORE = 'bbx-lang';
  var LANGS = ['zh', 'en', 'ko', 'ja'];
  var HTML_LANG = { zh: 'zh-CN', en: 'en', ko: 'ko', ja: 'ja' };

  var dict = {
    zh: {
      doc: {
        title: '吴旭涵 · 影像档案 | 影视后期 · 内容创作',
        desc: '吴旭涵的影像档案：影视动画科班出身，影视后期、短视频运营与 AIGC 创作。以艺术展陈的方式，呈现十六件影像作品。'
      },
      nav: { works: '展映', collection: '合集', about: '自述', exp: '履历', contact: '联络', cv: '简历', menu: '打开菜单', closeMenu: '关闭菜单', guide: '交互指南' },
      aria: {
        skip: '跳到主内容', backTop: '回到顶部', nav: '主导航', sectionNav: '章节索引', filters: '作品分类', view: '视图切换',
        close: '关闭展映', play: '播放 / 暂停', mute: '静音', unmute: '取消静音', fs: '全屏', progress: '播放进度',
        volume: 'BGM 音量', zoom: '画面大小', zoomOriginal: '原始大小', zoomHalf: '半全屏', zoomFull: '全屏',
        prev: '上一件', next: '下一件', lang: '切换语言', prevPage: '上一页', nextPage: '下一页', workOpen: '打开展映：{title}'
      },
      preloader: { kicker: 'BLACK BOX ARCHIVE — 影像档案', meta: '吴旭涵 · 影视后期 / 短视频运营 · 2026' },
      hero: {
        top1: 'PORTFOLIO / NO.01', top2: '影视后期 · 短视频运营 · AIGC', top3: '吉林 · 中国 / 2026',
        title1: '影像', title2: '造境',
        name: '吴旭涵', nameEn: 'Wu Xuhan',
        lede: '影视动画科班出身，<br>在商业广告、海外短剧与纪录片之间，<br>用剪辑重建时间的呼吸。',
        ctaWorks: '进入展映', ctaCv: '下载简历', cursorEnter: '进入', cursorScroll: '下滚',
        scroll: 'SCROLL', readout: 'SYS://ARCHIVE · FRAME 0001—0016 · 24FPS',
        stat1: '内容实习', unit1: '段',
        stat2: '省级 / 国家级奖项', unit2: '项',
        stat3: '海外短剧日榜',
        stat4: '账号冷启动涨粉', unit4: '+'
      },
      marquee: { m1: '商业广告', m2: '海外短剧', m3: '纪录片', m4: 'AIGC 创作', m5: '城市影像', m6: '直播切片', m7: '内容策略', m8: '数据复盘' },
      works: {
        kicker: '01 — SELECTED WORKS', title: '展映', en: 'selected works',
        lede: '十六件影像作品，按主题陈列。悬停卡片可静音预览，点击进入完整展映。',
        hint: '点击卡片进入展映 · 支持键盘 ← → 切换 · 可在「展墙 / 索引」间切换',
        before: '共', after: '件 · 影像母带可按需索取', request: '索取完整片源', empty: '该分类暂无作品。', cta: '进入展映', cursor: '展映'
      },
      filters: { all: '全部', ad: '商业广告', ai: 'AI 创作', drama: '短剧 · 预告', doc: '纪录片', city: '城市 · 活动' },
      col: {
        kicker: '02 — VIDEO LIBRARY', title: '视频合集', en: 'video library',
        lede: '全部成片按类目归档：商业广告、AI 创作、短剧与预告、纪录片、城市与活动。点击任意一条即可单独播放，展开或收起按类目查看。',
        hint: '按类目分组 · 点击卡片单独播放 · 支持展开更多 / 收起',
        unit: '支视频', groupUnit: '个类目',
        expandAll: '展开全部', collapseAll: '全部收起', more: '展开更多 {n} 支', less: '收起',
        playAria: '播放：{title}'
      },
      view: { wall: '展墙', index: '索引' },
      about: {
        kicker: '03 — STATEMENT', title: '自述', en: 'about',
        edu: '教育', eduValue: '吉林工程技术师范学院 · 艺术与设计学院 · 影视动画（本科）',
        time: '时间', timeValue: '2023.09 — 2027.07',
        rank: '排名', rankValue: '校前 10% · 一等奖学金 ×2',
        loc: '坐标', locValue: '吉林 · 中国',
        quote: '把每一个 3 秒，<br>剪成能被记住的情绪。',
        p1: '我是一名兼具<strong>后期制作</strong>与<strong>新媒体运营</strong>能力的复合型内容人：能独立完成从选题策划、脚本撰写、剪辑包装到发布复盘的全流程；熟悉抖音汽车垂类、海外短剧、电商新媒体等多领域的内容调性与爆款逻辑，习惯用完播率、互动率等数据反推内容迭代。',
        p2: '熟练使用 Premiere Pro、After Effects、DaVinci Resolve、剪映专业版完成剪辑与包装，Photoshop / Illustrator 完成视觉设计，并熟练运用 AI 工具辅助文案生成与内容批量生产。',
        toolbox: 'TOOLBOX / 工具箱',
        s1: '剪辑', s2: '动效包装', s3: '调色', s4: '快剪', s5: '视觉设计', s6: '图形', s7: '快设',
        t8: '短视频策划', t9: '数据分析', t10: 'AI 内容生产',
        s8b: '选题 / 脚本', s9b: '完播 / 互动',
        eduLabel: 'EDUCATION / 教育背景', eduName: '吉林工程技术师范学院', eduSub: '影视动画（本科） · 2023.09 — 2027.07 · 统招全日制',
        eduLi1: '主修：影视剪辑 / 三维动画建模 / 影视美术 / 动画软件制作 / 影视动画语言',
        eduLi2: '综合排名校前 10%，一等奖学金 ×2、二等奖学金 ×1、三等奖学金 ×2',
        awardsLabel: 'AWARDS / 获奖',
        award1: '吉林省第七届冰雪节创意大赛 · 三等奖（省级）',
        award2: '天池奖·第七届吉林省大学生广告创意大赛 · 优秀奖（省级）',
        award3: '吉林省第三、二届大学生主题创作短视频大赛 · 优秀奖（省级）',
        award4: '第六届全国大学生组织管理能力大赛 · 一等奖（国家级）',
        award5: '全国大学生视觉艺术设计竞赛（UVADC）省级赛 · 三等奖'
      },
      exp: {
        kicker: '04 — EXPERIENCE', title: '履历', en: 'experience',
        lede: '四段内容实战：从直播切片到海外短剧，再到汽车垂类与 AIGC。点击任一履历，展开它的方法与数据。',
        hint: '点击展开详情 · 再次点击收起',
        y1: '2025.12 — 2026.03', o1: '上海策良信息技术有限公司', r1: '新媒体运营实习生 · 汽车垂类',
        b11: '负责汽车改装垂类抖音矩阵号的内容策划、脚本撰写与日常运营（覆盖「话痨说车」等账号）',
        b12: '独立完成短视频从选题、脚本、剪辑到发布全流程，熟悉汽车垂类内容调性与爆款逻辑',
        b13: '基于完播率、互动率、涨粉趋势迭代内容方向，重点优化开头 3 秒钩子与选题结构',
        y2: '2025.07 — 2025.11', o2: 'TSAF 深圳敏思悦动科技有限公司', r2: '新媒体运营实习生',
        b21: '独立运营小红书企业号，累计产出原创图文 88 篇、短视频 130 条，粉丝从 0 冷启动至 8000+',
        b22: '搭建标准化选题库与更新 SOP，沉淀可复用的封面与标题模板，维持账号稳定增长',
        b23: '负责电商产品图后期，用 Photoshop 完成调色、瑕疵修复与精修，统一店铺视觉风格',
        y3: '2024.11 — 2025.03', o3: '福州畅读科技有限公司', r3: 'AI 漫剧后期制作实习生',
        b31: '独立完成 15 部都市复仇竖屏短剧后期剪辑，累计交付 1630 集，覆盖欧美（原生英文）与印尼（国产翻拍）双市场',
        b32: '作品上线 MoboReels 等畅读海外短剧 App，单部最高登顶站内日榜第 1 名，最高播放量 600 万',
        b33: '基于海外榜单与完播数据重构剪辑节奏，AI 批量生成字幕与转场，单集效率提升 36%，完播率提升 3 个百分点',
        y4: '2023.12 — 2024.03', o4: '莆田聚云合科技有限公司', r4: '视频剪辑实习生',
        b41: '负责直播切片与千川投流素材剪辑，日均产出 10–15 条，稳定支撑直播间日播投流',
        b42: '编写千川投放脚本，7 条成功跑量；优化前 3 秒结构与卖点呈现，素材完播率提升 35%，获客成本降低 18%'
      },
      contact: {
        kicker: '05 — CONTACT', title1: '一起做点', title2: '有质感的东西',
        note: '面试官可直接下载简历；点击上方任意一行，即可复制联系方式。',
        cvZh: '中文简历 · PDF', cvEn: 'English CV',
        time: 'BEIJING · 此刻', copy: '复制', phone: '拨号', wechat: '微信',
        previewHero: '在线预览简历', previewZh: '在线预览中文简历', previewEn: '在线预览英文简历',
        resumeKicker: 'RESUME / CV', resumeZh: '中文简历', resumeEn: 'English CV', resumePages: '页',
        resumeDownload: '下载原文件', resumeClose: '关闭预览', resumeZoom: '点击页面可放大，再次点击还原',
        resumeHint: '预览由 PDF 原文件渲染，内容与下载文件一致。',
        resumeLoadFail: '预览图加载失败，可能是网络波动或访问受限', resumeOpenPdf: '新窗口打开 PDF', resumeRetry: '重试加载',
        dlCount: '简历已被下载', dlUnit: '次'
      },
      gb: {
        kicker: 'GUESTBOOK / 留言', title: '留下一句话',
        note: '留言实时写入云端，公开可见。看了片子想聊两句，都可以写在这里。',
        lbName: '称呼', phName: '可选',
        lbIdentity: '身份', phIdentity: '可选，如 HR / 导演',
        lbContent: '留言', phContent: '写点什么…',
        send: '发送留言', sending: '发送中…', sent: '已发布，感谢留言',
        empty: '还没有留言，来做第一个。', anon: '匿名访客',
        loadFail: '留言暂时加载不出来，稍后刷新即可',
        errShort: '请至少写 2 个字', errRate: '刚发过一条，稍等一会儿再留言',
        errDenied: '内容不符合要求，请检查字数后重试',
        errNet: '网络中断，留言未发送', errGeneric: '发送失败，请稍后再试'
      },
      footer: { copy: '© 2026 吴旭涵 · 影视后期 / 短视频运营', note: '个人影像档案 · BLACK BOX ARCHIVE', top: '↑ TOP' },
      modal: {
        format: '形式', formatValue: '影像 / 短片', duration: '时长', category: '类别', number: '编号',
        prev: '← 上一件', next: '下一件 →', hint: '← → 切换作品 · ESC 关闭',
        stageNote: '影像母带 · 可邮件索取', stageNoteMov: 'MOV 母带 · 可邮件索取',
        errorNote: '该片源需邮件索取高清版', playBlocked: '播放受阻 · 请点击画面重试'
      },
      guide: {
        title: 'HOW TO EXPLORE / 如何浏览',
        k1: '滚动', d1: '逐帧经过每个章节', k2: '悬停', d2: '作品卡片静音预览',
        k3: '点击', d3: '进入展映 · ← → 切换', k4: '点击邮箱', d4: '一键复制联系方式', k5: 'ESC', d5: '关闭展映 / 指南'
      },
      start: '向下滚动 · 进入影像档案',
      toast: {
        filter: '{cat} · {n} 件', viewWall: '展墙视图 · 进入展映', viewIndex: '索引视图 · 快速浏览',
        copied: '已复制：{v}', copyFail: '复制失败，请手动选择', videoError: '该片源需邮件索取高清版',
        copyManual: '已选中，按 Ctrl / ⌘ + C 复制',
        dlStart: '正在准备下载…', dlDone: '已开始下载：{v}', dlFail: '下载被拦截，已为你打开文件'
      },
      page: { dock: '页面进度', prev: '上一页', next: '下一页' },
      cat: { ad: '商业广告', ai: 'AI 创作', drama: '短剧 · 预告', doc: '纪录片', city: '城市 · 活动' },
      section: { hero: '序', works: '展映', collection: '合集', about: '自述', experience: '履历', contact: '联络' }
    },

    en: {
      doc: {
        title: 'Wu Xuhan · Black Box Archive | Post-production & Content Creation',
        desc: 'The moving-image archive of Wu Xuhan: film-animation graduate working across post-production, short-form content and AIGC. Sixteen works presented as an exhibition.'
      },
      nav: { works: 'Works', collection: 'Library', about: 'About', exp: 'Experience', contact: 'Contact', cv: 'CV', menu: 'Open menu', closeMenu: 'Close menu', guide: 'Guide' },
      aria: {
        skip: 'Skip to content', backTop: 'Back to top', nav: 'Main navigation', sectionNav: 'Section index', filters: 'Work categories', view: 'View switch',
        close: 'Close screening', play: 'Play / pause', mute: 'Mute', unmute: 'Unmute', fs: 'Fullscreen', progress: 'Playback progress',
        volume: 'BGM volume', zoom: 'Screen size', zoomOriginal: 'Original size', zoomHalf: 'Half screen', zoomFull: 'Full screen',
        prev: 'Previous work', next: 'Next work', lang: 'Switch language', prevPage: 'Previous page', nextPage: 'Next page', workOpen: 'Open screening: {title}'
      },
      preloader: { kicker: 'BLACK BOX ARCHIVE', meta: 'Wu Xuhan · Post-production / Short-form · 2026' },
      hero: {
        top1: 'PORTFOLIO / NO.01', top2: 'POST-PRODUCTION · SHORT-FORM · AIGC', top3: 'JILIN · CHINA / 2026',
        title1: 'IMAGE', title2: 'WORLDS',
        name: 'Wu Xuhan', nameEn: '吴旭涵',
        lede: 'Trained in film animation,<br>moving between commercials, overseas short dramas and documentaries —<br>rebuilding the breath of time through editing.',
        ctaWorks: 'Enter the works', ctaCv: 'Download CV', cursorEnter: 'ENTER', cursorScroll: 'SCROLL',
        scroll: 'SCROLL', readout: 'SYS://ARCHIVE · FRAME 0001—0016 · 24FPS',
        stat1: 'Content internships', unit1: '',
        stat2: 'Provincial & national awards', unit2: '',
        stat3: 'Overseas short-drama daily chart',
        stat4: 'Followers from a cold start', unit4: '+'
      },
      marquee: { m1: 'Commercial', m2: 'Overseas drama', m3: 'Documentary', m4: 'AIGC', m5: 'City film', m6: 'Live clips', m7: 'Content strategy', m8: 'Data review' },
      works: {
        kicker: '01 — SELECTED WORKS', title: 'WORKS', en: 'selected works',
        lede: 'Sixteen moving-image works, arranged by theme. Hover for a silent preview; click to enter the screening.',
        hint: 'Click a card to enter · Use ← → keys · Switch between Wall / Index',
        before: 'Total', after: 'works · masters available on request', request: 'Request full masters', empty: 'No works in this category yet.', cta: 'Enter', cursor: 'View'
      },
      filters: { all: 'All', ad: 'Commercial', ai: 'AI Creation', drama: 'Drama · Trailer', doc: 'Documentary', city: 'City · Event' },
      col: {
        kicker: '02 — VIDEO LIBRARY', title: 'Video Library', en: 'video library',
        lede: 'Every finished piece, filed by category: commercials, AI work, drama & trailers, documentary, city & events. Click any card to play it on its own.',
        hint: 'Grouped by category · click a card to play · expand or collapse as needed',
        unit: 'videos', groupUnit: 'categories',
        expandAll: 'Expand all', collapseAll: 'Collapse all', more: 'Show {n} more', less: 'Collapse',
        playAria: 'Play: {title}'
      },
      view: { wall: 'Wall', index: 'Index' },
      about: {
        kicker: '03 — STATEMENT', title: 'ABOUT', en: 'about',
        edu: 'Education', eduValue: 'Jilin Engineering Normal University · College of Art and Design · Film & Animation (BA)',
        time: 'Period', timeValue: '2023.09 — 2027.07',
        rank: 'Ranking', rankValue: 'Top 10% · First-class scholarship ×2',
        loc: 'Location', locValue: 'Jilin · China',
        quote: 'Every three seconds,<br>cut into an emotion worth remembering.',
        p1: 'I am a hybrid content maker working across <strong>post-production</strong> and <strong>new-media operations</strong>: I can run the whole pipeline from topic planning and scripting to editing, packaging and post-release reviews. I know the tone and viral logic of automotive, overseas short-drama and e-commerce content, and I habitually let retention and engagement data drive the next iteration.',
        p2: 'I edit and package in Premiere Pro, After Effects, DaVinci Resolve and CapCut Pro, design visuals in Photoshop / Illustrator, and use AI tools to accelerate copywriting and batch content production.',
        toolbox: 'TOOLBOX',
        s1: 'Editing', s2: 'Motion & packaging', s3: 'Color grading', s4: 'Quick cut', s5: 'Visual design', s6: 'Graphics', s7: 'Quick design',
        t8: 'Short-video planning', t9: 'Data analysis', t10: 'AI content production',
        s8b: 'Topic / Script', s9b: 'Retention / Engagement',
        eduLabel: 'EDUCATION', eduName: 'Jilin Engineering Normal University', eduSub: 'Film & Animation (BA) · 2023.09 — 2027.07 · Full-time',
        eduLi1: 'Majors: Film editing / 3D animation modeling / Film art / Animation software / Film animation language',
        eduLi2: 'Top 10% of the school; first-class scholarship ×2, second-class ×1, third-class ×2',
        awardsLabel: 'AWARDS',
        award1: '7th Jilin Ice & Snow Festival Creative Contest · Third Prize (Provincial)',
        award2: 'Tianchi Award · 7th Jilin Advertising Creative Contest · Excellence Award (Provincial)',
        award3: '3rd & 2nd Jilin Provincial College Student Theme Creation Short Video Contest · Excellence Award (Provincial)',
        award4: '6th National College Student Organizational Management Competition · First Prize (National)',
        award5: 'National University Visual Art Design Competition (UVADC), provincial round · Third Prize'
      },
      exp: {
        kicker: '04 — EXPERIENCE', title: 'EXPERIENCE', en: 'experience',
        lede: 'Four content internships: from live clips to overseas short dramas, then automotive verticals and AIGC. Click any entry to open its method and numbers.',
        hint: 'Click to expand · Click again to collapse',
        y1: '2025.12 — 2026.03', o1: 'Shanghai Celiang Information Technology Co., Ltd.', r1: 'New-media Operations Intern · Automotive',
        b11: 'Planned content, wrote scripts and ran daily operations for an automotive-modification Douyin account matrix (including accounts such as Talkative Cars).',
        b12: 'Owned the full short-video workflow — topic, script, edit, publishing — with a strong feel for automotive content and viral mechanics.',
        b13: 'Iterated content strategy from retention, engagement and follower trends, focusing on the opening three-second hook and topic structure.',
        y2: '2025.07 — 2025.11', o2: 'TSAF Shenzhen Minsiyuedong Technology Co., Ltd.', r2: 'New-media Operations Intern',
        b21: 'Ran the Xiaohongshu corporate account solo — 88 original posts and 130 short videos, 0 → 8,000+ followers',
        b22: 'Built a standard topic library and posting SOP; reusable cover and headline templates for steady growth',
        b23: 'Product-photo retouching in Photoshop — colour grading, blemish removal, consistent store visual style',
        y3: '2024.11 — 2025.03', o3: 'Fuzhou Changdu Technology Co., Ltd.', r3: 'AI Drama Post-production Intern',
        b31: 'Edited 15 urban-revenge vertical short dramas, 1,630 episodes delivered across Western (native English) and Indonesian (localized remake) markets',
        b32: 'Titles live on MoboReels and other Changdu overseas short-drama apps; best title hit No.1 on the in-app daily chart with 6M views',
        b33: 'Rebuilt pacing from overseas charts and completion data; AI-assisted subtitles and transitions — per-episode efficiency +36%, completion +3 pts',
        y4: '2023.12 — 2024.03', o4: 'Putian Juyunhe Technology Co., Ltd.', r4: 'Video Editing Intern',
        b41: 'Edited live-stream clips and Qianchuan ad creatives, 10–15 pieces daily, supporting daily live ad delivery',
        b42: 'Wrote Qianchuan ad scripts, 7 scaled into paid delivery; reworked the first 3 seconds — creative completion +35%, acquisition cost -18%'
      },
      contact: {
        kicker: '05 — CONTACT', title1: 'Let us make', title2: 'something tactile',
        note: 'Recruiters can download the CV directly; click any line above to copy the contact.',
        cvZh: 'Chinese CV · PDF', cvEn: 'English CV',
        time: 'BEIJING · NOW', copy: 'Copy', phone: 'Call', wechat: 'WECHAT',
        previewHero: 'Preview CV', previewZh: 'Preview Chinese CV', previewEn: 'Preview English CV',
        resumeKicker: 'RESUME / CV', resumeZh: 'Chinese CV', resumeEn: 'English CV', resumePages: 'page',
        resumeDownload: 'Download PDF', resumeClose: 'Close preview', resumeZoom: 'Click the page to zoom in, click again to reset',
        resumeHint: 'Rendered from the original PDF — identical to the downloaded file.',
        resumeLoadFail: 'Preview image failed to load — network hiccup or access restriction', resumeOpenPdf: 'Open PDF in a new tab', resumeRetry: 'Retry',
        dlCount: 'CV downloaded', dlUnit: 'times'
      },
      gb: {
        kicker: 'GUESTBOOK', title: 'Leave a note',
        note: 'Messages are written to the cloud instantly and shown publicly. Watched something and want to talk? Write it here.',
        lbName: 'Name', phName: 'Optional',
        lbIdentity: 'Role', phIdentity: 'Optional, e.g. HR / director',
        lbContent: 'Message', phContent: 'Say something…',
        send: 'Post message', sending: 'Posting…', sent: 'Posted — thanks for the note',
        empty: 'No notes yet — be the first.', anon: 'Anonymous visitor',
        loadFail: 'Notes could not be loaded — refresh in a moment',
        errShort: 'Please write at least 2 characters', errRate: 'Just posted — try again in a moment',
        errDenied: 'Content rejected — please check the length',
        errNet: 'Network lost — your note was not sent', errGeneric: 'Could not post — please try again'
      },
      footer: { copy: '© 2026 Wu Xuhan · Post-production / Short-form', note: 'Personal moving-image archive · BLACK BOX ARCHIVE', top: '↑ TOP' },
      modal: {
        format: 'Format', formatValue: 'Film / Short', duration: 'Duration', category: 'Category', number: 'No.',
        prev: '← Previous', next: 'Next →', hint: '← → switch work · ESC to close',
        stageNote: 'Master file · available by email', stageNoteMov: 'MOV master · available by email',
        errorNote: 'Request the HD file by email', playBlocked: 'Playback blocked · click the frame to retry'
      },
      guide: {
        title: 'HOW TO EXPLORE',
        k1: 'Scroll', d1: 'Move frame by frame through sections', k2: 'Hover', d2: 'Silent preview on work cards',
        k3: 'Click', d3: 'Open the screening · ← → to switch', k4: 'Click email', d4: 'Copy the contact in one tap', k5: 'ESC', d5: 'Close screening / guide'
      },
      start: 'Scroll · enter the archive',
      toast: {
        filter: '{cat} · {n} works', viewWall: 'Wall view · enter a screening', viewIndex: 'Index view · quick browse',
        copied: 'Copied: {v}', copyFail: 'Copy failed — please select manually', videoError: 'Request the HD file by email',
        copyManual: 'Selected — press Ctrl / ⌘ + C to copy',
        dlStart: 'Preparing download…', dlDone: 'Download started: {v}', dlFail: 'Download blocked — opened the file instead'
      },
      page: { dock: 'Page progress', prev: 'Previous page', next: 'Next page' },
      cat: { ad: 'Commercial', ai: 'AI Creation', drama: 'Drama · Trailer', doc: 'Documentary', city: 'City · Event' },
      section: { hero: 'Overture', works: 'Works', collection: 'Library', about: 'About', experience: 'Experience', contact: 'Contact' }
    },

    ko: {
      doc: {
        title: '우쉬한 · 이미지 아카이브 | 영상 후반 · 콘텐츠 제작',
        desc: '우쉬한의 이미지 아카이브. 영상 애니메이션 전공으로 영상 후반, 숏폼 운영, AIGC 창작을 아우르며 16편의 작품을 전시 형태로 선보입니다.'
      },
      nav: { works: '작품', collection: '모음', about: '소개', exp: '경력', contact: '연락', cv: '이력서', menu: '메뉴 열기', closeMenu: '메뉴 닫기', guide: '가이드' },
      aria: {
        skip: '본문으로 건너뛰기', backTop: '맨 위로', nav: '주 메뉴', sectionNav: '섹션 인덱스', filters: '작품 분류', view: '보기 전환',
        close: '상영 닫기', play: '재생 / 일시정지', mute: '음소거', unmute: '음소거 해제', fs: '전체 화면', progress: '재생 진행',
        volume: 'BGM 음량', zoom: '화면 크기', zoomOriginal: '원본 크기', zoomHalf: '하프 스크린', zoomFull: '전체 화면',
        prev: '이전 작품', next: '다음 작품', lang: '언어 전환', prevPage: '이전 페이지', nextPage: '다음 페이지', workOpen: '상영 열기: {title}'
      },
      preloader: { kicker: 'BLACK BOX ARCHIVE — 이미지 아카이브', meta: '우쉬한 · 영상 후반 / 숏폼 운영 · 2026' },
      hero: {
        top1: 'PORTFOLIO / NO.01', top2: '영상 후반 · 숏폼 운영 · AIGC', top3: '지린 · 중국 / 2026',
        title1: '이미지', title2: '세계',
        name: '우쉬한', nameEn: 'Wu Xuhan',
        lede: '영상 애니메이션을 전공하고,<br>광고·해외 숏드라마·다큐멘터리 사이에서<br>편집으로 시간의 호흡을 다시 짓습니다.',
        ctaWorks: '작품 보기', ctaCv: '이력서 받기', cursorEnter: '보기', cursorScroll: '스크롤',
        scroll: 'SCROLL', readout: 'SYS://ARCHIVE · FRAME 0001—0016 · 24FPS',
        stat1: '콘텐츠 인턴십', unit1: '회',
        stat2: '성·국가급 수상', unit2: '개',
        stat3: '해외 숏드라마 일간 차트',
        stat4: '콜드 스타트 팔로워 증가', unit4: '+'
      },
      marquee: { m1: '광고', m2: '해외 숏드라마', m3: '다큐멘터리', m4: 'AIGC 창작', m5: '도시 영상', m6: '라이브 클립', m7: '콘텐츠 전략', m8: '데이터 리뷰' },
      works: {
        kicker: '01 — SELECTED WORKS', title: '작품', en: 'selected works',
        lede: '16편의 영상 작품을 주제별로 배치했습니다. 카드에 마우스를 올리면 무음 미리보기, 클릭하면 상영으로 이어집니다.',
        hint: '카드를 클릭해 상영 · ← → 키 전환 · 월 / 인덱스 보기 전환',
        before: '총', after: '편 · 원본 마스터는 요청 시 제공', request: '전체 원본 요청', empty: '이 분류에는 아직 작품이 없습니다.', cta: '상영', cursor: '보기'
      },
      filters: { all: '전체', ad: '광고', ai: 'AI 창작', drama: '숏드라마 · 예고', doc: '다큐멘터리', city: '도시 · 행사' },
      col: {
        kicker: '02 — VIDEO LIBRARY', title: '영상 모음', en: 'video library',
        lede: '완성된 모든 영상을 카테고리별로 정리했습니다: 광고, AI 창작, 숏드라마·예고, 다큐멘터리, 도시·행사. 카드를 클릭하면 개별 재생됩니다.',
        hint: '카테고리별 그룹 · 카드 클릭으로 개별 재생 · 더 보기 / 접기 지원',
        unit: '개 영상', groupUnit: '개 카테고리',
        expandAll: '모두 펼치기', collapseAll: '모두 접기', more: '{n}개 더 보기', less: '접기',
        playAria: '재생: {title}'
      },
      view: { wall: '월', index: '인덱스' },
      about: {
        kicker: '03 — STATEMENT', title: '소개', en: 'about',
        edu: '학력', eduValue: '지린 공정기술사범대학 · 예술디자인대학 · 영상 애니메이션(학사)',
        time: '기간', timeValue: '2023.09 — 2027.07',
        rank: '석차', rankValue: '학내 상위 10% · 1등 장학금 ×2',
        loc: '위치', locValue: '지린 · 중국',
        quote: '모든 3초를,<br>기억에 남는 감정으로 편집합니다.',
        p1: '저는 <strong>후반 제작</strong>과 <strong>뉴미디어 운영</strong>을 함께 다루는 콘텐츠 메이커입니다. 기획·대본·편집·패키징부터 게시 후 리뷰까지 전 과정을 단독으로 수행할 수 있고, 자동차·해외 숏드라마·이커머스 콘텐츠의 톤과 바이럴 구조를 이해합니다. 완주율과 참여율 데이터를 바탕으로 다음 버전을 설계합니다.',
        p2: 'Premiere Pro, After Effects, DaVinci Resolve, CapCut Pro로 편집·패키징하고 Photoshop / Illustrator로 비주얼을 설계하며, AI 도구로 카피 생성과 대량 제작을 가속합니다.',
        toolbox: 'TOOLBOX / 툴박스',
        s1: '편집', s2: '모션·패키징', s3: '색보정', s4: '퀵 컷', s5: '비주얼 디자인', s6: '그래픽', s7: '퀵 디자인',
        t8: '숏폼 기획', t9: '데이터 분석', t10: 'AI 콘텐츠 제작',
        s8b: '주제 / 대본', s9b: '완주 / 반응',
        eduLabel: 'EDUCATION / 학력', eduName: '지린 공정기술사범대학', eduSub: '영상 애니메이션(학사) · 2023.09 — 2027.07 · 전일제',
        eduLi1: '전공: 영상 편집 / 3D 애니메이션 모델링 / 영상 미술 / 애니메이션 소프트웨어 / 영상 애니메이션 언어',
        eduLi2: '학내 상위 10%, 1등 장학금 ×2 · 2등 ×1 · 3등 ×2',
        awardsLabel: 'AWARDS / 수상',
        award1: '지린성 제7회 빙설축제 크리에이티브 공모전 · 3등상(성급)',
        award2: '톈츠상 제7회 지린성 대학생 광고 크리에이티브 공모전 · 우수상(성급)',
        award3: '지린성 제3·2회 대학생 주제 창작 숏비디오 공모전 · 우수상(성급)',
        award4: '제6회 전국 대학생 조직관리 역량 대회 · 1등상(국가급)',
        award5: '전국 대학생 시각예술디자인 공모전(UVADC) 성급 대회 · 3등상'
      },
      exp: {
        kicker: '04 — EXPERIENCE', title: '경력', en: 'experience',
        lede: '네 번의 콘텐츠 실전: 라이브 클립에서 해외 숏드라마, 자동차 버티컬과 AIGC까지. 항목을 클릭하면 방식과 데이터가 펼쳐집니다.',
        hint: '클릭해 펼치기 · 다시 클릭해 접기',
        y1: '2025.12 — 2026.03', o1: '상하이 처량 정보기술 유한회사', r1: '뉴미디어 운영 인턴 · 자동차 버티컬',
        b11: '자동차 튜닝 버티컬 더우인 매트릭스 계정의 콘텐츠 기획·대본 작성·일상 운영 담당(‘수다쟁이 자동차’ 등).',
        b12: '숏폼의 기획·대본·편집·게시 전 과정을 단독 수행하며 자동차 버티컬의 톤과 바이럴 구조를 이해.',
        b13: '완주율·참여율·팔로워 추이로 방향을 개선하고 초반 3초 훅과 주제 구조를 최적화.',
        y2: '2025.07 — 2025.11', o2: 'TSAF 선전 민스웨둥 테크놀로지', r2: '뉴미디어 운영 인턴',
        b21: '샤오홍슈 기업 계정 단독 운영: 오리지널 이미지 88건·숏비디오 130건 제작, 팔로워 0 → 8000+',
        b22: '표준 주제 라이브러리와 업로드 SOP 구축, 재사용 가능한 커버·제목 템플릿으로 안정적 성장 유지',
        b23: '제품 이미지 후반 작업(Photoshop 색보정·결점 보정·정교화)으로 스토어 비주얼 통일',
        y3: '2024.11 — 2025.03', o3: '푸저우 창두 테크놀로지 유한회사', r3: 'AI 드라마 후반 제작 인턴',
        b31: '도시 복수 장르 세로형 숏드라마 15편 후반 편집 단독 담당, 총 1,630화 납품(서구·인도네시아 시장)',
        b32: 'MoboReels 등 창두 해외 숏드라마 앱에 공개, 최고 작품은 앱 내 일간 차트 1위·재생수 600만',
        b33: '해외 차트·완주 데이터로 편집 리듬 재구성, AI 자막·전환으로 편당 효율 36% 향상, 완주율 3%p 상승',
        y4: '2023.12 — 2024.03', o4: '푸톈 쥐윈허 테크놀로지', r4: '영상 편집 인턴',
        b41: '라이브 클립과 치엔촨 광고 소재 편집, 일평균 10~15편으로 라이브 일일 송출 지원',
        b42: '치엔촨 집행 스크립트 작성, 7편 확산 성공; 초반 3초 구조 개선으로 소재 완주율 35% 향상, 획득 비용 18% 절감'
      },
      contact: {
        kicker: '05 — CONTACT', title1: '함께', title2: '질감 있는 것을',
        note: '채용 담당자는 이력서를 바로 내려받을 수 있고, 위 항목을 클릭하면 연락처가 복사됩니다.',
        cvZh: '중문 이력서 · PDF', cvEn: 'English CV',
        time: 'BEIJING · 지금', copy: '복사', phone: '전화', wechat: 'WECHAT',
        previewHero: '이력서 미리보기', previewZh: '중문 이력서 미리보기', previewEn: '영문 이력서 미리보기',
        resumeKicker: 'RESUME / CV', resumeZh: '중문 이력서', resumeEn: 'English CV', resumePages: '페이지',
        resumeDownload: '원본 다운로드', resumeClose: '미리보기 닫기', resumeZoom: '페이지를 클릭하면 확대, 다시 클릭하면 원래 크기',
        resumeHint: 'PDF 원본을 렌더링한 미리보기이며, 다운로드 파일과 동일합니다.',
        resumeLoadFail: '미리보기 이미지를 불러오지 못했습니다 — 네트워크 또는 접근 제한', resumeOpenPdf: '새 창에서 PDF 열기', resumeRetry: '다시 시도',
        dlCount: '이력서 다운로드', dlUnit: '회'
      },
      gb: {
        kicker: 'GUESTBOOK / 방명록', title: '한마디 남기기',
        note: '메시지는 즉시 클라우드에 저장되며 공개됩니다. 작품을 보고 나눌 이야기가 있다면 여기에 남겨 주세요.',
        lbName: '이름', phName: '선택',
        lbIdentity: '소속', phIdentity: '선택, 예: HR / 감독',
        lbContent: '메시지', phContent: '하고 싶은 말…',
        send: '남기기', sending: '전송 중…', sent: '등록되었습니다. 감사합니다',
        empty: '아직 메시지가 없습니다. 첫 번째가 되어 보세요.', anon: '익명 방문자',
        loadFail: '메시지를 불러오지 못했습니다. 잠시 후 새로고침해 주세요',
        errShort: '2자 이상 입력해 주세요', errRate: '방금 등록했습니다. 잠시 후 다시 시도해 주세요',
        errDenied: '내용이 규칙에 맞지 않습니다. 글자 수를 확인해 주세요',
        errNet: '네트워크가 끊겨 전송되지 않았습니다', errGeneric: '전송 실패. 잠시 후 다시 시도해 주세요'
      },
      footer: { copy: '© 2026 우쉬한 · 영상 후반 / 숏폼 운영', note: '개인 이미지 아카이브 · BLACK BOX ARCHIVE', top: '↑ TOP' },
      modal: {
        format: '형식', formatValue: '영상 / 단편', duration: '재생 시간', category: '카테고리', number: '번호',
        prev: '← 이전', next: '다음 →', hint: '← → 작품 전환 · ESC 닫기',
        stageNote: '원본 마스터 · 이메일 요청', stageNoteMov: 'MOV 마스터 · 이메일 요청',
        errorNote: '고화질 파일은 이메일로 요청하세요', playBlocked: '재생이 차단되었습니다 · 화면을 다시 클릭하세요'
      },
      guide: {
        title: 'HOW TO EXPLORE / 둘러보기',
        k1: '스크롤', d1: '섹션을 프레임처럼 통과', k2: '호버', d2: '작품 카드 무음 미리보기',
        k3: '클릭', d3: '상영 열기 · ← → 전환', k4: '이메일 클릭', d4: '연락처 한 번에 복사', k5: 'ESC', d5: '상영 / 가이드 닫기'
      },
      start: '스크롤 · 아카이브로 들어가기',
      toast: {
        filter: '{cat} · {n}편', viewWall: '월 보기 · 상영으로', viewIndex: '인덱스 보기 · 빠른 탐색',
        copied: '복사됨: {v}', copyFail: '복사 실패 — 직접 선택하세요', videoError: '고화질 파일은 이메일로 요청하세요',
        copyManual: '선택됨 — Ctrl / ⌘ + C로 복사하세요',
        dlStart: '다운로드 준비 중…', dlDone: '다운로드 시작: {v}', dlFail: '다운로드가 차단되어 파일을 열었습니다'
      },
      page: { dock: '페이지 진행', prev: '이전 페이지', next: '다음 페이지' },
      cat: { ad: '광고', ai: 'AI 창작', drama: '숏드라마 · 예고', doc: '다큐멘터리', city: '도시 · 행사' },
      section: { hero: '서장', works: '작품', collection: '모음', about: '소개', experience: '경력', contact: '연락' }
    },

    ja: {
      doc: {
        title: '呉旭涵 · 影像アーカイブ | 映像ポストプロダクション・コンテンツ制作',
        desc: '呉旭涵の映像アーカイブ。映像アニメーション専攻として映像ポスト、ショート動画運営、AIGC制作を横断し、16の作品を展覧形式で紹介します。'
      },
      nav: { works: '展示', collection: 'コレクション', about: 'プロフィール', exp: '経歴', contact: 'コンタクト', cv: '履歴書', menu: 'メニューを開く', closeMenu: 'メニューを閉じる', guide: 'ガイド' },
      aria: {
        skip: '本文へスキップ', backTop: 'トップへ戻る', nav: 'メインナビゲーション', sectionNav: 'セクション索引', filters: '作品カテゴリ', view: '表示切替',
        close: '上映を閉じる', play: '再生 / 一時停止', mute: 'ミュート', unmute: 'ミュート解除', fs: '全画面', progress: '再生位置',
        volume: 'BGM音量', zoom: '画面サイズ', zoomOriginal: '元のサイズ', zoomHalf: 'ハーフ全画面', zoomFull: '全画面',
        prev: '前の作品', next: '次の作品', lang: '言語切替', prevPage: '前のページ', nextPage: '次のページ', workOpen: '上映を開く：{title}'
      },
      preloader: { kicker: 'BLACK BOX ARCHIVE — 影像アーカイブ', meta: '呉旭涵 · 映像ポスト / ショート動画 · 2026' },
      hero: {
        top1: 'PORTFOLIO / NO.01', top2: '映像ポスト · ショート動画 · AIGC', top3: '吉林 · 中国 / 2026',
        title1: '映像', title2: '世界',
        name: '呉旭涵', nameEn: 'Wu Xuhan',
        lede: '映像アニメーションを専攻し、<br>CM・海外ショートドラマ・ドキュメンタリーの間で、<br>編集によって時間の呼吸を組み直します。',
        ctaWorks: '展示を見る', ctaCv: '履歴書をダウンロード', cursorEnter: '見る', cursorScroll: 'スクロール',
        scroll: 'SCROLL', readout: 'SYS://ARCHIVE · FRAME 0001—0016 · 24FPS',
        stat1: 'コンテンツインターン', unit1: '件',
        stat2: '省・国家級の受賞', unit2: '件',
        stat3: '海外ショートドラマ日間ランキング',
        stat4: 'コールドスタートからのフォロワー', unit4: '+'
      },
      marquee: { m1: 'CM', m2: '海外ショートドラマ', m3: 'ドキュメンタリー', m4: 'AIGC制作', m5: '都市映像', m6: 'ライブ切り抜き', m7: 'コンテンツ戦略', m8: 'データ分析' },
      works: {
        kicker: '01 — SELECTED WORKS', title: '展示', en: 'selected works',
        lede: '16の映像作品をテーマ別に展示。カードにカーソルを合わせると無音プレビュー、クリックで上映へ。',
        hint: 'カードをクリックで上映 · ← → キーで切替 · ウォール / インデックス表示切替',
        before: '全', after: '作品 · マスターはご要望に応じて提供', request: 'マスターを請求', empty: 'このカテゴリには作品がありません。', cta: '上映', cursor: '上映'
      },
      filters: { all: 'すべて', ad: 'CM', ai: 'AI制作', drama: 'ドラマ · 予告', doc: 'ドキュメンタリー', city: '都市 · イベント' },
      col: {
        kicker: '02 — VIDEO LIBRARY', title: '映像コレクション', en: 'video library',
        lede: '完成した全映像をカテゴリ別に整理：CM、AI制作、ドラマ・予告、ドキュメンタリー、都市・イベント。カードをクリックすると単独で再生できます。',
        hint: 'カテゴリ別にグループ化 · カードをクリックで単独再生 · もっと見る / 閉じる',
        unit: '本の映像', groupUnit: 'カテゴリ',
        expandAll: 'すべて展開', collapseAll: 'すべて閉じる', more: 'さらに {n} 本', less: '閉じる',
        playAria: '再生：{title}'
      },
      view: { wall: 'ウォール', index: 'インデックス' },
      about: {
        kicker: '03 — STATEMENT', title: 'プロフィール', en: 'about',
        edu: '学歴', eduValue: '吉林工程技術師範学院 · 芸術デザイン学部 · 映像アニメーション（学士）',
        time: '期間', timeValue: '2023.09 — 2027.07',
        rank: '成績', rankValue: '学内上位10% · 一等奨学金×2',
        loc: '所在地', locValue: '吉林 · 中国',
        quote: 'すべての3秒を、<br>記憶に残る感情へと編集する。',
        p1: '私は<strong>ポストプロダクション</strong>と<strong>ニューメディア運営</strong>を横断するコンテンツメイカーです。企画・脚本・編集・パッケージから公開後の振り返りまで一貫して担い、自動車・海外ショートドラマ・ECのトーンとヒットの法則を理解しています。完走率やエンゲージ率のデータから次の改善を設計します。',
        p2: 'Premiere Pro、After Effects、DaVinci Resolve、CapCut Proで編集・パッケージ、Photoshop / Illustratorでビジュアルを設計し、AIツールでコピー生成と大量制作を加速します。',
        toolbox: 'TOOLBOX / ツールボックス',
        s1: '編集', s2: 'モーション・パッケージ', s3: 'カラーグレーディング', s4: 'クイック編集', s5: 'ビジュアルデザイン', s6: 'グラフィック', s7: 'クイックデザイン',
        t8: 'ショート動画企画', t9: 'データ分析', t10: 'AIコンテンツ制作',
        s8b: '企画 / 脚本', s9b: '完走 / エンゲージ',
        eduLabel: 'EDUCATION / 学歴', eduName: '吉林工程技術師範学院', eduSub: '映像アニメーション（学士） · 2023.09 — 2027.07 · 全日制',
        eduLi1: '専攻：映像編集／3Dアニメーションモデリング／映像美術／アニメーションソフト制作／映像アニメーション言語',
        eduLi2: '学内上位10%。一等奨学金×2、二等×1、三等×2',
        awardsLabel: 'AWARDS / 受賞',
        award1: '吉林省第7回氷雪祭クリエイティブコンテスト · 三等賞（省級）',
        award2: '天池賞 第7回吉林省大学生広告クリエイティブコンテスト · 優秀賞（省級）',
        award3: '吉林省第3・2回大学生テーマ創作ショート動画コンテスト · 優秀賞（省級）',
        award4: '第6回全国大学生組織管理能力コンテスト · 一等賞（国家級）',
        award5: '全国大学生ビジュアルアートデザイン競技会（UVADC）省級大会 · 三等賞'
      },
      exp: {
        kicker: '04 — EXPERIENCE', title: '経歴', en: 'experience',
        lede: '4つのコンテンツ実戦：ライブ切り抜きから海外ショートドラマ、自動車ジャンル、AIGCまで。項目をクリックすると手法とデータが開きます。',
        hint: 'クリックで展開 · もう一度で閉じる',
        y1: '2025.12 — 2026.03', o1: '上海策良情報技術有限公司', r1: 'ニューメディア運営インターン · 自動車ジャンル',
        b11: '自動車カスタム系Douyinマトリクスアカウントの企画・脚本・日次運用を担当（「おしゃべりカー」等）。',
        b12: 'ショート動画の企画・脚本・編集・公開までを一貫して担当。自動車ジャンルのトーンとヒットの法則を熟知。',
        b13: '完走率・エンゲージ率・フォロワー推移から方向性を改善し、冒頭3秒のフックと企画構成を最適化。',
        y2: '2025.07 — 2025.11', o2: 'TSAF 深セン敏思悦動科技有限公司', r2: 'ニューメディア運営インターン',
        b21: '小紅書（Xiaohongshu）企業アカウントを単独運用。オリジナル画像88本・ショート動画130本、フォロワー0→8000+',
        b22: '標準的な企画ライブラリと更新SOPを構築し、再利用可能なカバー・タイトルテンプレートで安定成長を維持',
        b23: '商品画像のレタッチ（Photoshopでの色調整・傷修正・精緻化）でストアのビジュアルを統一',
        y3: '2024.11 — 2025.03', o3: '福州暢読科技有限公司', r3: 'AIドラマ・ポストプロダクションインターン',
        b31: '都市リベンジ系縦型ショートドラマ15本のポストを単独担当、累計1,630話を納品（欧米・インドネシア市場）',
        b32: 'MoboReels など暢読の海外ショートドラマアプリで公開。最高作品はアプリ内日間ランキング1位・再生600万回',
        b33: '海外ランキングと完走データから編集リズムを再構築。AIによる字幕・トランジションで1話あたり効率36%向上、完走率3ポイント上昇',
        y4: '2023.12 — 2024.03', o4: '莆田聚雲合科技有限公司', r4: '映像編集インターン',
        b41: 'ライブ配信クリップと千川広告素材を編集、日次10〜15本でライブ配信の日次配信を支える',
        b42: '千川配信台本を作成し7本が拡散。冒頭3秒の構成改善で素材完走率35%向上、獲得コスト18%削減'
      },
      contact: {
        kicker: '05 — CONTACT', title1: '一緒に', title2: '質感のあるもの',
        note: '採用担当の方は履歴書を直接ダウンロードできます。上の行をクリックすると連絡先がコピーされます。',
        cvZh: '中国語履歴書 · PDF', cvEn: 'English CV',
        time: 'BEIJING · 現在', copy: 'コピー', phone: '発信', wechat: 'WECHAT',
        previewHero: '履歴書をプレビュー', previewZh: '中国語履歴書をプレビュー', previewEn: '英語履歴書をプレビュー',
        resumeKicker: 'RESUME / CV', resumeZh: '中国語履歴書', resumeEn: 'English CV', resumePages: 'ページ',
        resumeDownload: '原本をダウンロード', resumeClose: 'プレビューを閉じる', resumeZoom: 'ページをクリックで拡大、もう一度で元に戻す',
        resumeHint: 'PDF原本を描画したプレビューです。ダウンロードファイルと同一です。',
        resumeLoadFail: 'プレビュー画像を読み込めませんでした — ネットワークまたはアクセス制限', resumeOpenPdf: '新しいタブでPDFを開く', resumeRetry: '再試行',
        dlCount: '履歴書ダウンロード', dlUnit: '回'
      },
      gb: {
        kicker: 'GUESTBOOK / メッセージ', title: 'ひとこと残す',
        note: 'メッセージは即時にクラウドへ保存され、公開されます。作品をご覧になって話したいことがあれば、ここへどうぞ。',
        lbName: 'お名前', phName: '任意',
        lbIdentity: '立場', phIdentity: '任意（例：HR／監督）',
        lbContent: 'メッセージ', phContent: 'ひとこと…',
        send: '送信する', sending: '送信中…', sent: '投稿しました。ありがとうございます',
        empty: 'まだメッセージはありません。最初の一人になってください。', anon: '匿名の訪問者',
        loadFail: 'メッセージを読み込めませんでした。しばらくして再読み込みしてください',
        errShort: '2文字以上で入力してください', errRate: '投稿直後です。少し待ってから再度お試しください',
        errDenied: '内容が条件を満たしていません。文字数をご確認ください',
        errNet: '通信が切れ、送信できませんでした', errGeneric: '送信に失敗しました。後ほど再度お試しください'
      },
      footer: { copy: '© 2026 呉旭涵 · 映像ポスト / ショート動画', note: '個人映像アーカイブ · BLACK BOX ARCHIVE', top: '↑ TOP' },
      modal: {
        format: '形式', formatValue: '映像 / 短編', duration: '再生時間', category: 'カテゴリ', number: '番号',
        prev: '← 前へ', next: '次へ →', hint: '← → 作品切替 · ESC 閉じる',
        stageNote: 'マスター · メールで請求', stageNoteMov: 'MOVマスター · メールで請求',
        errorNote: '高画質版はメールでご請求ください', playBlocked: '再生がブロックされました · 画面を再クリック'
      },
      guide: {
        title: 'HOW TO EXPLORE / 操作方法',
        k1: 'スクロール', d1: 'セクションをフレームごとに進む', k2: 'ホバー', d2: '作品カードの無音プレビュー',
        k3: 'クリック', d3: '上映を開く · ← → 切替', k4: 'メールをクリック', d4: '連絡先をワンタップコピー', k5: 'ESC', d5: '上映 / ガイドを閉じる'
      },
      start: 'スクロール · アーカイブへ',
      toast: {
        filter: '{cat} · {n}作品', viewWall: 'ウォール表示 · 上映へ', viewIndex: 'インデックス表示 · クイック閲覧',
        copied: 'コピーしました：{v}', copyFail: 'コピーできません — 手動で選択してください', videoError: '高画質版はメールでご請求ください',
        copyManual: '選択しました — Ctrl / ⌘ + C でコピー',
        dlStart: 'ダウンロードを準備中…', dlDone: 'ダウンロード開始：{v}', dlFail: 'ダウンロードがブロックされました — ファイルを開きました'
      },
      page: { dock: 'ページ進行', prev: '前のページ', next: '次のページ' },
      cat: { ad: 'CM', ai: 'AI制作', drama: 'ドラマ · 予告', doc: 'ドキュメンタリー', city: '都市 · イベント' },
      section: { hero: '序', works: '展示', collection: 'コレクション', about: '紹介', experience: '経歴', contact: '連絡' }
    }
  };

  var lang = 'zh';
  try {
    var saved = localStorage.getItem(STORE);
    if (saved && LANGS.indexOf(saved) > -1) lang = saved;
  } catch (e) {}

  function resolve(obj, path) {
    var parts = path.split('.');
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (!cur || typeof cur !== 'object') return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  function t(key, vars) {
    var val = resolve(dict[lang], key);
    if (val === undefined) val = resolve(dict.zh, key);
    if (val === undefined) return key;
    if (vars) {
      Object.keys(vars).forEach(function (k) { val = val.split('{' + k + '}').join(vars[k]); });
    }
    return val;
  }

  function apply() {
    var root = document.documentElement;
    root.lang = HTML_LANG[lang] || 'zh-CN';
    root.setAttribute('data-lang', lang);
    document.title = t('doc.title');
    var md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute('content', t('doc.desc'));

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var v = t(el.getAttribute('data-i18n'));
      if (typeof v === 'string') el.textContent = v;
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var v = t(el.getAttribute('data-i18n-html'));
      if (typeof v === 'string') el.innerHTML = v;
    });
    document.querySelectorAll('[data-i18n-text]').forEach(function (el) {
      el.setAttribute('data-text', t(el.getAttribute('data-i18n-text')));
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
    });
    document.querySelectorAll('[data-i18n-cursor]').forEach(function (el) {
      el.setAttribute('data-cursor', t(el.getAttribute('data-i18n-cursor')));
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph')));
    });
    document.querySelectorAll('[data-lang-btn]').forEach(function (btn) {
      var on = btn.getAttribute('data-lang-btn') === lang;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    document.dispatchEvent(new CustomEvent('lang:change', { detail: { lang: lang } }));
  }

  function setLang(next) {
    if (LANGS.indexOf(next) < 0 || next === lang) return;
    lang = next;
    try { localStorage.setItem(STORE, lang); } catch (e) {}
    apply();
  }

  function bind() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('[data-lang-btn]') : null;
      if (!btn) return;
      e.preventDefault();
      setLang(btn.getAttribute('data-lang-btn'));
    });
  }

  window.I18N = {
    t: t,
    apply: apply,
    setLang: setLang,
    get lang() { return lang; },
    langs: LANGS
  };

  bind();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
})();
