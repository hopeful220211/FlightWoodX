const express = require('express')
const mongoose = require('mongoose')
const { authenticate } = require('../middleware/auth')
const Report = require('../models/Report')
const Comment = require('../models/Comment')

const router = express.Router()

// 举报理由固定枚举（与前端选项一一对应）
const REASONS = ['垃圾广告', '不友善', '涉及隐私', '其他']

/**
 * POST /api/community/reports — 举报评论（需鉴权）。
 * body: { targetType: 'comment', targetId, reason }
 *
 * 举报幂等（同一用户对同一评论只记一条）。公开举报接口只记录 Report；
 * 评论可见性只能由后续管理员审核流程修改，普通用户不能直接下架他人评论。
 */
router.post('/reports', authenticate, async (req, res) => {
  try {
    const { targetType, targetId, reason } = req.body || {}

    if (targetType !== 'comment') {
      return res.status(400).json({ error: '暂只支持举报评论' })
    }
    if (!REASONS.includes(reason)) {
      return res.status(400).json({ error: '请选择有效的举报理由' })
    }
    if (!targetId || !mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({ error: '举报对象无效' })
    }

    const commentExists = await Comment.exists({ _id: targetId })
    if (!commentExists) return res.status(404).json({ error: '评论不存在' })

    // 幂等 upsert：同一用户对同一评论重复举报视作已举报。
    try {
      await Report.updateOne(
        { reporterId: req.userId, targetType: 'comment', targetId },
        { $setOnInsert: { reporterId: req.userId, targetType: 'comment', targetId, reason } },
        { upsert: true },
      )
    } catch (e) {
      // 并发重复举报触发唯一索引 → 视作已举报，不报错。
      if (!e || e.code !== 11000) throw e
    }

    res.json({ success: true })
  } catch (error) {
    console.error('[community] Report error:', error)
    res.status(500).json({ error: '举报失败' })
  }
})

module.exports = router
