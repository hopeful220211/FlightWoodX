const test = require('node:test')
const assert = require('node:assert/strict')
const { parseDesignPayload } = require('../src/lib/designSnapshot')

function snapshot(overrides = {}) {
  return {
    id: 'design-1',
    name: '测试作品',
    updatedAt: '2026-08-04T00:00:00.000Z',
    buildMode: 'guided',
    currentStep: 'HUB',
    stepReached: 0,
    parts: [{
      instanceId: 'hub-1',
      partId: 'FW-HUB-001',
      category: 'mainboard',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
    }],
    ...overrides,
  }
}

test('normalizes and versions a valid design snapshot', () => {
  const result = parseDesignPayload({ designData: snapshot({ currentStep: 'MOTOR', stepReached: 5 }) })
  assert.equal(result.ok, true)
  assert.equal(result.designData.schemaVersion, 1)
  assert.equal(result.designData.currentStep, 'REVIEW')
  assert.equal(result.designData.stepReached, 4)
})

test('rejects malformed snapshots and legacy parts arrays', () => {
  assert.deepEqual(parseDesignPayload({ designData: snapshot({ extra: true }) }), {
    ok: false,
    error: 'designData 格式非法',
  })
  assert.deepEqual(parseDesignPayload({ parts: [{ instanceId: 'missing-required-fields' }] }), {
    ok: false,
    error: 'parts 格式非法',
  })
})

test('rejects orphaned assembly relationships', () => {
  const invalid = snapshot({
    parts: [{
      instanceId: 'arm-1',
      partId: 'FW-LAND-001',
      category: 'landing',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      attachedTo: { parentInstanceId: 'missing', parentConnectorId: 'slot' },
    }],
  })
  assert.equal(parseDesignPayload({ designData: invalid }).ok, false)
})
