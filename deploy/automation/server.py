#!/usr/bin/python3 -I
"""Root-owned, frontend-only deployment endpoint. Never execute uploaded code."""
import fcntl
import gzip
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import signal
import stat
import subprocess
import sys
import tarfile
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request

CONFIG_DIR = Path('/etc/flightwoodx-deploy')
RELEASES = Path('/var/lib/flightwoodx-releases')
PROGRAM = '/usr/local/libexec/flightwoodx-release'
MAX_ARCHIVE = 256 * 1024 * 1024
MAX_CONTENT = 512 * 1024 * 1024
MAX_ENTRIES = 10000
SHA = re.compile(r'[a-f0-9]{40}')
DIGEST = re.compile(r'[a-f0-9]{64}')
SAFE_ENV = {'PATH': '/usr/sbin:/usr/bin:/sbin:/bin', 'LANG': 'C.UTF-8', 'HOME': '/root'}


def validate_command(args):
    valid = args == ['status'] or (len(args) == 2 and args[0] == 'rollback' and SHA.fullmatch(args[1]))
    valid = valid or (len(args) == 3 and args[0] == 'publish' and SHA.fullmatch(args[1]) and DIGEST.fullmatch(args[2]))
    if not valid:
        raise ValueError('Unsupported deployment command')
    return args


def gateway():
    original = os.environ.get('SSH_ORIGINAL_COMMAND', '')
    if not re.fullmatch(r'status|publish [a-f0-9]{40} [a-f0-9]{64}|rollback [a-f0-9]{40}', original):
        raise ValueError('Only frontend deployment commands are permitted')
    args = validate_command(original.split(' '))
    os.execve('/usr/bin/sudo', ['sudo', '-n', PROGRAM, *args], SAFE_ENV)


def strict_json(value):
    def unique(pairs):
        result = {}
        for key, val in pairs:
            if key in result:
                raise ValueError('Duplicate JSON key')
            result[key] = val
        return result
    return json.loads(value, object_pairs_hook=unique)


def safe_name(name):
    if not isinstance(name, str) or not name or len(name.encode('utf-8')) > 1024:
        raise ValueError('Invalid file name')
    if '\\' in name or any(ord(ch) < 32 or ord(ch) == 127 for ch in name):
        raise ValueError('Invalid file name')
    parts = name.split('/')
    if len(parts) > 32 or any(not part or part.startswith('.') or part in ['node_modules'] for part in parts):
        raise ValueError('Unsafe archive path')
    if PurePosixPath(name).is_absolute() or str(PurePosixPath(name)) != name:
        raise ValueError('Non-canonical archive path')
    return name


class StrictTarInfo(tarfile.TarInfo):
    def _proc_member(self, tar):
        if self.type not in [tarfile.REGTYPE, tarfile.AREGTYPE, tarfile.DIRTYPE, tarfile.XHDTYPE]:
            raise ValueError('Unsupported archive member type')
        return super()._proc_member(tar)

    def _proc_pax(self, tar):
        if self.size > 16384 or self.size < 0 or getattr(tar, '_fwx_pax_active', False):
            raise ValueError('Oversized archive metadata')
        # Do not call tarfile's PAX processor: it interprets GNU sparse headers
        # before returning, so validating its result would be too late.
        data = tar.fileobj.read(self._block(self.size))[:self.size]
        values, offset = {}, 0
        while offset < len(data):
            match = re.match(rb'([0-9]{1,6}) ', data[offset:])
            if not match:
                raise ValueError('Malformed archive metadata')
            length = int(match[1])
            record = data[offset:offset + length]
            if length < 5 or len(record) != length or not record.endswith(b'\n'):
                raise ValueError('Malformed archive metadata')
            key, sep, value = record[match.end():-1].partition(b'=')
            if not sep or key not in [b'path', b'mtime'] or key in values:
                raise ValueError('Unsupported archive metadata')
            values[key] = value.decode('utf-8', errors='strict')
            offset += length
        tar._fwx_pax_active = True
        try:
            result = self.fromtarfile(tar)
        finally:
            tar._fwx_pax_active = False
        if b'path' in values:
            result.name = safe_name(values[b'path'].rstrip('/') if result.isdir() else values[b'path'])
        result.offset = self.offset
        return result


