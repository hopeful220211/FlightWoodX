const express = require('express')
const mongoose = require('mongoose')
const { authenticate, optionalAuthenticate } = require('../middleware/auth')
const Collection = require('../models/Collection')
const CollectionItem = require('../models/CollectionItem')
const CommunityPost = require('../models/CommunityPost')
const Reaction = require('../models/Reaction')

const router = express.Router()

const TARGET = 'communityPost'

// 作者公开信息（只暴露展示用字段；与 community.js 同口径）
function authorDTO(u) {
  if (!u) return null
  return {
    id: String(u._id),
    username: u.username,
    avatar: u.profile?.avatar || u.avatar || undefined,
  }
}

// 合集卡片 DTO（不含条目，列表用）。coverUrl 由调用方解析后传入。
function collectionDTO(doc, { itemCount, coverUrl }) {
  return {
    id: String(doc._id),
    name: doc.name,
    description: doc.description || '',
    coverUrl: coverUrl || undefined,
    itemCount: itemCount || 0,
    isPublic: doc.isPublic,
    createdAt: doc.createdAt,
  }
}

// 作品卡片 DTO（合集详情条目；形状对齐集成清单 §8 PostCard，与 community.js postCardDTO 一致）
function postCardDTO(row, likedSet) {
  return {
    id: String(row._id),
    title: row.title,
    authorId: String(row.authorId),
    author: authorDTO(row.author),
    projectId: String(row.projectId),
    coverUrl: row.project?.coverUrl || undefined,
    likeCount: row.likeCount || 0,
    favoriteCount: row.favoriteCount || 0,
    likedByMe: likedSet ? likedSet.has(String(row._id)) : false,
    createdAt: row.createdAt,
  }
}

// 当前用户对一批 post 的点赞集合（一次查询，非 N+1）
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

// 把一个合集的条目解析为 PostCard[]（join CommunityPost + 作者 + 项目封面，聚合点赞/收藏数）。
// 复用 community.js 的 /posts 聚合风格；按加入时间倒序（最近收藏在前）。
async function itemsForCollection(collectionId, viewerId) {
  const links = await CollectionItem.find({ collectionId }).sort({ addedAt: -1 }).lean()
  const postIds = links.map((l) => l.postId)
  if (!postIds.length) return []

  const rows = await CommunityPost.aggregate([
    { $match: { _id: { $in: postIds } } },
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
      $project: {
        title: 1, authorId: 1, projectId: 1, createdAt: 1,
        likeCount: 1, favoriteCount: 1,
        'author._id': 1, 'author.username': 1, 'author.avatar': 1, 'author.profile.avatar': 1,
        'project.coverUrl': 1,
      },
    },
  ])

  // 按 links 的加入顺序排序（aggregate 的 $in 不保证顺序）
  const byId = new Map(rows.map((r) => [String(r._id), r]))
  const ordered = postIds.map((pid) => byId.get(String(pid))).filter(Boolean)
  const likedSet = await likedSetFor(viewerId, ordered.map((r) => r._id))
  return ordered.map((r) => postCardDTO(r, likedSet))
}

// 解析合集展示封面：优先 coverPostId 指定作品的项目封面，否则取最近加入条目的项目封面，否则 undefined。
async function resolveCoverUrl(collection) {
  let coverPostId = collection.coverPostId
  if (!coverPostId) {
    const latest = await CollectionItem.findOne({ collectionId: collection._id })
      .sort({ addedAt: -1 })
      .lean()
    if (latest) coverPostId = latest.postId
  }
  if (!coverPostId) return undefined
  const post = await CommunityPost.findById(coverPostId)
    .populate('projectId', 'coverUrl')
    .lean()
  return post?.projectId?.coverUrl || undefined
}

/**
 * GET / — 我的合集列表（需鉴权）。
 * 每个合集带 itemCount + 解析后的 coverUrl。返回 { items: CollectionDTO[] }。
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const collections = await Collection.find({ ownerId: req.userId })
      .sort({ updatedAt: -1 })
      .lean()

    const items = await Promise.all(
      collections.map(async (c) => {
        const itemCount = await CollectionItem.countDocuments({ collectionId: c._id })
        const coverUrl = await resolveCoverUrl(c)
        return collectionDTO(c, { itemCount, coverUrl })
      }),
    )

    res.json({ items })
  } catch (error) {
    console.error('[collections] List error:', error)
    res.status(500).json({ error: '获取合集失败' })
  }
})

/**
 * GET /memberships?postId= — 我的哪些合集已包含某作品（需鉴权）。
 * 供「收藏到合集」弹窗一次性回填勾选态，避免逐合集拉详情的 N 次请求。
 * 返回 { collectionIds: string[] }（只含本人拥有且包含该作品的合集 id）。
 */
router.get('/memberships', authenticate, async (req, res) => {
  try {
    const { postId } = req.query
    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ error: '缺少有效的 postId' })
    }
    const myCollectionIds = await Collection.find({ ownerId: req.userId }).distinct('_id')
    if (!myCollectionIds.length) return res.json({ collectionIds: [] })

    const links = await CollectionItem.find({
      collectionId: { $in: myCollectionIds },
      postId,
    }).distinct('collectionId')

    res.json({ collectionIds: links.map(String) })
  } catch (error) {
    console.error('[collections] Memberships error:', error)
    res.status(500).json({ error: '获取收藏状态失败' })
  }
})

