// @ts-check
const mongoose = require('mongoose')
const DroneDesign = require('../models/DroneDesign')
const Program = require('../models/Program')

/**
 * @param {Record<string, any>} values
 * @param {any} ownerId
 * @param {{ DroneDesign?: any, Program?: any }} [models]
 */
async function validateProjectReferences(values, ownerId, models = {}) {
  const references = [
    ['designId', values.designId, models.DroneDesign || DroneDesign],
    ['programId', values.programId, models.Program || Program],
  ].filter(([, value]) => value !== undefined && value !== null)

  for (const [field, value] of references) {
    if (typeof value !== 'string' || !mongoose.isObjectIdOrHexString(value)) {
      return { ok: false, error: `${field} 无效` }
    }
  }

  const ownership = await Promise.all(
    references.map(([, value, Model]) => Model.exists({ _id: value, ownerId })),
  )
  const missingIndex = ownership.findIndex((result) => !result)
  if (missingIndex >= 0) {
    return { ok: false, error: `${references[missingIndex][0]} 不存在或不属于当前用户` }
  }
  return { ok: true }
}

module.exports = { validateProjectReferences }
