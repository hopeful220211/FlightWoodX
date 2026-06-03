const express = require('express')
const { authenticate } = require('../middleware/auth')
const Project = require('../models/Project')

const router = express.Router()

// All project routes require authentication
router.use(authenticate)

/**
 * GET /api/projects
 * List current user's projects (newest first)
 */
router.get('/', async (req, res) => {
  try {
    const projects = await Project.find({ ownerId: req.userId })
      .sort({ updatedAt: -1 })
      .lean()

    res.json({ projects })
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

module.exports = router
