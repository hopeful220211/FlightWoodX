const express = require('express')
const { authenticate } = require('../middleware/auth')
const Project = require('../models/Project')
const User = require('../models/User')
const { putObject, bestEffortDeleteObject } = require('../lib/storage')
const { withStringId } = require('../lib/documentResponse')
const { validateProjectReferences } = require('../lib/projectReferences')
const { publicProjectStages } = require('../lib/communityVisibility')

const router = express.Router()

// Keep Project covers distinct from DroneDesign and legacy unscoped covers.
// The namespace is derived only from a stored, ownership-checked document.
function coverPrefix(project) {
  return `covers/projects/${String(project._id)}`
}

function coverUploadLimit(req, res, next) {
  return req.app.locals.rateLimits.coverUpload(req, res, next)
}

function parseCoverBody(req, res, next) {
  return express.raw({
    type: ['image/png', 'image/webp', 'image/jpeg'],
    limit: req.app.locals.config.storage.maxCoverBytes,
  })(req, res, next)
}

/**
 * GET /api/projects/public
 * 公开作品列表（RFC-014 W6）：匿名访客可读，必须放在 authenticate 之前以绕过 JWT。
 * 只返回 visibility === 'public' 的项目，且严格字段白名单，绝不泄露 ownerId / designData 等私有字段。
 */
router.get('/public', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20))

    const [counts, docs] = await Promise.all([
      Project.aggregate([...publicProjectStages(), { $count: 'total' }]),
      Project.aggregate([
        ...publicProjectStages(), { $sort: { createdAt: 1, _id: 1 } },
        { $skip: (page - 1) * pageSize }, { $limit: pageSize },
      ]),
    ])
    const total = counts[0]?.total || 0

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
      visibility: 'public',
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
      .sort({ createdAt: 1, _id: 1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean()

    res.json({ items: items.map(withStringId), total, page, pageSize })
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

    res.json({ project: withStringId(project) })
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

    const references = {
      designId,
      programId,
    }
    const referenceCheck = await validateProjectReferences(references, req.userId)
    if (!referenceCheck.ok) return res.status(400).json({ error: referenceCheck.error })

    const project = new Project({
      ownerId: req.userId,
      name,
      designId: designId ?? undefined,
      programId: programId ?? undefined,
      coverUrl,
      visibility: visibility || 'private',
    })

    await project.save()
    res.status(201).json({ project: withStringId(project) })
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

    const referenceCheck = await validateProjectReferences(updates, req.userId)
    if (!referenceCheck.ok) return res.status(400).json({ error: referenceCheck.error })

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.userId },
      updates,
      { new: true, runValidators: true },
    ).lean()

    if (!project) {
      return res.status(404).json({ error: '项目不存在' })
    }

    res.json({ project: withStringId(project) })
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
    const project = await Project.findOneAndDelete({
      _id: req.params.id,
      ownerId: req.userId,
    })

    if (!project) {
      return res.status(404).json({ error: '项目不存在' })
    }

    await bestEffortDeleteObject(project.coverUrl, req.app.locals.config, coverPrefix(project))

    res.json({ message: '已删除' })
  } catch (error) {
    console.error('[projects] Delete failed')
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
  coverUploadLimit,
  parseCoverBody,
  async (req, res) => {
    let uploadedUrl = null
    let ownedPrefix = null
    try {
      if (!req.body || !req.body.length) {
        return res.status(400).json({ error: '未收到图片数据' })
      }
      const project = await Project.findOne({ _id: req.params.id, ownerId: req.userId })
      if (!project) return res.status(404).json({ error: '项目不存在' })

      const previousUrl = project.coverUrl
      const contentType = req.headers['content-type'] || 'image/png'
      ownedPrefix = coverPrefix(project)
      uploadedUrl = await putObject(ownedPrefix, req.body, contentType, req.app.locals.config)

      project.coverUrl = uploadedUrl
      await project.save()
      await bestEffortDeleteObject(previousUrl, req.app.locals.config, ownedPrefix)

      res.json({ coverUrl: uploadedUrl })
    } catch (error) {
      if (uploadedUrl) await bestEffortDeleteObject(uploadedUrl, req.app.locals.config, ownedPrefix)
      console.error('[projects] Cover upload failed')
      if (error.status === 413) return res.status(413).json({ error: '上传内容过大' })
      res.status(500).json({ error: '封面上传失败' })
    }
  },
)

module.exports = router
