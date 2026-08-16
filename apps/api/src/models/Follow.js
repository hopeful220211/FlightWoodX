const mongoose = require('mongoose')

// 关注关系（RFC-017 STREAM D）。对齐 @fwx/shared 的 Follow：
//   { id; followerId; followeeId; createdAt }
// followerId = 发起关注的人；followeeId = 被关注的创作者。
// 注意字段名是 followeeId（不是 followingId），与冻结契约保持一致。
const FollowSchema = new mongoose.Schema(
  {
    followerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    followeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
)

// 幂等：同一 (follower, followee) 只能存在一条；并发重复关注由唯一索引兜底（11000）。
FollowSchema.index({ followerId: 1, followeeId: 1 }, { unique: true })
// 统计某创作者的粉丝数 / 反查粉丝。
FollowSchema.index({ followeeId: 1 })
// 取「我关注了谁」→ 拉关注流（feed）。
FollowSchema.index({ followerId: 1 })

module.exports = mongoose.model('Follow', FollowSchema)
