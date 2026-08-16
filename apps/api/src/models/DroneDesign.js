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
    name: { type: String, required: true, trim: true, maxlength: 80 },
    params: { type: ParametricBodyParamsSchema }, // RFC-013：改可选，新设计走 designData
    /** 前端 Design 完整快照（RFC-013 方案 B：后端不解析内容，原样存取） */
    designData: { type: mongoose.Schema.Types.Mixed, default: null },
    glbUrl: { type: String }, // 二进制资产走对象存储，库里只存 URL
    thumbnailUrl: { type: String },
    weightG: { type: Number, default: 0, min: 0, max: 100000 },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
    /** Client-side parts array (PartInstance[]), stored as-is for M2 sync */
    parts: { type: mongoose.Schema.Types.Mixed, default: [] },
    /** Client-side local design ID, used to map server ↔ localStorage */
    localId: { type: String, trim: true, maxlength: 120, index: true, sparse: true },

    // ===== 作品库合一（RFC-024 §4.2）：DroneDesign 升为「我的作品」唯一后端源 =====
    // 以下展示/发布字段由旧 Project 并入，Project 退化为发布桥接（只当 CommunityPost 指针）。
    /** 展示封面（3D 截图大图）。与 thumbnailUrl（小自动缩略图）并存、各司其职。 */
    coverUrl: { type: String },
    /** 可见性：作品仓库的公开/私有开关（原 Project.visibility 并入，此处为单一真相源）。 */
    visibility: { type: String, enum: ['private', 'public'], default: 'private' },
    /** 开源复用开关（原 Project.reusable 并入）。作者允许他人「复用这个设计」时为 true。 */
    reusable: { type: Boolean, default: false },
    /** 关联的积木程序（可选）。作品 = 设计 + 程序，供发布 / 复用引用。 */
    programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program' },
    /** 被复用次数（他人 fork 本作品的累计计数）。canonical 事件计数，非从 designData 派生。 */
    reuseCount: { type: Number, default: 0 },
    /** 迁移溯源：从旧 Project 并入时记录来源 Project id，保证一次性迁移幂等（RFC-024）。 */
    migratedFromProjectId: { type: mongoose.Schema.Types.ObjectId, index: true, sparse: true },
  },
  { timestamps: true },
)

// (ownerId, localId) 复合唯一索引 —— 支撑按本地 id 幂等 upsert（RFC-013）。
// partial：仅对 localId 为字符串的文档生效，避免无 localId 的存量文档互相冲突。
DroneDesignSchema.index(
  { ownerId: 1, localId: 1 },
  { unique: true, partialFilterExpression: { localId: { $type: 'string' } } },
)

module.exports = mongoose.model('DroneDesign', DroneDesignSchema)
