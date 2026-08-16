const fs = require('fs').promises
const path = require('path')

const MAX_CAD_EXPORT_PARTS = 512
const CAD_PART_ID = /^[A-Za-z0-9_-]{1,128}$/

function validateCadExportParts(design) {
  if (!design || !Array.isArray(design.parts)) {
    return { ok: false, error: '无效的设计数据' }
  }
  if (design.parts.length > MAX_CAD_EXPORT_PARTS) {
    return { ok: false, error: '设计零件数量超出导出上限' }
  }

  const partIds = []
  for (const part of design.parts) {
    if (
      !part
      || typeof part !== 'object'
      || typeof part.partId !== 'string'
      || !CAD_PART_ID.test(part.partId)
    ) {
      return { ok: false, error: '无效的设计数据' }
    }
    partIds.push(part.partId)
  }
  return { ok: true, partIds }
}

function isWithin(rootPath, candidatePath) {
  const relativePath = path.relative(rootPath, candidatePath)
  return relativePath !== ''
    && relativePath !== '..'
    && !relativePath.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relativePath)
}

async function findApprovedCadPartFile(cadPartsDir, partId) {
  if (typeof partId !== 'string' || !CAD_PART_ID.test(partId)) return null

  const configuredRoot = path.resolve(cadPartsDir)
  const candidatePath = path.resolve(configuredRoot, `${partId}.dxf`)
  if (!isWithin(configuredRoot, candidatePath)) return null

  try {
    const [canonicalRoot, canonicalFile] = await Promise.all([
      fs.realpath(configuredRoot),
      fs.realpath(candidatePath),
    ])
    if (!isWithin(canonicalRoot, canonicalFile)) return null
    const fileStats = await fs.stat(canonicalFile)
    return fileStats.isFile() ? canonicalFile : null
  } catch {
    return null
  }
}

module.exports = {
  MAX_CAD_EXPORT_PARTS,
  findApprovedCadPartFile,
  validateCadExportParts,
}
