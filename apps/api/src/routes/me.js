const express = require('express')
const { authenticate } = require('../middleware/auth')
const User = require('../models/User')
const Project = require('../models/Project')

const router = express.Router()
router.use(authenticate)

// 课程总数（学习中心 12 课时）。后续课程入库后可改为动态。
const TOTAL_LESSONS = 12

/**
 * GET /api/me/stats — 当前用户的成就聚合（需求二）。
 * projectCount 实时查 Project；时长由埋点累计；课时数取 completedLessons 长度。
 */
router.get('/stats', async (req, res) => {
  try {
    const [user, projectCount] = await Promise.all([
      User.findById(req.userId).select('studySeconds designSeconds completedLessons flightCount'),
      Project.countDocuments({ ownerId: req.userId }),
    ])
    if (!user) return res.status(404).json({ error: '用户不存在' })

    res.json({
      projectCount,
      studyMinutes: Math.round((user.studySeconds || 0) / 60),
      designMinutes: Math.round((user.designSeconds || 0) / 60),
      lessonsCompleted: (user.completedLessons || []).length,
      totalLessons: TOTAL_LESSONS,
      flightCount: user.flightCount || 0,
    })
  } catch (error) {
    console.error('[me] Stats error:', error)
    res.status(500).json({ error: '获取统计失败' })
  }
})

/**
 * POST /api/me/activity — 上报活跃时长 { type: 'study'|'design', seconds }。
 * 前端在学习中心/设计工作台定时上报，后端 $inc 累加。
 */
router.post('/activity', async (req, res) => {
  try {
    const { type, seconds } = req.body
    const sec = Number(seconds)
    if (!['study', 'design'].includes(type)) {
      return res.status(400).json({ error: 'type 必须是 study 或 design' })
    }
    // 单次上报上限 1 小时，防异常值刷爆统计
    if (!Number.isFinite(sec) || sec <= 0 || sec > 3600) {
      return res.status(400).json({ error: 'seconds 不合法（应为 1–3600）' })
    }
    const field = type === 'study' ? 'studySeconds' : 'designSeconds'
    const user = await User.findByIdAndUpdate(
      req.userId,
      { $inc: { [field]: Math.round(sec) } },
      { new: true },
    ).select('studySeconds designSeconds')
    if (!user) return res.status(404).json({ error: '用户不存在' })

    res.json({
      studyMinutes: Math.round((user.studySeconds || 0) / 60),
      designMinutes: Math.round((user.designSeconds || 0) / 60),
    })
  } catch (error) {
    console.error('[me] Activity error:', error)
    res.status(500).json({ error: '上报失败' })
  }
})

/**
 * POST /api/me/lessons/complete — 标记课时完成 { lessonId }。
 * $addToSet 天然去重 + 幂等（重复完成同一课时不重复计数）。
 */
router.post('/lessons/complete', async (req, res) => {
  try {
    const { lessonId } = req.body
    if (!lessonId || typeof lessonId !== 'string') {
      return res.status(400).json({ error: '缺少 lessonId' })
    }
    const user = await User.findByIdAndUpdate(
      req.userId,
      { $addToSet: { completedLessons: lessonId } },
      { new: true },
    ).select('completedLessons')
    if (!user) return res.status(404).json({ error: '用户不存在' })

    res.json({ lessonsCompleted: user.completedLessons.length })
  } catch (error) {
    console.error('[me] Lesson complete error:', error)
    res.status(500).json({ error: '记录课时失败' })
  }
})

module.exports = router
