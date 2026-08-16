const express = require('express')
const mongoose = require('mongoose')
const { authenticate, optionalAuthenticate } = require('../middleware/auth')
const CommunityPost = require('../models/CommunityPost')
const Reaction = require('../models/Reaction')
const Follow = require('../models/Follow')
const User = require('../models/User')

const router = express.Router()

const TARGET = 'communityPost'

// ⚠️ 安全红线：本路由所有 DTO 只暴露展示用字段。
// User 上的 profile.grade / profile.studentId / email 是未成年人 PII，绝不能出现在任何响应里。
function authorCardDTO(u) {
  if (!u) return null
  return {
    id: String(u._id),
    username: u.username,
    avatar: u.profile?.avatar || u.avatar || undefined,
  }
}

// 列表卡片 DTO（与 community.js 的 postCardDTO 同口径：authorId + author + cover + 点赞/收藏 + likedByMe）。
function postCardDTO(row, likedSet) {
  return {
    id: String(row._id),
    title: row.title,
    description: row.description || '',
    authorId: String(row.authorId),
    author: authorCardDTO(row.author),
    projectId: String(row.projectId),
    coverUrl: row.project?.coverUrl || undefined,
    forkFromId: row.forkFromId ? String(row.forkFromId) : undefined,
    likeCount: row.likeCount || 0,
    favoriteCount: row.favoriteCount || 0,
    likedByMe: likedSet ? likedSet.has(String(row._id)) : false,
    createdAt: row.createdAt,
  }
}

// 当前用户对一批 post 的点赞集合（一次查询，非 N+1）。
async function likedSetFor(userId, ids) {
  if (!userId || !ids.length) return new Set()
  const mine = await Reaction.find({
    userId,
    targetType: TARGET,
    type: 'like',
    targetId: { $in: ids },
  }).distinct('targetId')
  return new Set(mine.map(String))
}

// 复用 community.js 的列表聚合：按 authorId 集合过滤，附 author / project.cover / likeCount / favoriteCount。
// 直接 COPY /posts 的 lookup 管线，仅把 $match 换成「指定作者集合」。
async function paginatedPostCards(authorMatch, viewerId, page, pageSize) {
  const total = await CommunityPost.countDocuments(authorMatch)

  const rows = await CommunityPost.aggregate([
    { $match: authorMatch },
    {
      $lookup: {
        from: 'reactions',
        let: { pid: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$targetType', TARGET] },
                  { $eq: ['$targetId', '$$pid'] },
                  { $eq: ['$type', 'like'] },
                ],
              },
            },
          },
          { $count: 'c' },
        ],
        as: '_la',
      },
    },
    { $addFields: { likeCount: { $ifNull: [{ $arrayElemAt: ['$_la.c', 0] }, 0] } } },
    { $sort: { createdAt: -1 } },
    { $skip: (page - 1) * pageSize },
    { $limit: pageSize },
    { $lookup: { from: 'users', localField: 'authorId', foreignField: '_id', as: 'author' } },
    { $addFields: { author: { $arrayElemAt: ['$author', 0] } } },
    { $lookup: { from: 'projects', localField: 'projectId', foreignField: '_id', as: 'project' } },
    { $addFields: { project: { $arrayElemAt: ['$project', 0] } } },
    {
      $lookup: {
        from: 'reactions',
        let: { pid: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$targetType', TARGET] },
                  { $eq: ['$targetId', '$$pid'] },
                  { $eq: ['$type', 'favorite'] },
                ],
              },
            },
          },
          { $count: 'c' },
        ],
        as: '_fa',
      },
    },
    { $addFields: { favoriteCount: { $ifNull: [{ $arrayElemAt: ['$_fa.c', 0] }, 0] } } },
    {
      // 只投影展示字段；作者只取 username/avatar，绝不带出 grade/studentId/email。
      $project: {
        title: 1, description: 1, authorId: 1, projectId: 1, forkFromId: 1, createdAt: 1,
        likeCount: 1, favoriteCount: 1,
        'author._id': 1, 'author.username': 1, 'author.avatar': 1, 'author.profile.avatar': 1,
        'project.coverUrl': 1,
      },
    },
  ])

  const likedSet = await likedSetFor(viewerId, rows.map((r) => r._id))
  return {
    items: rows.map((r) => postCardDTO(r, likedSet)),
    total,
    page,
    pageSize,
  }
}

