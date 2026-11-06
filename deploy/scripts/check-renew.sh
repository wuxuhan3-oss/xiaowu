#!/usr/bin/env bash
# ============================================================
# 证书健康检查：供 cron / 监控调用，剩余天数不足时告警
# 用法：bash deploy/scripts/check-renew.sh example.com [阈值天数=21]
# 退出码：0 正常；1 需要人工介入
# ============================================================
set -uo pipefail

DOMAIN="${1:-}"
THRESHOLD="${2:-21}"
[[ -n "$DOMAIN" ]] || { echo "用法：bash deploy/scripts/check-renew.sh <域名> [阈值天数]" >&2; exit 1; }

CERT_FILE="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"

if [[ -f "$CERT_FILE" ]]; then
  NOTAFTER="$(openssl x509 -in "$CERT_FILE" -noout -enddate | sed 's/notAfter=//')"
else
  NOTAFTER="$(echo | openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" 2>/dev/null \
    | openssl x509 -noout -enddate 2>/dev/null | sed 's/notAfter=//')"
fi

[[ -n "${NOTAFTER:-}" ]] || { echo "CRITICAL: 无法读取 $DOMAIN 的证书"; exit 1; }

EXP_TS="$(date -d "$NOTAFTER" +%s)"
DAYS=$(( (EXP_TS - $(date +%s)) / 86400 ))

if (( DAYS < 0 )); then
  echo "CRITICAL: $DOMAIN 证书已过期 ${DAYS#-} 天（$NOTAFTER）"
  exit 1
elif (( DAYS < THRESHOLD )); then
  echo "WARNING: $DOMAIN 证书仅剩 $DAYS 天（$NOTAFTER），请执行 certbot renew --dry-run 排查"
  exit 1
else
  echo "OK: $DOMAIN 证书剩余 $DAYS 天（$NOTAFTER）"
  exit 0
fi
