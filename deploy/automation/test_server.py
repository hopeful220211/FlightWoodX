import gzip
import hashlib
import importlib.util
import io
import json
import os
import tarfile
import tempfile
import unittest
from contextlib import ExitStack, contextmanager
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('release_server', Path(__file__).with_name('server.py'))
server = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)
SHA = 'a' * 40


def archive(entries=None, manifest_change=None, file_changes=None):
    files = {'index.html': b'<html>FlightWoodX</html>', 'assets/app.js': b'app', 'resource/中文素材.png': b'png'}
    files.update(file_changes or {})
    manifest = {'schemaVersion': 1, 'commit': SHA, 'files': [
        {'path': path, 'size': len(data), 'sha256': hashlib.sha256(data).hexdigest()} for path, data in files.items()]}
    if manifest_change:
        manifest_change(manifest)
    items = [(path, data, tarfile.REGTYPE) for path, data in files.items()]
    items += [('release.json', json.dumps(manifest).encode(), tarfile.REGTYPE)]
    items += entries or []
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode='w:gz', format=tarfile.PAX_FORMAT) as tar:
        for name, data, kind in items:
            info = tarfile.TarInfo(name)
            info.type, info.size = kind, len(data)
            info.linkname = '/etc/passwd' if kind in [tarfile.SYMTYPE, tarfile.LNKTYPE] else ''
            tar.addfile(info, io.BytesIO(data))
    return buf.getvalue()


