const express = require('express')
const { authenticate, optionalAuth } = require('../middleware/auth')
const Competition = require('../models/Competition')
const Registration = require('../models/Registration')
const Submission = require('../models/Submission')
const Score = require('../models/Score')
const Project = require('../models/Project')

const router = express.Router()

// 可报名 / 可提交的赛事状态（草稿不公开，已结束不收新提交）
const ACTIVE_STATUSES = ['open', 'running']

// ── 工具 ──
function parsePage(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize, 10) || 20))
  return { page, pageSize }
}

const iso = (d) => (d ? new Date(d).toISOString() : undefined)

// DTO：_id→id、Date→ISO，对齐 @fwx/shared 形状
function competitionDTO(c, extra = {}) {
  return {
    id: String(c._id),
    name: c.name,
    rulesDescription: c.rulesDescription,
    trackConfig: c.trackConfig,
    scoringRules: c.scoringRules,
    startTime: iso(c.startTime),
    endTime: iso(c.endTime),
    status: c.status,
    createdAt: iso(c.createdAt),
    ...extra,
  }
}

function submissionDTO(s) {
  return {
    id: String(s._id),
    competitionId: String(s.competitionId),
    userId: String(s.userId),
    projectId: String(s.projectId),
    status: s.status,
    runId: s.runId,
    submittedAt: iso(s.submittedAt),
  }
}

/** 统计一组赛事的报名数 → { competitionId: count } */
async function registeredCounts(ids) {
  const rows = await Registration.aggregate([
    { $match: { competitionId: { $in: ids } } },
    { $group: { _id: '$competitionId', n: { $sum: 1 } } },
  ])
  const map = {}
  for (const r of rows) map[String(r._id)] = r.n
  return map
}

/**
 * GET /api/competitions
 * 公开分页列表（不含草稿）。返回 Paginated<Competition + registeredCount>。
 */
router.get('/', async (req, res) => {
  try {
    const { page, pageSize } = parsePage(req.query)
    const filter = { status: { $ne: 'draft' } }

    const [total, comps] = await Promise.all([
      Competition.countDocuments(filter),
      Competition.find(filter)
        .sort({ startTime: 1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
    ])

    const counts = await registeredCounts(comps.map((c) => c._id))
    const items = comps.map((c) =>
      competitionDTO(c, { registeredCount: counts[String(c._id)] || 0 }),
    )

    res.json({ items, total, page, pageSize })
  } catch (error) {
    console.error('[competitions] List error:', error)
    res.status(500).json({ error: '获取赛事列表失败' })
  }
})

/**
 * GET /api/competitions/:id
 * 公开详情；带有效 token 时附带 isRegistered。
 */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const comp = await Competition.findById(req.params.id).lean()
    if (!comp || comp.status === 'draft') {
      return res.status(404).json({ error: '赛事不存在' })
    }

    const registeredCount = await Registration.countDocuments({ competitionId: comp._id })
    const extra = { registeredCount }
    if (req.userId) {
      extra.isRegistered = !!(await Registration.exists({
        competitionId: comp._id,
        userId: req.userId,
      }))
    }

    res.json({ competition: competitionDTO(comp, extra) })
  } catch (error) {
    console.error('[competitions] Detail error:', error)
    res.status(500).json({ error: '获取赛事详情失败' })
  }
})

/**
 * POST /api/competitions/:id/register
 * 幂等报名：仅可报名状态；已报名直接成功。
 */
router.post('/:id/register', authenticate, async (req, res) => {
  try {
    const comp = await Competition.findById(req.params.id).lean()
    if (!comp || comp.status === 'draft') {
      return res.status(404).json({ error: '赛事不存在' })
    }
    if (!ACTIVE_STATUSES.includes(comp.status)) {
      return res.status(409).json({ error: '该赛事当前不开放报名' })
    }

    // upsert：已报名则不重复建
    await Registration.updateOne(
      { competitionId: comp._id, userId: req.userId },
      { $setOnInsert: { competitionId: comp._id, userId: req.userId } },
      { upsert: true },
    )

    const registeredCount = await Registration.countDocuments({ competitionId: comp._id })
    res.json({ registered: true, registeredCount })
  } catch (error) {
    console.error('[competitions] Register error:', error)
    res.status(500).json({ error: '报名失败' })
  }
})

