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
    const { name, params, parts, weightG, status, glbUrl, thumbnailUrl, localId } = req.body

    if (!name) {
      return res.status(400).json({ error: '设计名称不能为空' })
    }

    const design = new DroneDesign({
      ownerId: req.userId,
      name,
      params: params || { hubType: 'default', layer: 'single', armCount: 4, armLengthMm: 100 },
      weightG: weightG || 0,
      status: status || 'draft',
      glbUrl,
      thumbnailUrl,
    })

    // Store parts array as a mixed field for flexibility
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
 * PATCH /api/drone-designs/:id
 * Update an existing drone design.
 */
router.patch('/:id', async (req, res) => {
  try {
    const allowedFields = ['name', 'params', 'parts', 'weightG', 'status', 'glbUrl', 'thumbnailUrl']
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
