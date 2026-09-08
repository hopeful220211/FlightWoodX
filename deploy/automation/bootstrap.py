#!/usr/bin/python3 -I
"""One-time, fail-closed installer. Never switches nginx or touches business data.

Run manually as root with the reviewed server source and an Ed25519 PUBLIC key.
Existing install targets/accounts are intentionally not repaired or overwritten.
"""
import argparse
import base64
import binascii
import hashlib
import ipaddress
import json
import os
from pathlib import Path
import pwd
import grp
import re
import stat
import subprocess
import sys

CONFIG_ROOT = Path("/etc/flightwoodx-deploy")
RELEASE_ROOT = Path("/var/lib/flightwoodx-releases")
ACCOUNT_HOME = Path("/var/lib/flightwoodx-deploy")
PROGRAM = Path("/usr/local/libexec/flightwoodx-release")
SUDOERS = Path("/etc/sudoers.d/flightwoodx-deploy")
ACCOUNT = "fwx-deploy"
NAMES = ("flightwoodx-nginx-1", "flightwoodx-api-1", "flightwoodx-mongo-1")
CLEAN_ENV = {"PATH": "/usr/sbin:/usr/bin:/sbin:/bin", "LANG": "C.UTF-8"}
MOUNT_TARGETS = {"/etc/nginx/nginx.conf", "/etc/nginx/templates", "/usr/share/nginx/html", "/etc/letsencrypt", "/var/www/certbot"}


class BootstrapError(Exception):
    """A bounded error that never includes command output or container secrets."""


def run(argv):
    result = subprocess.run(argv, env=CLEAN_ENV, capture_output=True, text=True, timeout=60, check=False)
    if result.returncode:
        raise BootstrapError("Required command failed: " + Path(argv[0]).name + " (exit " + str(result.returncode) + ")")
    return result.stdout


def validate_public_key(value):
    if len(value) > 2048 or "\r" in value or "\x00" in value:
        raise BootstrapError("Expected one Ed25519 public key, not a credential or key options")
    value = value.removesuffix("\n")
    if "\n" in value:
        raise BootstrapError("Multiple public-key lines are not accepted")
    parts = value.split(" ", 2)
    if len(parts) < 2 or parts[0] != "ssh-ed25519":
        raise BootstrapError("Only an ssh-ed25519 public key is accepted")
    try:
        wire = base64.b64decode(parts[1], validate=True)
    except (ValueError, binascii.Error) as error:
        raise BootstrapError("Invalid public-key encoding") from error
    expected = b"\x00\x00\x00\x0bssh-ed25519\x00\x00\x00\x20"
    if len(wire) != len(expected) + 32 or not wire.startswith(expected):
        raise BootstrapError("Invalid Ed25519 public-key wire format")
    canonical = "ssh-ed25519 " + base64.b64encode(wire).decode("ascii")
    fingerprint = "SHA256:" + base64.b64encode(hashlib.sha256(wire).digest()).decode("ascii").rstrip("=")
    return canonical, fingerprint


def authorized_key(public_key):
    key, _ = validate_public_key(public_key)
    return 'restrict,command="/usr/local/libexec/flightwoodx-release gateway" ' + key + "\n"


def sudoers():
    # Wildcard arguments never become shell input: the root program validates all argv.
    return ("# Only the reviewed release program; no shell, Docker access or environment forwarding.\n"
            "Defaults:fwx-deploy !setenv\n"
            "fwx-deploy ALL=(root) NOPASSWD: /usr/local/libexec/flightwoodx-release publish *, "
            "/usr/local/libexec/flightwoodx-release status, /usr/local/libexec/flightwoodx-release rollback *\n")


def safe_absolute(value):
    if not isinstance(value, str) or not value.startswith("/") or value == "/" or any(char in value for char in "\n\r\x00$:,") or ".." in Path(value).parts:
        raise BootstrapError("Unexpected absolute mount or certificate path")
    if str(Path(value)) != value:
        raise BootstrapError("Noncanonical absolute path")
    return value


