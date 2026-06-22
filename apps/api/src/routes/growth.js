// 成长体系后端（RFC-011 §4-E4）·真连库无 mock。
//
// 两个接口：
//   GET /api/growth/events       —— 当前用户的真实成长事件流（派生自各模块集合）
//   GET /api/growth/leaderboard  —— 成长排行榜（聚合各用户 totalPoints）
//
// 计分 / 层级一律来自 @fwx/shared 的纯函数（RFC-014 先例：require CJS 构建），不重写规则。
// 派生逻辑集中在 utils/growthDerive.js；本文件只做 HTTP 编排 + 分页。

const express = require('express')
const { authenticate } = require('../middleware/auth')
const User = require('../models/User')
const { ingestGrowthEvents, levelOf } = require('@fwx/shared/runtime-cjs')
const { DATA_AVAILABILITY, buildCompetitionRanks, deriveEventsForUser } = require('../utils/growthDerive')

const router = express.Router()
router.use(authenticate)

function displayNameOf(user) {
  return (user.profile && user.profile.displayName) || user.username || '匿名设计师'
}
function avatarOf(user) {
  return (user.profile && user.profile.avatar) || undefined
}

/**
 * GET /api/growth/events — 当前用户真实成长事件 + 聚合后的成长状态。
 * 返回 ingestGrowthEvents 的完整结果（totalPoints / 层级 / 徽章 / recentEvents），
 * 并附 dataAvailability 如实说明哪些信号可派生、哪些跳过。
 */
router.get('/events', async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .select('username profile completedLessons createdAt')
      .lean()
    if (!user) return res.status(404).json({ error: '用户不存在' })

    const events = await deriveEventsForUser(user) // 单用户场景内部自建赛事名次表
    const state = ingestGrowthEvents(events)

    res.json({
      ...state,
      // 如实回报数据可得性（真连库验收：哪些真实存在、哪些因 model 无字段而跳过）
      dataAvailability: DATA_AVAILABILITY,
    })
  } catch (error) {
    console.error('[growth] events error:', error)
    res.status(500).json({ error: '获取成长事件失败' })
  }
})

/**
 * GET /api/growth/leaderboard?scope=global|class&page&pageSize
 * 对每个用户派生事件 → ingestGrowthEvents().totalPoints，按分倒序，返回 Paginated<LeaderboardEntry>。
 *
 * scope=class：User 无独立班级字段，最接近的是 profile.grade。
 *   故 class 退化为「同年级榜」——按当前用户 profile.grade 过滤同年级用户。
 *   响应里 scopeNote 如实说明这是年级榜而非真正班级（不编造班级数据）。
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const scope = req.query.scope === 'class' ? 'class' : 'global'
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20))

    // class scope：按当前用户的年级过滤（最接近班级的真实字段）
    let userFilter = {}
    let scopeNote
    if (scope === 'class') {
      const me = await User.findById(req.userId).select('profile').lean()
      const grade = me && me.profile && me.profile.grade
      if (!grade) {
        // 当前用户无年级信息：诚实返回空榜，不编造
        return res.json({
          items: [],
          page,
          pageSize,
          total: 0,
          totalPages: 0,
          scope,
          scopeNote: '当前用户未设置年级，且 User 无独立班级字段，无法生成班级/年级榜',
        })
      }
      userFilter = { 'profile.grade': grade }
      scopeNote = `User 无独立班级字段，class 退化为「同年级榜」（grade=${grade}）`
    }

    // 一次性构建已结束赛事名次表，供所有用户复用（避免每用户重算全表）
    const ranksByComp = await buildCompetitionRanks()

    const users = await User.find(userFilter)
      .select('username profile completedLessons createdAt')
      .lean()

    // 为每个用户派生事件 → 聚合积分
    const scored = []
    for (const u of users) {
      const events = await deriveEventsForUser(u, ranksByComp)
      const { totalPoints } = ingestGrowthEvents(events)
      const { tier, subLevel } = levelOf(totalPoints)
      scored.push({
        userId: String(u._id),
        nickname: displayNameOf(u),
        avatarUrl: avatarOf(u),
        totalPoints,
        tier: tier.id,
        subLevel,
      })
    }

    // 按分倒序；同分按 userId 稳定排序，保证分页结果稳定（幂等）
    scored.sort((a, b) => (b.totalPoints - a.totalPoints) || (a.userId < b.userId ? -1 : 1))

    const total = scored.length
    const totalPages = Math.ceil(total / pageSize)
    const start = (page - 1) * pageSize
    const items = scored.slice(start, start + pageSize).map((entry, i) => ({
      rank: start + i + 1, // 榜单名次（连续，非并列）
      ...entry,
    }))

    res.json({ items, page, pageSize, total, totalPages, scope, scopeNote })
  } catch (error) {
    console.error('[growth] leaderboard error:', error)
    res.status(500).json({ error: '获取排行榜失败' })
  }
})

module.exports = router
