# 正式域名与 HTTPS 上线手册

> 适用项目：BLACK BOX ARCHIVE · 影像档案（纯静态站点，Nginx / Caddy 托管）
> 目标：把 `http://127.0.0.1:8377/` 变成 `https://你的域名/`，且具备自动续期与可验证的上线检查。

---

## 0. 五分钟最小路径

假设域名已买好、服务器已就绪：

```bash
# 1) 注入域名（改 index.html + 渲染配置）
bash deploy/scripts/set-domain.sh example.com

# 2) 上传站点
rsync -avz --delete --exclude 'deploy' --exclude 'index.html.bak-*' ./ user@server:/var/www/portfolio/

# 3) 本地先离线校验配置语法（不需要服务器）
bash deploy/scripts/validate-config.sh

# 4) 服务器上装配置
sudo cp deploy/nginx/portfolio.conf /etc/nginx/conf.d/portfolio.conf
sudo nginx -t && sudo systemctl reload nginx

# 5) 签证书（先 --dry-run 试跑一次）
sudo bash deploy/scripts/issue-cert.sh example.com you@example.com --dry-run
sudo bash deploy/scripts/issue-cert.sh example.com you@example.com

# 6) 验证
bash deploy/scripts/verify-online.sh example.com
```

---

## 1. 本目录文件清单

| 文件 | 用途 | 部署位置 |
|---|---|---|
| `nginx/portfolio.conf.template` | Nginx 完整站点配置模板（80 跳转 / 443 站点 / 缓存 / 安全头） | 由脚本渲染为 `portfolio.conf` |
| `nginx/portfolio.conf` | 渲染后的成品配置 | `/etc/nginx/conf.d/portfolio.conf` |
| `Caddyfile` | Caddy 替代方案（自动签发与续期） | `/etc/caddy/Caddyfile` |
| `scripts/set-domain.sh` | 域名注入：替换 HTML 内的硬编码地址、渲染配置 | 本地执行 |
| `scripts/issue-cert.sh` | Let's Encrypt 首次签发（含 DNS / 80 端口预检） | 服务器执行 |
| `scripts/verify-online.sh` | 上线验证：9 组共 20 余项自动检查 | 任意机器执行 |
| `scripts/renew-deploy-hook.sh` | 续期成功后自动重载 Nginx | `/etc/letsencrypt/renewal-hooks/deploy/` |
| `scripts/check-renew.sh` | 证书到期监控（供 cron / 监控系统调用） | 服务器执行 |
| `scripts/validate-config.sh` | 离线校验 Nginx 配置（无需服务器） | 本地执行 |
| `PREREQUISITES.md` | 上线前置资源清单与四条路径对比 | — |
| `ci/cloudflare-pages.yml` | 静态托管部署（无需 SSH） | 移到 `.github/workflows/` |
| `cloudflared/config.yml` | Tunnel 配置（无公网 IP 方案） | 本机 |

**运行环境**：脚本为 Bash，已在 Linux / Git Bash 下验证。`issue-cert.sh` 必须在该 Nginx 服务器上以 root 运行；`set-domain.sh` 在本地运行；`verify-online.sh` 任意能联网的机器均可运行（macOS 需先装 coreutils，否则 `date -d` 不可用）。

**关于 `nginx -t`**：配置文件已做结构性校验（括号配平、指令结尾、3 个 server 块、占位符全部替换），但未在真实 Nginx 上执行过语法检查。上线时请务必先 `sudo nginx -t`，通过后再 reload——这是唯一可信的验证方式。

---

## 2. 需要修改的配置项与文件位置

换域名不只是加一条解析。项目里有 6 处硬编码地址**必须**同步改，否则分享卡片、搜索引擎收录、结构化数据都会指向 127.0.0.1。

### 2.1 前端文件（`index.html`）

