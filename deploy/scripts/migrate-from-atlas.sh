#!/usr/bin/env bash
# MongoDB Atlas → ECS 内网 mongo 迁移（RFC-024 §4.8）。幂等、可重复；逐集合核对文档条数。
#   SRC_MONGODB_URI="$MONGODB_URI_FROM_SECRET_MANAGER" bash deploy/scripts/migrate-from-atlas.sh
# 走 docker compose 内的 mongo 容器执行（它自带 mongodump/mongorestore/mongosh，且能连内网目标库）。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$DEPLOY_DIR"

[ -f .env ] && { set -a; . ./.env; set +a; }
: "${SRC_MONGODB_URI:?需要设置源 Atlas 连接串 SRC_MONGODB_URI}"
DEST_DB="${DEST_DB:-flightwoodx}"
# 旧连接串未写库名时，Mongoose 默认把数据落进 test 库；迁移时改名成 DEST_DB。
SRC_DB="${SRC_DB:-test}"
ARCHIVE="/tmp/fwx-atlas-$(date +%Y%m%d-%H%M%S).archive.gz"

dc() { docker compose "$@"; }

echo "==> [1/4] 从 Atlas dump（在 mongo 容器内执行，压缩归档 → 落到宿主机）"
dc exec -T mongo mongodump --uri="$SRC_MONGODB_URI" --db="$SRC_DB" --archive --gzip > "$ARCHIVE"
echo "    归档：$ARCHIVE（$(du -h "$ARCHIVE" | cut -f1)）"

echo "==> [2/4] 恢复到内网 mongo（--drop：先清同名集合再导入，保证可重复执行的幂等结果）"
dc exec -T mongo mongorestore --drop --archive --gzip --nsFrom="${SRC_DB}.*" --nsTo="${DEST_DB}.*" < "$ARCHIVE"

echo "==> [3/4] 逐集合核对文档条数"
# 源端各集合条数
SRC_COUNTS="$(dc exec -T mongo mongosh "$SRC_MONGODB_URI" --quiet --eval '
  const s = db.getSiblingDB("'"$SRC_DB"'");
  s.getCollectionNames().sort().forEach(c => print(c + " " + s.getCollection(c).countDocuments()))
')"
# 目标端各集合条数
DST_COUNTS="$(dc exec -T mongo mongosh "mongodb://localhost:27017/${DEST_DB}" --quiet --eval '
  db.getCollectionNames().sort().forEach(c => print(c + " " + db.getCollection(c).countDocuments()))
')"

echo ""
printf "%-28s %10s %10s   %s\n" "集合" "源(Atlas)" "目标(ECS)" "状态"
printf "%-28s %10s %10s   %s\n" "----" "--------" "--------" "----"
MISMATCH=0
# 用源端集合列表逐个比对
while read -r col scount; do
  [ -z "$col" ] && continue
  dcount="$(echo "$DST_COUNTS" | awk -v c="$col" '$1==c{print $2}')"
  dcount="${dcount:-0}"
  if [ "$scount" = "$dcount" ]; then status="OK"; else status="✗ 不一致"; MISMATCH=$((MISMATCH+1)); fi
  printf "%-28s %10s %10s   %s\n" "$col" "$scount" "$dcount" "$status"
done <<< "$SRC_COUNTS"

echo ""
echo "==> [4/4] 清理临时归档"
rm -f "$ARCHIVE"

if [ "$MISMATCH" -eq 0 ]; then
  echo "✅ 全部集合条数一致，迁移对账通过。"
else
  echo "⚠️ 有 ${MISMATCH} 个集合条数不一致，请复查（脚本可重复执行）。"
  exit 1
fi
