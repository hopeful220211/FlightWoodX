"""No root, Docker, SSH, external network or real account mutation in these tests."""
import base64
import ast
import copy
from contextlib import ExitStack, redirect_stdout
import importlib.util
import io
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location("bootstrap", Path(__file__).with_name("bootstrap.py"))
bootstrap = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(bootstrap)


def public_key():
    wire = len(b"ssh-ed25519").to_bytes(4, "big") + b"ssh-ed25519" + (32).to_bytes(4, "big") + bytes(range(32))
    return "ssh-ed25519 " + base64.b64encode(wire).decode() + " github-release\n"


def containers():
    base = {"State": {"Running": True}, "Id": "a" * 64, "Created": "2026-09-07", "Config": {}, "HostConfig": {}, "NetworkSettings": {"Networks": {"flightwoodx_fwxnet": {}}}}
    nginx = copy.deepcopy(base)
    nginx.update({"Name": "/flightwoodx-nginx-1", "Image": "sha256:" + "1" * 64})
    nginx["Config"] = {"Env": ["FWX_SERVER_NAME=flightwoodx.com", "FWX_SSL_CERT=/etc/letsencrypt/live/flightwoodx.com/fullchain.pem", "FWX_SSL_CERT_KEY=/etc/letsencrypt/live/flightwoodx.com/privkey.pem", "NGINX_ENVSUBST_FILTER=^FWX_", "PATH=/untrusted", "JWT_SECRET=must-not-copy"]}
    nginx["HostConfig"] = {"NetworkMode": "flightwoodx_fwxnet", "PortBindings": {"80/tcp": [{"HostIp": "", "HostPort": "80"}], "443/tcp": [{"HostIp": "", "HostPort": "443"}]}}
    nginx["Mounts"] = [{"Type": "bind", "Source": source, "Destination": target, "RW": target == "/var/www/certbot", "Propagation": "rprivate"} for source, target in [
        ("/root/release/deploy/nginx/nginx.conf", "/etc/nginx/nginx.conf"),
        ("/root/release/deploy/nginx/templates", "/etc/nginx/templates"),
        ("/root/flightwoodx-web-7c3fb21", "/usr/share/nginx/html"),
        ("/etc/letsencrypt", "/etc/letsencrypt"),
        ("/root/flightwoodx/deploy/nginx/certbot-www", "/var/www/certbot"),
    ]]
    api, mongo = copy.deepcopy(base), copy.deepcopy(base)
    api.update({"Name": "/flightwoodx-api-1", "Id": "b" * 64})
    mongo.update({"Name": "/flightwoodx-mongo-1", "Id": "c" * 64})
    return [nginx, api, mongo]