class LimitedReader:
    def __init__(self, source, limit):
        self.source, self.limit, self.count = source, limit, 0

    def read(self, size):
        data = self.source.read(min(size, self.limit - self.count + 1))
        self.count += len(data)
        if self.count > self.limit:
            raise ValueError('Expanded archive stream exceeds limit')
        return data


def unpack_archive(stream, target, commit, max_bytes=MAX_CONTENT, max_entries=MAX_ENTRIES):
    target.mkdir(mode=0o755)
    os.chmod(target, 0o755)
    seen, materialized, files, total = set(), set(), {}, 0
    with gzip.GzipFile(fileobj=stream) as expanded, tarfile.open(
            fileobj=LimitedReader(expanded, max_bytes + 32 * 1024 * 1024), mode='r|', tarinfo=StrictTarInfo) as tar:
        for member in tar:
            name = safe_name(member.name.rstrip('/') if member.isdir() else member.name)
            if name in seen or len(seen) >= max_entries or member.sparse:
                raise ValueError('Duplicate, sparse or excessive archive entries')
            seen.add(name)
            materialized.update(str(parent) for parent in PurePosixPath(name).parents if str(parent) != '.')
            materialized.add(name)
            if len(materialized) > max_entries:
                raise ValueError('Too many files or implicit directories')
            if not (member.isdir() or member.isfile()) or member.linkname:
                raise ValueError('Archive must contain only files and directories')
            destination = target / name
            for parent in reversed(destination.parents):
                if parent != target and target in parent.parents:
                    parent.mkdir(mode=0o755, exist_ok=True)
                    os.chmod(parent, 0o755)
            if member.isdir():
                if member.size != 0:
                    raise ValueError('Directory payload')
                destination.mkdir(mode=0o755, exist_ok=True)
                os.chmod(destination, 0o755)
                continue
            total += member.size
            if member.size < 0 or total > max_bytes or (name == 'release.json' and member.size > 2 * 1024 * 1024):
                raise ValueError('Archive exceeds content limit')
            digest, copied = hashlib.sha256(), 0
            with tar.extractfile(member) as source, destination.open('xb') as output:
                while True:
                    chunk = source.read(65536)
                    if not chunk:
                        break
                    copied += len(chunk)
                    digest.update(chunk)
                    output.write(chunk)
            if copied != member.size:
                raise ValueError('Truncated archive file')
            os.chmod(destination, 0o644)
            files[name] = {'size': copied, 'sha256': digest.hexdigest()}
            # tarfile retains traversed members even in stream mode on Python 3.10.
            tar.members.clear()
    manifest_path = target / 'release.json'
    if 'release.json' not in files or 'index.html' not in files:
        raise ValueError('Missing entry or manifest')
    manifest = strict_json(manifest_path.read_text())
    if manifest.get('schemaVersion') != 1 or manifest.get('commit') != commit or not isinstance(manifest.get('files'), list):
        raise ValueError('Invalid release manifest')
    declared = {}
    for item in manifest['files']:
        if not isinstance(item, dict) or set(item) != {'path', 'size', 'sha256'}:
            raise ValueError('Invalid manifest entry')
        name = safe_name(item['path'])
        if name in declared or name == 'release.json' or type(item['size']) is not int or item['size'] < 0:
            raise ValueError('Invalid manifest path or size')
        if not isinstance(item['sha256'], str) or not DIGEST.fullmatch(item['sha256']):
            raise ValueError('Invalid manifest digest')
        declared[name] = {'size': item['size'], 'sha256': item['sha256']}
    del files['release.json']
    if declared != files:
        raise ValueError('Release manifest does not match file contents')
    return manifest


def trusted(path, directory=False):
    for item in [path, *path.parents]:
        info = item.lstat()
        if stat.S_ISLNK(info.st_mode) or info.st_uid != 0 or info.st_mode & 0o022:
            raise ValueError('Deployment configuration must be root-owned and not writable by others')
    if directory and not path.is_dir():
        raise ValueError('Expected directory')


def run(args, env=None):
    result = subprocess.run(args, env={**SAFE_ENV, **(env or {})}, cwd=CONFIG_DIR,
                            stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                            timeout=120, check=False)
    if result.returncode:
        # Compose/docker diagnostics may include private environment values.
        raise RuntimeError('Server deployment command failed (exit %s)' % result.returncode)
    return result.stdout


def inspect(name):
    return strict_json(run(['/usr/bin/docker', 'inspect', name]))[0]