| 行号 | 配置项 | 现值 | 应改为 |
|---|---|---|---|
| 12 | `og:url` | `http://127.0.0.1:8377/` | `https://example.com/` |
| 13 | `og:image` | `http://127.0.0.1:8377/assets/og/cover.jpg` | `https://example.com/assets/og/cover.jpg` |
| 23 | `twitter:image` | 同上 | 同上 |
| 24 | `link rel="canonical"` | `http://127.0.0.1:8377/` | `https://example.com/` |
| 33 | JSON-LD `Person.url` | `http://127.0.0.1:8377/` | `https://example.com/` |
| 34 | JSON-LD `Person.image` | `http://127.0.0.1:8377/assets/og/cover.jpg` | `https://example.com/assets/og/cover.jpg` |

> `js/` 与 `css/` 中无任何绝对地址引用，无需改动——这是好事，说明资源都用了相对路径，换域名不会出现失效链接。

以上 6 处由 `set-domain.sh` 一次性处理，并会自动备份 `index.html.bak-时间戳`。手动改也可以，但注意 **og:url 与 canonical 必须是最终 https 地址**，写成 http 或 www 版本都会造成重复收录。

### 2.2 服务端配置

| 配置项 | 位置 | 说明 |
|---|---|---|
| `server_name` | `portfolio.conf` | 必须同时含 `example.com` 与 `www.example.com` |
| `ssl_certificate` / `ssl_certificate_key` | 同上 | 指向 `/etc/letsencrypt/live/<域名>/`，域名变更后路径随之变化 |
| `root` | 同上 | 站点根目录，需与实际上传路径一致（默认 `/var/www/portfolio`） |
| `email` | `Caddyfile` | ACME 账户邮箱，用于证书到期提醒 |
| 证书邮箱 | `issue-cert.sh` 参数 | 建议用长期邮箱，证书过期前会收到通知 |

### 2.3 无需修改但需确认

- **`.well-known/acme-challenge` 路径**：Nginx 配置中已放行，签发与续期都依赖它，不要加认证、不要 301 到 https（Let's Encrypt 校验走的是 http）。
- **简历中文文件名**：`assets/resume/吴旭涵_简历.pdf` 在 URL 中需百分号编码，站点已正确编码；换服务器后注意文件系统编码为 UTF-8。

---

## 3. 域名解析配置

在域名服务商的 DNS 控制台添加两条记录（TTL 建议先设 600 秒便于调试，稳定后改 3600）：

| 主机记录 | 类型 | 记录值 | 说明 |
|---|---|---|---|
| `@` | A | 服务器公网 IPv4 | 主域名 |
| `www` | A 或 CNAME | 同上 IP，或 `example.com.` | 建议 A 与主域一致，省一次解析 |
| `@` | AAAA | 服务器 IPv6（如有） | 可选，无则不加，避免部分网络优先走 v6 失败 |
| `@` | CAA | `0 issue "letsencrypt.org"` | 可选，收紧证书签发权限，防误签 |

验证（本地执行）：

```bash
dig +short example.com A          # 应返回你的服务器 IP
dig +short www.example.com A
dig +short example.com @8.8.8.8   # 换公共 DNS 验证是否已扩散
```

> **备案提醒**：服务器在中国大陆时，域名必须完成 ICP 备案，否则 80/443 会被运营商拦截，表现为「本机能访问、外部超时」，此时证书签发一定失败。香港/海外服务器无需备案，但国内访问速度与稳定性会打折。

---

## 4. 服务器准备

```bash
# 站点目录
sudo mkdir -p /var/www/portfolio /var/www/certbot
sudo chown -R www-data:www-data /var/www/portfolio /var/www/certbot   # CentOS 用 nginx:nginx

# 上传（本地执行，注意 --delete 会删除服务器多余文件）
rsync -avz --delete --exclude 'deploy' --exclude 'index.html.bak-*' ./ user@server:/var/www/portfolio/

# 防火墙
sudo ufw allow 80/tcp && sudo ufw allow 443/tcp      # Ubuntu
# 云厂商还需在控制台安全组放行 80/443；这一步最容易漏，漏了证书必然签不下来
```

Nginx 安装与目录约定：

