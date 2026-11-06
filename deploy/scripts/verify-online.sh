#!/usr/bin/env bash
# ============================================================
# 上线验证脚本：逐项检查域名解析、跳转、证书、缓存与资源
# 用法：bash deploy/scripts/verify-online.sh example.com
# 退出码：0 全部通过；1 存在失败项
# ============================================================
set -uo pipefail

DOMAIN="${1:-}"
[[ -n "$DOMAIN" ]] || { echo "用法：bash deploy/scripts/verify-online.sh <域名>" >&2; exit 1; }
DOMAIN="${DOMAIN#http://}"; DOMAIN="${DOMAIN#https://}"; DOMAIN="${DOMAIN%%/*}"

PASS=0; FAIL=0; WARN=0
ok()   { PASS=$((PASS+1)); printf '\033[32m  PASS\033[0m  %s\n' "$1"; }
no()   { FAIL=$((FAIL+1)); printf '\033[31m  FAIL\033[0m  %s\n' "$1"; [[ -n "${2:-}" ]] && printf '        → %s\n' "$2"; }
warn() { WARN=$((WARN+1)); printf '\033[33m  WARN\033[0m  %s\n' "$1"; [[ -n "${2:-}" ]] && printf '        → %s\n' "$2"; }
head() { printf '\n\033[1m%s\033[0m\n' "$1"; }

CURL="curl -sS --max-time 15"
# Windows 版 curl 走 schannel，无法联网校验吊销状态，会误报 CRYPT_E_REVOCATION_OFFLINE
if curl -V 2>/dev/null | grep -qi schannel; then CURL="$CURL --ssl-no-revoke"; fi

# 安全取状态码：curl 失败时仍会输出 000，故不再追加兜底，避免拼成 000000
code_of() {
  local url="$1"; shift || true
  local out
  out="$($CURL "$@" -o /dev/null -w '%{http_code}' "$url" 2>/dev/null || true)"
  printf '%s' "${out:-000}"
}

# 跨平台解析：优先 dig，其次 getent，最后 nslookup
resolve() {
  local h="$1"
  if command -v dig >/dev/null 2>&1; then
    dig +short A "$h" 2>/dev/null | grep -E '^[0-9]{1,3}(\.[0-9]{1,3}){3}$' | head -1
  elif command -v getent >/dev/null 2>&1; then
    getent ahostsv4 "$h" 2>/dev/null | awk '{print $1; exit}'
  elif command -v nslookup >/dev/null 2>&1; then
    nslookup "$h" 2>/dev/null | awk '/^Address: /{print $2; exit}'
  fi
}

head "1. 域名解析"
A_IP="$(resolve "$DOMAIN")"
W_IP="$(resolve "www.$DOMAIN")"
[[ -n "$A_IP" ]] && ok "$DOMAIN → $A_IP" || no "$DOMAIN 无法解析" "检查 DNS A 记录与 TTL"
[[ -n "$W_IP" ]] && ok "www.$DOMAIN → $W_IP" || no "www.$DOMAIN 无法解析" "补一条 A 或 CNAME 记录"

