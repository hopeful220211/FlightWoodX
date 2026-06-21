const express = require('express')
const mongoose = require('mongoose')
const { authenticate } = require('../middleware/auth')
const CommunityPost = require('../models/CommunityPost')
const Project = require('../models/Project')
const DroneDesign = require('../models/DroneDesign')
const Program = require('../models/Program')

const router = express.Router()

// 克隆白名单：只复制真实存在的内容字段，剥离 _id/__v/时间戳/localId 等身份与归属字段。
// 与 models/DroneDesign.js、models/Program.js 的 schema 严格对齐——加字段时同步这里。
const DESIGN_CLONE_FIELDS = ['name', 'params', 'designData', 'glbUrl', 'thumbnailUrl', 'weightG', 'parts']
const PROGRAM_CLONE_FIELDS = ['name', 'blocklyXml', 'commandProgram']

// 从源文档按白名单挑字段（仅拷贝实际存在的键，避免把 undefined 写进新文档）。
function pickDefined(source, fields) {
  const out = {}
  for (const key of fields) {
    if (source[key] !== undefined) out[key] = source[key]
  }
  return out
}

// 某些部署（单机 mongod，非副本集）不支持事务。识别这类错误以便降级为非事务克隆。
function isTransactionUnsupported(err) {
  if (!err) return false
  // IllegalOperation(20)：Transaction numbers are only allowed on a replica set / mongos
  if (err.code === 20 || err.code === 263) return true
  const labels = err.errorLabels
  if (Array.isArray(labels) && labels.includes('TransientTransactionError')) return false
  const msg = String(err.message || '')
  return /Transaction numbers are only allowed|Transactions are not supported|replica set|mongos/i.test(msg)
}

/**
 * 在给定 session 下克隆出「新设计 + 新程序 + 新项目」三件套，归属当前用户。
 * session 传 null 时不开事务（降级路径）。返回新建的 Project 文档。
 */
async function cloneProjectBundle({ sourceProject, sourceDesign, sourceProgram, ownerId, session }) {
  const opts = session ? { session } : {}
  const created = []
  try {
    // 新设计：白名单拷贝 + 归属本人 + 重置为草稿；绝不带 localId（避免与他人/本人既有设计的唯一索引冲突）。
    const newDesign = new DroneDesign({
      ...pickDefined(sourceDesign, DESIGN_CLONE_FIELDS),
      ownerId,
      status: 'draft',
    })
    await newDesign.save(opts)
    created.push(newDesign)

    // 新程序：白名单拷贝 + 归属本人。
    const newProgram = new Program({
      ...pickDefined(sourceProgram, PROGRAM_CLONE_FIELDS),
      ownerId,
    })
    await newProgram.save(opts)
    created.push(newProgram)

    // 新项目：私密、不可复用，引用上面两个新产物；名字加「（复用）」后缀。
    const newProject = new Project({
      ownerId,
      name: `${sourceProject.name}（复用）`,
      visibility: 'private',
      reusable: false,
      coverUrl: sourceProject.coverUrl,
      designId: newDesign._id,
      programId: newProgram._id,
    })
    await newProject.save(opts)

    return newProject
  } catch (e) {
    // 事务路径由 withTransaction 自动回滚；非事务降级路径手动补偿删除已建文档，避免残留孤儿设计/程序。
    if (!session) {
      for (const doc of created.reverse()) {
        try { await doc.deleteOne() } catch (_) { /* 补偿删除尽力而为 */ }
      }
    }
    throw e
  }
}

/**
 * POST /api/community/posts/:id/fork — 复用一个开放复用的作品（需鉴权）。
 *
 * 把源作品的设计 + 程序整份克隆为「我的」一个新私密项目，落地后由前端打开编辑器改造。
 * 守卫：源 project 必须 public ∧ reusable ∧ 同时含 designId/programId（缺任一 → 409）。
 * 克隆在 Mongo 事务内完成（设计+程序+项目要么全建、要么全不建）；
 * 若部署不支持事务则降级为非事务顺序创建，保证可用。
 * 血缘（forkFromId）不在此写入——发布该 fork 时由前端经 ?forkedFrom 透传给 POST /posts 落地。
 */
router.post('/posts/:id/fork', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: '作品不存在' })
    }

    const sourcePost = await CommunityPost.findById(id).lean()
    if (!sourcePost) return res.status(404).json({ error: '作品不存在' })

    const sourceProject = await Project.findById(sourcePost.projectId).lean()
    if (!sourceProject) return res.status(404).json({ error: '作品不存在' })

    // 复用守卫：作者未开放复用 / 内容不完整时拒绝。
    const reusable =
      sourceProject.visibility === 'public' &&
      sourceProject.reusable === true &&
      sourceProject.designId &&
      sourceProject.programId
    if (!reusable) {
      return res.status(409).json({ error: '该作品未开放复用或缺少可复用内容' })
    }

    // 源设计 / 源程序必须都在，否则克隆无意义。
    const [sourceDesign, sourceProgram] = await Promise.all([
      DroneDesign.findById(sourceProject.designId).lean(),
      Program.findById(sourceProject.programId).lean(),
    ])
    if (!sourceDesign || !sourceProgram) {
      return res.status(409).json({ error: '该作品未开放复用或缺少可复用内容' })
    }

    // 资产归属一致性：项目引用的设计/程序若明确属于「别人」，拒绝复用。
    // 防止有人把他人资产绑到自己项目、标记 reusable，再借 fork 套出非自有内容。
    // （缺 ownerId 的历史数据不误伤；只在「确属他人」时拦截。）
    const authorId = String(sourceProject.ownerId)
    const referencesOthersAsset =
      (sourcePost.authorId && String(sourcePost.authorId) !== authorId) ||
      (sourceDesign.ownerId && String(sourceDesign.ownerId) !== authorId) ||
      (sourceProgram.ownerId && String(sourceProgram.ownerId) !== authorId)
    if (referencesOthersAsset) {
      return res.status(409).json({ error: '该作品未开放复用或缺少可复用内容' })
    }

    const ownerId = req.userId
    let newProject

    // 优先走事务；事务不被支持时降级为非事务克隆（仍保持白名单/守卫等正确性）。
    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        newProject = await cloneProjectBundle({
          sourcePost,
          sourceProject,
          sourceDesign,
          sourceProgram,
          ownerId,
          session,
        })
      })
    } catch (txErr) {
      if (!isTransactionUnsupported(txErr)) throw txErr
      // 降级：无事务顺序创建（学校单机部署兜底）。
      newProject = await cloneProjectBundle({
        sourcePost,
        sourceProject,
        sourceDesign,
        sourceProgram,
        ownerId,
        session: null,
      })
    } finally {
      session.endSession()
    }

    res.status(201).json({ projectId: String(newProject._id) })
  } catch (error) {
    console.error('[community] Fork error:', error)
    res.status(500).json({ error: '复用失败，请稍后再试' })
  }
})

module.exports = router
