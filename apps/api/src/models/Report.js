const mongoose = require('mongoose')

/**
 * Report — 举报，对齐 @fwx/shared 的 `Report` 契约（RFC-016 社交原语）。
 *
 * 青少年安全：任何用户都可举报评论；首条举报即把目标评论降级为 'pending'（快速下架，
 * 从公开列表消失），再交人工/后续审核处理。
 *
 * 唯一索引 (reporterId,targetType,targetId) 保证「同一用户对同一目标只产生一条举报」→ 举报幂等。
 */
const ReportSchema = new mongoose.Schema(
  {
    targetType: {
      type: String,
      enum: ['project', 'communityPost', 'part', 'comment'],
      required: true,
    },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

// 防重复 + 幂等：一个用户对一个目标只能举报一次。
ReportSchema.index({ reporterId: 1, targetType: 1, targetId: 1 }, { unique: true })

module.exports = mongoose.model('Report', ReportSchema)
