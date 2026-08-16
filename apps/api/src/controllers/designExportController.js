const archiver = require('archiver')
const mongoose = require('mongoose')
const DroneDesign = require('../models/DroneDesign')
const { findApprovedCadPartFile, validateCadExportParts } = require('../lib/cadExport')
const { generateReadme } = require('../utils/generateReadme')

function designLookup(designId, ownerId) {
  if (mongoose.isObjectIdOrHexString(designId)) return { _id: designId, ownerId }
  if (typeof designId === 'string' && designId.trim() && designId.length <= 120) {
    return { localId: designId.trim(), ownerId }
  }
  return null
}

function storedDesignParts(design) {
  if (design.designData && Array.isArray(design.designData.parts)) {
    return { parts: design.designData.parts }
  }
  return { parts: design.parts }
}

function serverAuthor(authUser) {
  const candidate = authUser && authUser.profile && authUser.profile.displayName
    ? authUser.profile.displayName
    : authUser && authUser.username
  return typeof candidate === 'string' && candidate.trim()
    ? candidate.trim().slice(0, 120)
    : 'FlightWoodX 用户'
}

function createExportCadHandler({
  DroneDesignModel = DroneDesign,
  createArchive = archiver,
  findCadPartFile = findApprovedCadPartFile,
} = {}) {
  return async function exportCad(req, res) {
    try {
      const lookup = designLookup(req.params.designId, req.userId)
      if (lookup === null) return res.status(400).json({ error: '设计 id 无效' })

      const design = await DroneDesignModel.findOne(lookup).lean()
      if (!design) return res.status(404).json({ error: '设计不存在' })

      const validated = validateCadExportParts(storedDesignParts(design))
      if (!validated.ok) return res.status(422).json({ error: '设计数据无法导出' })

      const designName = typeof design.name === 'string' && design.name.trim()
        ? design.name.trim()
        : '未命名设计'
      const username = serverAuthor(req.authUser)
      const dateStr = new Date().toISOString().slice(0, 10)
      const safeName = designName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_')
      const zipFileName = `flightwoodx-${safeName}-${dateStr}.zip`

      const grouped = new Map()
      for (const partId of validated.partIds) {
        grouped.set(partId, (grouped.get(partId) || 0) + 1)
      }
      const partList = Array.from(grouped.entries())
        .map(([name, count]) => ({ name, count }))
      const missingParts = []

      res.setHeader('Content-Type', 'application/zip')
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(zipFileName)}"`,
      )

      const archive = createArchive('zip', { zlib: { level: 9 } })
      archive.on('error', (error) => {
        console.error('[export-cad] Archive error:', error)
        if (!res.headersSent) res.status(500).json({ error: 'ZIP 生成失败' })
      })
      archive.pipe(res)

      archive.append(
        generateReadme({ designName, username, date: dateStr, partList }),
        { name: 'README.txt' },
      )
      archive.append(JSON.stringify({
        designId: String(design._id),
        designName,
        author: username,
        createdAt: design.updatedAt || new Date().toISOString(),
        exportedAt: new Date().toISOString(),
        parts: partList.map((part) => ({ partId: part.name, count: part.count })),
      }, null, 2), { name: 'design-summary.json' })

      for (const { name: partId, count } of partList) {
        const dxfPath = await findCadPartFile(
          req.app.locals.config.cadPartsDir,
          partId,
        )
        if (dxfPath === null) {
          missingParts.push(partId)
          console.warn(`[export-cad] Missing CAD file: ${partId}.dxf`)
          continue
        }

        if (count === 1) {
          archive.file(dxfPath, { name: `parts/${partId}.dxf` })
        } else {
          for (let index = 1; index <= count; index += 1) {
            archive.file(dxfPath, {
              name: `parts/${partId}_${String(index).padStart(3, '0')}.dxf`,
            })
          }
        }
      }

      if (missingParts.length > 0) {
        const note = `以下零件的 CAD 文件暂未提供，请联系老师获取：\n${missingParts.map((partId) => `  - ${partId}`).join('\n')}\n`
        archive.append(note, { name: 'MISSING_PARTS.txt' })
      }

      await archive.finalize()
    } catch (error) {
      console.error('[export-cad] Error:', error)
      if (!res.headersSent) res.status(500).json({ error: '导出失败' })
    }
  }
}

module.exports = {
  createExportCadHandler,
  exportCad: createExportCadHandler(),
}
