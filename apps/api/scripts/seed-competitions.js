#!/usr/bin/env node

/**
 * Seed 真实赛事数据（RFC-018 P2）。幂等可重复跑。
 *
 *   node scripts/seed-competitions.js
 *
 * 造两个真实赛事：
 *   ① 2026 翼创未来 · 年度创意赛（open，富详情页）— 挂 3 名学员的报名 + 提交 + 人工评分，
 *      让排行榜前三名可验。
 *   ② 2026 翼创未来 · 秋季区域实飞赛（closed，已结束）— 挂 2 名学员成绩，作"获奖公示"。
 *
 * 真幂等（Codex 评审①采纳）：连跑两次赛事数 / 评分状态不变；并清理旧 demo 赛事
 * （「暑期线上海选 / 春季体验赛」），避免残留多余赛事。
 * 评分均为人工 seed（source='human'），不经任何自动评分闭环（RFC-018 §8，自动评分等 RFC-015）。
 */

require('dotenv').config()
const mongoose = require('mongoose')

const ANNUAL_NAME = '2026 翼创未来 · 年度创意赛'
const REGIONAL_NAME = '2026 翼创未来 · 秋季区域实飞赛'
// 旧 demo 赛事名（历史 seed 残留），连同其报名/提交/评分一并清理。
const LEGACY_NAMES = ['2026 翼创未来 · 暑期线上海选', '2026 翼创未来 · 春季体验赛']

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('[ERROR] MONGODB_URI 未设置，检查 .env')
    process.exit(1)
  }
  await mongoose.connect(uri)
  console.log('[OK] Connected to MongoDB')

  const User = require('../src/models/User')
  const Project = require('../src/models/Project')
  const Competition = require('../src/models/Competition')
  const Registration = require('../src/models/Registration')
  const Submission = require('../src/models/Submission')
  const Score = require('../src/models/Score')

  // 0) 清理旧 demo 赛事及其挂载数据（真幂等）
  for (const legacy of LEGACY_NAMES) {
    const old = await Competition.findOne({ name: legacy })
    if (old) {
      const subs = await Submission.find({ competitionId: old._id }, '_id')
      await Score.deleteMany({ submissionId: { $in: subs.map((s) => s._id) } })
      await Submission.deleteMany({ competitionId: old._id })
      await Registration.deleteMany({ competitionId: old._id })
      await Competition.deleteOne({ _id: old._id })
      console.log(`  - 清理旧赛事：${legacy}`)
    }
  }

  // 工具：按名字幂等取/建赛事
  async function upsertCompetition(def) {
    let c = await Competition.findOne({ name: def.name })
    if (!c) {
      c = await Competition.create(def)
      console.log(`  + 创建赛事：${def.name}`)
    }
    return c
  }

  // 工具：按 email 幂等取/建学员（明文密码交 User pre-save 钩子 hash）
  async function upsertStudent(username, email) {
    let u = await User.findOne({ email })
    if (!u) {
      u = await User.create({ username, email, password: 'seed-password-001', role: 'student' })
    }
    return u
  }

  // 工具：给某赛事挂一条 报名 + 提交(scored) + 人工评分；全部幂等
  async function seedEntry(comp, user, projectName, dims) {
    let project = await Project.findOne({ ownerId: user._id, name: projectName })
    if (!project) {
      project = await Project.create({ ownerId: user._id, name: projectName, visibility: 'public' })
    }
    await Registration.updateOne(
      { competitionId: comp._id, userId: user._id },
      { $setOnInsert: { competitionId: comp._id, userId: user._id } },
      { upsert: true },
    )
    let submission = await Submission.findOne({
      competitionId: comp._id,
      userId: user._id,
      projectId: project._id,
    })
    if (!submission) {
      submission = await Submission.create({
        competitionId: comp._id,
        userId: user._id,
        projectId: project._id,
        status: 'scored',
      })
    }
    const total = dims.design + dims.programming + dims.creativity + dims.taskCompletion
    const existing = await Score.findOne({ submissionId: submission._id })
    if (!existing) {
      await Score.create({ submissionId: submission._id, dimensions: dims, total, source: 'human' })
    }
    return total
  }

  const now = Date.now()
  const day = 24 * 60 * 60 * 1000

  // 1) 两个真实赛事
  const annual = await upsertCompetition({
    name: ANNUAL_NAME,
    rulesDescription:
      '仿真先行，无需硬件。设计 → 编程 → 仿真试飞，按设计 / 编程逻辑 / 创意 / 任务完成四维评分，不评纯竞速。',
    trackConfig: { name: '标准避障赛道 A', description: '起飞 → 穿越障碍 → 精准降落', obstacles: [] },
    scoringRules: { design: 25, programming: 25, creativity: 25, taskCompletion: 25 },
    startTime: new Date(now - 5 * day),
    endTime: new Date(now + 25 * day),
    status: 'open',
  })

  const regional = await upsertCompetition({
    name: REGIONAL_NAME,
    rulesDescription: '区域线下体验赛，从仿真到实飞。本届已结束，可查看最终成绩与获奖公示。',
    trackConfig: { name: '区域实飞赛道', description: '起飞 → 绕标 → 定点降落', obstacles: [] },
    scoringRules: { design: 25, programming: 25, creativity: 25, taskCompletion: 25 },
    startTime: new Date(now - 60 * day),
    endTime: new Date(now - 30 * day),
    status: 'closed',
  })

  // 2) 年度赛：3 名学员成绩（前三名可验，分差明显）
  const annualEntries = [
    { username: '林知遥', email: 'seed-annual-1@flightwoodx.com', project: '云隼一号', dims: { design: 24, programming: 23, creativity: 24, taskCompletion: 23 } }, // 94
    { username: '陈思齐', email: 'seed-annual-2@flightwoodx.com', project: '木鸢改进型', dims: { design: 22, programming: 20, creativity: 23, taskCompletion: 21 } }, // 86
    { username: '赵小满', email: 'seed-annual-3@flightwoodx.com', project: '榫卯飞手', dims: { design: 19, programming: 21, creativity: 18, taskCompletion: 20 } }, // 78
  ]
  for (const e of annualEntries) {
    const u = await upsertStudent(e.username, e.email)
    const total = await seedEntry(annual, u, e.project, e.dims)
    console.log(`  + 年度赛成绩：${e.username} = ${total}`)
  }

  // 3) 区域赛：2 名学员成绩（获奖公示）
  const regionalEntries = [
    { username: '周屹松', email: 'seed-regional-1@flightwoodx.com', project: '秋叶号', dims: { design: 23, programming: 22, creativity: 22, taskCompletion: 24 } }, // 91
    { username: '吴小帆', email: 'seed-regional-2@flightwoodx.com', project: '风信子', dims: { design: 20, programming: 21, creativity: 20, taskCompletion: 22 } }, // 83
  ]
  for (const e of regionalEntries) {
    const u = await upsertStudent(e.username, e.email)
    const total = await seedEntry(regional, u, e.project, e.dims)
    console.log(`  + 区域赛成绩：${e.username} = ${total}`)
  }

  console.log('[DONE] 赛事 seed 完成：年度赛 3 条、区域赛 2 条人工评分进榜。')
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error('[FATAL]', err)
  process.exit(1)
})
