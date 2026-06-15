const express = require('express')
const { authenticate } = require('../middleware/auth')
const DroneDesign = require('../models/DroneDesign')

const router = express.Router()

// All drone design routes require authentication
router.use(authenticate)

/**
 * GET /api/drone-designs
 * List current user's drone designs (newest first)
 */
router.get('/', async (req, res) => {
  try {
    const designs = await DroneDesign.find({ ownerId: req.userId })
      .sort({ updatedAt: -1 })
      .lean()

    res.json({ designs })
  } catch (error) {
    console.error('[drone-designs] List error:', error)
    res.status(500).json({ error: '获取设计列表失败' })
  }
})

/**
 * GET /api/drone-designs/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const design = await DroneDesign.findOne({
      _id: req.params.id,
      ownerId: req.userId,
    }).lean()

    if (!design) {
      return res.status(404).json({ error: '设计不存在' })
    }

    res.json({ design })
  } catch (error) {
    console.error('[drone-designs] Get error:', error)
    res.status(500).json({ error: '获取设计失败' })
  }
})

/**
 * POST /api/drone-designs
 * Create a new drone design. Accepts the full parametric body params
 * and the parts list from the client-side design store.
 */
router.post('/', async (req, res) => {
  try {
    const { name, params, parts, weightG, status, glbUrl, thumbnailUrl, localId, designData } = req.body

    if (!name) {
      return res.status(400).json({ error: '设计名称不能为空' })
    }

    const design = new DroneDesign({
      ownerId: req.userId,
      name,
      params: params || undefined, // RFC-013：params 可选，新设计走 designData
      weightG: weightG || 0,
      status: status || 'draft',
      glbUrl,
      thumbnailUrl,
    })

    // RFC-013 方案 B：前端 Design 完整快照（后端原样存取）
    if (designData !== undefined) {
      design.set('designData', designData)
    }
    // Store parts array as a mixed field for flexibility（向后兼容）
    if (parts) {
      design.set('parts', parts)
    }
    // Store localId so the client can map server ↔ local
    if (localId) {
      design.set('localId', localId)
    }

    await design.save()
    res.status(201).json({ design: design.toObject() })
  } catch (error) {
    console.error('[drone-designs] Create error:', error)
    res.status(500).json({ error: '创建设计失败' })
  }
})

/**
 * PUT /api/drone-designs
 * 幂等 upsert：按 (ownerId, localId) 创建或更新（RFC-013）。
 * 前端无论保存多少次、是否重试，同一 localId 只对应一条记录 —— 抗重复、抗弱网重试。
 */
router.put('/', async (req, res) => {
  try {
    const { localId, name, designData, weightG, thumbnailUrl, status } = req.body
    if (!localId) return res.status(400).json({ error: '缺少 localId' })
    if (!name) return res.status(400).json({ error: '设计名称不能为空' })

    const update = {
      ownerId: req.userId,
      localId,
      name,
      designData: designData ?? null,
      weightG: weightG ?? 0,
    }
    if (thumbnailUrl !== undefined) update.thumbnailUrl = thumbnailUrl
    if (status !== undefined) update.status = status

    const design = await DroneDesign.findOneAndUpdate(
      { ownerId: req.userId, localId },
      { $set: update },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    ).lean()

    res.json({ design })
  } catch (error) {
    // 并发下唯一索引可能抛 E11000：再读一次返回既有记录，保持幂等
    if (error && error.code === 11000) {
      const existing = await DroneDesign.findOne({ ownerId: req.userId, localId: req.body.localId }).lean()
      if (existing) return res.json({ design: existing })
    }
    console.error('[drone-designs] Upsert error:', error)
    res.status(500).json({ error: '保存设计失败' })
  }
})

/**
 * PATCH /api/drone-designs/:id
 * Update an existing drone design.
 */
router.patch('/:id', async (req, res) => {
  try {
    const allowedFields = ['name', 'params', 'parts', 'designData', 'weightG', 'status', 'glbUrl', 'thumbnailUrl']
    const updates = {}
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key]
      }
    }

    const design = await DroneDesign.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.userId },
      updates,
      { new: true, runValidators: true },
    ).lean()

    if (!design) {
      return res.status(404).json({ error: '设计不存在' })
    }

    res.json({ design })
  } catch (error) {
    console.error('[drone-designs] Update error:', error)
    res.status(500).json({ error: '更新设计失败' })
  }
})

/**
 * DELETE /api/drone-designs/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const result = await DroneDesign.deleteOne({
      _id: req.params.id,
      ownerId: req.userId,
    })

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: '设计不存在' })
    }

    res.json({ message: '已删除' })
  } catch (error) {
    console.error('[drone-designs] Delete error:', error)
    res.status(500).json({ error: '删除设计失败' })
  }
})

module.exports = router
