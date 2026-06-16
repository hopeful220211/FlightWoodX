#!/usr/bin/env node

/**
 * Seed 真实赛事数据（替代前端 hardcoded demo）。幂等可重复跑。
 *
 *   node scripts/seed-competitions.js
 *
 * 造：2 个真实赛事（一个 open 可报名 / 一个 closed 已结束）+ 一名 seed 学员 +
 * 一个作品 + 一条报名 + 一条提交 + 一条「人工」评分 → 排行榜有真实条目。
 * 评分是人工/seed（source='human'），不经任何自动评分闭环（RFC-018 §8）。
 */

require('dotenv').config()
const mongoose = require('mongoose')

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

  // 1) seed 学员（复用已有则不重建）
  const email = 'seed-student@flightwoodx.com'
  let user = await User.findOne({ email })
  if (!user) {
    // 明文密码交给 User 模型的 pre-save 钩子自动 hash
    user = await User.create({
      username: '示例学员',
      email,
      password: 'seed-password-001',
      role: 'student',
    })
    console.log('  + 创建 seed 学员')
  }

  // 2) seed 作品
  let project = await Project.findOne({ ownerId: user._id, name: '示例参赛作品' })
  if (!project) {
    project = await Project.create({
      ownerId: user._id,
      name: '示例参赛作品',
      visibility: 'public',
    })
    console.log('  + 创建 seed 作品')
  }

  // 3) 两个真实赛事（按名字幂等）
  const now = Date.now()
  const day = 24 * 60 * 60 * 1000
  const compDefs = [
    {
      name: '2026 翼创未来 · 暑期线上海选',
      rulesDescription: '仿真先行，无需硬件。设计 → 编程 → 仿真，按设计/编程/创意/任务完成四维评分。',
      trackConfig: { name: '标准避障赛道 A', description: '起飞 → 穿越障碍 → 精准降落', obstacles: [] },
      scoringRules: { design: 25, programming: 25, creativity: 25, taskCompletion: 25 },
      startTime: new Date(now - 2 * day),
      endTime: new Date(now + 20 * day),
      status: 'open',
    },
    {
      name: '2026 翼创未来 · 春季体验赛',
      rulesDescription: '入门体验赛，已结束，可查看排行与回放（回放 P1）。',
      trackConfig: { name: '入门赛道', description: '起飞 → 直线飞行 → 降落', obstacles: [] },
      scoringRules: { design: 25, programming: 25, creativity: 25, taskCompletion: 25 },
      startTime: new Date(now - 60 * day),
      endTime: new Date(now - 30 * day),
      status: 'closed',
    },
  ]

  const comps = []
  for (const def of compDefs) {
    let c = await Competition.findOne({ name: def.name })
    if (!c) {
      c = await Competition.create(def)
      console.log(`  + 创建赛事：${def.name}`)
    }
    comps.push(c)
  }

  // 4) 报名 + 提交 + 人工评分（挂在第一个 open 赛事上），全部幂等
  const openComp = comps[0]

  await Registration.updateOne(
    { competitionId: openComp._id, userId: user._id },
    { $setOnInsert: { competitionId: openComp._id, userId: user._id } },
    { upsert: true },
  )

  let submission = await Submission.findOne({
    competitionId: openComp._id,
    userId: user._id,
    projectId: project._id,
  })
  if (!submission) {
    submission = await Submission.create({
      competitionId: openComp._id,
      userId: user._id,
      projectId: project._id,
      status: 'scored', // 人工已评分 → 进榜
    })
    console.log('  + 创建 seed 提交（已评分）')
  }

  const dimensions = { design: 22, programming: 20, creativity: 23, taskCompletion: 21 }
  const total = dimensions.design + dimensions.programming + dimensions.creativity + dimensions.taskCompletion
  const existingScore = await Score.findOne({ submissionId: submission._id })
  if (!existingScore) {
    await Score.create({ submissionId: submission._id, dimensions, total, source: 'human' })
    console.log(`  + 创建 seed 人工评分（total=${total}）`)
  }

  console.log('[DONE] 赛事 seed 完成。排行榜应能看到 1 条人工评分条目。')
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error('[FATAL]', err)
  process.exit(1)
})
