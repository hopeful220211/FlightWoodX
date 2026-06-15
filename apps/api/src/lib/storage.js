// 对象存储适配层（RFC-012 A6）。
// 一套代码、多平台：STORAGE_DRIVER=disk 用本地磁盘（开发），=s3 用 S3 兼容协议
// （阿里云 OSS / 腾讯云 COS / AWS S3，仅在用到时才 require @aws-sdk/client-s3）。
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const DRIVER = process.env.STORAGE_DRIVER || 'disk'
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads')
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`

const EXT_BY_TYPE = { 'image/png': 'png', 'image/webp': 'webp', 'image/jpeg': 'jpg' }

function genKey(prefix, contentType) {
  const ext = EXT_BY_TYPE[contentType] || 'bin'
  return `${prefix}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`
}

async function putDisk(key, buffer) {
  const full = path.join(UPLOAD_DIR, key)
  await fs.promises.mkdir(path.dirname(full), { recursive: true })
  await fs.promises.writeFile(full, buffer)
  return `${PUBLIC_BASE_URL}/uploads/${key}`
}

let s3Client = null
async function putS3(key, buffer, contentType) {
  // lazy require：本地 disk 模式无需安装 @aws-sdk/client-s3
  const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
  if (!s3Client) {
    s3Client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION || 'auto',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      },
    })
  }
  await s3Client.send(
    new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: buffer, ContentType: contentType }),
  )
  const base = process.env.CDN_DOMAIN || `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}`
  return `${base}/${key}`
}

/**
 * 存一个对象，返回可访问 URL。
 * @param {string} prefix 逻辑目录，如 'covers'
 * @param {Buffer} buffer 文件内容
 * @param {string} contentType MIME，如 'image/webp'
 * @returns {Promise<string>} 可访问 URL
 */
async function putObject(prefix, buffer, contentType) {
  const key = genKey(prefix, contentType)
  if (DRIVER === 's3') return putS3(key, buffer, contentType)
  return putDisk(key, buffer)
}

module.exports = { putObject, UPLOAD_DIR, DRIVER }
