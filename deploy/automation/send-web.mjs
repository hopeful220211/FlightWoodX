import { createReadStream } from 'node:fs';
import { lstat, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { RELEASE_LIMITS, sha256File, validatePublicPath } from './package-web.mjs';

const COMMIT = /^[0-9a-f]{40}$/;
const HASH = /^[0-9a-f]{64}$/;
const REMOTE_COMMAND = /^(?:status|rollback [0-9a-f]{40}|publish [0-9a-f]{40} [0-9a-f]{64})$/;
const ORIGIN = 'https://flightwoodx.com';

export function sshArguments({ host, port = '22', keyPath, knownHostsPath }, command) {
  if (typeof host !== 'string' || !/^[a-zA-Z0-9](?:[a-zA-Z0-9.-]{0,251}[a-zA-Z0-9])?$/u.test(host) || host.includes('..')) throw new Error('Invalid deployment host');
  if (!/^\d{1,5}$/u.test(String(port)) || Number(port) < 1 || Number(port) > 65535) throw new Error('Invalid deployment port');
  if (!REMOTE_COMMAND.test(command)) throw new Error('Unsupported deployment command');
  if (!keyPath || !knownHostsPath) throw new Error('Deployment identity files are required');
  return ['-F', '/dev/null', '-T', '-p', String(Number(port)), '-i', keyPath,
    '-o', 'StrictHostKeyChecking=yes', '-o', `UserKnownHostsFile=${knownHostsPath}`,
    '-o', 'GlobalKnownHostsFile=/dev/null', '-o', 'UpdateHostKeys=no',
    '-o', 'BatchMode=yes', '-o', 'IdentitiesOnly=yes', '-o', 'IdentityAgent=none',
    '-o', 'PasswordAuthentication=no', '-o', 'KbdInteractiveAuthentication=no',
    '-o', 'PubkeyAuthentication=yes', '-o', 'NumberOfPasswordPrompts=0',
    '-o', 'ForwardAgent=no', '-o', 'ClearAllForwardings=yes', '-o', 'PermitLocalCommand=no',
    '-o', 'ProxyCommand=none', '-o', 'ConnectTimeout=20', '-o', 'ConnectionAttempts=1',
    '-o', 'ServerAliveInterval=15', '-o', 'ServerAliveCountMax=3', '-o', 'LogLevel=ERROR',
    `fwx-deploy@${host}`, command];
}

export function safeRemoteStatus(output) {
  if (typeof output !== 'string' || output.length > 16_384) throw new Error('Invalid deployment status');
  let value;
  try { value = JSON.parse(output); } catch { throw new Error('Invalid deployment status'); }
  if (!value || value.schemaVersion !== 1 || typeof value.ready !== 'boolean' || !(value.currentCommit === null || COMMIT.test(value.currentCommit)) || !(value.previousCommit === null || COMMIT.test(value.previousCommit))) throw new Error('Invalid deployment status');
  return { schemaVersion: 1, currentCommit: value.currentCommit, previousCommit: value.previousCommit, ready: value.ready };
}

function transport(args, archive) {
  return new Promise((fulfill, reject) => {
    const child = spawn('ssh', args, { stdio: ['pipe', 'pipe', 'ignore'], env: { PATH: process.env.PATH, LC_ALL: 'C' } });
    let output = '';
    let failed = false;
    let input;
    const fail = () => { failed = true; input?.destroy(); child.kill('SIGTERM'); reject(new Error('Secure deployment connection failed')); };
    const timeout = setTimeout(fail, 15 * 60 * 1000);
    child.on('error', fail);
    child.stdin.on('error', () => { /* The exit status handles remote rejection without exposing transport logs. */ });
    child.stdout.on('data', chunk => { output += chunk.toString('utf8'); if (output.length > 16_384) fail(); });
    child.on('close', code => {
      clearTimeout(timeout);
      input?.destroy();
      if (failed) return;
      if (code !== 0) { reject(new Error('Secure deployment command was rejected or failed')); return; }
      try { fulfill(safeRemoteStatus(output)); } catch { reject(new Error('Server returned invalid deployment status')); }
    });
    if (archive) { input = createReadStream(archive); input.on('error', fail); input.pipe(child.stdin); }
    else child.stdin.end();
  });
}

async function publicBytes(path, fetcher, limit) {
  const url = new URL(path, ORIGIN);
  if (url.origin !== ORIGIN) throw new Error('Release check attempted an external URL');
  url.searchParams.set('release-check', String(Date.now()));
  const response = await fetcher(url, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(30_000) });
  if (!response.ok || !response.body) throw new Error('Production HTTP check failed');
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.byteLength;
    if (size > limit) throw new Error('Production response exceeded its size limit');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function verifyProduction(commit, fetcher = fetch) {
  let manifest;
  try { manifest = JSON.parse((await publicBytes('/release.json', fetcher, RELEASE_LIMITS.manifestBytes)).toString('utf8')); } catch { throw new Error('Production release manifest is unavailable'); }
  if (manifest.schemaVersion !== 1 || manifest.commit !== commit || !Array.isArray(manifest.files) || manifest.files.length >= RELEASE_LIMITS.members) throw new Error('Production release does not match the tested commit');
  const files = new Map();
  for (const item of manifest.files) {
    validatePublicPath(item.path);
    if (files.has(item.path) || !HASH.test(item.sha256) || !Number.isSafeInteger(item.size) || item.size < 0 || item.size > RELEASE_LIMITS.expandedBytes) throw new Error('Invalid production release manifest');
    files.set(item.path, item);
  }
  async function checkFile(path, maxSize) {
    const item = files.get(path);
    if (!item) throw new Error('Production release is missing a required file');
    const bytes = await publicBytes(`/${path.split('/').map(encodeURIComponent).join('/')}`, fetcher, maxSize);
    if (bytes.length !== item.size || createHash('sha256').update(bytes).digest('hex') !== item.sha256) throw new Error('Production bytes do not match the release manifest');
    return bytes;
  }
  const html = (await checkFile('index.html', 2 * 1024 * 1024)).toString('utf8');
  const entryPaths = [...html.matchAll(/(?:src|href)=["'](\/assets\/[^"'?#]+\.(?:js|css))["']/gu)].map(match => match[1].slice(1));
  if (!entryPaths.some(path => path.endsWith('.js'))) throw new Error('Production entry script was not found');
  for (const path of new Set(entryPaths)) await checkFile(path, 16 * 1024 * 1024);
  const health = JSON.parse((await publicBytes('/api/health', fetcher, 16_384)).toString('utf8'));
  if (health.status !== 'OK' || health.db !== 'connected') throw new Error('Production API health check failed');
}

export async function sendWeb(request, { env = process.env, transport: run = transport, verify = verifyProduction } = {}) {
  const { operation, commit, archive, archiveSha256 } = request;
  if (!['publish', 'status', 'rollback'].includes(operation)) throw new Error('Unsupported deployment operation');
  if (operation !== 'status' && !COMMIT.test(commit)) throw new Error('A full lowercase commit SHA is required');
  if (operation === 'publish') {
    if (!HASH.test(archiveSha256)) throw new Error('A release digest is required');
    const info = await lstat(archive);
    if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1 || info.size > RELEASE_LIMITS.archiveBytes || info.size < 1) throw new Error('Invalid release archive');
    if (await sha256File(archive) !== archiveSha256) throw new Error('Release archive digest mismatch');
  }
  if (typeof env.SSH_KEY !== 'string' || env.SSH_KEY.length < 32 || env.SSH_KEY.length > 64 * 1024 || typeof env.SSH_KNOWN_HOSTS !== 'string' || !env.SSH_KNOWN_HOSTS.trim() || env.SSH_KNOWN_HOSTS.length > 64 * 1024) throw new Error('Production deployment credentials are not configured');
  const directory = await mkdtemp(join(tmpdir(), 'fwx-web-identity-'));
  try {
    const keyPath = join(directory, 'identity');
    const knownHostsPath = join(directory, 'known_hosts');
    await writeFile(keyPath, `${env.SSH_KEY.trim()}\n`, { mode: 0o600, flag: 'wx' });
    await writeFile(knownHostsPath, `${env.SSH_KNOWN_HOSTS.trim()}\n`, { mode: 0o600, flag: 'wx' });
    const config = { host: env.FWX_DEPLOY_HOST, port: env.FWX_DEPLOY_PORT || '22', keyPath, knownHostsPath };
    const command = operation === 'status' ? 'status' : operation === 'rollback' ? `rollback ${commit}` : `publish ${commit} ${archiveSha256}`;
    const state = await run(sshArguments(config, command), operation === 'publish' ? archive : undefined);
    if (operation !== 'status' && state.ready !== true) throw new Error('Server has an unfinished deployment transaction');
    if (operation === 'publish') {
      if (state.currentCommit !== commit) throw new Error('Server did not confirm the requested release');
      try { await verify(commit); } catch {
        try {
          const restored = safeRemoteStatus(JSON.stringify(await run(sshArguments(config, `rollback ${commit}`))));
          if (!restored.ready || restored.currentCommit === commit || (state.previousCommit && restored.currentCommit !== state.previousCommit)) throw new Error('Unconfirmed rollback');
        } catch { throw new Error('Production verification failed and rollback was not confirmed; operator inspection is required'); }
        throw new Error('Production verification failed; the preceding frontend release was restored');
      }
    }
    return safeRemoteStatus(JSON.stringify(state));
  } finally { await rm(directory, { recursive: true, force: true }); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [operation, commit, archive, archiveSha256, ...extra] = process.argv.slice(2);
  if (extra.length || (operation === 'status' && commit) || (operation === 'rollback' && archive)) { process.stderr.write('Invalid deployment arguments\n'); process.exitCode = 1; }
  else await sendWeb({ operation, commit, archive, archiveSha256 }).then(state => process.stdout.write(`${JSON.stringify(state)}\n`)).catch(() => { process.stderr.write('Frontend deployment did not complete. Check the deployment configuration and server status; transport output is withheld to protect credentials.\n'); process.exitCode = 1; });
}
