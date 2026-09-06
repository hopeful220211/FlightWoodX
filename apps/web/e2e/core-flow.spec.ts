import { randomBytes } from 'node:crypto'
import { expect, test } from '@playwright/test'
import type { BrowserContext, Locator, Page } from '@playwright/test'
import { DroneDesignSnapshotSchema, PART_REGISTRY } from '@fwx/parts-schema'
import type { DroneDesignSnapshot } from '@fwx/parts-schema'

/**
 * Requires a running local Web app and its isolated API/database; no mocks or production writes.
 * Each user-flow test creates a unique e2e_* account. Retain or discard the whole test
 * database after the run; these tests never delete an existing account or unrelated work.
 * Credentials only live in memory. Tracing/video are disabled in playwright.config.ts.
 */
async function guardLocalNetwork(context: BrowserContext) {
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (['http:', 'https:'].includes(url.protocol)
      && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
      await route.abort('blockedbyclient')
      return
    }
    await route.continue()
  })
}

function observeBrowser(page: Page) {
  const failures: string[] = []
  page.on('pageerror', error => failures.push(error.message))
  page.on('response', response => {
    if (response.status() >= 400) {
      failures.push(`${response.status()} ${response.request().method()} ${new URL(response.url()).pathname}`)
    }
  })
  page.on('requestfailed', request => {
    const failure = request.failure()?.errorText ?? 'request failed'
    // A navigation may cancel an obsolete image or data request normally.
    if (!failure.includes('ERR_ABORTED')) failures.push(`${failure} ${new URL(request.url()).pathname}`)
  })
  return failures
}

async function registerDedicatedAccount(page: Page) {
  const suffix = randomBytes(6).toString('hex')
  const username = `e2e_${suffix}`
  const password = randomBytes(24).toString('base64url')
  await page.goto('/register')
  await page.getByLabel('用户名', { exact: true }).fill(username)
  await page.getByLabel('邮箱', { exact: true }).fill(`${username}@example.test`)
  try {
    // Do not include a generated password in an error or an attachment.
    try {
      await page.getByLabel('密码', { exact: true }).fill(password)
    } catch {
      throw new Error('Could not fill the test registration password field.')
    }
    const registered = page.waitForResponse(response =>
      new URL(response.url()).pathname.endsWith('/api/auth/register')
      && response.request().method() === 'POST')
    await page.getByRole('button', { name: '创建账号', exact: true }).click()
    const response = await registered
    expect(response.ok(), `The isolated API registration returned status ${response.status()}`).toBe(true)
    await expect(page).toHaveURL(/\/dashboard$/)
  } finally {
    // Clear the field before failure artifacts are collected if registration fails.
    if (await page.getByLabel('密码', { exact: true }).count()) {
      await page.getByLabel('密码', { exact: true }).fill('').catch(() => {})
    }
  }
  return `E2E ${suffix}`
}

async function readDesign(page: Page): Promise<DroneDesignSnapshot | null> {
  const raw = await page.evaluate(() => {
    const persisted = localStorage.getItem('drone_app_design_store')
    if (!persisted) return null
    const state = JSON.parse(persisted).state
    return state.designs.find((design: { id: string }) => design.id === state.activeDesignId) ?? null
  })
  return raw ? DroneDesignSnapshotSchema.parse(raw) : null
}

