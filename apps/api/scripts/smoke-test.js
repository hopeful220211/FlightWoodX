#!/usr/bin/env node

/**
 * 冒烟测试（RFC-014 W10）：对一个运行中的后端做非破坏性健康检查。
 * 全部为只读 / 健康检查，绝不在数据库里造垃圾数据。
 *
 * 用 Node 20+ 内置 fetch，零依赖。
 *
 * Usage:
 *   cd apps/api && node scripts/smoke-test.js
 *   BASE_URL=http://localhost:3000 SMOKE_TOKEN=<jwt> node scripts/smoke-test.js
 *
 * 环境变量：
 *   BASE_URL     后端地址，默认 http://localhost:3000
 *   SMOKE_TOKEN  可选；提供则额外测一次带 token 的 GET /api/projects 期望 200
 */

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const SMOKE_TOKEN = process.env.SMOKE_TOKEN

let failed = 0

function pass(name, detail) {
  console.log(`✅ ${name}${detail ? ` — ${detail}` : ''}`)
}

function fail(name, detail) {
  failed += 1
  console.log(`❌ ${name}${detail ? ` — ${detail}` : ''}`)
}

async function check(name, fn) {
  try {
    await fn()
  } catch (err) {
    fail(name, err.message)
  }
}

async function main() {
  console.log(`[smoke] Target: ${BASE_URL}\n`)

  // 1. 健康检查
  await check('GET /healthz', async () => {
    const res = await fetch(`${BASE_URL}/healthz`)
    if (res.status !== 200) throw new Error(`期望 200，实际 ${res.status}`)
    const body = await res.json()
    if (body.status !== 'OK') throw new Error(`status 字段非 OK：${body.status}`)
    if (body.db !== 'connected') throw new Error(`db 字段非 connected：${body.db}`)
    pass('GET /healthz', `status=${body.status} db=${body.db}`)
  })

  // 2. 公开作品列表（W6）：分页信封形状校验
  await check('GET /api/projects/public', async () => {
    const res = await fetch(`${BASE_URL}/api/projects/public`)
    if (res.status !== 200) throw new Error(`期望 200，实际 ${res.status}`)
    const body = await res.json()
    if (!Array.isArray(body.items)) throw new Error('items 不是数组')
    for (const k of ['total', 'page', 'pageSize']) {
      if (typeof body[k] !== 'number') throw new Error(`${k} 不是数字`)
    }
    pass('GET /api/projects/public', `items=${body.items.length} total=${body.total}`)
  })

  // 3. 鉴权保护抽查：不带 token 访问需登录接口应 401
  await check('GET /api/projects (无 token)', async () => {
    const res = await fetch(`${BASE_URL}/api/projects`)
    if (res.status !== 401) throw new Error(`期望 401，实际 ${res.status}`)
    pass('GET /api/projects (无 token)', '正确拒绝未鉴权请求')
  })

  // 4. 可选：带 token 访问需登录接口应 200
  if (SMOKE_TOKEN) {
    await check('GET /api/projects (带 token)', async () => {
      const res = await fetch(`${BASE_URL}/api/projects`, {
        headers: { Authorization: `Bearer ${SMOKE_TOKEN}` },
      })
      if (res.status !== 200) throw new Error(`期望 200，实际 ${res.status}`)
      const body = await res.json()
      if (!Array.isArray(body.items)) throw new Error('items 不是数组')
      pass('GET /api/projects (带 token)', `items=${body.items.length}`)
    })
  } else {
    console.log('⏭️  GET /api/projects (带 token) — 跳过（未设置 SMOKE_TOKEN）')
  }

  console.log('')
  if (failed > 0) {
    console.error(`[smoke] ${failed} 项失败`)
    process.exit(1)
  }
  console.log('[smoke] 全部通过')
  process.exit(0)
}

main().catch((err) => {
  console.error('[smoke] FATAL', err)
  process.exit(1)
})
