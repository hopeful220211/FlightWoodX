const express = require('express')
const { authenticate } = require('../middleware/auth')
const Project = require('../models/Project')
const User = require('../models/User')
const { putObject } = require('../lib/storage')

const router = express.Router()

/**
 * GET /api/projects/public
 * 公开作品列表（RFC-014 W6）：匿名访客可读，必须放在 authenticate 之前以绕过 JWT。
 * 只返回 visibility === 'public' 的项目，且严格字段白名单，绝不泄露 ownerId / designData 等私有字段。
 */
router.get('/public', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20))

    const filter = { visibility: 'public' }
    const total = await Project.countDocuments(filter)
    const docs = await Project.find(filter)
      .sort({ createdAt: 1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean()

    // 批量解析作者展示名：一次查出涉及的 User，避免 N+1。
    const ownerIds = [...new Set(docs.map((d) => String(d.ownerId)))]
    const users = ownerIds.length
      ? await User.find({ _id: { $in: ownerIds } })
          .select('username profile.displayName')
          .lean()
      : []
    const nameById = new Map(
      users.map((u) => [String(u._id), (u.profile && u.profile.displayName) || u.username || 'FlightWoodX 用户']),
    )

    const items = docs.map((d) => ({
      id: String(d._id),
      name: d.name,
      coverUrl: d.coverUrl,
      visibility: d.visibility,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      authorDisplayName: nameById.get(String(d.ownerId)) || 'FlightWoodX 用户',
    }))

    res.json({ items, total, page, pageSize })
  } catch (error) {
    console.error('[projects] Public list error:', error)
    res.status(500).json({ error: '获取公开作品列表失败' })
  }
})

// All project routes below require authentication
router.use(authenticate)

/**
 * GET /api/projects
 * List current user's projects in creation order (oldest first)。
 * 用 createdAt 而非 updatedAt 排序：改名/编辑不应改变项目在列表中的位置
 * （第 N 个创建的始终排第 N 位）。
 * RFC-014 W3：统一分页信封 { items, total, page, pageSize }。
 */
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20))

    const filter = { ownerId: req.userId }
    const total = await Project.countDocuments(filter)
    const items = await Project.find(filter)
      .sort({ createdAt: 1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean()

    res.json({ items, total, page, pageSize })
  } catch (error) {
    console.error('[projects] List error:', error)
    res.status(500).json({ error: '获取项目列表失败' })
  }
})

/**
 * GET /api/projects/:id
 * Get a single project by ID (must belong to current user)
 */
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      ownerId: req.userId,
    }).lean()

    if (!project) {
      return res.status(404).json({ error: '项目不存在' })
    }

    res.json({ project })
  } catch (error) {
    console.error('[projects] Get error:', error)
    res.status(500).json({ error: '获取项目失败' })
  }
})

/**
 * POST /api/projects
 * Create a new project
 */
router.post('/', async (req, res) => {
  try {
    const { name, designId, programId, coverUrl, visibility } = req.body

    if (!name) {
      return res.status(400).json({ error: '项目名称不能为空' })
    }

    const project = new Project({
      ownerId: req.userId,
      name,
      designId: designId || undefined,
      programId: programId || undefined,
      coverUrl,
      visibility: visibility || 'private',
    })

    await project.save()
    res.status(201).json({ project: project.toObject() })
  } catch (error) {
    console.error('[projects] Create error:', error)
    res.status(500).json({ error: '创建项目失败' })
  }
})

/**
 * PATCH /api/projects/:id
 * Update a project (must belong to current user)
 */
router.patch('/:id', async (req, res) => {
  try {
    const allowedFields = ['name', 'designId', 'programId', 'coverUrl', 'visibility']
    const updates = {}
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key]
      }
    }

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.userId },
      updates,
      { new: true, runValidators: true },
    ).lean()

    if (!project) {
      return res.status(404).json({ error: '项目不存在' })
    }

    res.json({ project })
  } catch (error) {
    console.error('[projects] Update error:', error)
    res.status(500).json({ error: '更新项目失败' })
  }
})

/**
 * DELETE /api/projects/:id
 * Delete a project (must belong to current user)
 */
router.delete('/:id', async (req, res) => {
  try {
    const result = await Project.deleteOne({
      _id: req.params.id,
      ownerId: req.userId,
    })

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: '项目不存在' })
    }

    res.json({ message: '已删除' })
  } catch (error) {
    console.error('[projects] Delete error:', error)
    res.status(500).json({ error: '删除项目失败' })
  }
})

/**
 * POST /api/projects/:id/cover
 * 上传项目封面（前端把 3D 画面截图传上来）。用 express.raw 直接收图片二进制，
 * 避开 JSON body 体积限制，零额外依赖。存储后把 URL 写进 project.coverUrl。
 */
router.post(
  '/:id/cover',
  express.raw({ type: ['image/png', 'image/webp', 'image/jpeg'], limit: '5mb' }),
  async (req, res) => {
    try {
      if (!req.body || !req.body.length) {
        return res.status(400).json({ error: '未收到图片数据' })
      }
      const project = await Project.findOne({ _id: req.params.id, ownerId: req.userId })
      if (!project) return res.status(404).json({ error: '项目不存在' })

      const contentType = req.headers['content-type'] || 'image/png'
      const url = await putObject('covers', req.body, contentType)

      project.coverUrl = url
      await project.save()

      res.json({ coverUrl: url })
    } catch (error) {
      console.error('[projects] Cover upload error:', error)
      res.status(500).json({ error: '封面上传失败' })
    }
  },
)

module.exports = router
