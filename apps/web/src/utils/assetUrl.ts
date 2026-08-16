// utils/assetUrl.ts
//
// RFC-024 §4.8：大文件资产（GLB / 贴图 / 缩略图）不打进前端构建包、也不经 ECS，
// 生产环境全部从对象存储（阿里云 OSS 公共读桶 / CDN）加载。
//
// base 由 Vite 环境变量 VITE_ASSET_BASE 决定：
//   - 未设置（本地开发/自托管）→ 空串，路径保持 '/models/...'，由 dev server / nginx 就地服务
//   - 生产 → 指向 OSS/CDN 域名（如 https://fwx-assets.oss-cn-chengdu.aliyuncs.com）
// 只改「资产 URL 从哪来」，不改任何加载逻辑。
const BASE = (import.meta.env.VITE_ASSET_BASE || '').replace(/\/+$/, '')

/** 把一个仓库内相对资产路径解析为最终 URL（生产指向 OSS，本地保持相对）。 */
export function assetUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path // 已是绝对 URL，原样返回
  const p = path.startsWith('/') ? path : `/${path}`
  return `${BASE}${p}`
}