def identities(config):
    result = {}
    for key in ['apiContainer', 'mongoContainer']:
        record = inspect(config[key])
        if not record['State']['Running']:
            raise RuntimeError('Existing backend is not running')
        result[key] = record['Id']
    return result


def live_directory(config):
    record = inspect(config['nginxContainer'])
    mounts = [m for m in record['Mounts'] if m['Destination'] == '/usr/share/nginx/html' and m['Type'] == 'bind']
    if len(mounts) != 1:
        raise RuntimeError('Unexpected frontend mount')
    return mounts[0]['Source']


def compose(directory, args):
    return run(['/usr/bin/docker', 'compose', '-p', 'flightwoodx', '-f', str(CONFIG_DIR / 'compose.json'), *args],
               {'WEB_DIST_DIR': str(directory)})


def activate(directory):
    trusted(Path(directory), directory=True)
    compose(directory, ['up', '-d', '--no-deps', '--no-build', '--pull', 'never', '--force-recreate', 'nginx'])


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError('Unexpected website redirect')


def https_bytes(path, limit):
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
    request = urllib.request.Request('https://flightwoodx.com' + path, headers={'Cache-Control': 'no-cache'})
    with opener.open(request, timeout=20) as response:
        data = response.read(limit + 1)
        if response.status != 200 or len(data) > limit:
            raise ValueError('Invalid production response')
        return data


def file_digest(path, limit=MAX_CONTENT):
    size, digest = 0, hashlib.sha256()
    with path.open('rb') as source:
        while True:
            data = source.read(65536)
            if not data:
                break
            size += len(data)
            if size > limit:
                raise ValueError('Local resource too large')
            digest.update(data)
    return size, digest.hexdigest()


def check_remote_file(path, source, limit=MAX_CONTENT):
    expected_size, expected_digest = file_digest(source, limit)
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
    request = urllib.request.Request('https://flightwoodx.com' + path, headers={'Cache-Control': 'no-cache'})
    size, digest = 0, hashlib.sha256()
    with opener.open(request, timeout=20) as response:
        if response.status != 200:
            raise ValueError('Invalid production response')
        while True:
            data = response.read(65536)
            if not data:
                break
            size += len(data)
            if size > expected_size:
                raise ValueError('Production response too large')
            digest.update(data)
    if (size, digest.hexdigest()) != (expected_size, expected_digest):
        raise ValueError('Production resource differs from candidate')


def check_site(directory):
    directory = Path(directory)
    entry = directory / 'index.html'
    if entry.stat().st_size > 4 * 1024 * 1024:
        raise ValueError('Oversized application entry')
    expected_index = entry.read_bytes()
    check_remote_file('/?release-check=' + str(time.time_ns()), entry, 4 * 1024 * 1024)
    for route in ['/dashboard', '/dashboard/']:
        check_remote_file(route, entry, 4 * 1024 * 1024)
    paths = re.findall(r'(?:src|href)="(/assets/[^"?#]+\.(?:js|css))"', expected_index.decode())
    paths += ['/optimized/picture/awards/red-dot-logo.31372310.webp', '/optimized/picture/awards/if.webp',
              '/optimized/picture/awards/IDEA.webp', '/models/mainboards/core_hub_01.glb',
              '/thumbnails/core_hub_01.png', '/textures/wood-board.png']
    if not any(path.endswith('.js') for path in paths):
        raise ValueError('Missing application entry')
    for path in paths:
        safe_name(path.removeprefix('/'))
        check_remote_file(urllib.parse.quote(path, safe='/'), directory / path.removeprefix('/'))
    release = directory / 'release.json'
    if release.exists():
        check_remote_file('/release.json?check=' + str(time.time_ns()), release, 2 * 1024 * 1024)
    health = strict_json(https_bytes('/api/health', 65536))
    if health.get('status') != 'OK' or health.get('db') != 'connected':
        raise ValueError('API health check failed')


def retry_check(directory):
    for attempt in range(6):
        try:
            return check_site(directory)
        except (ValueError, OSError, urllib.error.URLError):
            if attempt == 5:
                raise
            time.sleep(2)