head "2. HTTP 自动跳转 HTTPS"
CODE="$(code_of "http://$DOMAIN/")"
LOC="$($CURL -o /dev/null -w '%{redirect_url}' "http://$DOMAIN/" || echo '')"
if [[ "$CODE" =~ ^30[1278]$ && "$LOC" == https://* ]]; then
  ok "http://$DOMAIN → $LOC（$CODE）"
else
  no "HTTP 未正确跳转（状态码 $CODE，目标 ${LOC:-无}）" "确认 Nginx 80 段有 return 301 https://..."
fi

CODE_W="$(code_of "http://www.$DOMAIN/")"
LOC_W="$($CURL -o /dev/null -w '%{redirect_url}' "http://www.$DOMAIN/" || echo '')"
if [[ "$CODE_W" =~ ^30[1278]$ && "$LOC_W" == "https://$DOMAIN/"* ]]; then
  ok "http://www.$DOMAIN → $LOC_W（$CODE_W）"
else
  no "www 的 HTTP 跳转异常（状态码 $CODE_W，目标 ${LOC_W:-无}）" "检查 80 段 server_name 是否含 www"
fi

head "3. HTTPS 可用性与 www 归一化"
CODE_HTTPS="$(code_of "https://$DOMAIN/")"
[[ "$CODE_HTTPS" == "200" ]] && ok "https://$DOMAIN/ 返回 200" || no "https://$DOMAIN/ 返回 $CODE_HTTPS" "查看 nginx error.log 与站点根目录权限"

CODE_WWW="$(code_of "https://www.$DOMAIN/")"
LOC_WWW="$($CURL -o /dev/null -w '%{redirect_url}' "https://www.$DOMAIN/" || echo '')"
if [[ "$CODE_WWW" =~ ^30[1278]$ && "$LOC_WWW" == "https://$DOMAIN/"* ]]; then
  ok "https://www.$DOMAIN → https://$DOMAIN（$CODE_WWW）"
else
  warn "www 的 HTTPS 未归一化（$CODE_WWW）" "可能导致重复收录与分享链接不一致"
fi

head "4. 证书"
CERT="$(echo | openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" 2>/dev/null | openssl x509 -noout -subject -dates -ext subjectAltName 2>/dev/null || true)"
if [[ -n "$CERT" ]]; then
  SAN="$(echo "$CERT" | grep -o 'DNS:[^, ]*' | sed 's/DNS://' | tr '\n' ' ')"
  NOTAFTER="$(echo "$CERT" | grep notAfter | sed 's/notAfter=//')"
  if echo "$SAN" | grep -q "$DOMAIN"; then ok "证书 SAN 覆盖：$SAN"; else no "证书未覆盖 $DOMAIN（SAN: $SAN）"; fi
  if echo "$SAN" | grep -q "www.$DOMAIN"; then ok "证书含 www 子域"; else warn "证书不含 www 子域"; fi
  EXP_TS="$(date -d "$NOTAFTER" +%s 2>/dev/null || echo 0)"
  DAYS=$(( (EXP_TS - $(date +%s)) / 86400 ))
  if [[ "$DAYS" -ge 14 ]]; then ok "剩余有效期 ${DAYS} 天（到期 $NOTAFTER）";
  else no "证书仅剩 ${DAYS} 天，续期可能已失效" "执行 certbot renew --dry-run 排查"; fi
else
  no "无法建立 TLS 连接或取不到证书" "确认 443 放行、证书路径正确"
fi

TLS10="$(echo | openssl s_client -connect "$DOMAIN:443" -tls1 2>&1 | grep -c 'Cipher is\|Protocol  *: *TLSv1' || true)"
[[ "$TLS10" -eq 0 ]] && ok "已禁用 TLS 1.0" || warn "TLS 1.0 仍可握手" "ssl_protocols 只保留 TLSv1.2 TLSv1.3"

head "5. 安全响应头"
HDR="$($CURL -D - -o /dev/null "https://$DOMAIN/" | tr -d '\r')"
echo "$HDR" | grep -qi 'strict-transport-security' && ok "HSTS 已下发" || no "缺少 HSTS 头" "在 443 段 add_header Strict-Transport-Security"
echo "$HDR" | grep -qi 'x-content-type-options'   && ok "X-Content-Type-Options" || warn "缺少 nosniff"
echo "$HDR" | grep -qi 'referrer-policy'          && ok "Referrer-Policy" || warn "缺少 Referrer-Policy"
echo "$HDR" | grep -qiE '^server:.*nginx/[0-9]'   && warn "Server 头暴露版本号" "server_tokens off;"

head "6. 页面内域名一致性"
HTML="$($CURL "https://$DOMAIN/" || true)"
if echo "$HTML" | grep -q "127.0.0.1"; then
  no "页面里仍有 127.0.0.1 引用" "运行 deploy/scripts/set-domain.sh 重新注入"
else
  ok "页面无本地地址残留"
fi
if echo "$HTML" | grep -q "<link rel=\"canonical\" href=\"https://$DOMAIN/"; then
  ok "canonical 指向 https://$DOMAIN/"
else
  no "canonical 未指向正式域名" "检查 index.html 第 24 行附近"
fi
if echo "$HTML" | grep -q "og:url\" content=\"https://$DOMAIN/"; then
  ok "og:url 指向正式域名"
else
  no "og:url 未指向正式域名" "分享卡片会显示错误链接"
fi
OG_IMG="$(echo "$HTML" | grep -o 'og:image" content="[^"]*' | sed 's/.*content="//')"
# og:image 必须是可解析的绝对 URL
case "$OG_IMG" in http://*|https://*) ;; *) OG_IMG="" ;; esac
if [[ -n "$OG_IMG" ]]; then
  OG_CODE="$(code_of "$OG_IMG")"
  [[ "$OG_CODE" == "200" ]] && ok "og:image 可访问（$OG_IMG）" || no "og:image 返回 $OG_CODE" "分享时无预览图"
