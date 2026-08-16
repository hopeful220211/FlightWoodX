const express = require('express')
const crypto = require('crypto')
const { authenticate } = require('../middleware/auth')

// 浏览器直传 OSS 的临时凭证接口（RFC-024 §4.8）。
// 带宽命门：GLB/贴图/缩略图/DXF/zip 等大文件**绝不经 ECS 中转**——
// 前端拿一份「限定到单个随机对象、只能 PutObject、15 分钟过期」的 STS 凭证，直传对象存储；
// 服务端只事后接收 object key + 元数据（在各业务接口里存），文件内容永不过 ECS。
// 所有凭证/RoleArn/桶名全走 env，禁止硬编码。
const router = express.Router()

// 每个用户只能往自己的前缀写，杜绝越权覆盖他人对象。
function userPrefix(userId) {
  return `user-uploads/${userId}/`
}

/**
 * POST /api/uploads/sts —— 获取直传 OSS 的临时 STS 凭证（需登录）。
 * body（可选）: { ext?: string } 仅用于生成一个建议 objectKey，服务端不接收文件内容。
 * 返回: { region, bucket, prefix, objectKey, credentials:{accessKeyId,accessKeySecret,securityToken,expiration} }
 *
 * 未配置 OSS/STS（如本地 disk 模式）时返回 501，前端应回退为经后端的小文件上传通道。
 */
router.post('/sts', authenticate, (req, res, next) => req.app.locals.rateLimits.sts(req, res, next), async (req, res) => {
  const config = req.app.locals.config
  const { oss } = config.storage
  const roleArn = oss.stsRoleArn
  const bucket = oss.assetsBucket
  const region = oss.region
  if (config.storage.driver !== 'oss' || !roleArn || !bucket || !region) {
    return res.status(501).json({ error: '对象存储直传未配置（当前非 OSS 模式）' })
  }

  try {
    // lazy require：非 OSS 部署无需安装 ali-oss
    const { STS } = require('ali-oss')
    const sts = new STS({
      // STS 专用子账号优先；未单独配置则复用主 AK（生产建议用最小权限的 STS 子账号）
      accessKeyId: oss.stsAccessKeyId || oss.accessKeyId,
      accessKeySecret: oss.stsSecret || oss.secret,
    })

    const prefix = userPrefix(req.userId)
    const rawExt = typeof req.body?.ext === 'string' ? req.body.ext.replace(/[^a-z0-9]/gi, '').slice(0, 8) : ''
    const objectKey = `${prefix}${Date.now()}-${crypto.randomBytes(12).toString('hex')}${rawExt ? '.' + rawExt : ''}`
    // 每份凭证只允许写一个随机对象，而不是整个用户前缀；配合申请限流建立存储配额边界。
    const policy = {
      Version: '1',
      Statement: [
        {
          Effect: 'Allow',
          Action: ['oss:PutObject'],
          Resource: [`acs:oss:*:*:${bucket}/${objectKey}`],
        },
      ],
    }

    const durationSeconds = 900
    const sessionName = `fwx-${String(req.userId).slice(-12)}`
    const { credentials } = await sts.assumeRole(roleArn, policy, durationSeconds, sessionName)

    res.json({
      region,
      bucket,
      prefix,
      objectKey,
      maxBytes: config.storage.maxCoverBytes,
      credentials: {
        accessKeyId: credentials.AccessKeyId,
        accessKeySecret: credentials.AccessKeySecret,
        securityToken: credentials.SecurityToken,
        expiration: credentials.Expiration,
      },
    })
  } catch (error) {
    console.error('[uploads] STS error:', error.message)
    res.status(500).json({ error: '获取上传凭证失败' })
  }
})

module.exports = router
