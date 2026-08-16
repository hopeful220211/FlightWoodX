#!/usr/bin/env bash
# 每日备份：mongodump → gzip → 上传 OSS 私有桶 fwx-private/backup/，保留 14 天。
# 依赖 ossutil（阿里云对象存储命令行）。凭证全走 env，不落盘。
#   bash deploy/scripts/backup-daily.sh
# cron 样例见同目录 backup.cron。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$DEPLOY_DIR"

[ -f .env ] && { set -a; . ./.env; set +a; }
: "${OSS_PRIVATE_BUCKET:?需要 OSS_PRIVATE_BUCKET}"
: "${OSS_REGION:?需要 OSS_REGION}"
: "${OSS_ACCESS_KEY_ID:?需要 OSS_ACCESS_KEY_ID}"
: "${OSS_SECRET:?需要 OSS_SECRET}"
DEST_DB="${DEST_DB:-flightwoodx}"
RETAIN_DAYS="${BACKUP_RETAIN_DAYS:-14}"

TS="$(date +%Y%m%d-%H%M%S)"
FILE="fwx-${DEST_DB}-${TS}.archive.gz"
LOCAL="/tmp/${FILE}"
ENDPOINT="https://${OSS_REGION}.aliyuncs.com"
OSSU=(ossutil -e "$ENDPOINT" -i "$OSS_ACCESS_KEY_ID" -k "$OSS_SECRET")

echo "==> dump 数据库 ${DEST_DB}"
docker compose exec -T mongo mongodump --db="$DEST_DB" --archive --gzip > "$LOCAL"

echo "==> 上传到 oss://${OSS_PRIVATE_BUCKET}/backup/${FILE}"
"${OSSU[@]}" cp "$LOCAL" "oss://${OSS_PRIVATE_BUCKET}/backup/${FILE}"

echo "==> 清理本地临时文件"
rm -f "$LOCAL"

echo "==> 删除 ${RETAIN_DAYS} 天前的远端备份（按文件名日期）"
# 说明：更稳妥的做法是给桶配「生命周期规则」自动过期；此处按文件名日期兜底清理。
CUTOFF="$(date -d "-${RETAIN_DAYS} days" +%Y%m%d 2>/dev/null || date -v-"${RETAIN_DAYS}"d +%Y%m%d)"
"${OSSU[@]}" ls "oss://${OSS_PRIVATE_BUCKET}/backup/" | awk '{print $NF}' | grep 'fwx-.*\.archive\.gz' | while read -r obj; do
  fdate="$(echo "$obj" | sed -E 's/.*-([0-9]{8})-[0-9]{6}\.archive\.gz/\1/')"
  if [ -n "$fdate" ] && [ "$fdate" -lt "$CUTOFF" ] 2>/dev/null; then
    echo "    删除过期备份：$obj"
    "${OSSU[@]}" rm "$obj" >/dev/null || true
  fi
done

echo "✅ 备份完成：${FILE}"
