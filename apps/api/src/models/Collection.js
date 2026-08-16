const mongoose = require('mongoose')

/**
 * Collection — 用户收藏夹 / 合集（Pinterest 风格的「板」），对齐 @fwx/shared 的 Collection 契约。
 *
 * 一个用户可建多个合集，把社区作品（CommunityPost）归入其中（关系存 CollectionItem）。
 * coverPostId 可选；未设置时由路由按「最近加入的作品封面」兜底解析展示封面（不落库）。
 * isPublic=true 时任何人可看，false 仅作者本人可看。
 */
const CollectionSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    description: { type: String, default: '' },
    coverPostId: { type: mongoose.Schema.Types.ObjectId, ref: 'CommunityPost' },
    isPublic: { type: Boolean, default: true },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Collection', CollectionSchema)
