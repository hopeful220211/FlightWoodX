const express = require('express')
const { optionalAuthenticate } = require('../middleware/auth')
const CommunityPost = require('../models/CommunityPost')
const Reaction = require('../models/Reaction')
const { publicPostStages, countPublicPosts } = require('../lib/communityVisibility')

const router = express.Router()

const TARGET = 'communityPost'
const DAY_MS = 24 * 60 * 60 * 1000
const WEEK_MS = 7 * DAY_MS

// 作者公开信息（只暴露展示用字段）——与 community.js 同口径。
function authorDTO(u) {
  if (!u) return null
  return {
    id: String(u._id),
    username: u.username,
    avatar: u.profile?.avatar || u.avatar || undefined,
  }
}

// 列表卡片 DTO，对齐集成清单 §8 PostCard（含 authorId + favoriteCount）。
function postCardDTO(row, likedSet) {
  return {
    id: String(row._id),
    title: row.title,
    description: row.description || '',
    authorId: String(row.authorId),
    author: authorDTO(row.author),
    projectId: String(row.projectId),
    coverUrl: row.project?.coverUrl || undefined,
    forkFromId: row.forkFromId ? String(row.forkFromId) : undefined,
    likeCount: row.likeCount || 0,
    favoriteCount: row.favoriteCount || 0,
    likedByMe: likedSet ? likedSet.has(String(row._id)) : false,
    createdAt: row.createdAt,
  }
}

// 统计当前用户对一批 post 的点赞集合（一次查询，非 N+1）。
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

/**
 * GET /api/community/trending — 热门榜（公域，可选鉴权）。
 * query: window=day|week|all（默认 all）, page, pageSize（上限 100，默认 20）
 * 返回 Paginated<PostCard>：{ items, total, page, pageSize }
 *
 * 热度 = 时间窗内的点赞数（day=近 24h, week=近 7d, all=不限时间），按窗口点赞数倒序、
 * createdAt 倒序分页。likeCount 取「窗口内点赞数」，favoriteCount 取全量收藏数，
 * likedByMe 用观看者的点赞集合。聚合风格与 community.js 一致。
 * total = 窗口内有 ≥1 个赞的作品数；window=all 时 total = 全部作品数。
 */
router.get('/', optionalAuthenticate, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20))
    const window = ['day', 'week', 'all'].includes(req.query.window) ? req.query.window : 'all'
    const since =
      window === 'day' ? new Date(Date.now() - DAY_MS) : window === 'week' ? new Date(Date.now() - WEEK_MS) : null

    // 窗口内点赞计数的子管道（all 时不加时间过滤）。
    const windowedLikePipeline = [
      {
        $match: {
          $expr: {
            $and: [
              { $eq: ['$targetType', TARGET] },
              { $eq: ['$targetId', '$$pid'] },
              { $eq: ['$type', 'like'] },
              ...(since ? [{ $gte: ['$createdAt', since] }] : []),
            ],
          },
        },
      },
      { $count: 'c' },
    ]

    // total：窗口内有 ≥1 个赞的作品数（window=all 时即全部作品）。
    let total
    if (window === 'all') {
      total = await countPublicPosts()
    } else {
      const distinct = await Reaction.find({
        targetType: TARGET,
        type: 'like',
        createdAt: { $gte: since },
      }).distinct('targetId')
      total = await countPublicPosts({ _id: { $in: distinct } })
    }

    const rows = await CommunityPost.aggregate([
      ...publicPostStages(),
      // 每条 post 的窗口内点赞数
      {
        $lookup: {
          from: 'reactions',
          let: { pid: '$_id' },
          pipeline: windowedLikePipeline,
          as: '_la',
        },
      },
      { $addFields: { likeCount: { $ifNull: [{ $arrayElemAt: ['$_la.c', 0] }, 0] } } },
      // 非 all 窗口：只保留窗口内有热度的作品（与 total 口径一致）
      ...(since ? [{ $match: { likeCount: { $gt: 0 } } }] : []),
      { $sort: { likeCount: -1, createdAt: -1 } },
      { $skip: (page - 1) * pageSize },
      { $limit: pageSize },
      { $lookup: { from: 'users', localField: 'authorId', foreignField: '_id', as: 'author' } },
      { $addFields: { author: { $arrayElemAt: ['$author', 0] } } },
      { $lookup: { from: 'projects', localField: 'projectId', foreignField: '_id', as: 'project' } },
      { $addFields: { project: { $arrayElemAt: ['$project', 0] } } },
      // 收藏数（全量 favorite Reaction 聚合，与列表同口径）
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
        $project: {
          title: 1, description: 1, authorId: 1, projectId: 1, forkFromId: 1, createdAt: 1,
          likeCount: 1, favoriteCount: 1,
          'author._id': 1, 'author.username': 1, 'author.avatar': 1, 'author.profile.avatar': 1,
          'project.coverUrl': 1,
        },
      },
    ])

    const likedSet = await likedSetFor(req.userId, rows.map((r) => r._id))
    const items = rows.map((r) => postCardDTO(r, likedSet))
    res.json({ items, total, page, pageSize })
  } catch (error) {
    console.error('[community] Trending error:', error)
    res.status(500).json({ error: '获取热门作品失败' })
  }
})

module.exports = router
