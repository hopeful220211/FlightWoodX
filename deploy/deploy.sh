#!/usr/bin/env bash
# 一键发布：拉代码 → 构建前端 → 起/更新容器。在服务器上跑：deploy/deploy.sh
# 幂等：可重复执行；每次把最新代码构建并滚动更新容器。
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

echo "==> [2/4] 安装依赖"
corepack enable >/dev/null 2>&1 || true
pnpm install --frozen-lockfile

echo "==> [3/4] 构建前端（2G 内存：限制 Node 堆 + 依赖 swap 兜底）"
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=1536}"
pnpm --filter web build
# 资产走 OSS：配了 VITE_ASSET_BASE 就从 dist 删掉大资产目录（避免在 ECS 上重复托管、省磁盘）
if [ -n "${VITE_ASSET_BASE:-}" ]; then
  echo "    VITE_ASSET_BASE 已设置 → 从 dist 移除 models/textures/thumbnails（走 OSS）"
  rm -rf apps/web/dist/models apps/web/dist/textures apps/web/dist/thumbnails || true
fi

echo "==> [4/4] 构建并滚动更新容器"
cd "$SCRIPT_DIR"
docker compose up -d --build
docker compose ps

echo "==> 发布完成。健康检查：curl -fsS https://\$FWX_SERVER_NAME/api/health"
