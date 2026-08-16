const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const EXT_BY_TYPE = { 'image/png': 'png', 'image/webp': 'webp', 'image/jpeg': 'jpg' }
const clients = new WeakMap()

function getUploadDir(config) {
  return config.storage.uploadDir
}

function normalizeContentType(contentType) {
  return String(contentType || '').split(';', 1)[0].trim().toLowerCase()
}

function genKey(prefix, contentType) {
  const ext = EXT_BY_TYPE[normalizeContentType(contentType)]
  if (!ext) throw Object.assign(new Error('Unsupported upload content type'), { status: 415 })
  return `${prefix}/${Date.now()}-${crypto.randomBytes(12).toString('hex')}.${ext}`
}

function publicBase(config) {
  if (config.storage.driver === 'disk') return `${config.storage.publicBaseUrl}/uploads`
  if (config.storage.driver === 's3') {
    return config.storage.cdnDomain || (config.storage.s3.endpoint
      ? `${config.storage.s3.endpoint}/${config.storage.s3.bucket}`
      : `https://${config.storage.s3.bucket}.s3.${config.storage.s3.region}.amazonaws.com`)
  }
  return config.storage.cdnDomain ||
    `https://${config.storage.oss.assetsBucket}.${config.storage.oss.region}.aliyuncs.com`
}

function clientState(config) {
  if (!clients.has(config)) clients.set(config, {})
  return clients.get(config)
}

async function putDisk(config, key, buffer) {
  const uploadDir = getUploadDir(config)
  const full = path.resolve(uploadDir, key)
  if (!full.startsWith(`${uploadDir}${path.sep}`)) throw new Error('Invalid storage key')
  await fs.promises.mkdir(path.dirname(full), { recursive: true })
  await fs.promises.writeFile(full, buffer, { flag: 'wx' })
}

async function putS3(config, key, buffer, contentType) {
  let sdk
  try {
    sdk = require('@aws-sdk/client-s3')
  } catch (error) {
    throw new Error('S3 storage dependency is unavailable; install @aws-sdk/client-s3')
  }
  const state = clientState(config)
  if (!state.s3) {
    state.s3 = new sdk.S3Client({
      endpoint: config.storage.s3.endpoint || undefined,
      region: config.storage.s3.region,
      credentials: {
        accessKeyId: config.storage.s3.accessKeyId,
        secretAccessKey: config.storage.s3.secretAccessKey,
      },
    })
  }
  await state.s3.send(new sdk.PutObjectCommand({
    Bucket: config.storage.s3.bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }))
}

async function putOss(config, key, buffer, contentType) {
  const OSS = require('ali-oss')
  const state = clientState(config)
  if (!state.oss) {
    state.oss = new OSS({
      region: config.storage.oss.region,
      accessKeyId: config.storage.oss.accessKeyId,
      accessKeySecret: config.storage.oss.secret,
      bucket: config.storage.oss.assetsBucket,
    })
  }
  await state.oss.put(key, buffer, { headers: { 'Content-Type': contentType } })
}

async function putObject(prefix, buffer, contentType, config) {
  if (!config || !config.storage) throw new Error('Storage configuration is required')
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw Object.assign(new Error('Upload body is empty'), { status: 400 })
  if (buffer.length > config.storage.maxCoverBytes) throw Object.assign(new Error('Upload body is too large'), { status: 413 })

  const normalizedType = normalizeContentType(contentType)
  const key = genKey(prefix, normalizedType)
  if (config.storage.driver === 'oss') await putOss(config, key, buffer, normalizedType)
  else if (config.storage.driver === 's3') await putS3(config, key, buffer, normalizedType)
  else await putDisk(config, key, buffer)
  return `${publicBase(config)}/${key}`
}

function managedKey(url, config) {
  if (typeof url !== 'string') return null
  const prefix = `${publicBase(config)}/`
  if (!url.startsWith(prefix)) return null
  const key = url.slice(prefix.length)
  return key && !key.includes('..') && !key.startsWith('/') ? key : null
}

async function deleteObject(url, config) {
  const key = managedKey(url, config)
  if (!key) return false

  if (config.storage.driver === 'disk') {
    const uploadDir = getUploadDir(config)
    const full = path.resolve(uploadDir, key)
    if (!full.startsWith(`${uploadDir}${path.sep}`)) return false
    try {
      await fs.promises.unlink(full)
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
    return true
  }

  const state = clientState(config)
  if (config.storage.driver === 's3') {
    const sdk = require('@aws-sdk/client-s3')
    if (!state.s3) {
      state.s3 = new sdk.S3Client({
        endpoint: config.storage.s3.endpoint || undefined,
        region: config.storage.s3.region,
        credentials: {
          accessKeyId: config.storage.s3.accessKeyId,
          secretAccessKey: config.storage.s3.secretAccessKey,
        },
      })
    }
    await state.s3.send(new sdk.DeleteObjectCommand({ Bucket: config.storage.s3.bucket, Key: key }))
  } else {
    const OSS = require('ali-oss')
    if (!state.oss) {
      state.oss = new OSS({
        region: config.storage.oss.region,
        accessKeyId: config.storage.oss.accessKeyId,
        accessKeySecret: config.storage.oss.secret,
        bucket: config.storage.oss.assetsBucket,
      })
    }
    await state.oss.delete(key)
  }
  return true
}

async function bestEffortDeleteObject(url, config) {
  try {
    return await deleteObject(url, config)
  } catch (error) {
    console.warn('[storage] cleanup failed:', error.message)
    return false
  }
}

module.exports = { putObject, deleteObject, bestEffortDeleteObject, getUploadDir, normalizeContentType }
