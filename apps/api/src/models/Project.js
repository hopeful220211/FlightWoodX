const mongoose = require('mongoose')

// 设计 + 程序的整合体。对齐 @fwx/shared 的 Project 类型（RFC-011 §2.4）。
const ProjectSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    designId: { type: mongoose.Schema.Types.ObjectId, ref: 'DroneDesign' },  // optional until M2
    programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program' },    // optional until M3
    name: { type: String, required: true, trim: true },
    coverUrl: { type: String },
    visibility: { type: String, enum: ['private', 'public'], default: 'private' },
    // 开源复用开关（对齐已冻结契约 @fwx/shared models.ts Project.reusable）：
    // 作者允许他人「复用这个设计」时为 true（RFC-017 P1 / 开源复用闭环）。
    reusable: { type: Boolean, default: false },
    // 仅由服务端 fork 路由写入。发布社区作品时据此生成可信 forkFromId；不接受客户端赋值。
    forkFromPostId: { type: mongoose.Schema.Types.ObjectId, ref: 'CommunityPost', select: false },
  },
  { timestamps: true },
)

// 同一用户对同一来源只生成一份复用项目；并发请求由唯一索引兜底。
ProjectSchema.index(
  { ownerId: 1, forkFromPostId: 1 },
  { unique: true, partialFilterExpression: { forkFromPostId: { $type: 'objectId' } } },
)

module.exports = mongoose.model('Project', ProjectSchema)