fi

head "7. 资源与缓存"
CSS_PATH="$(echo "$HTML" | grep -o 'href="css/[^"]*"' | head -1 | sed 's/href="//;s/"//')"
CSS_PATH="${CSS_PATH:-css/art.css}"
# 只接受干净的相对路径，避免页面内容异常时拼出非法 URL
[[ "$CSS_PATH" =~ ^[A-Za-z0-9._/-]+\.(css|js)$ ]] || CSS_PATH="css/art.css"
CSS_HDR="$($CURL -D - -o /dev/null "https://$DOMAIN/$CSS_PATH" | tr -d '\r')"
echo "$CSS_HDR" | grep -qi 'content-encoding: *gzip' && ok "CSS 已 gzip 压缩" || warn "CSS 未压缩" "检查 gzip_types 是否含 text/css"

MP4="$(echo "$HTML" | grep -o 'assets/previews/[^"]*\.mp4' | head -1)"
MP4="${MP4:-assets/previews/animation-short.mp4}"
[[ "$MP4" =~ ^[A-Za-z0-9._/-]+\.(mp4|webm|m4v)$ ]] || MP4="assets/previews/animation-short.mp4"
RANGE_CODE="$(code_of "https://$DOMAIN/$MP4" -H 'Range: bytes=0-1023')"
[[ "$RANGE_CODE" == "206" ]] && ok "视频支持 Range（206），可拖动进度" || warn "视频 Range 返回 $RANGE_CODE" "检查是否被 CDN 或反代改写"
CTYPE="$($CURL -H 'Range: bytes=0-0' -o /dev/null -w '%{content_type}' "https://$DOMAIN/$MP4" 2>/dev/null || true)"
[[ "$CTYPE" == video/mp4* ]] && ok "视频 Content-Type 正确（$CTYPE）" || warn "视频 Content-Type 为 ${CTYPE:-空}" "iOS 可能无法播放"

head "8. 错误处理"
CODE404="$(code_of "https://$DOMAIN/__not_exist__")"
[[ "$CODE404" == "404" ]] && ok "不存在的路径返回 404" || warn "不存在的路径返回 $CODE404" "确认 try_files 末位是 =404"

head "9. 简历文件"
for f in "assets/resume/%E5%90%B4%E6%97%AD%E6%B6%B5_%E7%AE%80%E5%8E%86.pdf" "assets/resume/WuXuhan_Resume_EN.pdf"; do
  C="$(code_of "https://$DOMAIN/$f")"
  [[ "$C" == "200" ]] && ok "简历可下载（$(basename "$f")）" || no "简历返回 $C：$f" "文件名含中文，确认 URL 编码与 charset"
done

printf '\n\033[1m汇总\033[0m：通过 %d ／ 警告 %d ／ 失败 %d\n' "$PASS" "$WARN" "$FAIL"
[[ "$FAIL" -eq 0 ]] && { echo "上线检查通过 ✓"; exit 0; } || { echo "存在失败项，请按提示处理后重跑。"; exit 1; }
