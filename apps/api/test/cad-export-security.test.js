const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')
const {
  MAX_CAD_EXPORT_PARTS,
  findApprovedCadPartFile,
  validateCadExportParts,
} = require('../src/lib/cadExport')

test('CAD export accepts bounded part ids and rejects traversal-shaped input', () => {
  assert.deepEqual(
    validateCadExportParts({ parts: [{ partId: 'FW-ARM_001' }] }),
    { ok: true, partIds: ['FW-ARM_001'] },
  )

  for (const partId of ['../../secret', 'folder/part', '', 'x'.repeat(129), 42]) {
    assert.deepEqual(
      validateCadExportParts({ parts: [{ partId }] }),
      { ok: false, error: '无效的设计数据' },
    )
  }

  assert.deepEqual(
    validateCadExportParts({
      parts: Array.from({ length: MAX_CAD_EXPORT_PARTS + 1 }, () => ({ partId: 'arm' })),
    }),
    { ok: false, error: '设计零件数量超出导出上限' },
  )
})

test('CAD export reads only regular files that remain inside its approved root', async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fwx-cad-root-'))
  const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fwx-cad-outside-'))
  try {
    const safeFile = path.join(rootDir, 'arm_01.dxf')
    const outsideFile = path.join(outsideDir, 'escape.dxf')
    fs.writeFileSync(safeFile, 'safe')
    fs.writeFileSync(outsideFile, 'outside')
    fs.symlinkSync(outsideFile, path.join(rootDir, 'escape.dxf'))

    assert.equal(await findApprovedCadPartFile(rootDir, 'arm_01'), fs.realpathSync(safeFile))
    assert.equal(await findApprovedCadPartFile(rootDir, '../../escape'), null)
    assert.equal(await findApprovedCadPartFile(rootDir, 'escape'), null)
    assert.equal(await findApprovedCadPartFile(rootDir, 'missing'), null)
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true })
    fs.rmSync(outsideDir, { recursive: true, force: true })
  }
})