def atomic_state(state):
    fd, name = tempfile.mkstemp(prefix='state-', suffix='.json', dir=CONFIG_DIR)
    try:
        with os.fdopen(fd, 'w') as output:
            json.dump(state, output, sort_keys=True)
            output.flush()
            os.fsync(output.fileno())
        os.replace(name, CONFIG_DIR / 'state.json')
        fd = os.open(CONFIG_DIR, os.O_RDONLY)
        try:
            os.fsync(fd)
        finally:
            os.close(fd)
    finally:
        if os.path.exists(name):
            os.unlink(name)


def public_status(state):
    return {'schemaVersion': 1, 'ready': not bool(state.get('pending')), 'currentCommit': state.get('currentCommit'),
            'previousCommit': state.get('previousCommit')}


def switch_with_rollback(candidate, previous, switch, check):
    try:
        switch(candidate)
        check(candidate)
    except BaseException:
        handler = signal.signal(signal.SIGTERM, signal.SIG_IGN)
        try:
            switch(previous)
            check(previous)
        finally:
            signal.signal(signal.SIGTERM, handler)
        raise


def change_release(config, state, candidate, commit):
    before = identities(config)
    previous = state['currentDirectory']
    if live_directory(config) != previous:
        raise RuntimeError('Live release changed outside deployment; manual reconciliation required')
    pending = {**state, 'pending': {'directory': candidate, 'commit': commit}}
    atomic_state(pending)
    new_state = {'currentCommit': commit, 'currentDirectory': candidate,
                 'previousCommit': state.get('currentCommit'), 'previousDirectory': previous}

    def verify(directory):
        if live_directory(config) != directory or identities(config) != before:
            raise RuntimeError('Unexpected container or mount change')
        retry_check(directory)
        atomic_state(new_state if directory == candidate else state)

    try:
        switch_with_rollback(candidate, previous, activate, verify)
    except BaseException:
        # If compensation itself fails, preserve pending journal for manual recovery.
        raise RuntimeError('Deployment failed; inspect status before retrying') from None
    return new_state


def recover_pending(config, state):
    if state.get('pending'):
        if live_directory(config) not in [state['currentDirectory'], state['pending']['directory']]:
            raise RuntimeError('External frontend change needs manual reconciliation')
        before = identities(config)
        activate(state['currentDirectory'])
        retry_check(state['currentDirectory'])
        if identities(config) != before or live_directory(config) != state['currentDirectory']:
            raise RuntimeError('Backend identity changed during recovery')
        state = {key: value for key, value in state.items() if key != 'pending'}
        atomic_state(state)
    return state


def verified_local_file(path, limit, capture=False):
    trusted(path)
    expected = path.lstat()
    if not stat.S_ISREG(expected.st_mode) or expected.st_nlink != 1:
        raise ValueError('Live release files must be regular single-link files')
    if expected.st_size > limit:
        raise ValueError('Live release contents exceed size limit')
    def identity(info):
        return (info.st_dev, info.st_ino, info.st_mode, info.st_uid, info.st_gid,
                info.st_nlink, info.st_size, info.st_mtime_ns, info.st_ctime_ns)
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    size, digest, data = 0, hashlib.sha256(), bytearray()
    with os.fdopen(fd, 'rb') as source:
        if identity(os.fstat(source.fileno())) != identity(expected):
            raise ValueError('Live release contents changed during verification')
        while True:
            chunk = source.read(65536)
            if not chunk:
                break
            size += len(chunk)
            if size > limit:
                raise ValueError('Live release contents exceed size limit')
            digest.update(chunk)
            if capture:
                data.extend(chunk)
        if size != expected.st_size or identity(os.fstat(source.fileno())) != identity(expected):
            raise ValueError('Live release contents changed during verification')
    return {'size': size, 'sha256': digest.hexdigest()}, bytes(data)


def confirm_active_release(config, state, manifest):
    before = identities(config)
    directory = Path(state['currentDirectory'])
    if live_directory(config) != str(directory):
        raise RuntimeError('Live release changed outside deployment; manual reconciliation required')
    trusted(directory, directory=True)
    manifest_record, raw = verified_local_file(directory / 'release.json', 2 * 1024 * 1024, capture=True)
    if strict_json(raw) != manifest:
        raise ValueError('Active release manifest differs from the verified candidate manifest')
    expected = {item['path']: {'size': item['size'], 'sha256': item['sha256']} for item in manifest['files']}
    expected['release.json'] = manifest_record
    actual, pending, members, total = {}, [directory], 0, 0
    while pending:
        parent = pending.pop()
        with os.scandir(parent) as entries:
            for entry in entries:
                members += 1
                if members > MAX_ENTRIES:
                    raise ValueError('Live release contents exceed entry limit')
                path = Path(entry.path)
                name = safe_name(path.relative_to(directory).as_posix())
                trusted(path)
                info = path.lstat()
                if stat.S_ISDIR(info.st_mode):
                    pending.append(path)
                    continue
                record, _ = verified_local_file(path, MAX_CONTENT - total)
                total += record['size']
                actual[name] = record
    if actual != expected:
        raise ValueError('Live release contents do not match the verified manifest')
    retry_check(str(directory))
    if live_directory(config) != str(directory) or identities(config) != before:
        raise RuntimeError('Unexpected container identity or mount change during verification')
    return state


