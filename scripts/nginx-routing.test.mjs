import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'

const template = readFileSync(new URL('../deploy/nginx/templates/default.conf.template', import.meta.url), 'utf8')
const https = template.slice(template.indexOf('# ---- HTTPS'))

test('SPA fallback checks files, never public directories that collide with page routes', () => {
  assert.ok(statSync(new URL('../apps/web/public/dashboard', import.meta.url)).isDirectory())
  const location = https.match(/location \/ \{([^}]+)\}/)?.[1]
  assert.ok(location, 'HTTPS SPA location exists')
  // $uri/ accepts public/dashboard as a directory: /dashboard redirects, then returns 403.
  assert.match(location, /try_files\s+\$uri\s+\/index\.html\s*;/)
  assert.doesNotMatch(location, /\$uri\//)
})

test('static resources keep real 404 and existing cache headers', () => {
  const assets = https.match(/location \/assets\/ \{([^}]+)\}/)?.[1]
  const media = https.match(/location ~\* \^\/\(models\|thumbnails\|textures\|optimized\|resource\|fonts\|blockly-media\)\/ \{([^}]+)\}/)?.[1]
  for (const block of [assets, media]) {
    assert.ok(block, 'dedicated static location exists')
    assert.match(block, /try_files\s+\$uri\s+=404\s*;/)
    assert.doesNotMatch(block, /\/index\.html/)
  }
  assert.match(assets, /add_header Cache-Control "public, immutable";/)
  assert.match(media, /add_header Cache-Control "public, must-revalidate";/)
  assert.match(https, /location = \/index\.html \{\s*add_header Cache-Control "no-cache";/)
})

test('API and uploads remain upstream routes without SPA interception', () => {
  for (const prefix of ['api', 'uploads']) {
    const block = https.match(new RegExp(`location /${prefix}/ \\{([^}]+)\\}`))?.[1]
    assert.ok(block, `${prefix} proxy exists`)
    assert.match(block, /proxy_pass http:\/\/fwx_api;/)
    assert.doesNotMatch(block, /try_files|error_page|proxy_intercept_errors/)
    assert.match(block, /proxy_set_header Host \$host;/)
    assert.match(block, /proxy_set_header X-Forwarded-Proto \$scheme;/)
  }
  assert.match(https, /ssl_protocols TLSv1\.2 TLSv1\.3;/)
  assert.match(https, /ssl_ciphers HIGH:!aNULL:!MD5;/)
})