class BootstrapTests(unittest.TestCase):
    def test_public_key_is_canonical_and_fingerprinted_without_comment(self):
        key, fingerprint = bootstrap.validate_public_key(public_key())
        self.assertEqual(len(key.split()), 2)
        self.assertTrue(fingerprint.startswith("SHA256:"))

    def test_bad_and_multiline_keys_rejected(self):
        for bad in [public_key() + public_key(), "command=\"sh\" " + public_key(), public_key().replace("ssh-ed25519", "ssh-rsa", 1), "ssh-ed25519 AAAA", public_key().replace("github-release", "bad\rcomment"), public_key().replace("github-release", "bad\x00comment")]:
            with self.subTest(key=bad[:20]), self.assertRaises(bootstrap.BootstrapError):
                bootstrap.validate_public_key(bad)

    def test_malformed_ed25519_wire_rejected(self):
        for wire in [b"ssh-ed25519", b"\x00\x00\x00\x0bssh-ed25519\x00\x00\x00\x20" + b"a" * 31, b"\x00\x00\x00\x0bssh-ed25519\x00\x00\x00\x20" + b"a" * 33]:
            with self.assertRaises(bootstrap.BootstrapError):
                bootstrap.validate_public_key("ssh-ed25519 " + base64.b64encode(wire).decode())

    def test_snapshot_only_pins_nginx_preserves_network_ports_certbot(self):
        compose, config, sources = bootstrap.create_snapshot(containers())
        self.assertEqual(list(compose["services"]), ["nginx"])
        nginx = compose["services"]["nginx"]
        self.assertEqual(nginx["image"], "sha256:" + "1" * 64)
        self.assertEqual(compose["networks"]["production"], {"external": True, "name": "flightwoodx_fwxnet"})
        self.assertEqual(nginx["restart"], "unless-stopped")
        self.assertNotIn("JWT_SECRET", json.dumps(compose))
        self.assertNotIn("depends_on", nginx)
        self.assertEqual(config["initialDirectory"], "/root/flightwoodx-web-7c3fb21")
        self.assertIsNone(config["initialCommit"])
        self.assertEqual(len(sources), 2)
        self.assertEqual(next(v for v in nginx["volumes"] if v["target"] == "/usr/share/nginx/html")["source"], "${WEB_DIST_DIR}")
        acme = next(v for v in nginx["volumes"] if v["target"] == "/var/www/certbot")
        self.assertEqual(acme["source"], "/root/flightwoodx/deploy/nginx/certbot-www")
        self.assertFalse(acme["read_only"])

    def test_privileges_extra_ports_and_mounts_rejected(self):
        cases = [("Privileged", True), ("PidMode", "host"), ("IpcMode", "host"), ("Devices", [{"PathOnHost": "/dev/sda"}]), ("CapAdd", ["SYS_ADMIN"]), ("SecurityOpt", ["seccomp=unconfined"]), ("NetworkMode", "host")]
        for field, value in cases:
            fixture = containers()
            fixture[0]["HostConfig"][field] = value
            with self.subTest(field=field), self.assertRaises(bootstrap.BootstrapError):
                bootstrap.create_snapshot(fixture)
        fixture = containers()
        fixture[0]["HostConfig"]["PortBindings"]["22/tcp"] = [{"HostPort": "22"}]
        with self.assertRaises(bootstrap.BootstrapError):
            bootstrap.create_snapshot(fixture)
        for field, value in [("Type", "volume"), ("Destination", "/var/run/docker.sock"), ("Source", "/tmp/${BAD}")]:
            fixture = containers()
            fixture[0]["Mounts"][0][field] = value
            with self.assertRaises(bootstrap.BootstrapError):
                bootstrap.create_snapshot(fixture)

    def test_stopped_backend_and_extra_network_fail(self):
        fixture = containers()
        fixture[2]["State"]["Running"] = False
        with self.assertRaises(bootstrap.BootstrapError):
            bootstrap.create_snapshot(fixture)
        fixture = containers()
        fixture[0]["NetworkSettings"]["Networks"]["extra"] = {}
        with self.assertRaises(bootstrap.BootstrapError):
            bootstrap.create_snapshot(fixture)

    def test_config_files_reject_links_and_special_files(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            regular = root / "regular"
            regular.write_text("safe")
            linked = root / "linked"
            linked.symlink_to(regular)
            with self.assertRaises(bootstrap.BootstrapError):
                bootstrap.read_regular(linked, trusted=False)
            subdir = root / "linked-dir"
            subdir.symlink_to(root, target_is_directory=True)
            with self.assertRaises(bootstrap.BootstrapError):
                bootstrap.read_regular(subdir / "regular", trusted=False)

    def test_existing_installation_never_overwrites(self):
        with tempfile.TemporaryDirectory() as directory:
            occupied = Path(directory) / "config"
            occupied.mkdir()
            with self.assertRaises(bootstrap.BootstrapError):
                bootstrap.require_absent([occupied])

    def test_account_access_is_forced_and_no_general_sudo(self):
        authorized = bootstrap.authorized_key(public_key())
        self.assertTrue(authorized.startswith('restrict,command="/usr/local/libexec/flightwoodx-release gateway" ssh-ed25519 '))
        rules = bootstrap.sudoers()
        self.assertNotIn("NOPASSWD: ALL", rules)
        self.assertNotIn("env_keep", rules)
        self.assertNotIn("/bin/sh", rules)
        self.assertIn("/usr/local/libexec/flightwoodx-release publish *", rules)
        self.assertIn("/usr/local/libexec/flightwoodx-release status", rules)

    def test_command_failure_does_not_log_secret_output(self):
        import subprocess
        with patch.object(bootstrap.subprocess, "run", return_value=subprocess.CompletedProcess([], 1, "JWT_SECRET=private", "private")):
            with self.assertRaises(bootstrap.BootstrapError) as raised:
                bootstrap.run(["/usr/bin/docker", "inspect", "flightwoodx-api-1"])
        self.assertNotIn("private", str(raised.exception))

    def test_bootstrap_source_has_no_backend_recreation_or_remote_download(self):
        source = Path(bootstrap.__file__).read_text()
        for forbidden in ["--force-recreate", "urllib", "curl", "usermod"]:
            self.assertNotIn(forbidden, source)
        commands = [node.args[0] for node in ast.walk(ast.parse(source)) if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == "run"]
        docker_commands = [command for command in commands if isinstance(command, ast.List) and isinstance(command.elts[0], ast.Constant) and command.elts[0].value == "/usr/bin/docker"]
        self.assertEqual(len(docker_commands), 2)
        self.assertEqual({command.elts[1].value for command in docker_commands}, {"inspect", "compose"})
        compose_command = next(command for command in docker_commands if command.elts[1].value == "compose")
        self.assertEqual([node.value for node in compose_command.elts], ["/usr/bin/docker", "compose", "version"])

    def test_isolated_install_permissions_and_zero_service_mutation(self):
        with tempfile.TemporaryDirectory() as directory, ExitStack() as patches:
            root = Path(directory).resolve()
            replacements = {"CONFIG_ROOT": root / "etc-config", "RELEASE_ROOT": root / "releases", "ACCOUNT_HOME": root / "account-home", "PROGRAM": root / "libexec" / "release", "SUDOERS": root / "sudoers.d" / "release"}
            (root / "sudoers.d").mkdir()
            for name, value in replacements.items():
                patches.enter_context(patch.object(bootstrap, name, value))
            fixture = containers()
            for number, mount in enumerate(fixture[0]["Mounts"]):
                path = root / ("existing-" + str(number))
                mount["Source"] = str(path)
                if mount["Destination"] == "/etc/nginx/nginx.conf":
                    path.write_text("events {}")
                else:
                    path.mkdir()
                    if mount["Destination"] == "/etc/nginx/templates":
                        (path / "default.conf.template").write_text("server {}")
                    elif mount["Destination"] == "/usr/share/nginx/html":
                        (path / "index.html").write_text("existing live site")
            key_file, server_file = root / "key.pub", root / "server.py"
            key_file.write_text(public_key())
            server_file.write_text("#!/usr/bin/python3 -I\nprint('stub is never executed')\n")
            real_check, real_read = bootstrap.check_path, bootstrap.read_regular
            patches.enter_context(patch.object(bootstrap, "check_path", side_effect=lambda path, trusted=True: real_check(path, False)))
            patches.enter_context(patch.object(bootstrap, "read_regular", side_effect=lambda path, trusted=True: public_key().encode() if str(path) == "/etc/ssh/ssh_host_ed25519_key.pub" else real_read(path, False)))
            patches.enter_context(patch.object(bootstrap.os, "geteuid", return_value=0))
            ownership = patches.enter_context(patch.object(bootstrap.os, "chown"))
            patches.enter_context(patch.object(bootstrap.os, "fchown"))
            patches.enter_context(patch.object(bootstrap.pwd, "getpwnam", side_effect=[KeyError(), SimpleNamespace(pw_uid=123, pw_gid=123, pw_dir=str(replacements["ACCOUNT_HOME"]), pw_shell="/bin/sh")]))
            patches.enter_context(patch.object(bootstrap.grp, "getgrnam", side_effect=KeyError()))
            patches.enter_context(patch.object(bootstrap.grp, "getgrall", return_value=[]))
            commands = patches.enter_context(patch.object(bootstrap, "run", return_value=""))
            inspections = patches.enter_context(patch.object(bootstrap, "inspect_production", side_effect=[copy.deepcopy(fixture), copy.deepcopy(fixture)]))
            output = io.StringIO()
            args = SimpleNamespace(public_key=str(key_file), server_source=str(server_file))
            with redirect_stdout(output):
                bootstrap.install(args)
            self.assertEqual(inspections.call_count, 2)
            self.assertIn("production containers unchanged", output.getvalue())
            self.assertNotIn("must-not-copy", output.getvalue())
            self.assertEqual((replacements["CONFIG_ROOT"] / "config.json").stat().st_mode & 0o777, 0o600)
            self.assertEqual(replacements["RELEASE_ROOT"].stat().st_mode & 0o777, 0o700)
            self.assertEqual(replacements["PROGRAM"].stat().st_mode & 0o777, 0o755)
            self.assertEqual(replacements["SUDOERS"].stat().st_mode & 0o777, 0o440)
            self.assertTrue(all(call.args[1:] == (0, 0) for call in ownership.call_args_list))
            self.assertEqual(commands.call_args_list[0].args[0], ["/usr/bin/docker", "compose", "version"])
            self.assertFalse(any(any(word in call.args[0] for word in ("up", "down", "restart", "--force-recreate", "--groups")) for call in commands.call_args_list))
            self.assertEqual((root / "existing-2" / "index.html").read_text(), "existing live site")
            with self.assertRaises(bootstrap.BootstrapError):
                bootstrap.install(args)


if __name__ == "__main__":
    unittest.main()
