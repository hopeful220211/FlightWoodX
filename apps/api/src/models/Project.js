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
  },
  { timestamps: true },
)

module.exports = mongoose.model('Project', ProjectSchema)
