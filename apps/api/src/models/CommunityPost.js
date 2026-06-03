const mongoose = require('mongoose')

// 社区作品。对齐 @fwx/shared 的 CommunityPost 类型（RFC-011 §2.4）。
// forkFromId 记录 fork 来源（原创则为空），用于网络效应与溯源。
const CommunityPostSchema = new mongoose.Schema(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    likes: { type: Number, default: 0, min: 0 },
    forkFromId: { type: mongoose.Schema.Types.ObjectId, ref: 'CommunityPost' },
  },
  { timestamps: true },
)

module.exports = mongoose.model('CommunityPost', CommunityPostSchema)
