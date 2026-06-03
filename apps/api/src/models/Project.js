const mongoose = require('mongoose')

// 设计 + 程序的整合体。对齐 @fwx/shared 的 Project 类型（RFC-011 §2.4）。
const ProjectSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    designId: { type: mongoose.Schema.Types.ObjectId, ref: 'DroneDesign', required: true },
    programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true },
    name: { type: String, required: true, trim: true },
    coverUrl: { type: String },
    visibility: { type: String, enum: ['private', 'public'], default: 'private' },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Project', ProjectSchema)