def create_snapshot(containers):
    if not isinstance(containers, list) or len(containers) != 3:
        raise BootstrapError("Expected exactly the three existing production containers")
    by_name = {item.get("Name", "").removeprefix("/"): item for item in containers}
    if set(by_name) != set(NAMES):
        raise BootstrapError("Unexpected production container names")
    for item in containers:
        if item.get("State", {}).get("Running") is not True or not re.fullmatch(r"[a-f0-9]{64}", item.get("Id", "")):
            raise BootstrapError("A required production container is not running")
    nginx = by_name[NAMES[0]]
    host = nginx.get("HostConfig", {})
    if host.get("Privileged") or host.get("CapAdd") or host.get("Devices") or host.get("DeviceRequests") or host.get("SecurityOpt") or host.get("PidMode") or host.get("IpcMode") in ("host", "container"):
        raise BootstrapError("Unexpected nginx container privileges")
    networks = nginx.get("NetworkSettings", {}).get("Networks", {})
    if len(networks) != 1:
        raise BootstrapError("Expected exactly one existing nginx network")
    network = next(iter(networks))
    if not re.fullmatch(r"flightwoodx_[a-zA-Z0-9_-]+", network) or host.get("NetworkMode") != network:
        raise BootstrapError("Unexpected nginx network mode")
    if any(network not in item.get("NetworkSettings", {}).get("Networks", {}) for item in containers):
        raise BootstrapError("Production containers do not share the existing network")
    image = nginx.get("Image", "")
    if not re.fullmatch(r"sha256:[a-f0-9]{64}", image):
        raise BootstrapError("Cannot pin nginx to an existing immutable local image ID")
    bindings = host.get("PortBindings", {})
    if set(bindings) != {"80/tcp", "443/tcp"}:
        raise BootstrapError("Only existing HTTP and HTTPS published ports are allowed")
    ports = []
    for target in (80, 443):
        rows = bindings[str(target) + "/tcp"]
        if not isinstance(rows, list) or not 1 <= len(rows) <= 2:
            raise BootstrapError("Unexpected published port bindings")
        for row in rows:
            if row.get("HostPort") != str(target):
                raise BootstrapError("Published port translation is not permitted")
            port = {"target": target, "published": str(target), "protocol": "tcp"}
            if row.get("HostIp"):
                try:
                    ipaddress.ip_address(row["HostIp"])
                except ValueError as error:
                    raise BootstrapError("Invalid existing port address") from error
                port["host_ip"] = row["HostIp"]
            ports.append(port)
    mounts = nginx.get("Mounts", [])
    if len(mounts) != len(MOUNT_TARGETS) or {mount.get("Destination") for mount in mounts} != MOUNT_TARGETS:
        raise BootstrapError("Unexpected nginx mounts; no extra host mounts are accepted")
    volumes, sources = [], {}
    initial_directory = None
    for mount in mounts:
        target = mount["Destination"]
        if mount.get("Type") != "bind" or mount.get("Propagation") not in (None, "", "rprivate"):
            raise BootstrapError("Only existing private bind mounts are allowed")
        source = safe_absolute(mount.get("Source"))
        read_only = mount.get("RW") is False
        if target != "/var/www/certbot" and not read_only:
            raise BootstrapError("nginx config, website and certificates must already be mounted read-only")
        if target == "/usr/share/nginx/html":
            initial_directory = source
            source = "${WEB_DIST_DIR}"
        elif target in ("/etc/nginx/nginx.conf", "/etc/nginx/templates"):
            copied = CONFIG_ROOT / "nginx" / Path(target).name
            sources[str(copied)] = source
            source = str(copied)
        volumes.append({"type": "bind", "source": source, "target": target, "read_only": read_only, "bind": {"create_host_path": False}})
    environment = {}
    permitted = {"FWX_SERVER_NAME", "FWX_SSL_CERT", "FWX_SSL_CERT_KEY", "NGINX_ENVSUBST_FILTER"}
    for entry in nginx.get("Config", {}).get("Env", []):
        key, separator, value = entry.partition("=")
        if key not in permitted:
            if key.startswith("FWX_"):
                raise BootstrapError("An unrecognized nginx FWX environment variable needs manual review")
            continue
        if not separator or key in environment or len(value) > 1024 or any(char in value for char in "\n\r\x00$"):
            raise BootstrapError("Unexpected nginx environment value")
        environment[key] = value
    if set(environment) != permitted or environment["NGINX_ENVSUBST_FILTER"] != "^FWX_" or set(environment["FWX_SERVER_NAME"].split()) not in ({"flightwoodx.com"}, {"flightwoodx.com", "www.flightwoodx.com"}):
        raise BootstrapError("Expected the existing FlightWoodX nginx environment")
    for key in ("FWX_SSL_CERT", "FWX_SSL_CERT_KEY"):
        if not safe_absolute(environment[key]).startswith("/etc/letsencrypt/"):
            raise BootstrapError("Existing certificate paths must remain within /etc/letsencrypt")
    compose = {"name": "flightwoodx", "services": {"nginx": {
        "image": image, "pull_policy": "never", "restart": "unless-stopped", "ports": ports,
        "environment": environment, "volumes": volumes, "networks": {"production": {"aliases": ["nginx"]}},
    }}, "networks": {"production": {"external": True, "name": network}}}
    config = {"schemaVersion": 1, "domain": "flightwoodx.com", "initialDirectory": initial_directory, "initialCommit": None,
              "nginxContainer": NAMES[0], "apiContainer": NAMES[1], "mongoContainer": NAMES[2]}
    return compose, config, sources