```bash
sudo apt install -y nginx certbot          # Debian/Ubuntu
sudo dnf install -y nginx certbot          # CentOS/RHEL
sudo cp deploy/nginx/portfolio.conf /etc/nginx/conf.d/portfolio.conf
sudo nginx -t && sudo systemctl reload nginx
```

> **Nginx 版本差异**：模板用 `listen 443 ssl http2;`，兼容 1.18–1.24（Ubuntu 22.04 自带 1.18 必须这样写）。若你的 Nginx ≥ 1.25.1，该写法会提示 deprecated，可改为 `listen 443 ssl;` 并在 server 块内单独加一行 `http2 on;`。
>
> 若同机已有 `default_server` 占用 80 端口，本配置的 `server_name` 精确匹配不受影响；但如果访问 IP 直连，会落到默认站点，属正常现象。

---

## 5. 证书签发流程（Let's Encrypt + HTTP-01）

### 5.1 原理

Certbot 在你的站点根目录写入一个随机校验文件，Let's Encrypt 从公网访问 `http://example.com/.well-known/acme-challenge/<token>` 读取它。读到了，就证明你控制该域名，随即签发 90 天有效期的证书。因此 **80 端口必须能从公网访问**，且该路径不能被跳转到 HTTPS（校验器默认不跟随 301 到其它域名）。

### 5.2 执行

```bash
# 先演练，不产生真实证书，也不会占用签发配额
sudo bash deploy/scripts/issue-cert.sh example.com you@example.com --dry-run

# 正式签发（一次包含主域与 www，两个名字进同一张证书的 SAN）
sudo bash deploy/scripts/issue-cert.sh example.com you@example.com
```

脚本依次做：DNS 比对 → 80 端口探活 → `nginx -t` → `certbot certonly --webroot` → 校验证书文件 → 重载 Nginx → 打印证书信息。

成功输出应包含：

```
Certificate is saved at: /etc/letsencrypt/live/example.com/fullchain.pem
Key is saved at:         /etc/letsencrypt/live/example.com/privkey.pem
```

### 5.3 证书文件用哪个

| 文件 | 用途（务必分清） |
|---|---|
| `fullchain.pem` | **Nginx 的 `ssl_certificate` 必须用它**（站点证书 + 中间证书） |
| `privkey.pem` | 私钥 |
| `chain.pem` | 仅中间证书，OCSP stapling 用 |

最常见的坑：只配 `cert.pem`，桌面浏览器正常，但 Android 旧机型、微信内置浏览器、部分小程序会报「证书链不完整」。

### 5.4 如果没有 80 端口，或需要通配符

改用 DNS-01 校验（在 DNS 商处加一条 TXT 记录），无需开放 80：

```bash
sudo certbot certonly --manual --preferred-challenges dns \
  -d example.com -d "*.example.com"
```

通配符证书必须走 DNS-01。国内可用 `certbot-dns-dnspod` / `certbot-dns-aliyun` 插件实现全自动。

---

## 6. HTTP → HTTPS 自动跳转

本站采用**三层保障**，缺一层都会出现某个入口仍是 http 的情况：

**第一层：Nginx 301（服务端强制）**

80 端口的 `server` 块里，除 ACME 校验路径外全部 301 到 https 主域名；同时 443 的 www 块把 www 归一化到裸域。这样任何 http 入口、任何 www 入口，最终都落到唯一地址。

**第二层：HSTS（浏览器记住，不再发 http 请求）**

```nginx
add_header Strict-Transport-Security "max-age=31536000" always;
```

首次访问后，浏览器在一年内对本站强制走 https，连地址栏输入的 `http://` 都会在本地改写成 https。

> ⚠️ 谨慎开启 `includeSubDomains`：一旦下发，所有子域（包括你现在还用 http 的测试域）都会被强制 https，且无法「撤销」，只能等 max-age 过期。确认无 http 子域后再加。
> 若误开需要回退：把 `max-age` 改为 `0` 并重新下发一次，或在该浏览器手动清除 HSTS 记录（Chrome：`chrome://net-internals/#hsts`）。