async function buildAndSave(page: Page, name: string) {
  await page.getByRole('button', { name: '新建作品', exact: true }).first().click()
  await page.getByLabel('无人机名字', { exact: true }).fill(name)
  await page.getByRole('button', { name: '开始搭建', exact: true }).click()
  await expect(page).toHaveURL(/\/design\/design-[^/]+$/)
  const designId = new URL(page.url()).pathname.split('/').at(-1)!

  await page.getByRole('button', { name: '添加主板件01', exact: true }).click()
  await page.getByRole('button', { name: '下一步 →', exact: true }).click()
  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: '添加起落架01', exact: true }).click()
  }
  await page.getByRole('button', { name: '下一步 →', exact: true }).click()
  await page.getByRole('button', { name: '添加保护板01', exact: true }).click()
  await page.getByRole('button', { name: '下一步 →', exact: true }).click()
  await page.getByRole('button', { name: '下一步 →', exact: true }).click()

  const saveResponse = page.waitForResponse(response => {
    if (!new URL(response.url()).pathname.endsWith('/api/drone-designs')
      || response.request().method() !== 'PUT') return false
    // An earlier autosave may still be in flight; await this completed snapshot.
    const submitted = response.request().postDataJSON()
    return submitted.localId === designId && submitted.designData?.currentStep === 'REVIEW'
      && submitted.designData?.parts.length === 6
  })
  await page.getByRole('button', { name: '保存草稿', exact: true }).click()
  const response = await saveResponse
  expect(response.ok(), 'The real API must accept the design save').toBe(true)
  const body = await response.json()
  const saved = DroneDesignSnapshotSchema.parse(body.design.designData)
  expect(saved.id).toBe(designId)
  expect(saved.parts).toHaveLength(6)
  expect(new Set(saved.parts.map(part => part.instanceId)).size).toBe(6)
  expect(saved.parts.filter(part => part.category === 'mainboard')).toHaveLength(1)
  expect(saved.parts.filter(part => part.category === 'landing')).toHaveLength(4)
  expect(saved.parts.filter(part => part.category === 'guard')).toHaveLength(1)
  expect(saved.parts.map(part => part.partId).sort()).toEqual([
    'arm_01', 'arm_01', 'arm_01', 'arm_01', 'core_hub_01', 'joint_01',
  ])
  for (const part of saved.parts.filter(part => part.category !== 'mainboard')) {
    expect(part.attachedTo?.parentInstanceId, 'Every added child must have an existing parent').toBeTruthy()
    expect(saved.parts.some(parent => parent.instanceId === part.attachedTo?.parentInstanceId)).toBe(true)
  }

  await page.reload()
  await expect(page.getByRole('button', { name: '继续积木编程', exact: true })).toBeVisible()
  await expect.poll(async () => (await readDesign(page))?.parts.length).toBe(6)
  expect((await readDesign(page))?.currentStep).toBe('REVIEW')
  return designId
}

async function saveExampleProgram(page: Page) {
  await page.getByRole('button', { name: '继续积木编程', exact: true }).click()
  await expect(page).toHaveURL(/\/code\/design-[^/]+$/)
  await page.getByRole('button', { name: '从示例开始', exact: true }).click()
  await expect(page.getByRole('button', { name: '运行', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.getByText('已与账号同步', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: '运行', exact: true })).toBeEnabled()
  await expect(page.getByRole('button', { name: '从示例开始', exact: true })).toHaveCount(0)
}

async function runSimulation(page: Page) {
  await page.getByRole('button', { name: '运行', exact: true }).click()
  await expect(page).toHaveURL(/\/simulator\/design-[^/]+$/)
  await expect(page.getByText('视觉仿真 · 用于检查指令流程，不代表真实飞行结果', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '运行', exact: true }).click()
  await expect(page.getByRole('button', { name: '停止', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: /完成！/ })).toBeVisible({ timeout: 45_000 })
  await expect(page.getByRole('heading', { name: /运行失败|撞到障碍了/ })).toHaveCount(0)
}

async function expectInsideViewport(page: Page, locator: Locator) {
  const bounds = await locator.boundingBox()
  const viewport = page.viewportSize()!
  expect(bounds, 'The control must be visible').not.toBeNull()
  expect(bounds!.x).toBeGreaterThanOrEqual(0)
  expect(bounds!.y).toBeGreaterThanOrEqual(0)
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width + 1)
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height + 1)
}

test.beforeEach(async ({ context }) => {
  await guardLocalNetwork(context)
})

