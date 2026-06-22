// 成长事件派生（RFC-011 §4-E4 成长体系 · 真连库无 mock）。
//
// 本模块只「读」其它模块的真实集合，把它们的领域事实「派生」为 @fwx/shared 定义的
// GrowthEvent[]，再交给 shared 的纯函数 ingestGrowthEvents 计分聚合。
// 计分 / 层级规则一律来自 @fwx/shared，本模块绝不重写规则。
//
// 数据可得性（诚实标注，决定了哪些事件能派生）：
//   ✅ lesson_completed   ← User.completedLessons[]（无逐课完成时间，occurredAt 降级用 createdAt）
//   ✅ project_published  ← CommunityPost（原创：forkFromId 为空），按 projectId 去重
//   ✅ project_was_forked ← CommunityPost.forkFromId（我的帖被他人 fork）
//   ✅ competition_ranked ← 已结束(closed)赛事内 Submission+Score 排名（每人每赛事只计最佳）
//   ❌ project_liked      ← CommunityPost.likes 仅聚合计数、无逐条点赞人 → 跳过（不编造点赞人）
//   ❌ project_favorited  ← model 无字段 → 跳过
//
// 幂等：派生用确定性 id（lesson:/publish:/fork:/comp:），同一库状态重复请求结果稳定；
// ingestGrowthEvents 内部再按 id 去重。

const User = require('../models/User')
const Project = require('../models/Project')
const CommunityPost = require('../models/CommunityPost')
const Submission = require('../models/Submission')
const Score = require('../models/Score')
const Competition = require('../models/Competition')

// 哪些信号当前真实可派生（用于 /events 响应里如实回报可得性）。
const DATA_AVAILABILITY = {
  lesson_completed: { available: true, source: 'User.completedLessons', note: '无逐课完成时间，occurredAt 降级为账号 createdAt' },
  project_published: { available: true, source: 'CommunityPost(原创)', note: 'forkFromId 为空的帖；按 projectId 去重' },
  project_was_forked: { available: true, source: 'CommunityPost.forkFromId', note: '我的帖被他人 fork' },
  competition_ranked: { available: true, source: 'Submission+Score(closed 赛事)', note: '每人每赛事取最佳名次；并列用标准竞赛排名' },
  project_liked: { available: false, source: 'CommunityPost.likes', note: '仅聚合计数、无逐条点赞人，跳过以免编造点赞人' },
  project_favorited: { available: false, source: '(无字段)', note: 'model 无收藏字段，跳过' },
}

function iso(d) {
  return (d instanceof Date ? d : new Date(d || Date.now())).toISOString()
}

// ---- 单赛事名次表：competitionId -> Map(userId -> bestRank) ----
// 一次性批量读取，避免「每用户 × 全表」重复计算。
// 排名口径：每个 submission 取其最高 Score.total（防御一提交多条 Score）；
// 同一用户在同赛事多次提交取其最高分参与排名；并列同名次（标准竞赛排名，1,2,2,4）。
async function buildCompetitionRanks() {
  const closed = await Competition.find({ status: 'closed' }).select('_id').lean()
  const closedIds = closed.map((c) => c._id)
  if (closedIds.length === 0) return new Map()

  const submissions = await Submission.find({ competitionId: { $in: closedIds } })
    .select('_id competitionId userId submittedAt')
    .lean()
  if (submissions.length === 0) return new Map()

  const scores = await Score.find({ submissionId: { $in: submissions.map((s) => s._id) } })
    .select('submissionId total')
    .lean()

  // submissionId -> 最高 total
  const bestScoreOf = new Map()
  for (const sc of scores) {
    const key = String(sc.submissionId)
    const t = Number(sc.total)
    if (!Number.isFinite(t)) continue
    if (!bestScoreOf.has(key) || t > bestScoreOf.get(key)) bestScoreOf.set(key, t)
  }

  // competitionId -> (userId -> 该用户在本赛事的最高分 + 最早达成该分的 submittedAt)
  const perComp = new Map()
  for (const sub of submissions) {
    const total = bestScoreOf.get(String(sub._id))
    if (total === undefined) continue // 无成绩的提交不参与排名
    const compKey = String(sub.competitionId)
    const userKey = String(sub.userId)
    if (!perComp.has(compKey)) perComp.set(compKey, new Map())
    const userMap = perComp.get(compKey)
    const prev = userMap.get(userKey)
    if (!prev || total > prev.total) {
      userMap.set(userKey, { total, submittedAt: sub.submittedAt })
    }
  }

  // 每赛事按分数倒序算 rank（标准竞赛排名），输出 competitionId -> (userId -> rank/submittedAt)
  const ranksByComp = new Map()
  for (const [compKey, userMap] of perComp) {
    const rows = [...userMap.entries()]
      .map(([userId, v]) => ({ userId, total: v.total, submittedAt: v.submittedAt }))
      .sort((a, b) => b.total - a.total)
    const out = new Map()
    let rank = 0
    let processed = 0
    let prevTotal = null
    for (const row of rows) {
      processed += 1
      if (prevTotal === null || row.total < prevTotal) {
        rank = processed // 标准竞赛排名：并列后跳号
        prevTotal = row.total
      }
      out.set(row.userId, { rank, submittedAt: row.submittedAt, competitionId: compKey })
    }
    ranksByComp.set(compKey, out)
  }
  return ranksByComp
}

