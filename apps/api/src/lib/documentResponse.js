// @ts-check
/** @param {any} document */
function withStringId(document) {
  if (!document) return document
  const value = typeof document.toObject === 'function' ? document.toObject() : document
  if (!value._id) return value
  return { ...value, id: String(value._id) }
}

module.exports = { withStringId }
