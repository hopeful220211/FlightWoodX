const test = require('node:test')
const assert = require('node:assert/strict')
const reportsRouter = require('../src/routes/reports')
const { authenticate } = require('../src/middleware/auth')
const Report = require('../src/models/Report')
const Comment = require('../src/models/Comment')

const reporterId = '507f1f77bcf86cd799439011'
const commentId = '507f191e810c19729de860ea'

function reportRoute() {
  return reportsRouter.stack.find((layer) => layer.route?.path === '/reports').route
}

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code
      return this
    },
    json(body) {
      this.body = body
      return this
    },
  }
}

test('report write route requires authentication', () => {
  assert.equal(reportRoute().stack[0].handle, authenticate)
})

test('ordinary reports create a reporter-scoped record without changing comment visibility', async () => {
  const originalCommentExists = Comment.exists
  const originalReportUpdateOne = Report.updateOne
  let reportWrite

  Comment.exists = async (filter) => {
    assert.deepEqual(filter, { _id: commentId })
    return { _id: commentId }
  }
  Report.updateOne = async (filter, update, options) => {
    reportWrite = { filter, update, options }
    return { acknowledged: true, upsertedCount: 1 }
  }

  try {
    const response = responseRecorder()
    const handler = reportRoute().stack[1].handle
    await handler({
      body: { targetType: 'comment', targetId: commentId, reason: '垃圾广告' },
      userId: reporterId,
    }, response)

    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.body, { success: true })
    assert.deepEqual(reportWrite, {
      filter: { reporterId, targetType: 'comment', targetId: commentId },
      update: {
        $setOnInsert: {
          reporterId,
          targetType: 'comment',
          targetId: commentId,
          reason: '垃圾广告',
        },
      },
      options: { upsert: true },
    })
  } finally {
    Comment.exists = originalCommentExists
    Report.updateOne = originalReportUpdateOne
  }
})
