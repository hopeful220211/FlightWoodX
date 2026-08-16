const mongoose = require('mongoose')

// 镜像 @fwx/shared 的 SubmissionStatus（RFC-016 §2.6 状态机）。
// api 是 CommonJS，无法运行时 import shared 的 TS 类型 → 此处定义一处常量并与 shared
// 保持同步（临时策略，待 shared 产出运行时常量后改为消费它）。
const SUBMISSION_STATUSES = ['submitted', 'running', 'scored', 'reviewed', 'published', 'rejected']

// 参赛提交。对齐 @fwx/shared 的 Submission 类型（RFC-016 §2.6）。
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
    // §2.6 状态机：提交即 submitted；评分/复核/发布/驳回各自推进。杜绝"提交即有分"。
    status: { type: String, enum: SUBMISSION_STATUSES, default: 'submitted', index: true },
    submittedAt: { type: Date, default: Date.now },
    runId: { type: String }, // 关联仿真运行（评分/回放数据源，RFC-015，P1）
    simReplayUrl: { type: String }, // 仿真回放大对象走对象存储
  },
  { timestamps: true },
)

// 幂等：同一用户对同一赛事的同一作品只留一条，防重复点击造多条。
SubmissionSchema.index({ competitionId: 1, userId: 1, projectId: 1 }, { unique: true })

module.exports = mongoose.model('Submission', SubmissionSchema)
module.exports.SUBMISSION_STATUSES = SUBMISSION_STATUSES
