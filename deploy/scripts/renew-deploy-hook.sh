#!/usr/bin/env bash
# ============================================================
# Certbot 续期后置钩子：证书更新成功后自动重载 Nginx
# 安装位置：/etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
# 安装命令：sudo install -m 755 deploy/scripts/renew-deploy-hook.sh \
#            /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
# 说明：certbot renew 只在证书「确实更新」时才触发本钩子，日常续期检查不会误重载
# ============================================================
set -euo pipefail

echo "[$(date '+%F %T')] 证书已更新，校验并重载 Nginx"

if nginx -t; then
  systemctl reload nginx
  echo "[$(date '+%F %T')] Nginx 重载完成"
else
  echo "[$(date '+%F %T')] Nginx 配置校验失败，跳过重载" >&2
  exit 1
fi
