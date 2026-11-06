#!/usr/bin/env bash
# ============================================================
# 媒体库上传：把 media/ 发布到任意 rclone 支持的远端
# 用法：
#   bash deploy/scripts/publish-media.sh r2:my-bucket/media https://cdn.example.com/media
#   MEDIA_REMOTE=oss:my-bucket/media MEDIA_BASE_URL=https://cdn.example.com/media \
#     bash deploy/scripts/publish-media.sh
# 依赖：rclone（支持 S3 / R2 / OSS / COS / SFTP 等）
# ============================================================
set -euo pipefail

REMOTE="${1:-${MEDIA_REMOTE:-}}"
BASE="${2:-${MEDIA_BASE_URL:-}}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOCAL="$ROOT/media"

[[ -n "$REMOTE" ]] || { echo "✗ 缺少远端，例如 r2:my-bucket/media" >&2; exit 1; }
[[ -d "$LOCAL" ]] || { echo "✗ 找不到 $LOCAL" >&2; exit 1; }
command -v rclone >/dev/null 2>&1 || { echo "✗ 未安装 rclone：https://rclone.org/downloads/" >&2; exit 1; }

echo "== 上传 $LOCAL → $REMOTE"
rclone copy "$LOCAL" "$REMOTE" \
  --checksum --progress --transfers 4 --checkers 8 \
  --include '*.mp4' --include '*.json' --include '*.html'

if [[ -n "$BASE" ]]; then
  echo
  echo "完成。稳定链接示例："
  echo "  $BASE/manifest.json"
  echo "  $BASE/index.html"
  echo "  $BASE/tank300-ad.mp4"
  echo "  $BASE/previews/tank300-ad.mp4"
  echo
  echo "若 CDN 域名与主站不同，请同步修改 js/works-data.js 的 media/ 前缀，或在 Nginx 将 /media/ 指向该 CDN。"
else
  echo "完成。请用对象存储/CDN 的公网域名拼接 /media/<slug>.mp4。"
fi