def publish(config, state, commit, digest):
    if shutil.disk_usage(RELEASES).free < 1024 * 1024 * 1024 + MAX_ARCHIVE + MAX_CONTENT + 32 * 1024 * 1024:
        raise ValueError('Insufficient disk headroom; at least 1 GiB must remain after staging; no releases were deleted')
    # SIGHUP/SIGPIPE are ignored so an SSH disconnect cannot interrupt activation.
    signal.alarm(900)
    with tempfile.TemporaryDirectory(prefix='receive-', dir=RELEASES) as temporary:
        archive = Path(temporary) / 'web.tar.gz'
        calculated, size = hashlib.sha256(), 0
        with archive.open('xb') as output:
            while True:
                chunk = sys.stdin.buffer.read(65536)
                if not chunk:
                    break
                size += len(chunk)
                if size > MAX_ARCHIVE:
                    raise ValueError('Compressed archive too large')
                calculated.update(chunk)
                output.write(chunk)
        if calculated.hexdigest() != digest:
            raise ValueError('Archive checksum mismatch')
        candidate = Path(temporary) / 'web'
        with archive.open('rb') as stream:
            manifest = unpack_archive(stream, candidate, commit)
        signal.alarm(0)
        if state.get('currentCommit') == commit:
            return confirm_active_release(config, state, manifest)
        # Validate before changing a running container; never pull another image.
        compose(candidate, ['run', '--rm', '--no-deps', '--pull', 'never', 'nginx', 'nginx', '-t'])
        final = RELEASES / (commit + '-' + str(time.time_ns()))
        candidate.rename(final)
        return change_release(config, state, str(final), commit)


def main():
    args = sys.argv[1:]
    if args == ['gateway']:
        gateway()
        return
    validate_command(args)
    if os.geteuid() != 0:
        raise ValueError('This endpoint requires the dedicated sudo rule')
    os.umask(0o077)
    trusted(CONFIG_DIR, directory=True)
    trusted(RELEASES, directory=True)
    trusted(CONFIG_DIR / 'config.json')
    trusted(CONFIG_DIR / 'compose.json')
    config = strict_json((CONFIG_DIR / 'config.json').read_text())
    if config.get('schemaVersion') != 1 or config.get('domain') != 'flightwoodx.com':
        raise ValueError('Unexpected deployment configuration')
    signal.signal(signal.SIGHUP, signal.SIG_IGN)
    signal.signal(signal.SIGPIPE, signal.SIG_IGN)
    def interrupted(signum, frame):
        raise InterruptedError('Deployment interrupted')
    signal.signal(signal.SIGTERM, interrupted)
    signal.signal(signal.SIGALRM, interrupted)
    with (CONFIG_DIR / 'release.lock').open('a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise ValueError('Another deployment is running') from None
        state_path = CONFIG_DIR / 'state.json'
        if state_path.exists():
            trusted(state_path)
            state = strict_json(state_path.read_text())
        else:
            state = {'currentDirectory': config['initialDirectory'], 'currentCommit': config.get('initialCommit'),
                     'previousDirectory': None, 'previousCommit': None}
        if args[0] != 'status':
            state = recover_pending(config, state)
        if args[0] == 'publish':
            state = publish(config, state, args[1], args[2])
        elif args[0] == 'rollback':
            if state.get('currentCommit') != args[1] or not state.get('previousDirectory'):
                raise ValueError('Rollback only applies to the current release')
            state = change_release(config, state, state['previousDirectory'], state.get('previousCommit'))
        print(json.dumps(public_status(state)), flush=True)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print('Frontend deployment refused: ' + type(error).__name__, file=sys.stderr)
        sys.exit(1)
