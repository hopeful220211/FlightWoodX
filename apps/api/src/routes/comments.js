const express = require('express')
const mongoose = require('mongoose')
const { authenticate, optionalAuthenticate } = require('../middleware/auth')
const Comment = require('../models/Comment')
const CommunityPost = require('../models/CommunityPost')

const router = express.Router()

const TARGET = 'communityPost'

// ============ 青少年安全：内容校验 ============
// 联系方式 / 引流外链一律拦截（防止成年人通过评论区私下联系学生）。
const URL_RE = /(https?:\/\/|www\.)\S+/i
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/
const PHONE_RE = /(?<!\d)1[3-9]\d{9}(?!\d)/ // 中国大陆手机号
// QQ / 微信 / vx 等社交账号引流（关键词后跟一串数字/字母）
const SOCIAL_RE = /(qq|扣扣|企鹅|微信|威信|vx|v信|薇信|weixin|wechat|加我)\s*[:：]?\s*[a-z0-9_-]{5,}/i
// 域名兜底（example.com / .cn 之类，URL_RE 之外的裸域名）
const DOMAIN_RE = /[a-z0-9-]+\.(com|cn|net|org|cc|top|xyz|vip|shop|me|io)\b/i
const ZERO_WIDTH_RE = /[\u200B-\u200D\u2060\uFEFF]/g

// 规范化：全角→半角(NFKC) + 去零宽字符，破解全角/零宽绕过
function normalizeForSafety(s) {
  return s.normalize('NFKC').replace(ZERO_WIDTH_RE, '')
}

// 轻量脏话/辱骂黑名单（命中即拒，给孩子一个干净的社区）。保持简短、显见即可。
const PROFANITY = [
  '傻逼', '煞笔', '沙比', '傻x', '草泥马', '卧槽', '我操', '滚蛋',
  '废物', '智障', '脑残', '白痴', '去死', '混蛋', '王八蛋', '贱人',
]

// 限流阈值
const RATE_WINDOW_MS = 60 * 1000 // 60 秒内最多 5 条
const RATE_MAX = 5
const DUP_WINDOW_MS = 5 * 60 * 1000 // 5 分钟内不得重复同一内容

// 评论对外 DTO（绝不暴露 moderation 等内部字段）
function commentDTO(row) {
  const author = row.authorId
  return {
    id: String(row._id),
    authorId: author && author._id ? String(author._id) : String(row.authorId),
    author:
      author && author._id
        ? {
            id: String(author._id),
            username: author.username,
            avatar: author.profile?.avatar || author.avatar || undefined,
          }
        : null,
    body: row.body,
    createdAt: row.createdAt,
  }
}

/**
 * 校验评论正文。返回错误提示（中文，对孩子友好）或 null（通过）。
 * 注意：调用方应先 trim。
 */
function validateBody(body) {
  if (!body) return '评论不能为空哦'
  if (body.length > 300) return '评论太长啦，最多 300 个字'
  // 规范形（全角→半角、去零宽）+ 紧凑形（去空格/常见分隔符），
  // 双形检测破解 "138 0013 8000" / "微 信：xxx" / 全角/零宽 等拆分混淆。
  const lower = normalizeForSafety(body).toLowerCase()
  const compact = lower.replace(/[\s\-_~·.，。、|/\\]+/g, '')
  if (URL_RE.test(lower) || EMAIL_RE.test(lower) || DOMAIN_RE.test(lower)) return '评论里不能放网址或邮箱哦'
  if (PHONE_RE.test(lower) || PHONE_RE.test(compact)) return '为了安全，评论里不能留手机号哦'
  if (SOCIAL_RE.test(lower) || SOCIAL_RE.test(compact)) return '为了安全，评论里不能留 QQ / 微信哦'
  if (PROFANITY.some((w) => lower.includes(w) || compact.includes(w))) return '请友善发言，换个说法再试试吧'
  return null
}

/**
 * GET /api/community/posts/:id/comments — 某作品的评论列表（公域，可选鉴权）。
 * 只返回 moderation='approved'，被举报/打回的不出现在公开列表。
 * 返回 Paginated<CommentDTO>：{ items, total, page, pageSize }
 */
router.get('/posts/:id/comments', optionalAuthenticate, async (req, res) => {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: '作品不存在' })
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20))

    const filter = { targetType: TARGET, targetId: id, moderation: 'approved' }
    const total = await Comment.countDocuments(filter)
    const rows = await Comment.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate('authorId', 'username avatar profile.avatar')
      .lean()

    res.json({ items: rows.map(commentDTO), total, page, pageSize })
  } catch (error) {
    console.error('[community] List comments error:', error)
    res.status(500).json({ error: '获取评论失败' })
  }
})

/**
 * POST /api/community/posts/:id/comments — 发表评论（需鉴权）。
 * body: { body }
 * 青少年安全：内容校验（外链/联系方式/脏话）+ 简单限流（60s 内 ≤5 条、5min 内不得重复）。
 */
router.post('/posts/:id/comments', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: '作品不存在' })
    }
    const exists = await CommunityPost.exists({ _id: id })
    if (!exists) return res.status(404).json({ error: '作品不存在' })

    const body = (typeof req.body?.body === 'string' ? req.body.body : '').trim()
    const invalid = validateBody(body)
    if (invalid) return res.status(400).json({ error: invalid })

    // 限流：60s 内本人评论数
    const since = new Date(Date.now() - RATE_WINDOW_MS)
    const recentCount = await Comment.countDocuments({
      authorId: req.userId,
      createdAt: { $gte: since },
    })
    if (recentCount >= RATE_MAX) {
      return res.status(429).json({ error: '发评论太快啦，歇一会儿再来吧' })
    }
    // 防刷屏：5min 内同一内容
    const dupSince = new Date(Date.now() - DUP_WINDOW_MS)
    const dup = await Comment.exists({
      authorId: req.userId,
      body,
      createdAt: { $gte: dupSince },
    })
    if (dup) return res.status(429).json({ error: '刚刚已经说过同样的话啦' })

    const created = await Comment.create({
      targetType: TARGET,
      targetId: id,
      authorId: req.userId,
      body,
      moderation: 'approved',
    })
    const populated = await Comment.findById(created._id)
      .populate('authorId', 'username avatar profile.avatar')
      .lean()

    res.status(201).json({ comment: commentDTO(populated) })
  } catch (error) {
    console.error('[community] Create comment error:', error)
    res.status(500).json({ error: '评论失败' })
  }
})

/**
 * DELETE /api/community/comments/:id — 删除评论（需鉴权，仅作者本人）。
 */
router.delete('/comments/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: '评论不存在' })
    }
    const comment = await Comment.findById(id)
    if (!comment) return res.status(404).json({ error: '评论不存在' })
    if (String(comment.authorId) !== String(req.userId)) {
      return res.status(403).json({ error: '只能删除自己的评论' })
    }

    await comment.deleteOne()
    res.json({ success: true })
  } catch (error) {
    console.error('[community] Delete comment error:', error)
    res.status(500).json({ error: '删除评论失败' })
  }
})

module.exports = router
