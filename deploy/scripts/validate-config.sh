#!/usr/bin/env bash
# ============================================================
# 离线校验 Nginx 配置（无需服务器、无需装 Nginx）
# 原理：把 conf.d 片段包进 http{} 上下文，用 crossplane 按官方指令表严格解析
# 用法：bash deploy/scripts/validate-config.sh [配置文件]
# 依赖：python3 + pip install crossplane
# 注意：本脚本校验语法与指令上下文，不校验证书文件是否存在、模块是否编译
# ============================================================
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONF="${1:-$ROOT/deploy/nginx/portfolio.conf}"

[[ -f "$CONF" ]] || { echo "✗ 找不到配置文件：$CONF" >&2; echo "  先运行：bash deploy/scripts/set-domain.sh <域名>" >&2; exit 1; }

if ! python3 -m crossplane --help >/dev/null 2>&1 && ! python -m crossplane --help >/dev/null 2>&1; then
  echo "缺少 crossplane，安装：python -m pip install crossplane" >&2
  exit 1
fi
PY="$(command -v python3 || command -v python)"

# Git Bash / MSYS 下 Python 需要 Windows 风格路径（C:/...），否则会被当成 C:/c/...
CONF_INCLUDE="$CONF"
if command -v cygpath >/dev/null 2>&1; then CONF_INCLUDE="$(cygpath -m "$CONF")"; fi

# 渲染后的配置是 conf.d 片段，必须放进 http{} 才能被解析
WRAP="$(mktemp)"
trap 'rm -f "$WRAP"' EXIT
{
  echo 'events {}'
  echo 'http {'
  echo "include $CONF_INCLUDE;"
  echo '}'
} > "$WRAP"

echo "校验：$CONF"
OUT="$("$PY" -m crossplane parse --strict "$WRAP" 2>&1)"

STATUS="$(printf '%s' "$OUT" | "$PY" -c 'import sys,json; print(json.load(sys.stdin).get("status","unknown"))' 2>/dev/null || echo parse_error)"

if [[ "$STATUS" == "ok" ]]; then
  echo "✓ 语法与指令上下文校验通过（crossplane strict）"
  echo
  echo "提示：上线时仍需在服务器执行 sudo nginx -t —— 它会额外校验"
  echo "      证书文件是否存在、模块是否已编译、端口是否被占用，这三点离线无法覆盖。"
  exit 0
else
  echo "✗ 校验未通过："
  printf '%s' "$OUT" | "$PY" -c '
import sys, json
try:
    d = json.load(sys.stdin)
    for e in d.get("errors", []):
        print("   -", e.get("error", e))
except Exception:
    print(sys.stdin.read() if False else "   （解析输出异常，请加 --strict 手动查看）")
' 2>/dev/null || printf '%s\n' "$OUT"
  exit 1
fi