class ReleaseTests(unittest.TestCase):
    def unpack(self, blob, **kwargs):
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp) / 'candidate'
            manifest = server.unpack_archive(io.BytesIO(blob), target, SHA, **kwargs)
            self.assertEqual(manifest['commit'], SHA)
            self.assertEqual((target / 'index.html').stat().st_mode & 0o777, 0o644)
            return manifest

    def test_valid_archive_and_unicode(self):
        self.assertEqual(len(self.unpack(archive())['files']), 3)

    def test_reject_unsafe_paths_links_duplicates(self):
        for name, kind in [('../outside', tarfile.REGTYPE), ('/outside', tarfile.REGTYPE),
                           ('a/../../outside', tarfile.REGTYPE), ('a\\b', tarfile.REGTYPE),
                           ('.env', tarfile.REGTYPE), ('sub/.git/config', tarfile.REGTYPE),
                           ('index.html', tarfile.REGTYPE), ('link', tarfile.SYMTYPE),
                           ('hard', tarfile.LNKTYPE), ('device', tarfile.CHRTYPE)]:
            with self.subTest(name=name, kind=kind), self.assertRaises(ValueError):
                self.unpack(archive([(name, b'', kind)]))

    def test_manifest_must_cover_every_file_and_match_hash_size_commit(self):
        mutations = [lambda m: m.update(commit='b' * 40), lambda m: m['files'].pop(),
                     lambda m: m['files'].append(m['files'][0]),
                     lambda m: m['files'][0].update(size=999),
                     lambda m: m['files'][0].update(sha256='0' * 64)]
        for mutate in mutations:
            with self.assertRaises(ValueError):
                self.unpack(archive(manifest_change=mutate))

    def test_limits(self):
        with self.assertRaises(ValueError):
            self.unpack(archive(), max_bytes=5)
        with self.assertRaises(ValueError):
            self.unpack(archive(), max_entries=2)

    def test_implicit_directories_count_towards_limit(self):
        with self.assertRaises(ValueError):
            self.unpack(archive([('a/b/c/d/e/f', b'x', tarfile.REGTYPE)]), max_entries=10)
        with self.assertRaises(ValueError):
            server.safe_name('/'.join(['nested'] * 33))

    def test_reject_large_pax_and_unknown_headers(self):
        buf = io.BytesIO()
        with tarfile.open(fileobj=buf, mode='w:gz', format=tarfile.PAX_FORMAT) as tar:
            item = tarfile.TarInfo('x')
            item.pax_headers = {'path': 'x' * 20000}
            tar.addfile(item)
        with self.assertRaises(ValueError):
            self.unpack(buf.getvalue())

    def test_strict_json_rejects_duplicate_keys(self):
        with self.assertRaises(ValueError):
            server.strict_json('{"commit":"a","commit":"b"}')

    def test_sparse_metadata_rejected_before_standard_library_processing(self):
        buf = io.BytesIO()
        with tarfile.open(fileobj=buf, mode='w:gz', format=tarfile.PAX_FORMAT) as tar:
            item = tarfile.TarInfo('bad')
            item.pax_headers = {'GNU.sparse.major': '1', 'GNU.sparse.minor': '0'}
            tar.addfile(item)
        with patch.object(tarfile.TarInfo, '_proc_gnusparse_10', side_effect=AssertionError('unsafe parser reached')):
            with self.assertRaises(ValueError):
                self.unpack(buf.getvalue())

    def test_expanded_stream_limit(self):
        source = server.LimitedReader(io.BytesIO(b'12345'), 4)
        self.assertEqual(source.read(2), b'12')
        with self.assertRaises(ValueError):
            source.read(10)

    def test_exact_command_allowlist(self):
        for args in [['status'], ['publish', SHA, 'b' * 64], ['rollback', SHA]]:
            self.assertEqual(server.validate_command(args), args)
        for args in [[], ['status', 'x'], ['publish', SHA, 'bad'], ['rollback', '../x'], ['sh'], ['publish', SHA + ';id', 'b' * 64]]:
            with self.assertRaises(ValueError):
                server.validate_command(args)

    def test_public_status_does_not_expose_paths_or_config(self):
        result = server.public_status({'currentCommit': SHA, 'previousCommit': None, 'currentDirectory': '/root/private', 'secret': 'hidden'})
        self.assertEqual(result, {'schemaVersion': 1, 'ready': True, 'currentCommit': SHA, 'previousCommit': None})

    def test_transaction_reverts_after_failed_health_check(self):
        calls = []
        def check(directory):
            calls.append(('check', directory))
            if directory == 'new':
                raise ValueError('bad release')
        with self.assertRaises(ValueError):
            server.switch_with_rollback('new', 'old', lambda p: calls.append(('activate', p)), check)
        self.assertEqual(calls, [('activate', 'new'), ('check', 'new'), ('activate', 'old'), ('check', 'old')])

    def test_success_has_no_rollback(self):
        calls = []
        server.switch_with_rollback('new', 'old', lambda p: calls.append(p), lambda p: None)
        self.assertEqual(calls, ['new'])

    def transaction(self, failure=None):
        state = {'currentDirectory': 'old', 'currentCommit': 'b' * 40, 'previousDirectory': None, 'previousCommit': None}
        current, calls, journal = ['old'], [], []
        def activate(directory):
            calls.append(directory)
            current[0] = directory
            if failure == 'activation' and directory == 'new':
                raise RuntimeError('cannot start candidate')
            if failure == 'compensation' and directory == 'old':
                raise RuntimeError('cannot restore')
        def check(directory):
            if failure in ['health', 'compensation'] and directory == 'new':
                raise RuntimeError('health failed')
        def write(value):
            if failure == 'state' and value.get('currentDirectory') == 'new':
                raise OSError('state unavailable')
            journal.append(dict(value))
        def identities(config):
            return {'api': 'changed' if failure == 'identity' and current[0] == 'new' else 'same'}
        with ExitStack() as stack:
            stack.enter_context(patch.object(server, 'live_directory', side_effect=lambda c: current[0]))
            stack.enter_context(patch.object(server, 'identities', side_effect=identities))
            stack.enter_context(patch.object(server, 'activate', side_effect=activate))
            stack.enter_context(patch.object(server, 'retry_check', side_effect=check))
            stack.enter_context(patch.object(server, 'atomic_state', side_effect=write))
            if failure:
                with self.assertRaises(RuntimeError):
                    server.change_release({}, state, 'new', SHA)
            else:
                result = server.change_release({}, state, 'new', SHA)
                self.assertEqual(result['currentCommit'], SHA)
        return current, calls, journal

    def test_transaction_success_and_journal(self):
        current, calls, journal = self.transaction()
        self.assertEqual(calls, ['new'])
        self.assertIn('pending', journal[0])
        self.assertNotIn('pending', journal[-1])
        self.assertEqual(journal[-1]['previousDirectory'], 'old')

    def test_transaction_compensates_all_failure_stages(self):
        for stage in ['activation', 'health', 'identity', 'state']:
            with self.subTest(stage=stage):
                current, calls, journal = self.transaction(stage)
                self.assertEqual(calls, ['new', 'old'])
                self.assertEqual(current[0], 'old')
                self.assertEqual(journal[-1]['currentDirectory'], 'old')
                self.assertNotIn('pending', journal[-1])

    def test_failed_compensation_preserves_pending_journal(self):
        _, _, journal = self.transaction('compensation')
        self.assertIn('pending', journal[-1])

    def test_external_live_change_never_activates(self):
        with patch.object(server, 'identities', return_value={}), patch.object(server, 'live_directory', return_value='external'), patch.object(server, 'activate') as activate:
            with self.assertRaises(RuntimeError):
                server.change_release({}, {'currentDirectory': 'old'}, 'new', SHA)
            activate.assert_not_called()

    def test_pending_recovery_checks_mount_before_clearing(self):
        state = {'currentDirectory': 'old', 'currentCommit': None, 'pending': {'directory': 'new', 'commit': SHA}}
        for result_mount in ['old', 'unexpected']:
            with patch.object(server, 'identities', return_value={}), patch.object(server, 'live_directory', side_effect=['new', result_mount]), patch.object(server, 'activate'), patch.object(server, 'retry_check'), patch.object(server, 'atomic_state') as write:
                if result_mount == 'old':
                    result = server.recover_pending({}, state)
                    self.assertNotIn('pending', result)
                    write.assert_called_once()
                else:
                    with self.assertRaises(RuntimeError):
                        server.recover_pending({}, state)
                    write.assert_not_called()


