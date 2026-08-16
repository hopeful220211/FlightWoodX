#!/usr/bin/env bash
# 首次装机脚本（阿里云 ECS · Ubuntu 22.04 · 2C2G）。幂等，可重复跑。需 root/sudo。
#   sudo REGISTRY_MIRROR=https://xxxx.mirror.aliyuncs.com bash deploy/setup-server.sh
# 做六件事：4G swap → docker+compose → 阿里云镜像加速器 → SSH 仅密钥 → certbot → 自签占位证书。
set -euo pipefail
[ "$(id -u)" -eq 0 ] || { echo "请用 root/sudo 运行"; exit 1; }

echo "==> [1/6] 4G swap（2G 内存构建/运行兜底）"
if ! swapon --show | grep -q '/swapfile'; then
  fallocate -l 4G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=4096
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "    swap 已建立"
else
  echo "    swap 已存在，跳过"
fi

echo "==> [2/6] Docker + compose 插件"
if ! command -v docker >/dev/null 2>&1; then
  # 国内可换用阿里云 docker-ce 镜像源；此处用官方便捷脚本，装完再配加速器
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
else
  echo "    docker 已安装，跳过"
fi

echo "==> [3/6] 阿里云容器镜像加速器"
if [ -n "${REGISTRY_MIRROR:-}" ]; then
  mkdir -p /etc/docker
  cat > /etc/docker/daemon.json <<EOF
{
  "registry-mirrors": ["${REGISTRY_MIRROR}", "https://docker.m.daocloud.io"],
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
EOF
  systemctl restart docker
  echo "    已写入镜像加速器：${REGISTRY_MIRROR}"
else
  echo "    未提供 REGISTRY_MIRROR，跳过（可稍后设置后重跑）"
fi

echo "==> [4/6] SSH 仅密钥、禁密码"
# 安全护栏：只有当已存在 authorized_keys 时才禁用密码，避免把自己锁在门外
KEYFILE="${SUDO_USER:+/home/$SUDO_USER/.ssh/authorized_keys}"
[ -n "${KEYFILE:-}" ] && [ -f "$KEYFILE" ] || KEYFILE="/root/.ssh/authorized_keys"
if [ -s "$KEYFILE" ]; then
  sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
  sed -i 's/^#\?PubkeyAuthentication.*/PubkeyAuthentication yes/' /etc/ssh/sshd_config
  systemctl restart ssh || systemctl restart sshd || true
  echo "    已禁用 SSH 密码登录（检测到已配置公钥：$KEYFILE）"
else
  echo "    ⚠️ 未发现 authorized_keys，跳过禁用密码（先上传公钥，否则会锁死登录）"
fi

echo "==> [5/6] certbot"
command -v certbot >/dev/null 2>&1 || { apt-get update -y && apt-get install -y certbot; }

echo "==> [6/6] 自签占位证书（让 nginx 首启不崩，certbot 签发后替换）"
PLACEHOLDER_DIR="/etc/letsencrypt/live/flightwoodx.com"
if [ ! -f "$PLACEHOLDER_DIR/fullchain.pem" ]; then
  mkdir -p "$PLACEHOLDER_DIR"
  openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
    -keyout "$PLACEHOLDER_DIR/privkey.pem" \
    -out "$PLACEHOLDER_DIR/fullchain.pem" \
    -subj "/CN=flightwoodx.com"
  echo "    自签占位证书已生成于 $PLACEHOLDER_DIR"
else
  echo "    证书已存在，跳过"
fi

cat <<'NEXT'

装机完成。后续：
  1) 在 deploy/ 目录：cp .env.example .env，填真实凭证
  2) 首次签发正式证书（域名已解析到本机后）：
       # 先清掉自签占位（nginx 仍在内存用旧证书，删盘不影响运行），certbot 才能干净签发到同一路径
       rm -rf /etc/letsencrypt/live/flightwoodx.com /etc/letsencrypt/archive/flightwoodx.com /etc/letsencrypt/renewal/flightwoodx.com.conf
       certbot certonly --webroot -w deploy/nginx/certbot-www --cert-name flightwoodx.com -d flightwoodx.com -d www.flightwoodx.com
       # 真证书正好落在 FWX_SSL_CERT 默认指向的 /etc/letsencrypt/live/flightwoodx.com/，无需改 .env
       docker compose restart nginx
  3) 发布：deploy/deploy.sh
NEXT