/**
 * POST / — 新建合集（需鉴权）。body: { name(必填), description?, isPublic? }
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description, isPublic } = req.body
    const trimmed = (name || '').trim()
    if (!trimmed) return res.status(400).json({ error: '请填写合集名称' })

    const doc = await Collection.create({
      ownerId: req.userId,
      name: trimmed,
      description: (description && String(description).trim()) || '',
      isPublic: typeof isPublic === 'boolean' ? isPublic : true,
    })

    res.status(201).json({ collection: collectionDTO(doc, { itemCount: 0, coverUrl: undefined }) })
  } catch (error) {
    console.error('[collections] Create error:', error)
    res.status(500).json({ error: '创建合集失败' })
  }
})

/**
 * PATCH /:id — 更新合集（仅作者；非作者一律 404，不泄露存在性）。
 * body: { name?, description?, isPublic?, coverPostId? }
 */
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({ error: '合集不存在' })

    const collection = await Collection.findById(id)
    if (!collection || String(collection.ownerId) !== String(req.userId)) {
      return res.status(404).json({ error: '合集不存在' })
    }

    const { name, description, isPublic, coverPostId } = req.body
    if (typeof name === 'string') {
      const trimmed = name.trim()
      if (!trimmed) return res.status(400).json({ error: '合集名称不能为空' })
      collection.name = trimmed
    }
    if (typeof description === 'string') collection.description = description.trim()
    if (typeof isPublic === 'boolean') collection.isPublic = isPublic
    if (coverPostId !== undefined) {
      if (coverPostId === null || coverPostId === '') {
        collection.coverPostId = undefined
      } else if (mongoose.Types.ObjectId.isValid(coverPostId)) {
        collection.coverPostId = coverPostId
      }
    }
    await collection.save()

    const itemCount = await CollectionItem.countDocuments({ collectionId: collection._id })
    const coverUrl = await resolveCoverUrl(collection)
    res.json({ collection: collectionDTO(collection, { itemCount, coverUrl }) })
  } catch (error) {
    console.error('[collections] Update error:', error)
    res.status(500).json({ error: '更新合集失败' })
  }
})

/**
 * DELETE /:id — 删除合集及其全部条目（仅作者）。
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({ error: '合集不存在' })

    const collection = await Collection.findById(id)
    if (!collection || String(collection.ownerId) !== String(req.userId)) {
      return res.status(404).json({ error: '合集不存在' })
    }

    await CollectionItem.deleteMany({ collectionId: id })
    await Collection.deleteOne({ _id: id })
    res.json({ success: true })
  } catch (error) {
    console.error('[collections] Delete error:', error)
    res.status(500).json({ error: '删除合集失败' })
  }
})

/**
 * GET /:id — 合集详情（可选鉴权）。
 * 公开合集任何人可看；私有合集仅作者本人可看，否则 404（不泄露存在性）。
 * 返回 CollectionDetail = CollectionDTO + { items: PostCard[] }。
 */
router.get('/:id', optionalAuthenticate, async (req, res) => {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({ error: '合集不存在' })

    const collection = await Collection.findById(id).lean()
    if (!collection) return res.status(404).json({ error: '合集不存在' })

    const isOwner = req.userId && String(collection.ownerId) === String(req.userId)
    if (!collection.isPublic && !isOwner) {
      return res.status(404).json({ error: '合集不存在' })
    }

    const items = await itemsForCollection(collection._id, req.userId)
    const coverUrl = await resolveCoverUrl(collection)
    res.json({
      collection: {
        ...collectionDTO(collection, { itemCount: items.length, coverUrl }),
        ownerId: String(collection.ownerId),
        items,
      },
    })
  } catch (error) {
    console.error('[collections] Detail error:', error)
    res.status(500).json({ error: '获取合集详情失败' })
  }
})

/**
 * POST /:id/items — 把作品加入合集（仅作者；幂等 upsert）。body: { postId }
 */
router.post('/:id/items', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    const { postId } = req.body
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({ error: '合集不存在' })
    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ error: '缺少有效的 postId' })
    }

    const collection = await Collection.findById(id)
    if (!collection || String(collection.ownerId) !== String(req.userId)) {
      return res.status(404).json({ error: '合集不存在' })
    }

    const postExists = await CommunityPost.exists({ _id: postId })
    if (!postExists) return res.status(404).json({ error: '作品不存在' })

    // 幂等加入：唯一索引 (collectionId, postId) + upsert；并发重复触发 11000 → 视作已加入。
    await CollectionItem.updateOne(
      { collectionId: id, postId },
      { $setOnInsert: { collectionId: id, postId } },
      { upsert: true },
    )
    // 触碰合集 updatedAt，便于「我的合集」按最近活跃排序
    await Collection.updateOne({ _id: id }, { $set: { updatedAt: new Date() } })

    res.json({ success: true })
  } catch (error) {
    if (error && error.code === 11000) {
      return res.json({ success: true })
    }
    console.error('[collections] Add item error:', error)
    res.status(500).json({ error: '加入合集失败' })
  }
})

/**
 * DELETE /:id/items/:postId — 从合集移除作品（仅作者；幂等）。
 */
router.delete('/:id/items/:postId', authenticate, async (req, res) => {
  try {
    const { id, postId } = req.params
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(404).json({ error: '合集不存在' })
    }

    const collection = await Collection.findById(id)
    if (!collection || String(collection.ownerId) !== String(req.userId)) {
      return res.status(404).json({ error: '合集不存在' })
    }

    await CollectionItem.deleteOne({ collectionId: id, postId })
    res.json({ success: true })
  } catch (error) {
    console.error('[collections] Remove item error:', error)
    res.status(500).json({ error: '移出合集失败' })
  }
})

module.exports = router