**第三层：页面内无混合内容**

站点 CSS/JS/图片全部用相对路径，本身不会产生 `http://` 混合内容，这是它比多数模板站更省事的地方。换域名后只要确认 6 处绝对地址（见第 2 节）都变成 https 即可。

验证跳转：

```bash
curl -I http://example.com/        # 期望 301，Location: https://example.com/
curl -I https://www.example.com/   # 期望 301，Location: https://example.com/
curl -I https://example.com/       # 期望 200，且带 strict-transport-security
```

---

## 7. 证书自动续期

Let's Encrypt 证书 90 天有效。certbot 包自带 `certbot.timer`，每天运行两次，只在「距到期不足 30 天」时才真正续期，续期成功后触发 deploy hook。

### 7.1 确认定时器在跑

```bash
systemctl list-timers | grep certbot
systemctl status certbot.timer
```

若没有（如用 snap 安装或旧系统），用 cron 兜底：

```cron
0 3 * * * root certbot renew --quiet --deploy-hook "systemctl reload nginx"
```

### 7.2 安装重载钩子

```bash
sudo install -m 755 deploy/scripts/renew-deploy-hook.sh \
  /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

钩子只在证书**确实更新**时执行，日常检查不会反复重载 Nginx。它先 `nginx -t` 再 reload，配置有错时不会把服务搞挂。

### 7.3 演练续期（强烈建议上线当天就做一次）

```bash
sudo certbot renew --dry-run
```

输出 `Congratulations, all simulated renewals succeeded` 才算真正配好。很多人直到第 90 天才发现续期失败——因为 webroot 路径改了、80 端口关了、或者 Nginx 配置被覆盖过。

### 7.4 监控

```bash
# 剩余 < 21 天返回非 0，可直接接监控平台
bash deploy/scripts/check-renew.sh example.com 21

