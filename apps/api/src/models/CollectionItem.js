const mongoose = require('mongoose')

/**
 * CollectionItem — 合集与作品的多对多关系条目（对齐 @fwx/shared 的 CollectionItem 契约）。
 *
 * 注意契约时间字段是 addedAt（加入合集的时间），不是 createdAt：用 timestamps 重命名。
 * 唯一索引 (collectionId, postId) 保证「同一作品在同一合集只出现一次」→ 加入操作幂等（11000 兜底并发）。
 */
const CollectionItemSchema = new mongoose.Schema(
  {
    collectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Collection', required: true },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'CommunityPost', required: true },
  },
  { timestamps: { createdAt: 'addedAt', updatedAt: false } },
)

CollectionItemSchema.index({ collectionId: 1, postId: 1 }, { unique: true })

module.exports = mongoose.model('CollectionItem', CollectionItemSchema)