/**
 * POST /api/competitions/:id/submit  body: { projectId }
 * 只建 Submission(status=submitted)，引用 Project；不产 Score、不写 runId（杜绝"提交即有分"）。
 * 幂等：同赛事同用户同作品复用已有提交。
 */
router.post('/:id/submit', authenticate, async (req, res) => {
  try {
    const { projectId } = req.body
    if (!projectId) {
      return res.status(400).json({ error: '请选择要提交的作品' })
    }

    const comp = await Competition.findById(req.params.id).lean()
    if (!comp || comp.status === 'draft') {
      return res.status(404).json({ error: '赛事不存在' })
    }
    if (!ACTIVE_STATUSES.includes(comp.status)) {
      return res.status(409).json({ error: '该赛事当前不接受提交' })
    }

    // 必须先报名再提交（报名→提交 语义）
    const registered = await Registration.exists({ competitionId: comp._id, userId: req.userId })
    if (!registered) {
      return res.status(403).json({ error: '请先报名再提交' })
    }

    // 作品必须属于当前用户
    const project = await Project.findOne({ _id: projectId, ownerId: req.userId }).lean()
    if (!project) {
      return res.status(404).json({ error: '作品不存在或不属于你' })
    }

    // 幂等：已存在则复用
    const existing = await Submission.findOne({
      competitionId: comp._id,
      userId: req.userId,
      projectId,
    }).lean()
    if (existing) {
      return res.status(200).json({ submission: submissionDTO(existing), reused: true })
    }

    const submission = await Submission.create({
      competitionId: comp._id,
      userId: req.userId,
      projectId,
      status: 'submitted',
    })
    res.status(201).json({ submission: submissionDTO(submission.toObject()) })
  } catch (error) {
    // 唯一索引并发兜底
    if (error && error.code === 11000) {
      const existing = await Submission.findOne({
        competitionId: req.params.id,
        userId: req.userId,
        projectId: req.body.projectId,
      }).lean()
      if (existing) return res.status(200).json({ submission: submissionDTO(existing), reused: true })
    }
    console.error('[competitions] Submit error:', error)
    res.status(500).json({ error: '提交失败' })
  }
})

/**
 * GET /api/competitions/:id/leaderboard
 * 公开排行榜：只读 Score（人工/seed），按 total 降序，分页。无分则空。
 */
router.get('/:id/leaderboard', async (req, res) => {
  try {
    const { page, pageSize } = parsePage(req.query)

    const comp = await Competition.findById(req.params.id).lean()
    if (!comp || comp.status === 'draft') {
      return res.status(404).json({ error: '赛事不存在' })
    }

    const subs = await Submission.find({ competitionId: req.params.id })
      .populate('userId', 'username nickname')
      .populate('projectId', 'name coverUrl')
      .lean()

    if (subs.length === 0) {
      return res.json({ items: [], total: 0, page, pageSize })
    }

    const scores = await Score.find({ submissionId: { $in: subs.map((s) => s._id) } }).lean()
    const scoreBySub = {}
    for (const sc of scores) scoreBySub[String(sc.submissionId)] = sc

    // 只有已评分的提交进榜
    const ranked = subs
      .map((s) => ({ sub: s, score: scoreBySub[String(s._id)] }))
      .filter((x) => x.score)
      .sort((a, b) => b.score.total - a.score.total)

    const total = ranked.length
    const pageItems = ranked.slice((page - 1) * pageSize, page * pageSize)
    const items = pageItems.map((x, i) => ({
      rank: (page - 1) * pageSize + i + 1,
      submissionId: String(x.sub._id),
      userId: String(x.sub.userId?._id || x.sub.userId),
      userName: x.sub.userId?.nickname || x.sub.userId?.username || '匿名',
      projectId: String(x.sub.projectId?._id || x.sub.projectId),
      projectName: x.sub.projectId?.name || '未命名作品',
      total: x.score.total,
      dimensions: x.score.dimensions,
      source: x.score.source,
    }))

    res.json({ items, total, page, pageSize })
  } catch (error) {
    console.error('[competitions] Leaderboard error:', error)
    res.status(500).json({ error: '获取排行榜失败' })
  }
})

module.exports = router
