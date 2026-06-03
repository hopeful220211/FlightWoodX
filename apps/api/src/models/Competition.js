const mongoose = require('mongoose')

// 赛事。对齐 @fwx/shared 的 Competition 类型（RFC-011 §2.4）。
// 评分维度：设计 / 编程逻辑 / 创意 / 任务完成，不评纯竞速。
const ObstacleSchema = new mongoose.Schema(
  {
    posCm: { type: [Number], required: true }, // [x, y, z]
    radiusCm: { type: Number, required: true },
  },
  { _id: false },
)

const CompetitionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    rulesDescription: { type: String, required: true },
    trackConfig: {
      name: { type: String, required: true },
      description: { type: String },
      obstacles: { type: [ObstacleSchema], default: [] },
    },
    scoringRules: {
      design: { type: Number, required: true },
      programming: { type: Number, required: true },
      creativity: { type: Number, required: true },
      taskCompletion: { type: Number, required: true },
    },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: { type: String, enum: ['draft', 'open', 'running', 'closed'], default: 'draft' },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Competition', CompetitionSchema)
