// Classify rejected client values without exposing database internals.
function isInvalidDocument(error) {
  return Boolean(error && (error.name === 'ValidationError' || error.name === 'CastError'))
}

module.exports = { isInvalidDocument }