test('desktop: register, assemble, save, restore on another device, program, and simulate', async ({ page, browser, baseURL }) => {
  const failures = observeBrowser(page)
  const name = await registerDedicatedAccount(page)
  const designId = await buildAndSave(page, name)
  await saveExampleProgram(page)

  // Copy only the authenticated session into a new browser context. No design/program
  // localStorage is transferred, so restoration must use the real API records.
  const auth = await page.evaluate(() => localStorage.getItem('auth-storage'))
  if (!auth || !baseURL) throw new Error('The test account session was not persisted.')
  const restoredContext = await browser.newContext({
    baseURL,
    viewport: { width: 1440, height: 900 },
    serviceWorkers: 'block',
    storageState: { cookies: [], origins: [{ origin: new URL(baseURL).origin, localStorage: [{ name: 'auth-storage', value: auth }] }] },
  })
  await guardLocalNetwork(restoredContext)
  const restoredPage = await restoredContext.newPage()
  const restoredFailures = observeBrowser(restoredPage)
  try {
    await restoredPage.goto(`/design/${designId}`)
    await expect.poll(async () => (await readDesign(restoredPage))?.parts.length).toBe(6)
    await restoredPage.getByRole('button', { name: '继续积木编程', exact: true }).click()
    await expect(restoredPage.getByRole('button', { name: '运行', exact: true })).toBeEnabled()
    await expect(restoredPage.getByRole('button', { name: '从示例开始', exact: true })).toHaveCount(0)
    await runSimulation(restoredPage)
    expect(restoredFailures).toEqual([])
  } finally {
    await restoredContext.close()
  }
  expect(failures).toEqual([])
})

test.describe('mobile 390 × 844', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('independent account: complete the existing flow with visible controls', async ({ page }) => {
    const failures = observeBrowser(page)
    const name = await registerDedicatedAccount(page)
    await buildAndSave(page, name)
    await expectInsideViewport(page, page.getByRole('button', { name: '继续积木编程', exact: true }))
    await expectInsideViewport(page, page.locator('[aria-current="step"]'))
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await saveExampleProgram(page)
    await expectInsideViewport(page, page.getByRole('button', { name: '运行', exact: true }))
    await runSimulation(page)
    expect(failures).toEqual([])
  })
})

test('read-only: every registered official model and thumbnail is served as a valid binary asset', async ({ request, baseURL }) => {
  if (!baseURL) throw new Error('The local test origin is required.')
  const origin = new URL(baseURL).origin
  expect(PART_REGISTRY.length, 'The registry must contain official parts').toBeGreaterThan(0)

  for (const part of PART_REGISTRY) {
    await test.step(`${part.partNumber}: model and thumbnail`, async () => {
      const assets = [
        { kind: 'glb', path: part.modelPath },
        { kind: 'png', path: `/thumbnails/${part.thumbnailFile}` },
      ] as const

      for (const asset of assets) {
        const url = new URL(asset.path, baseURL)
        // API requests do not pass through the browser's route guard. Validate before
        // issuing any GET and never follow redirects to a potentially external host.
        expect(url.origin, `${part.partNumber} must use same-origin assets`).toBe(origin)
        expect(url.username || url.password, 'Asset URLs must not contain credentials').toBe('')
        const response = await request.get(url.href, { maxRedirects: 0 })
        try {
          expect(response.status(), asset.path).toBe(200)
          expect(response.headers()['content-type'] ?? '', asset.path).not.toContain('text/html')
          const body = await response.body()

          if (asset.kind === 'glb') {
            expect(body.length, asset.path).toBeGreaterThanOrEqual(12)
            expect(body.subarray(0, 4).toString('ascii'), asset.path).toBe('glTF')
            expect(body.readUInt32LE(4), `${asset.path}: GLB version`).toBe(2)
            expect(body.readUInt32LE(8), `${asset.path}: declared binary length`).toBe(body.length)
          } else {
            expect(body.length, asset.path).toBeGreaterThanOrEqual(24)
            expect(body.subarray(0, 8).toString('hex'), asset.path).toBe('89504e470d0a1a0a')
            expect(body.subarray(12, 16).toString('ascii'), `${asset.path}: PNG header`).toBe('IHDR')
            expect(body.readUInt32BE(16), `${asset.path}: width`).toBeGreaterThan(0)
            expect(body.readUInt32BE(20), `${asset.path}: height`).toBeGreaterThan(0)
          }
        } finally {
          await response.dispose()
        }
      }
    })
  }
})