def check_path(path, trusted=True):
    path = Path(path).absolute()
    for current in (*reversed(path.parents), path):
        info = current.lstat()
        if stat.S_ISLNK(info.st_mode):
            raise BootstrapError("Symbolic links are not accepted in installer input paths")
        if trusted and (info.st_uid != 0 or info.st_mode & 0o022):
            raise BootstrapError("Existing server config and its ancestors must be root-owned and not writable by other users")
    return path.lstat()


def read_regular(path, trusted=True):
    info = check_path(path, trusted)
    if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1 or info.st_size > 1024 * 1024:
        raise BootstrapError("Expected a small regular file without links")
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    with os.fdopen(fd, "rb") as handle:
        opened = os.fstat(handle.fileno())
        if (opened.st_dev, opened.st_ino, opened.st_mode, opened.st_nlink) != (info.st_dev, info.st_ino, info.st_mode, info.st_nlink):
            raise BootstrapError("Installer input changed while it was being read")
        data = handle.read(1024 * 1024 + 1)
        if len(data) > 1024 * 1024:
            raise BootstrapError("Installer input is too large")
        return data


def copy_plan(source, destination):
    """Validate the entire small config tree before creating installation paths."""
    source, destination = Path(source), Path(destination)
    info = check_path(source)
    if stat.S_ISREG(info.st_mode):
        return [(destination, read_regular(source))]
    if not stat.S_ISDIR(info.st_mode):
        raise BootstrapError("Invalid nginx config source")
    result = [(destination, None)]
    for child in sorted(source.iterdir()):
        result.extend(copy_plan(child, destination / child.name))
        if len(result) > 100:
            raise BootstrapError("Unexpectedly large nginx configuration tree")
    return result


def require_absent(paths):
    for path in paths:
        if os.path.lexists(path):
            raise BootstrapError("Installation target already exists; nothing is overwritten: " + str(path))


def mkdir(path, mode):
    Path(path).mkdir(mode=mode)
    os.chown(path, 0, 0)
    os.chmod(path, mode)


def write_new(path, data, mode):
    raw = data.encode("utf-8") if isinstance(data, str) else data
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, mode)
    with os.fdopen(fd, "wb") as handle:
        handle.write(raw)
        os.fchown(handle.fileno(), 0, 0)
        os.fchmod(handle.fileno(), mode)
        handle.flush()
        os.fsync(handle.fileno())


def identity(containers):
    return sorted((item["Name"], item["Id"], item.get("Created"), item.get("State", {}).get("Running")) for item in containers)


def inspect_production():
    return json.loads(run(["/usr/bin/docker", "inspect", *NAMES]))