/**
 * POST /api/community/users/:id/follow — 关注某创作者（需鉴权，幂等）。
 * - 校验 :id 是真实存在的用户；不能关注自己（400）。
 * - upsert Follow(followerId=req.userId, followeeId=id)；并发重复由唯一索引兜底（11000）。
 * 返回 { success:true, isFollowedByMe:true }。
 */
router.post('/users/:id/follow', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: '用户不存在' })
    }
    if (String(id) === String(req.userId)) {
      return res.status(400).json({ error: '不能关注自己' })
    }
    const target = await User.exists({ _id: id })
    if (!target) return res.status(404).json({ error: '用户不存在' })

    await Follow.updateOne(
      { followerId: req.userId, followeeId: id },
      { $setOnInsert: { followerId: req.userId, followeeId: id } },
      { upsert: true },
    )
    res.json({ success: true, isFollowedByMe: true })
  } catch (error) {
    // 并发双提交触发唯一索引 → 视作已关注（幂等）。
    if (error && error.code === 11000) {
      return res.json({ success: true, isFollowedByMe: true })
    }
    console.error('[follows] Follow error:', error)
    res.status(500).json({ error: '关注失败' })
  }
})

/**
 * DELETE /api/community/users/:id/follow — 取消关注（需鉴权，幂等）。
 * 返回 { success:true, isFollowedByMe:false }。
 */
router.delete('/users/:id/follow', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: '用户不存在' })
    }
    await Follow.deleteOne({ followerId: req.userId, followeeId: id })
    res.json({ success: true, isFollowedByMe: false })
  } catch (error) {
    console.error('[follows] Unfollow error:', error)
    res.status(500).json({ error: '取消关注失败' })
  }
})

/**
 * GET /api/community/users/:id — 创作者主页（公域，可选鉴权）。
 * 返回 { author: AuthorDTO, posts: Paginated<PostCard> }，其中
 *   AuthorDTO = { id, username, avatar?, followerCount, followingCount, isFollowedByMe }
 * posts = 该作者的社区作品（authorId=id），分页、PostCard 形状、likedByMe 针对当前访客。
 * ⚠️ 输出绝不包含 grade/studentId/email。
 */
router.get('/users/:id', optionalAuthenticate, async (req, res) => {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: '用户不存在' })
    }
    // 只取展示字段；显式排除 PII（不 select email/profile.grade/profile.studentId）。
    const user = await User.findById(id).select('username avatar profile.avatar').lean()
    if (!user) return res.status(404).json({ error: '用户不存在' })

    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20))

    const [followerCount, followingCount, isFollowedByMe, posts] = await Promise.all([
      Follow.countDocuments({ followeeId: id }),
      Follow.countDocuments({ followerId: id }),
      req.userId
        ? Follow.exists({ followerId: req.userId, followeeId: id }).then(Boolean)
        : Promise.resolve(false),
      paginatedPostCards({ authorId: new mongoose.Types.ObjectId(id) }, req.userId, page, pageSize),
    ])

    res.json({
      author: {
        id: String(user._id),
        username: user.username,
        avatar: user.profile?.avatar || user.avatar || undefined,
        followerCount,
        followingCount,
        isFollowedByMe,
      },
      posts,
    })
  } catch (error) {
    console.error('[follows] Author error:', error)
    res.status(500).json({ error: '获取创作者主页失败' })
  }
})

/**
 * GET /api/community/feed — 我的关注流（需鉴权）。
 * 拉「我关注的所有创作者」的社区作品，按时间倒序分页（PostCard 形状）。
 * 我没关注任何人 → { items:[], total:0, page, pageSize }。
 */
router.get('/feed', authenticate, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20))

    const followeeIds = await Follow.find({ followerId: req.userId }).distinct('followeeId')
    if (!followeeIds.length) {
      return res.json({ items: [], total: 0, page, pageSize })
    }

    const result = await paginatedPostCards(
      { authorId: { $in: followeeIds } },
      req.userId,
      page,
      pageSize,
    )
    res.json(result)
  } catch (error) {
    console.error('[follows] Feed error:', error)
    res.status(500).json({ error: '获取关注流失败' })
  }
})

module.exports = router
