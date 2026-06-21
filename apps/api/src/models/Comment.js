const mongoose = require('mongoose')

/**
 * Comment — 评论，对齐 @fwx/shared 的 `Comment` 契约（RFC-016 社交原语）。
 *
 * 通用结构：可挂在作品/项目/零件/评论上（targetType + targetId）。
 * 社区作品的评论 targetType = 'communityPost'。
 *
 * moderation（审核状态）只在服务端流转，**不向客户端暴露**：
 *  - 默认 'approved'：青少年产品默认即时可见，体验顺；被举报后由 reports 路由降级为 'pending' 实现快速下架。
 *  - 列表接口只返回 'approved'，故被举报/被打回的评论自动从公开列表消失。
 */
const CommentSchema = new mongoose.Schema(
  {
    targetType: {
      type: String,
      enum: ['project', 'communityPost', 'part', 'comment'],
      required: true,
    },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true, maxlength: 300 },
    moderation: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'rejected'],
      default: 'approved',
    },
  },
  { timestamps: true },
)

// 列表查询主索引：按目标 + 审核态取，按时间倒序分页。
CommentSchema.index({ targetType: 1, targetId: 1, moderation: 1, createdAt: -1 })
// 限流辅助索引：按作者 + 时间窗口数最近评论。
CommentSchema.index({ authorId: 1, createdAt: -1 })

module.exports = mongoose.model('Comment', CommentSchema)