def install(args):
    if os.geteuid() != 0:
        raise BootstrapError("Run this reviewed one-time installer as root in the server terminal")
    os.umask(0o077)
    targets = [CONFIG_ROOT, RELEASE_ROOT, ACCOUNT_HOME, PROGRAM, SUDOERS]
    require_absent(targets)
    for lookup in (pwd.getpwnam, grp.getgrnam):
        try:
            lookup(ACCOUNT)
        except KeyError:
            pass
        else:
            raise BootstrapError("Deployment account or group already exists; manual review required")
    for parent in {path.parent for path in targets}:
        if parent.exists():
            check_path(parent)
        elif parent != PROGRAM.parent:
            raise BootstrapError("Required system directory is missing")
        else:
            check_path(parent.parent)
    public = read_regular(Path(args.public_key), trusted=False).decode("ascii")
    _, fingerprint = validate_public_key(public)
    server = read_regular(Path(args.server_source), trusted=False)
    if not server.startswith(b"#!/usr/bin/python3 -I\n"):
        raise BootstrapError("Server source must use the isolated /usr/bin/python3 -I interpreter")
    compile(server, "reviewed-release-server", "exec")
    before = inspect_production()
    compose, config, sources = create_snapshot(before)
    planned = []
    for destination, source in sources.items():
        planned.extend(copy_plan(source, destination))
    live_nginx = next(item for item in before if item["Name"] == "/" + NAMES[0])
    for mount in live_nginx["Mounts"]:
        if mount["Destination"] in ("/etc/letsencrypt", "/var/www/certbot"):
            info = check_path(mount["Source"])
            if not stat.S_ISDIR(info.st_mode):
                raise BootstrapError("Existing certificate and ACME bind roots must be directories")
    check_path(config["initialDirectory"])
    if not Path(config["initialDirectory"]).is_dir():
        raise BootstrapError("Current live website directory is missing")
    read_regular(Path(config["initialDirectory"]) / "index.html")
    host_key, host_fingerprint = validate_public_key(read_regular(Path("/etc/ssh/ssh_host_ed25519_key.pub")).decode("ascii"))
    run(["/usr/bin/docker", "compose", "version"])
    run(["/usr/sbin/visudo", "-c"])
    # All validation above is read-only. From here failures preserve partial state for review.
    mkdir(CONFIG_ROOT, 0o700)
    mkdir(RELEASE_ROOT, 0o700)
    mkdir(CONFIG_ROOT / "nginx", 0o755)
    for destination, data in planned:
        mkdir(destination, 0o755) if data is None else write_new(destination, data, 0o644)
    write_new(CONFIG_ROOT / "config.json", json.dumps(config, indent=2) + "\n", 0o600)
    write_new(CONFIG_ROOT / "compose.json", json.dumps(compose, indent=2) + "\n", 0o600)
    if not PROGRAM.parent.exists():
        mkdir(PROGRAM.parent, 0o755)
    write_new(PROGRAM, server, 0o755)
    mkdir(ACCOUNT_HOME, 0o755)
    mkdir(ACCOUNT_HOME / ".ssh", 0o755)
    write_new(ACCOUNT_HOME / ".ssh" / "authorized_keys", authorized_key(public), 0o644)
    pending_rules = CONFIG_ROOT / "sudoers.pending"
    write_new(pending_rules, sudoers(), 0o440)
    run(["/usr/sbin/visudo", "-c", "-f", str(pending_rules)])
    # No password, supplementary group, Docker group or general sudo permission is assigned.
    run(["/usr/sbin/useradd", "--system", "--user-group", "--no-create-home", "--home-dir", str(ACCOUNT_HOME), "--shell", "/bin/sh", ACCOUNT])
    account = pwd.getpwnam(ACCOUNT)
    if account.pw_uid == 0 or account.pw_gid == 0 or account.pw_dir != str(ACCOUNT_HOME) or account.pw_shell != "/bin/sh":
        raise BootstrapError("Unexpected deployment-account identity")
    if any(group.gr_gid != account.pw_gid and ACCOUNT in group.gr_mem for group in grp.getgrall()):
        raise BootstrapError("Unexpected supplementary deployment-account privileges")
    write_new(SUDOERS, sudoers(), 0o440)
    run(["/usr/sbin/visudo", "-c"])
    after = inspect_production()
    if identity(before) != identity(after):
        raise BootstrapError("Production containers changed during installation; inspect before releasing")
    print("Installed restricted web-only deployment account; production containers unchanged.")
    print("Deployment public-key fingerprint: " + fingerprint)
    print("Pinned nginx image: " + compose["services"]["nginx"]["image"])
    print("Host key: 8.156.92.182 " + host_key)
    print("Host key fingerprint: " + host_fingerprint)
    print("No website version was changed. Test restricted SSH status before the first release.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--public-key", required=True, help="Path to the single Ed25519 PUBLIC key")
    parser.add_argument("--server-source", required=True, help="Path to reviewed server.py")
    args = parser.parse_args()
    try:
        install(args)
    except (BootstrapError, OSError, ValueError, SyntaxError, subprocess.SubprocessError) as error:
        if isinstance(error, BootstrapError):
            print("Installation stopped: " + str(error), file=sys.stderr)
        else:
            print("Installation stopped: " + type(error).__name__ + "; inspect prerequisites and preserve partial installation paths.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
