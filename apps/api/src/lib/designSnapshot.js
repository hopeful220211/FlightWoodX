// @ts-check
const {
  DesignPartInstanceSchema,
  DroneDesignSnapshotSchema,
} = require('@fwx/parts-schema/runtime-cjs')

const PartsArraySchema = DesignPartInstanceSchema.array().max(500)

/**
 * Parse the two legacy/current assembly payload fields before any Mongo write.
 * `undefined` means the caller did not update that field; `null` is retained only
 * for legacy records that intentionally have no versioned snapshot yet.
 * @param {{ designData?: unknown, parts?: unknown }} body
 */
function parseDesignPayload(body) {
  let designData = body.designData
  let parts = body.parts

  if (designData !== undefined && designData !== null) {
    const result = DroneDesignSnapshotSchema.safeParse(designData)
    if (!result.success) return { ok: false, error: 'designData 格式非法' }
    designData = result.data
  }

  if (parts !== undefined) {
    const result = PartsArraySchema.safeParse(parts)
    if (!result.success) return { ok: false, error: 'parts 格式非法' }
    parts = result.data
  }

  return { ok: true, designData, parts }
}

module.exports = { parseDesignPayload }
