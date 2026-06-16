const mongoose = require('mongoose')

// 社区作品。对齐 @fwx/shared 的 CommunityPost 类型（RFC-011 §2.4）。
// forkFromId 记录 fork 来源（原创则为空），用于网络效应与溯源。
const CommunityPostSchema = new mongoose.Schema(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    // ⚠️ 裸计数字段保留以兼容历史数据，但社区 P0 起**不读不写**：
    // 点赞口径统一走 Reaction（用户级、防重复、可排行，RFC-016 §2.2 / Codex 评审）。
    likes: { type: Number, default: 0, min: 0 },
    forkFromId: { type: mongoose.Schema.Types.ObjectId, ref: 'CommunityPost' },
  },
  { timestamps: true },
)

// 发布幂等：同一作者同一 project 只能有一条社区作品（find-or-create + 此唯一索引兜底防并发重复）。
CommunityPostSchema.index({ authorId: 1, projectId: 1 }, { unique: true })

module.exports = mongoose.model('CommunityPost', CommunityPostSchema)
