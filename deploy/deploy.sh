#!/usr/bin/env bash
# 一键发布：拉代码 → 构建前端 → 起/更新容器。在服务器上跑：deploy/deploy.sh
# 可重复执行；Compose 重建不保证零停机。先按 deploy/README.md 备份并确认分支。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

# 载入部署变量（VITE_ASSET_BASE 等给前端构建用）
if [ -f "$SCRIPT_DIR/.env" ]; then
  set -a; . "$SCRIPT_DIR/.env"; set +a
fi

echo "==> [1/4] 拉取最新代码"
git pull --ff-only
git log -1 --format='准备发布提交：%h %s'

echo "==> [2/4] 安装依赖"
corepack enable >/dev/null 2>&1 || true
pnpm install --frozen-lockfile

echo "==> [3/4] 构建前端（2G 内存：限制 Node 堆 + 依赖 swap 兜底）"
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=1536}"
# 避免沿用失效 OSS 配置，把 403 模型地址再次写进浏览器包。
# 显式恢复同源副本，不修改服务器 .env 或对象存储权限。
if [ -n "${VITE_ASSET_BASE:-}" ]; then
  asset_base="${VITE_ASSET_BASE%/}"
  for asset_path in models/mainboards/core_hub_01.glb thumbnails/core_hub_01.png textures/wood-board.png; do
    if ! curl --fail --silent --location --max-time 15 --output /dev/null "$asset_base/$asset_path"; then
      echo "==> 远端静态资产探测失败，本次构建改用仓库内同源资产。"
      export VITE_ASSET_BASE=""
      break
    fi
  done
fi
pnpm --filter web build
# 保留同源资产副本；CDN 故障时可重新构建为空的 VITE_ASSET_BASE 后恢复。

echo "==> [4/4] 构建并更新容器"
cd "$SCRIPT_DIR"
docker compose config --quiet
docker compose up -d --build
docker compose ps

for attempt in $(seq 1 20); do
  if docker compose exec -T api node -e 'fetch("http://127.0.0.1:3000/api/health").then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))' >/dev/null 2>&1; then
    echo "==> 容器 API 健康检查通过。仍需在正式域名验证页面、资产和保存刷新。"
    exit 0
  fi
  sleep 2
done
echo "==> API 健康检查未通过；请检查容器日志并按发布记录回滚。" >&2
exit 1