# 或写进 cron，异常时发邮件
0 9 * * * root /usr/local/bin/check-renew.sh example.com 21 || echo "证书告警" | mail -s "TLS 证书即将过期" you@example.com
```

---

## 8. 上线前验证

### 8.1 自动检查

```bash
bash deploy/scripts/verify-online.sh example.com
```

覆盖 9 组检查：DNS 解析、HTTP 跳转、HTTPS 可用性、www 归一化、证书 SAN 与剩余天数、TLS 1.0 是否禁用、安全响应头、页面域名一致性（含 og:image 是否可访问）、资源缓存与 Range 支持、404 处理、简历下载。

全部 PASS 才算出线上线；有 WARN 可以带着上线，但要记进待办。

### 8.2 手工清单（脚本查不到的部分）

- [ ] 手机 **4G 流量**（不连 WiFi）打开正常——排除内网 DNS 覆盖
- [ ] **微信内**打开正常，转发给文件传输助手后卡片有标题与封面
- [ ] 发给 **iPhone 与 Android 各一台**打开，确认证书不报警（验中间证书）
- [ ] 简历 PDF 能下载，文件名不是乱码
- [ ] 作品视频能播放、能拖动进度条
- [ ] 多语言切换后页面标题与地址不变
- [ ] 分享链接到 LinkedIn / 微信，确认预览图正确（og:image 需为绝对 https 地址）
- [ ] 用无痕窗口访问一次，确认没有依赖本地缓存的假象

### 8.3 外部工具

| 工具 | 检查什么 |
|---|---|
| `ssllabs.com/ssltest` | 证书链、协议版本、加密套件评级（目标 A 及以上） |
| `developers.facebook.com/tools/debug/` | OG 标签实际抓取结果，可强制刷新缓存 |
| 微信开发者工具「分享调试」或直接发给自己 | 微信卡片预览 |
| `hstspreload.org` | 仅在确认要加入 HSTS 预加载列表时才需要 |

---

## 9. 常见问题排查

| 现象 | 根因 | 处理 |
|---|---|---|
| 签发报 `Connection refused` / `Timeout during connect` | 80 端口未放行（安全组 / ufw / 云防火墙），或域名未备案被拦，或 Nginx 没监听 80 | 先在外部网络 `curl -I http://example.com/`，能返回 301 才说明通了 |
| 签发报 `Invalid response ... 404` | webroot 路径不对，或 ACME 路径被 301 到 https | 确认 `root /var/www/certbot` 与 certbot 的 `-w` 一致；确认该路径未被跳转规则命中 |
| 浏览器报 `ERR_TOO_MANY_REDIRECTS` | 用了 CDN，回源协议是 http，而源站又强制跳 https，形成环 | CDN 回源改为 HTTPS，或在 Nginx 侧信任 `X-Forwarded-Proto` 后跳转 |
| `NET::ERR_CERT_COMMON_NAME_INVALID` | 证书 SAN 不含当前访问的域名（常见于漏了 `-d www`） | 重新签发，把 www 一并加进去 |
| 桌面正常，手机/微信报证书错误 | 只配了 `cert.pem`，缺中间证书 | `ssl_certificate` 改用 `fullchain.pem` |
| 页面能开但样式全丢 | 混合内容被拦（CSP 或 https 页面里引了 http 资源） | 检查 6 处硬编码地址是否已改；F12 Console 会直接列出被拦 URL |
| 中文简历 404 | 文件名编码不一致（UTF-8 vs GBK），或 URL 未编码 | 统一 UTF-8；链接使用 `%E5%90%B4...` 形式 |
| 视频不能拖动进度条 | Range 请求被反代 / CDN 吞掉，或开了 gzip 压缩视频 | 关闭视频的 gzip；CDN 开启 Range 透传 |
| 续期静默失败 | webroot 被改、80 被关、或配置被覆盖 | `certbot renew --dry-run` 立刻暴露；建议保留 `check-renew.sh` 告警 |
| 403 Forbidden | 目录权限不足或 SELinux 拦截 | `chmod -R 755`；CentOS 执行 `setsebool -P httpd_can_network_connect 1` 并检查 `semanage fcontext` |
| 域名解析很久不生效 | 本地 DNS 缓存或 TTL 未到 | `dig @8.8.8.8` 交叉验证；必要时刷新本地 DNS 缓存 |
| 本机能开、外网超时 | 大陆服务器未备案，或安全组只放行了 22 | 完成备案；核对安全组入站规则 |
| 开了 HSTS 后子域打不开 | 误加了 `includeSubDomains` | 下发 `max-age=0` 撤销，或清理浏览器 HSTS 记录 |

---

## 10. 进阶：1.4GB 视频与访问速度

当前项目 `assets/` 共约 **1.4GB**，其中 `assets/works/` 单支视频可达 21MB。这在自建 Nginx 上能用（支持 Range，可拖动），但有三点要注意：

1. **带宽是硬成本**。按 21MB/支估算，一次完整浏览可能消耗 200MB 以上。云服务器 1–5Mbps 带宽下，单用户就会把带宽跑满。
2. **建议视频走对象存储 + CDN**（腾讯云 COS / 阿里云 OSS），HTML/CSS/JS 仍留在 Nginx。只需把模板中的 `videoPath` 改为 CDN 域名，源站压力立刻下降一个量级。
3. **悬停预览应指向 `assets/previews/`**（单支 100–500KB），不要指向 `assets/works/` 的母带——这是控制首屏流量的关键。

若坚持单机托管，至少在 Nginx 里对视频开启 `sendfile on`（模板已配）并确认云服务器带宽 ≥ 10Mbps。

---

## 11. 回滚

上线出问题时按逆序退回：

```bash
# 恢复前端
cp index.html.bak-<时间戳> index.html

# 撤掉站点配置
sudo rm /etc/nginx/conf.d/portfolio.conf && sudo nginx -t && sudo systemctl reload nginx

# 证书无需删除（不影响 http 访问），需要时再挂回配置
```

DNS 回滚把 A 记录改回旧 IP 即可，TTL 越小回滚越快——这也是建议初期把 TTL 设为 600 秒的原因。
