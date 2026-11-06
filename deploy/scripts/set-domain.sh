#!/usr/bin/env bash
# ============================================================
# 域名注入脚本
# 作用：把项目里所有指向本地地址 / 旧域名的引用，统一替换为新域名，
#       并渲染 Nginx / Caddy 配置模板。
# 用法：
#   bash deploy/scripts/set-domain.sh example.com            # 正式执行
#   bash deploy/scripts/set-domain.sh example.com --dry-run  # 只预览不落盘
# ============================================================
set -euo pipefail

DOMAIN="${1:-}"
DRY_RUN="${2:-}"

if [[ -z "$DOMAIN" ]]; then
  echo "用法：bash deploy/scripts/set-domain.sh <域名> [--dry-run]" >&2
  echo "示例：bash deploy/scripts/set-domain.sh wuxuhan.com" >&2
  exit 1
fi

# 去掉可能误输入的协议与斜杠
DOMAIN="${DOMAIN#http://}"; DOMAIN="${DOMAIN#https://}"; DOMAIN="${DOMAIN%%/*}"

# 域名合法性校验：至少两段、仅字母数字与连字符、顶级域不少于 2 位
if ! [[ "$DOMAIN" =~ ^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$ ]]; then
  echo "✗ 域名格式不合法：$DOMAIN" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
INDEX="$ROOT/index.html"
NGINX_TPL="$ROOT/deploy/nginx/portfolio.conf.template"
NGINX_OUT="$ROOT/deploy/nginx/portfolio.conf"
CADDY_TPL="$ROOT/deploy/Caddyfile"
CADDY_OUT="$ROOT/deploy/Caddyfile.rendered"

[[ -f "$INDEX" ]] || { echo "✗ 找不到 $INDEX" >&2; exit 1; }

# 读取当前生效的域名（从 canonical 标签），用于幂等判断与提示
CURRENT="$(grep -oE '<link rel="canonical" href="[^"]+"' "$INDEX" | head -1 | sed -E 's/.*href="([^"]+)".*/\1/' || true)"

echo "== 目标域名：https://$DOMAIN"
echo "== 当前 canonical：${CURRENT:-未设置}"
echo

CHANGED=0

# ---------- 1. 替换 index.html 中的域名引用 ----------
# 覆盖：og:url / og:image / twitter:image / canonical / JSON-LD 的 url 与 image
if [[ "$DRY_RUN" == "--dry-run" ]]; then
  echo "[预览] index.html 将被替换的行："
  grep -nE 'https?://(127\.0\.0\.1:8377|[^/"]*)/' "$INDEX" | grep -vE 'w3\.org|schema\.org' | sed 's/^/    /' || true
else
  cp "$INDEX" "$INDEX.bak-$(date +%Y%m%d%H%M%S)"
  # 先替换本地地址，再替换任何既有正式域名，都指向新域名
  sed -i -E \
    -e "s#https?://127\.0\.0\.1:8377#https://$DOMAIN#g" \
    -e "s#https?://(www\.)?${DOMAIN//./\\.}#https://$DOMAIN#g" \
    "$INDEX"
  # 若此前用的是其它域名，一并纠正 canonical / og:url / og:image / twitter:image / JSON-LD
  sed -i -E \
    -e "s#(<meta property=\"og:url\" content=\")[^\"]*#\1https://$DOMAIN/#" \
    -e "s#(<meta property=\"og:image\" content=\")[^\"]*#\1https://$DOMAIN/assets/og/cover.jpg#" \
    -e "s#(<meta name=\"twitter:image\" content=\")[^\"]*#\1https://$DOMAIN/assets/og/cover.jpg#" \
    -e "s#(<link rel=\"canonical\" href=\")[^\"]*#\1https://$DOMAIN/#" \
    -e "s#(\"url\": \")[^\"]*#\1https://$DOMAIN/#" \
    -e "s#(\"image\": \")[^\"]*#\1https://$DOMAIN/assets/og/cover.jpg#" \
    "$INDEX"
  echo "✓ index.html 已更新（原文件备份为 index.html.bak-*）"
  CHANGED=1
fi

# ---------- 2. 渲染 Nginx 配置 ----------
if [[ -f "$NGINX_TPL" ]]; then
  if [[ "$DRY_RUN" == "--dry-run" ]]; then
    echo "[预览] 将生成 $NGINX_OUT（server_name = $DOMAIN www.$DOMAIN）"
  else
    sed "s/__DOMAIN__/$DOMAIN/g" "$NGINX_TPL" > "$NGINX_OUT"
    echo "✓ 已生成 $NGINX_OUT"
    CHANGED=1
  fi
else
  echo "! 未找到 Nginx 模板，跳过"
fi

# ---------- 3. 渲染 Caddyfile ----------
if [[ -f "$CADDY_TPL" ]]; then
  if [[ "$DRY_RUN" == "--dry-run" ]]; then
    echo "[预览] 将生成 $CADDY_OUT"
  else
    sed "s/__DOMAIN__/$DOMAIN/g" "$CADDY_TPL" > "$CADDY_OUT"
    echo "✓ 已生成 $CADDY_OUT"
    CHANGED=1
  fi
fi

# ---------- 4. 检查是否还有残留的本地地址 ----------
echo
if [[ "$DRY_RUN" == "--dry-run" ]]; then
  echo "（预览模式：以上引用尚未替换，正式执行后会自动清除）"
  REMAIN=""
else
REMAIN="$(grep -rn "127\.0\.0\.1:8377" "$INDEX" "$ROOT/js" "$ROOT/css" 2>/dev/null || true)"
if [[ -n "$REMAIN" ]]; then
  echo "! 仍有引用未替换，请人工确认："
  echo "$REMAIN" | sed 's/^/    /'
else
  echo "✓ 项目内已无 127.0.0.1 残留引用"
fi
fi

# ---------- 5. 下一步提示 ----------
echo
if [[ "$DRY_RUN" == "--dry-run" ]]; then
  echo "以上为预览，未写入任何文件。去掉 --dry-run 即可正式执行。"
else
  cat <<EOF
下一步：
  1) 上传站点：rsync -avz --delete --exclude 'deploy' --exclude 'index.html.bak-*' ./ user@server:/var/www/portfolio/
  2) 安装配置：sudo cp deploy/nginx/portfolio.conf /etc/nginx/conf.d/portfolio.conf
  3) 签发证书：sudo bash deploy/scripts/issue-cert.sh $DOMAIN admin@$DOMAIN
  4) 校验结果：bash deploy/scripts/verify-online.sh $DOMAIN
EOF
  if [[ $CHANGED -eq 0 ]]; then echo "（本次没有文件被修改）"; fi
fi
exit 0
