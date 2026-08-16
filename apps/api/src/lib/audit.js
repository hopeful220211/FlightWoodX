// 审计写入工具（RFC-014 §7 / §8 「审计先行」）。
// 所有后台写操作调用 writeAudit() 落痕；序列化用 toAuditLogDTO() 对齐前端。
//
// 当前实现是 best-effort 旁路：审计失败不回滚业务，writeAudit 内部告警后返回。
// 这只是现有行为，不是全局安全保证；修改时须同步 SECURITY/RELIABILITY、调用方和失败测试。
const AuditLog = require('../models/AuditLog')

const SYSTEM_ACTOR = 'system'

/**
 * 落一条审计日志。失败只告警、不抛错。
 * @param {object} entry
 * @param {string} entry.actor    操作者 userId；系统操作传 'system'（或省略 actor）。
 * @param {string} entry.action   动作码 `资源:动作`，如 'users:role'。
 * @param {string} entry.target   目标 `资源#id`，如 'user#64f…'。
 * @param {*}     [entry.before]  改动前快照。
 * @param {*}     [entry.after]   改动后快照。
 * @param {string}[entry.diffSummary] 一句话差异摘要（不传则自动从 action/target 生成）。
 * @returns {Promise<void>}
 */
async function writeAudit(entry) {
  try {
    const { actor, action, target, before, after, diffSummary } = entry || {}
    if (!action || !target) {
      console.warn('[audit] skipped: action/target required', { action, target })
      return
    }
    await AuditLog.create({
      actor: actor || SYSTEM_ACTOR,
      action,
      target,
      before,
      after,
      diffSummary: diffSummary || `${action} ${target}`,
    })
  } catch (err) {
    // 旁路失败不影响主流程，仅告警。
    console.warn('[audit] write failed:', err && err.message)
  }
}

/**
 * Mongoose 文档 → 前端契约 AuditLogDTO（@fwx/shared）。
 * 只暴露 diffSummary，不回显 before/after 原文（合规：最小化展示）。
 */
function toAuditLogDTO(doc) {
  return {
    id: String(doc._id),
    actor: doc.actor,
    action: doc.action,
    target: doc.target,
    at: (doc.createdAt instanceof Date ? doc.createdAt : new Date(doc.createdAt)).toISOString(),
    diffSummary: doc.diffSummary || `${doc.action} ${doc.target}`,
  }
}

module.exports = { writeAudit, toAuditLogDTO, SYSTEM_ACTOR }
