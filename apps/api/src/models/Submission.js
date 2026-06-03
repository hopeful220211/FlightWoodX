const mongoose = require('mongoose')

// 参赛提交。对齐 @fwx/shared 的 Submission 类型（RFC-011 §2.4）。
const SubmissionSchema = new mongoose.Schema(
  {
    competitionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Competition',
      required: true,
      index: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    submittedAt: { type: Date, default: Date.now },
    simReplayUrl: { type: String }, // 仿真回放大对象走对象存储
  },
  { timestamps: true },
)

module.exports = mongoose.model('Submission', SubmissionSchema)
