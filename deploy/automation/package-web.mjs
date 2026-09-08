import { constants, createReadStream, createWriteStream } from 'node:fs';
import { lstat, mkdir, mkdtemp, open, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const RELEASE_LIMITS = Object.freeze({ archiveBytes: 256 * 1024 * 1024, expandedBytes: 512 * 1024 * 1024, manifestBytes: 2 * 1024 * 1024, members: 10_000 });
const COMMIT = /^[0-9a-f]{40}$/;

export function validatePublicPath(path) {
  if (typeof path !== 'string' || !path || isAbsolute(path) || /[\\\u0000-\u001f\u007f]/u.test(path) || Buffer.byteLength(path) > 1024) throw new Error('Invalid public file path');
  const segments = path.split('/');
  if (segments.length > 32 || segments.some(segment => !segment || segment.startsWith('.') || segment === 'node_modules')) throw new Error('Hidden or unsafe public path');
  const name = segments.at(-1).toLowerCase();
  if (name === 'release.json' || /^(?:id_(?:rsa|dsa|ecdsa|ed25519)(?:\.pub)?|authorized_keys|known_hosts|credentials(?:\..*)?|secrets?(?:\..*)?)$/u.test(name) || /\.(?:pem|key|p12|pfx|sql|dump|bak|sqlite3?|tfstate|log|map)$/u.test(name)) throw new Error('Sensitive or reserved public file');
  return path;
}

export async function sha256File(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}

// PAX is needed for existing long Chinese asset names. Only relative regular
// file entries are emitted; no parent directories, ownership or source mtimes.
const TAR_PROGRAM = `import gzip,json,os,sys,tarfile
root=sys.argv[1]
with open(os.path.join(root,"release.json"),encoding="utf-8") as f:
    manifest=json.load(f)
names=[entry["path"] for entry in manifest["files"]]+["release.json"]
with os.fdopen(3,"wb",closefd=False) as output:
    with gzip.GzipFile(filename="",mode="wb",fileobj=output,mtime=0) as compressed:
        with tarfile.open(fileobj=compressed,mode="w",format=tarfile.PAX_FORMAT) as archive:
            for name in names:
                path=os.path.join(root,*name.split("/"))
                info=tarfile.TarInfo(name)
                info.size=os.path.getsize(path)
                info.mode=0o644
                info.uid=info.gid=info.mtime=0
                with open(path,"rb") as source:
                    archive.addfile(info,source)
`;

function createArchive(stage, descriptor) {
  return new Promise((fulfill, reject) => {
    const child = spawn('python3', ['-I', '-c', TAR_PROGRAM, stage], { stdio: ['ignore', 'ignore', 'ignore', descriptor], env: { PATH: process.env.PATH, LC_ALL: 'C.UTF-8' } });
    child.on('error', () => reject(new Error('Python 3 is required to package public assets')));
    child.on('close', code => code === 0 ? fulfill() : reject(new Error('Public archive creation failed')));
  });
}

export async function packageWeb(distPath, commit, archivePath) {
  if (!COMMIT.test(commit)) throw new Error('A full lowercase commit SHA is required');
  const requestedRoot = resolve(distPath);
  const rootInfo = await lstat(requestedRoot);
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) throw new Error('The distribution must be a real directory');
  const root = await realpath(requestedRoot);
  const destination = resolve(archivePath);
  const outputDirectory = await realpath(dirname(destination));
  const canonicalOutput = join(outputDirectory, destination.split('/').at(-1));
  const relOutput = relative(root, canonicalOutput);
  if (!relOutput || (!relOutput.startsWith('../') && !isAbsolute(relOutput))) throw new Error('The archive must be outside the distribution');
  try { await lstat(destination); throw new Error('The output archive already exists'); } catch (error) { if (error.code !== 'ENOENT') throw error; }

  const stage = await mkdtemp(join(tmpdir(), 'fwx-web-package-'));
  let archiveHandle;
  let createdArchive = false;
  let completed = false;
  try {
    const files = [];
    let members = 1; // release.json plus each file and its implicit directories.
    let expandedBytes = 0;
    async function visit(directory, prefix = '') {
      const entries = await readdir(directory, { withFileTypes: true });
      entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
      for (const entry of entries) {
        const name = prefix ? `${prefix}/${entry.name}` : entry.name;
        const source = join(root, ...name.split('/'));
        const info = await lstat(source);
        // Empty tracked placeholders are build debris, not public assets. This
        // exception never permits a link, a hidden directory or nonempty data.
        if (entry.name === '.gitkeep' && info.isFile() && !info.isSymbolicLink() && info.nlink === 1 && info.size === 0) continue;
        validatePublicPath(name);
        if (++members > RELEASE_LIMITS.members) throw new Error('Public release exceeds its member limit');
        if (info.isSymbolicLink() || (!info.isDirectory() && !info.isFile())) throw new Error('Public assets must be regular files, not links or devices');
        if (info.isDirectory()) { await visit(source, name); continue; }
        if (info.nlink !== 1) throw new Error('Hardlinked public files are forbidden');
        expandedBytes += info.size;
        if (expandedBytes > RELEASE_LIMITS.expandedBytes) throw new Error('Public release exceeds its expanded size limit');
        if (await realpath(source) !== source) throw new Error('Public file ancestors must not be links');
        const handle = await open(source, constants.O_RDONLY | constants.O_NOFOLLOW);
        try {
          const opened = await handle.stat();
          if (!opened.isFile() || opened.nlink !== 1 || opened.ino !== info.ino || opened.dev !== info.dev || opened.size !== info.size) throw new Error('Public source changed while packaging');
          const target = join(stage, ...name.split('/'));
          await mkdir(dirname(target), { recursive: true, mode: 0o700 });
          const hash = createHash('sha256');
          let count = 0;
          let tail = '';
          const verifier = new Transform({ transform(chunk, encoding, done) {
            count += chunk.length;
            if (count > info.size) return done(new Error('Public file changed while packaging'));
            const text = tail + chunk.toString('latin1');
            if (/-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----/u.test(text)) return done(new Error('Private key content cannot be published'));
            tail = text.slice(-100);
            hash.update(chunk);
            done(null, chunk);
          } });
          await pipeline(handle.createReadStream({ autoClose: false }), verifier, createWriteStream(target, { flags: 'wx', mode: 0o600 }));
          const after = await handle.stat();
          if (count !== info.size || after.mtimeMs !== opened.mtimeMs || after.ctimeMs !== opened.ctimeMs) throw new Error('Public source changed while packaging');
          files.push({ path: name, sha256: hash.digest('hex'), size: count });
        } finally { await handle.close(); }
      }
    }
    await visit(root);
    if (!files.some(file => file.path === 'index.html')) throw new Error('A release must contain index.html');
    const manifest = Buffer.from(`${JSON.stringify({ schemaVersion: 1, commit, files })}\n`);
    if (manifest.length > RELEASE_LIMITS.manifestBytes || expandedBytes + manifest.length > RELEASE_LIMITS.expandedBytes) throw new Error('Release manifest exceeds its size limit');
    await writeFile(join(stage, 'release.json'), manifest, { flag: 'wx', mode: 0o600 });
    archiveHandle = await open(destination, 'wx', 0o600);
    createdArchive = true;
    await createArchive(stage, archiveHandle.fd);
    if ((await archiveHandle.stat()).size > RELEASE_LIMITS.archiveBytes) throw new Error('Compressed release exceeds 256 MiB');
    await archiveHandle.close();
    archiveHandle = null;
    const hash = await sha256File(destination);
    completed = true;
    return hash;
  } finally {
    if (archiveHandle) await archiveHandle.close();
    if (!completed && createdArchive) await rm(destination, { force: true });
    await rm(stage, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [dist, commit, archive, ...extra] = process.argv.slice(2);
  if (!dist || !commit || !archive || extra.length) { process.stderr.write('Usage: node package-web.mjs <dist> <40-character SHA> <new archive.tar.gz>\n'); process.exitCode = 1; }
  else await packageWeb(dist, commit, archive).then(hash => process.stdout.write(`${hash}\n`)).catch(() => { process.stderr.write('Public release packaging failed; check paths, links, sensitive files and size limits.\n'); process.exitCode = 1; });
}