// 反查 userId -> [{ competitionId, rank, submittedAt }]
function ranksForUser(ranksByComp, userId) {
  const uid = String(userId)
  const out = []
  for (const [, userMap] of ranksByComp) {
    const r = userMap.get(uid)
    if (r) out.push(r)
  }
  return out
}

/**
 * 派生单个用户的真实 GrowthEvent[]。
 * @param {object} user  已查出的 User 文档（lean 或 mongoose doc 均可）
 * @param {Map} [ranksByComp]  buildCompetitionRanks 的结果；不传则内部自行构建（单用户场景）
 */
async function deriveEventsForUser(user, ranksByComp) {
  const userId = String(user._id)
  const events = []

  // 1) lesson_completed ← User.completedLessons[]
  const lessons = Array.isArray(user.completedLessons) ? user.completedLessons : []
  const lessonOccurredAt = iso(user.createdAt)
  for (const lessonId of lessons) {
    if (!lessonId) continue
    events.push({
      id: `lesson:${userId}:${lessonId}`,
      type: 'lesson_completed',
      userId,
      occurredAt: lessonOccurredAt,
      lessonId: String(lessonId),
    })
  }

  // 我的全部社区帖（一次查，供 published / forked 复用）
  const myPosts = await CommunityPost.find({ authorId: user._id })
    .select('_id projectId forkFromId createdAt')
    .lean()

  // 2) project_published ← 原创帖（forkFromId 为空），按 projectId 去重
  const publishedProjectIds = new Set()
  for (const post of myPosts) {
    if (post.forkFromId) continue // fork 帖不算原创发布
    const pid = post.projectId ? String(post.projectId) : null
    if (!pid || publishedProjectIds.has(pid)) continue
    publishedProjectIds.add(pid)
    events.push({
      id: `publish:${pid}`,
      type: 'project_published',
      userId,
      occurredAt: iso(post.createdAt),
      projectId: pid,
    })
  }

  // 3) project_was_forked ← 别人 fork 了我的帖
  const myPostIds = myPosts.map((p) => p._id)
  if (myPostIds.length > 0) {
    const forkPosts = await CommunityPost.find({ forkFromId: { $in: myPostIds } })
      .select('_id authorId projectId forkFromId createdAt')
      .lean()
    // 原帖 id -> 原帖真实 projectId（fork 事件 projectId 用「被 fork 的原作品」的 Project ID）
    const projectIdOfPost = new Map(
      myPosts.map((p) => [String(p._id), p.projectId ? String(p.projectId) : '']),
    )
    for (const fp of forkPosts) {
      const forkedBy = String(fp.authorId)
      const originPostId = String(fp.forkFromId)
      const originProjectId = projectIdOfPost.get(originPostId) || ''
      events.push({
        id: `fork:${fp._id}`,
        type: 'project_was_forked',
        userId,
        occurredAt: iso(fp.createdAt),
        projectId: originProjectId, // 被 fork 的原作品 Project ID
        forkedByUserId: forkedBy, // 与 userId 不同才计分（shared 规则）
      })
    }
  }

  // 4) competition_ranked ← 已结束赛事内的名次（每人每赛事一条）
  const ranks = ranksByComp ? ranksForUser(ranksByComp, userId) : ranksForUser(await buildCompetitionRanks(), userId)
  for (const r of ranks) {
    events.push({
      id: `comp:${r.competitionId}:${userId}`,
      type: 'competition_ranked',
      userId,
      occurredAt: iso(r.submittedAt),
      competitionId: r.competitionId,
      rank: r.rank,
    })
  }

  // project_liked / project_favorited：数据不可得，诚实跳过（见 DATA_AVAILABILITY）。
  return events
}

module.exports = {
  DATA_AVAILABILITY,
  buildCompetitionRanks,
  deriveEventsForUser,
}
