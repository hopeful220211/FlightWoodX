const mongoose = require('mongoose')

// 设计器产物。字段对齐 @fwx/shared 的 DroneDesign 类型（RFC-011 §2.4）。
// 注意：本 schema 仅定义，阶段一不接任何路由/业务逻辑。
const ParametricBodyParamsSchema = new mongoose.Schema(
  {
    hubType: { type: String, required: true }, // 主板型号（HUB）
    layer: { type: String, enum: ['single', 'double'], default: 'single' },
    armCount: { type: Number, required: true },
    armLengthMm: { type: Number, required: true },
    guardStyle: { type: String, enum: ['plate', 'joint', 'landing'] },
  },
  { _id: false },
)

const DroneDesignSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    params: { type: ParametricBodyParamsSchema, required: true },
    glbUrl: { type: String }, // 二进制资产走对象存储，库里只存 URL
    thumbnailUrl: { type: String },
    weightG: { type: Number, required: true },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  },
  { timestamps: true },
)

module.exports = mongoose.model('DroneDesign', DroneDesignSchema)