class RepeatedReleaseTests(unittest.TestCase):
    @contextmanager
    def repeated_publish(self, blob=None, mutate=None, mounts=None, backends=None, health_error=None):
        blob = archive() if blob is None else blob
        with tempfile.TemporaryDirectory() as tmp, ExitStack() as patches:
            releases = Path(tmp)
            current = releases / 'current'
            server.unpack_archive(io.BytesIO(archive()), current, SHA)
            if mutate:
                mutate(current)
            state = {'currentDirectory': str(current), 'currentCommit': SHA,
                     'previousDirectory': '/retained/previous', 'previousCommit': 'b' * 40}
            incoming = io.BytesIO(blob)
            patches.enter_context(patch.object(server, 'RELEASES', releases))
            patches.enter_context(patch.object(server.sys, 'stdin', SimpleNamespace(buffer=incoming)))
            patches.enter_context(patch.object(server.shutil, 'disk_usage', return_value=SimpleNamespace(free=10 * 1024 ** 3)))
            patches.enter_context(patch.object(server.signal, 'alarm'))
            patches.enter_context(patch.object(server, 'trusted'))
            patches.enter_context(patch.object(server, 'live_directory', side_effect=mounts or [str(current), str(current)]))
            patches.enter_context(patch.object(server, 'identities', side_effect=backends or [{'api': 'api', 'mongo': 'mongo'}] * 2))
            health = patches.enter_context(patch.object(server, 'retry_check', side_effect=health_error))
            forbidden = [patches.enter_context(patch.object(server, name, side_effect=AssertionError('Repeated release must not mutate deployment')))
                         for name in ['compose', 'activate', 'change_release', 'atomic_state']]
            def publish(digest=None):
                return server.publish({}, state, SHA, digest or hashlib.sha256(blob).hexdigest())
            yield publish, current, state, incoming, health
            for operation in forbidden:
                operation.assert_not_called()
            self.assertEqual(list(releases.iterdir()), [current])

    def test_matching_release_is_verified_without_redeployment(self):
        with self.repeated_publish() as (publish, current, state, incoming, health):
            result = publish()
            self.assertIs(result, state)
            self.assertEqual(result['previousCommit'], 'b' * 40)
            self.assertEqual(incoming.tell(), len(incoming.getvalue()))
            health.assert_called_once_with(str(current))

    def test_manifest_formatting_does_not_force_redeployment(self):
        def reformat(path):
            manifest = path / 'release.json'
            manifest.write_text(json.dumps(json.loads(manifest.read_text()), indent=2, sort_keys=True))
        with self.repeated_publish(mutate=reformat) as (publish, _, state, _, _):
            self.assertIs(publish(), state)

    def test_current_manifest_corruption_is_rejected(self):
        with self.repeated_publish(mutate=lambda p: (p / 'release.json').write_text('{"commit":"a","commit":"b"}')) as (publish, _, _, _, _):
            with self.assertRaisesRegex(ValueError, 'Duplicate JSON key'):
                publish()

    def test_same_sha_with_different_valid_content_is_rejected(self):
        with self.repeated_publish(blob=archive(file_changes={'assets/app.js': b'other'})) as (publish, _, _, incoming, _):
            with self.assertRaisesRegex(ValueError, 'manifest'):
                publish()
            self.assertEqual(incoming.tell(), len(incoming.getvalue()))

    def test_repeated_release_still_checks_archive_checksum(self):
        with self.repeated_publish() as (publish, _, _, incoming, _):
            with self.assertRaisesRegex(ValueError, 'checksum'):
                publish('0' * 64)
            self.assertEqual(incoming.tell(), len(incoming.getvalue()))

    def test_repeated_release_still_validates_archive_members(self):
        with self.repeated_publish(blob=archive([('../outside', b'x', tarfile.REGTYPE)])) as (publish, _, _, _, _):
            with self.assertRaisesRegex(ValueError, 'path'):
                publish()

    def test_damaged_or_extra_live_file_is_rejected(self):
        for change in [lambda p: (p / 'assets/app.js').write_bytes(b'bad'),
                       lambda p: (p / 'unexpected.txt').write_bytes(b'extra'),
                       lambda p: (p / 'assets/app.js').unlink()]:
            with self.subTest(change=change), self.repeated_publish(mutate=change) as (publish, _, _, _, _):
                with self.assertRaisesRegex(ValueError, 'contents'):
                    publish()

    def test_live_symlinks_and_hardlinks_are_rejected(self):
        def linked(path, kind):
            source = path / 'assets/app.js'
            source.unlink()
            if kind == 'symlink':
                source.symlink_to(path / 'index.html')
            else:
                os.link(path / 'index.html', source)
        for kind in ['symlink', 'hardlink']:
            with self.subTest(kind=kind), self.repeated_publish(mutate=lambda p: linked(p, kind)) as (publish, _, _, _, _):
                with self.assertRaisesRegex(ValueError, 'regular|link'):
                    publish()

    def test_changed_live_mount_is_rejected(self):
        with self.repeated_publish(mounts=['/unexpected']) as (publish, _, _, _, _):
            with self.assertRaisesRegex(RuntimeError, 'Live release'):
                publish()

    def test_live_mount_change_during_public_check_is_rejected(self):
        with self.repeated_publish() as (publish, _, _, _, health):
            health.side_effect = lambda _: setattr(server.live_directory, 'side_effect', lambda _: '/unexpected')
            with self.assertRaisesRegex(RuntimeError, 'mount change'):
                publish()

    def test_oversized_live_file_is_rejected_before_reading(self):
        def enlarge(path):
            with (path / 'assets/app.js').open('r+b') as file:
                file.truncate(server.MAX_CONTENT + 1)
        with self.repeated_publish(mutate=enlarge) as (publish, _, _, _, _):
            with self.assertRaisesRegex(ValueError, 'size limit'):
                publish()

    def test_changed_backend_after_verification_is_rejected(self):
        for key in ['api', 'mongo']:
            before = {'api': 'api', 'mongo': 'mongo'}
            after = {**before, key: 'changed'}
            with self.subTest(key=key), self.repeated_publish(backends=[before, after]) as (publish, _, _, _, _):
                with self.assertRaisesRegex(RuntimeError, 'container|identity'):
                    publish()

    def test_failed_public_check_is_rejected_without_cutover(self):
        with self.repeated_publish(health_error=RuntimeError('Public check failed')) as (publish, _, _, _, _):
            with self.assertRaisesRegex(RuntimeError, 'Public check failed'):
                publish()


if __name__ == '__main__':
    unittest.main()
