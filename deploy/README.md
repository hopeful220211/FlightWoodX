# FlightWoodX 部署（阿里云 ECS · RFC-024 §4.8）

零密码骨架：所有凭证走 `deploy/.env`（已被 `.gitignore` 忽略），仓库不含任何真实 AK/SK/连接串。
目标机：阿里云 ECS 成都 · Ubuntu 22.04 · 2C2G · 3Mbps。大文件全走 OSS，ECS 只跑 API + 前端静态页。

## 架构
```
浏览器 ──HTTPS──> nginx(80/443) ──/api──> api:3000 ──内网──> mongo(仅内网,无公网端口)
   │                                                              └── 命名卷持久化
   └── GLB/贴图/缩略图/DXF/zip 直连 OSS（不经 ECS；直传用 /api/uploads/sts 换临时凭证）
```

## 首次上线顺序
1. `sudo REGISTRY_MIRROR=<加速器地址> bash deploy/setup-server.sh` — swap/docker/加速器/SSH 加固/certbot/自签占位证书
2. `cd deploy && cp .env.example .env && vim .env` — 填真实凭证
3. 域名解析到本机后签正式证书：
   `certbot certonly --webroot -w deploy/nginx/certbot-www -d flightwoodx.com -d www.flightwoodx.com`
   然后把 `.env` 的 `FWX_SSL_CERT/FWX_SSL_CERT_KEY` 指向 `/etc/letsencrypt/live/flightwoodx.com/`
4. `bash deploy/scripts/upload-assets.sh` — 资产传到 OSS 公共读桶
5. `bash deploy/deploy.sh` — 构建前端 + 起容器
6. （迁移）`SRC_MONGODB_URI=... bash deploy/scripts/migrate-from-atlas.sh` — Atlas→ECS，带逐集合对账
7. 备份 cron：见 `scripts/backup.cron`

## 文件
| 文件 | 作用 |
|---|---|
| `docker-compose.yml` | api / mongo(内网) / nginx 三服务，`restart: unless-stopped` |
| `../apps/api/Dockerfile` | 多阶段、仅生产依赖、省内存 |
| `nginx/nginx.conf` + `nginx/templates/default.conf.template` | 静态托管 + 反代 /api + HTTPS（envsubst 注入域名/证书路径）|
| `deploy.sh` | 拉码 → 构建前端 → `compose up -d --build` |
| `setup-server.sh` | 首次装机（幂等）|
| `scripts/migrate-from-atlas.sh` | 迁移 + 逐集合对账（幂等）|
| `scripts/backup-daily.sh` + `backup.cron` | 每日备份 → OSS 私有桶，保留 14 天 |
| `scripts/upload-assets.sh` | 资产 → OSS 公共读桶 |
| `.env.example` | 全部变量清单 |
