import { execFileSync } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'

const MAX_TEXT_BYTES = 2 * 1024 * 1024
const ALLOWED_EXACT = new Set([
  'scripts/check-secrets.mjs',
])

const sensitiveFile = /(^|\/)(\.env|id_(?:rsa|dsa|ecdsa|ed25519)|[^/]+\.(?:pem|key|p12|pfx))$/i
const allowedSensitiveFile = /(^|\/)\.env\.(?:example|sample|template)$/i
const rules = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['AWS access key', /AKIA[0-9A-Z]{16}/],
  ['GitHub token', /gh[pousr]_[A-Za-z0-9]{20,}/],
  ['Slack token', /xox[baprs]-[A-Za-z0-9-]{20,}/],
  ['live secret key', /(?:sk_live_|sk-[A-Za-z0-9_-]{20,})/],
  ['credentialed MongoDB URI', /mongodb(?:\+srv)?:\/\/[^\s"'<>/:]+:[^\s"'<>@]+@/],
]

const listed = execFileSync(
  'git',
  ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
  { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
)

const findings = []
for (const file of listed.split('\0').filter(Boolean)) {
  if (ALLOWED_EXACT.has(file)) continue
  if (sensitiveFile.test(file) && !allowedSensitiveFile.test(file)) {
    findings.push({ file, rule: 'sensitive filename' })
    continue
  }

  let stat
  try {
    stat = statSync(file)
  } catch {
    continue
  }
  if (!stat.isFile() || stat.size > MAX_TEXT_BYTES) continue

  const bytes = readFileSync(file)
  if (bytes.includes(0)) continue
  const text = bytes.toString('utf8')
  for (const [rule, pattern] of rules) {
    if (pattern.test(text)) findings.push({ file, rule })
  }
}

if (findings.length > 0) {
  console.error('Potential secrets found:')
  for (const finding of findings) console.error(`- ${finding.file}: ${finding.rule}`)
  process.exit(1)
}

console.log('Secret scan passed')
