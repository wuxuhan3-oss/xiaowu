#!/usr/bin/env bash
# ============================================================
# Let's Encrypt 证书首次签发脚本（webroot 方式）
# 前置：Nginx 已加载 deploy/nginx/portfolio.conf，且 80 端口可从公网访问
# 用法：
#   sudo bash deploy/scripts/issue-cert.sh example.com admin@example.com
#   sudo bash deploy/scripts/issue-cert.sh example.com admin@example.com --dry-run
# ============================================================
set -euo pipefail

DOMAIN="${1:-}"
EMAIL="${2:-}"
MODE="${3:-}"
WEBROOT="/var/www/certbot"
LE_LIVE="/etc/letsencrypt/live/$DOMAIN"

ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$1"; }
bad()  { printf '  \033[31m✗\033[0m %s\n' "$1"; }

[[ -n "$DOMAIN" && -n "$EMAIL" ]] || {
  echo "用法：sudo bash deploy/scripts/issue-cert.sh <域名> <邮箱> [--dry-run]" >&2; exit 1; }

[[ $EUID -eq 0 ]] || { echo "请用 sudo 运行" >&2; exit 1; }

command -v certbot >/dev/null 2>&1 || {
  echo "未安装 certbot。Ubuntu/Debian：apt install -y certbot；CentOS：dnf install -y certbot" >&2; exit 1; }

echo "== 1/5 预检"
mkdir -p "$WEBROOT/.well-known/acme-challenge"
chown -R www-data:www-data "$WEBROOT" 2>/dev/null || chown -R nginx:nginx "$WEBROOT" 2>/dev/null || true

# DNS 是否已指向本机
PUBLIC_IP="$(curl -4 -s --max-time 8 https://api.ipify.org || echo '')"
if command -v dig >/dev/null 2>&1; then
  RESOLVED="$(dig +short A "$DOMAIN" 2>/dev/null | grep -E '^[0-9]{1,3}(\.[0-9]{1,3}){3}$' | head -1)"
else
  RESOLVED="$(getent hosts "$DOMAIN" 2>/dev/null | awk '{print $1; exit}')"
fi
echo "  本机公网 IP：${PUBLIC_IP:-获取失败}"
echo "  域名解析到：${RESOLVED:-未解析}"
if [[ -n "$PUBLIC_IP" && -n "$RESOLVED" ]]; then
  [[ "$PUBLIC_IP" == "$RESOLVED" ]] && ok "DNS 已指向本机" || warn "DNS 与本机 IP 不一致，若走 CDN 可忽略"
else
  warn "解析未生效或本机在 NAT 后，请确认 80 端口从公网可达"
fi

# 80 端口可达性（ACME HTTP-01 必需）
if curl -sS --max-time 10 -o /dev/null "http://$DOMAIN/.well-known/acme-challenge/__probe__" 2>/dev/null; then
  ok "80 端口可访问"
elif curl -sS --max-time 10 -o /dev/null -w '%{http_code}' "http://$DOMAIN/.well-known/acme-challenge/__probe__" 2>/dev/null | grep -q '404\|403'; then
  ok "80 端口可访问（返回 404 属正常，说明请求已到达 Nginx）"
else
  bad "80 端口不可达。请检查安全组 / 防火墙 / 备案状态，或改用 DNS-01 方式（见 README）"
  exit 1
fi

echo "== 2/5 检查 Nginx 配置"
if nginx -t 2>/dev/null; then ok "Nginx 配置语法通过"; else bad "Nginx 配置有误，先执行 nginx -t 排查"; exit 1; fi

echo "== 3/5 申请证书（含 www 子域）"
EXTRA=""
[[ "$MODE" == "--dry-run" ]] && EXTRA="--dry-run" && warn "本次为演练模式，不会写入真实证书"

certbot certonly --webroot -w "$WEBROOT" \
  -d "$DOMAIN" -d "www.$DOMAIN" \
  --email "$EMAIL" --agree-tos --no-eff-email \
  --keep-until-expiring --non-interactive $EXTRA

[[ "$MODE" == "--dry-run" ]] && { echo "演练结束。去掉 --dry-run 正式签发。"; exit 0; }

echo "== 4/5 校验证书文件"
for f in fullchain.pem privkey.pem chain.pem; do
  [[ -f "$LE_LIVE/$f" ]] && ok "$f" || { bad "缺少 $f"; exit 1; }
done

echo "== 5/5 重载 Nginx"
nginx -t && systemctl reload nginx && ok "Nginx 已重载"

echo
openssl x509 -in "$LE_LIVE/fullchain.pem" -noout -subject -dates -ext subjectAltName | sed 's/^/  /'
echo
echo "下一步：bash deploy/scripts/verify-online.sh $DOMAIN"
echo "续期：certbot.timer 已随包安装，执行 systemctl list-timers | grep certbot 确认"
