// 给 OSS 公共读资产桶配 CORS，允许站点跨域读取 GLB/贴图（浏览器 fetch/GLTFLoader 需要）。
// 桶「公共读」只让 curl 能下；浏览器跨域抓取还需桶返回 Access-Control-Allow-Origin。
// 用法（需 ali-oss，可在 apps/api 目录跑）：
//   OSS_REGION=.. OSS_ACCESS_KEY_ID=.. OSS_SECRET=.. OSS_ASSETS_BUCKET=fwx-assets node deploy/scripts/set-oss-cors.js
const OSS = require('ali-oss')

const client = new OSS({
  region: process.env.OSS_REGION,
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_SECRET,
  bucket: process.env.OSS_ASSETS_BUCKET,
})

const rules = [{
  allowedOrigin: [
    'https://flightwoodx.com', 'https://www.flightwoodx.com',
    'https://flightwoodx.cn', 'https://www.flightwoodx.cn',
  ],
  allowedMethod: ['GET', 'HEAD'],
  allowedHeader: ['*'],
  exposeHeader: ['ETag', 'Content-Length', 'Content-Type'],
  maxAgeSeconds: 600,
}]

client.putBucketCORS(process.env.OSS_ASSETS_BUCKET, rules)
  .then(() => console.log('✅ CORS 已配置到桶', process.env.OSS_ASSETS_BUCKET))
  .catch((e) => { console.error('配置失败:', e.message); process.exit(1) })
