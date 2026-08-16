const mongoose = require('mongoose')

// 操作审计日志（RFC-014 §5.9 / §7 「审计先行」地基）。
// 任何后台写操作（改角色、改状态、发布课程、入库零件…）都要落一条审计。
// 对齐 @fwx/shared 的 AuditLogDTO（id/actor/action/target/at/diffSummary）。
//
// 设计取舍：
// - before/after 存改动前后的快照（Mixed），便于追溯与回滚判断；对外只暴露 diffSummary。
// - actor 存操作者 userId（ObjectId）；系统自动操作用约定字符串（见 lib/audit.js）。
// - 审计只增不改不删：本模型不提供更新入口，集合天然 append-only。
const AuditLogSchema = new mongoose.Schema(
  {
    // 操作者 userId；系统操作存 'system'（非 ObjectId，故用 String 宽容存储）。
    actor: { type: String, required: true, index: true },
    // 动作码，约定 `资源:动作`，如 'users:role'、'courses:publish'。
    action: { type: String, required: true, index: true },
    // 操作目标，约定 `资源#id`，如 'user#64f…'、'course#64f…'。
    target: { type: String, required: true, index: true },
    // 改动前/后快照（可选；读操作或无前态时留空）。
    before: { type: mongoose.Schema.Types.Mixed },
    after: { type: mongoose.Schema.Types.Mixed },
    // 人类可读的一句话差异摘要（对外 DTO 直接用这个，不回显 before/after 原文）。
    diffSummary: { type: String },
  },
  { timestamps: true },
)

// 审计常按"目标 + 时间倒序"查（某用户/某课程的操作历史）。
AuditLogSchema.index({ target: 1, createdAt: -1 })

module.exports = mongoose.model('AuditLog', AuditLogSchema)
