#!/usr/bin/env bash
# 批量把前端静态资产传到 OSS 公共读桶 fwx-assets（RFC-024 §4.8）。
# 供「前端从 OSS 加载 GLB/贴图/缩略图」用；后续新增零件资产也用它增量同步。
# 依赖 ossutil，凭证全走 env。--update 只传有变化的文件（增量、可重复）。
#   bash deploy/scripts/upload-assets.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

[ -f "$DEPLOY_DIR/.env" ] && { set -a; . "$DEPLOY_DIR/.env"; set +a; }
: "${OSS_ASSETS_BUCKET:?需要 OSS_ASSETS_BUCKET}"
: "${OSS_REGION:?需要 OSS_REGION}"
: "${OSS_ACCESS_KEY_ID:?需要 OSS_ACCESS_KEY_ID}"
: "${OSS_SECRET:?需要 OSS_SECRET}"

ENDPOINT="https://${OSS_REGION}.aliyuncs.com"
OSSU=(ossutil -e "$ENDPOINT" -i "$OSS_ACCESS_KEY_ID" -k "$OSS_SECRET")
PUBLIC="apps/web/public"

for dir in models textures thumbnails; do
  SRC="${PUBLIC}/${dir}/"
  if [ -d "$SRC" ]; then
    echo "==> 同步 ${SRC} → oss://${OSS_ASSETS_BUCKET}/${dir}/"
    "${OSSU[@]}" cp -r -f --update "$SRC" "oss://${OSS_ASSETS_BUCKET}/${dir}/"
  else
    echo "==> 跳过（不存在）：$SRC"
  fi
done

echo "✅ 资产同步完成。注意：桶 ${OSS_ASSETS_BUCKET} 需在控制台设为「公共读」，并按需配 CDN 与跨域(CORS)。"
