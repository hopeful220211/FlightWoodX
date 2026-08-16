// @ts-check
function notFound(req, res) {
  res.status(404).json({ error: 'Not Found', path: req.originalUrl })
}

function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode
  if (status === 413 || err.type === 'entity.too.large') {
    return res.status(413).json({ error: '上传内容过大' })
  }
  if (status === 400 || err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: '请求内容格式错误' })
  }

  console.error('Error:', err && err.message ? err.message : err)
  const body = { error: 'Internal Server Error' }
  if (req.app.locals.config.nodeEnv === 'development' && err && err.message) {
    body.message = err.message
  }
  return res.status(500).json(body)
}

module.exports = { notFound, errorHandler }
