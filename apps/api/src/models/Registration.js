const mongoose = require('mongoose')

// 赛事报名。板块特有（非跨块共享契约），故定义在 api。
// 一个用户对一个赛事只报一次 → 唯一复合索引；报名数 = 该赛事的报名记录数。
const RegistrationSchema = new mongoose.Schema(
  {
    competitionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Competition',
      required: true,
      index: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true },
)

RegistrationSchema.index({ competitionId: 1, userId: 1 }, { unique: true })

module.exports = mongoose.model('Registration', RegistrationSchema)
