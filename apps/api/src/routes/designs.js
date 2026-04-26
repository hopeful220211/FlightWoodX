const express = require('express')
const path = require('path')
const fs = require('fs').promises
const archiver = require('archiver')
const { authenticate } = require('../middleware/auth')
const { generateReadme } = require('../utils/generateReadme')

const router = express.Router()

// All design routes require authentication
router.use(authenticate)

const CAD_DIR = path.resolve(__dirname, '../../../web/public/cad/parts')

/**
 * POST /api/designs/:designId/export-cad
 *
 * Receives the full design in the request body (since designs live in
 * localStorage, not the backend DB). Generates a ZIP with .dxf files,
 * README.txt, and design-summary.json.
 */
router.post('/:designId/export-cad', async (req, res) => {
  try {
    const { design } = req.body

    if (!design || !design.parts || !Array.isArray(design.parts)) {
      return res.status(400).json({ error: '无效的设计数据' })
    }

    const designName = design.name || '未命名设计'
    const username = req.body.username || '设计师'
    const dateStr = new Date().toISOString().slice(0, 10)
    const safeName = designName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_')
    const zipFileName = `flightwoodx-${safeName}-${dateStr}.zip`

    // Group parts by partId
    const grouped = new Map()
    for (const p of design.parts) {
      grouped.set(p.partId, (grouped.get(p.partId) || 0) + 1)
    }

    const partList = Array.from(grouped.entries()).map(([name, count]) => ({ name, count }))
    const missingParts = []

    // Set response headers for ZIP download
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(zipFileName)}"`)

    const archive = archiver('zip', { zlib: { level: 9 } })

    archive.on('error', (err) => {
      console.error('[export-cad] Archive error:', err)
      if (!res.headersSent) {
        res.status(500).json({ error: 'ZIP 生成失败' })
      }
    })

    archive.pipe(res)

    // README.txt
    archive.append(generateReadme({ designName, username, date: dateStr, partList }), { name: 'README.txt' })

    // design-summary.json
    const summary = {
      designId: req.params.designId,
      designName,
      author: username,
      createdAt: design.updatedAt || new Date().toISOString(),
      exportedAt: new Date().toISOString(),
      parts: partList.map(p => ({ partId: p.name, count: p.count })),
      stats: design.stats || null,
      checkResults: design.checkResults || null,
    }
    archive.append(JSON.stringify(summary, null, 2), { name: 'design-summary.json' })

    // Part .dxf files
    for (const { name: partId, count } of partList) {
      const dxfPath = path.join(CAD_DIR, `${partId}.dxf`)
      let cadExists = false

      try {
        await fs.access(dxfPath)
        cadExists = true
      } catch {
        // File doesn't exist
        missingParts.push(partId)
        console.warn(`[export-cad] Missing CAD file: ${partId}.dxf`)
      }

      if (cadExists) {
        if (count === 1) {
          archive.file(dxfPath, { name: `parts/${partId}.dxf` })
        } else {
          for (let i = 1; i <= count; i++) {
            archive.file(dxfPath, { name: `parts/${partId}_${String(i).padStart(3, '0')}.dxf` })
          }
        }
      }
    }

    // Append missing parts note if any
    if (missingParts.length > 0) {
      const note = `以下零件的 CAD 文件暂未提供，请联系老师获取：\n${missingParts.map(p => `  - ${p}`).join('\n')}\n`
      archive.append(note, { name: 'MISSING_PARTS.txt' })
    }

    await archive.finalize()
  } catch (error) {
    console.error('[export-cad] Error:', error)
    if (!res.headersSent) {
      res.status(500).json({ error: '导出失败' })
    }
  }
})

module.exports = router
