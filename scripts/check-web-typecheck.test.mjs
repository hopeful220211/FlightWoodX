import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('web typecheck explicitly checks application and tooling projects', () => {
  const pkg = JSON.parse(readFileSync(new URL('../apps/web/package.json', import.meta.url), 'utf8'))
  // The root tsconfig contains files:[]; tsc --noEmit alone checks no application files.
  assert.match(pkg.scripts.typecheck, /tsc --noEmit -p tsconfig\.app\.json/)
  assert.match(pkg.scripts.typecheck, /tsc --noEmit -p tsconfig\.node\.json/)
})
