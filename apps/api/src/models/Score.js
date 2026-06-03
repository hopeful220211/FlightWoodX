const mongoose = require('mongoose')

// 评分。对齐 @fwx/shared 的 Score 类型（RFC-011 §2.4）。
// source 区分自动评分（SimAdapter 跑标准赛道）与人工评分。
const ScoreSchema = new mongoose.Schema(
  {
    submissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Submission',
      required: true,
      index: true,
    },
    dimensions: {
      design: { type: Number, required: true },
      programming: { type: Number, required: true },
      creativity: { type: Number, required: true },
      taskCompletion: { type: Number, required: true },
    },
    total: { type: Number, required: true },
    source: { type: String, enum: ['auto', 'human'], required: true },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Score', ScoreSchema)
