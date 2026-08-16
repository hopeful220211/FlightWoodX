#!/usr/bin/env node

/**
 * 一次性迁移：把存量 Project 数据并入 DroneDesign 口径（作品库合一 · RFC-024 §4.6）。
 *
 * 背景：合一前有两套「我的作品」——DroneDesign（引导式设计快照）与 Project（设计+程序整合体）。
 * 合一后 DroneDesign 是唯一后端源，Project 退化为发布桥接。本脚本让存量 Project 不丢东西：
 *   ① Project 关联了 design（有 designId 且 design 存在）
 *      → 把 Project 的展示字段（coverUrl / visibility / reusable / programId）补写到该 DroneDesign，
 *        仅补 design 侧「确实缺失」的字段（design 已有的不覆盖，design 为权威）。
 *   ② Project 是空壳 / 悬空（无 designId，或 designId 指向已不存在的 design）
 *      → 为它建一条占位 DroneDesign（带 name/coverUrl/visibility/reusable/programId，designData=null，
 *        打 migratedFromProjectId 标记），保证用户库里不丢作品。
 *
 * 幂等 & 可重复：
 *   - 占位创建按 migratedFromProjectId 去重（已建过就跳过）。
 *   - 字段补写只在 design 侧缺失时写，重复跑不产生新变更。
 *
 * 安全（默认 dry-run）：
 *   node scripts/migrate-projects-into-designs.js              # 只打印对账表，不写库
 *   node scripts/migrate-projects-into-designs.js --commit     # 真正写库
 *
 * ⚠️ 生产库演练规程（务必先在拷贝库跑过再上生产）：
 *   1) mongodump --uri "$MONGODB_URI" --out /tmp/fwx-dump
 *   2) mongorestore --uri "mongodb://localhost:27017/fwx_migrate_rehearsal" --nsFrom 'PROD.*' --nsTo 'fwx_migrate_rehearsal.*' /tmp/fwx-dump/PROD
 *   3) MONGODB_URI=mongodb://localhost:27017/fwx_migrate_rehearsal node scripts/migrate-projects-into-designs.js          # dry-run 看对账
 *   4) 核对无误后：MONGODB_URI=...rehearsal... node scripts/migrate-projects-into-designs.js --commit  再抽查结果
 *   5) 演练通过后，--commit 上生产由军师统一协调执行（本脚本作者不直接跑生产）。
 */

require('dotenv').config()
const mongoose = require('mongoose')
const DroneDesign = require('../src/models/DroneDesign')
const Project = require('../src/models/Project')

const COMMIT = process.argv.includes('--commit')

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('[ERROR] MONGODB_URI 未设置，请检查 apps/api/.env')
    process.exit(1)
  }

  await mongoose.connect(uri)
  const dbName = mongoose.connection.db.databaseName
  console.log(`[OK] 已连接 MongoDB · 库=${dbName} · 模式=${COMMIT ? 'COMMIT(写库)' : 'DRY-RUN(只读对账)'}`)

  const projects = await Project.find({}).lean()
  console.log(`[INFO] 待处理 Project：${projects.length} 条\n`)

  let willCreate = 0 // 情形②：将新建占位 design
  let willUpdate = 0 // 情形①：将补写 design 展示字段
  let skipped = 0 // 已一致 / 已迁移过，无需变更
  const sample = [] // 对账样例（最多打印前 20 行）

  for (const p of projects) {
    // 先尝试情形①：Project 关联了仍存在的 design。用 .lean() 拿裸文档，避免 mongoose 默认值
    // 把「缺失」误报成「已有」（visibility/reusable 有 schema 默认）。
    let linkedDesign = null
    if (p.designId) {
      linkedDesign = await DroneDesign.findById(p.designId).select('coverUrl visibility reusable programId').lean()
    }

    if (linkedDesign) {
      // 情形①：仅补 design 侧确实缺失的字段（design 为权威，不覆盖已有值）。
      const patch = {}
      if (linkedDesign.coverUrl == null && p.coverUrl) patch.coverUrl = p.coverUrl
      if (linkedDesign.visibility == null && p.visibility) patch.visibility = p.visibility
      if (linkedDesign.reusable == null && p.reusable === true) patch.reusable = true
      if (linkedDesign.programId == null && p.programId) patch.programId = p.programId

      if (Object.keys(patch).length === 0) {
        skipped++
        continue
      }
      willUpdate++
      if (sample.length < 20) sample.push(`  [更新] design ${p.designId} ← project ${p._id}：${Object.keys(patch).join(', ')}`)
      if (COMMIT) await DroneDesign.updateOne({ _id: p.designId }, { $set: patch })
      continue
    }

    // 情形②：空壳 / 悬空 Project → 建占位 design（幂等：按 migratedFromProjectId 去重）。
    const existing = await DroneDesign.findOne({ migratedFromProjectId: p._id }).select('_id').lean()
    if (existing) {
      skipped++
      continue
    }
    willCreate++
    if (sample.length < 20) sample.push(`  [新建] 占位 design ← project ${p._id}（name="${p.name || '未命名作品'}"）`)
    if (COMMIT) {
      await DroneDesign.create({
        ownerId: p.ownerId,
        name: p.name || '未命名作品',
        designData: null,
        visibility: p.visibility || 'private',
        reusable: p.reusable === true,
        ...(p.coverUrl ? { coverUrl: p.coverUrl } : {}),
        ...(p.programId ? { programId: p.programId } : {}),
        migratedFromProjectId: p._id,
      })
    }
  }

  console.log('==== 迁移对账 ====')
  console.log(`  将新建占位 design（空壳/悬空 Project）：${willCreate}`)
  console.log(`  将补写 design 展示字段（已关联 Project）：${willUpdate}`)
  console.log(`  跳过（已一致 / 已迁移过）：${skipped}`)
  if (sample.length) {
    console.log('\n  样例（前 20 条）：')
    for (const line of sample) console.log(line)
  }
  console.log(`\n[${COMMIT ? 'DONE' : 'DRY-RUN'}] ${COMMIT ? '已写库。' : '未写任何数据；确认无误后加 --commit 执行。'}`)

  await mongoose.disconnect()
  process.exit(0)
}

main().catch((err) => {
  console.error('[ERROR] 迁移失败：', err)
  process.exit(1)
})
