const mongoose = require('mongoose')

/**
 * Reaction — 用户级社交反应（点赞/收藏），对齐 @fwx/shared 的 `Reaction` 契约（RFC-016 §2.2）。
 *
 * 取代 CommunityPost.likes 裸计数：用户级、可取消、可防重复、可排行。
 * 唯一索引 (userId,targetType,targetId,type) 保证「同一用户对同一目标同一类型只有一条」→ 点赞幂等。
 */
const ReactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: {
      type: String,
      enum: ['project', 'communityPost', 'part', 'comment'],
      required: true,
    },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    type: { type: String, enum: ['like', 'favorite'], default: 'like', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

// 防重复 + 幂等
ReactionSchema.index({ userId: 1, targetType: 1, targetId: 1, type: 1 }, { unique: true })
// 计数 / likedByMe 聚合辅助索引
ReactionSchema.index({ targetType: 1, targetId: 1, type: 1 })

module.exports = mongoose.model('Reaction', ReactionSchema)
