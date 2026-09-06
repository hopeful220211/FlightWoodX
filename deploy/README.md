# FlightWoodX 部署（阿里云 ECS · RFC-024 §4.8）

零密码骨架：所有凭证走 `deploy/.env`（已被 `.gitignore` 忽略），仓库不含任何真实 AK/SK/连接串。
目标机：阿里云 ECS 成都 · Ubuntu 22.04 · 2C2G · 3Mbps。当前发布默认把官方模型、缩略图、纹理和优化图片同源托管；OSS 可用性与权限通过实际验证后再启用。用户上传由独立的 `STORAGE_DRIVER` 控制。

> 2026-09-07：线上 OSS 资产请求返回 403，不能沿用未经复核的 CDN 配置。本轮本地修复不等于已经发布到正式域名。

## 架构
```
浏览器 ──HTTPS──> nginx(80/443) ──/api──> api:3000 ──内网──> mongo(仅内网,无公网端口)
   │                                                              └── 命名卷持久化
   ├── 官方模型/图片：同源静态文件，VITE_ASSET_BASE 留空
   └── 用户封面：/uploads（磁盘命名卷）或经验证的 OSS/S3
```

## 首次上线顺序
1. `sudo REGISTRY_MIRROR=<加速器地址> bash deploy/setup-server.sh` — swap/docker/加速器/SSH 加固/certbot/自签占位证书
2. `cd deploy && cp .env.example .env && vim .env` — 填真实凭证
3. 域名解析到本机后签正式证书：
   `certbot certonly --webroot -w deploy/nginx/certbot-www -d flightwoodx.com -d www.flightwoodx.com`
   然后把 `.env` 的 `FWX_SSL_CERT/FWX_SSL_CERT_KEY` 指向 `/etc/letsencrypt/live/flightwoodx.com/`
4. 默认 `VITE_ASSET_BASE=`，前端构建保留模型等资产并生成 WebP；需要 CDN 时才按既有权限策略上传、验证公开读取和 CORS。不要为解决 403 直接把私有备份桶公开。
5. `bash deploy/deploy.sh` — 构建前端 + 起容器。探测远端资产失败会明确提示并对本次构建改用同源资产；不会修改 `.env`。脚本会等待容器内 API 健康，但域名端浏览器验收仍须执行。
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

## 现有站点升级前必须核对

1. 确认服务器 checkout 的分支、提交和未提交文件；当前修复位于 `codex/review-readiness-2026-09-07`，不能在旧分支只运行一次 pull 就认为得到修复。先确认该分支已推送且 CI 通过，不强制覆盖服务器改动。
2. 保存当前提交、前端 `dist`、API 镜像标识和部署配置副本；配置含密钥，只保存在受限服务器目录，不上传 GitHub。
3. 备份 MongoDB 并确认备份可读。此次没有数据库删除或强制迁移，不运行 wipe/migrate 脚本，不使用 `docker compose down -v`。
4. 本轮给磁盘上传新增 `api-uploads` 命名卷。如果旧容器曾用 `STORAGE_DRIVER=disk` 且文件只在容器内，必须先从旧容器复制其上传目录到受限备份，填充新命名卷，再重建 API；否则旧封面会被新空卷遮住。旧配置若使用 OSS，也必须验证历史封面和新增封面的读取，不可仅验证静态模型。
5. `PUBLIC_BASE_URL=https://flightwoodx.com`，`VITE_API_URL` 建议 `/api`；`TRUST_PROXY_HOPS=1` 仅适用于本编排的一层 nginx。保留生产 JWT 与管理员密钥，不能用测试配置覆盖。
6. `docker compose config --quiet`、构建、`nginx -t` 和健康检查通过后，再浏览器验收。没有 Docker/证书/服务器访问时不能把模板检查视作实际容器启动成功。

## 发布后验收与回滚

- 读取正式首页的新 JS/CSS 文件名及部署提交；无缓存重新打开，不凭页面能访问判断版本。
- 模型、缩略图、纹理和 `/optimized/picture/` 返回实际二进制图片/GLB；不存在的静态文件返回 404，不能返回 SPA HTML。
- 专用验收账号执行注册、登录、拼装 6 件、保存、刷新、新设备打开、积木保存、仿真、作品封面及社区；无权限账号直访后台必须拒绝。
- 在手机、平板、桌面检查布局；相机权限、实飞、加工文件和正式管理账号另行验收。
- 如失败，用已保存的前端构建和 API 镜像/提交回滚，保留 Mongo 与上传卷；记录具体失败项。Compose 重建不是零停机发布。
- 备份恢复、OSS 权限、正式管理员和历史凭据轮换仍需服务器/账号负责人参与；不能由本机测试替代。

## 本机重复验收

在隔离 MongoDB 与 API 上运行 `FWX_TEST_MONGO_URI=mongodb://127.0.0.1:27017 pnpm run ci`。该变量仅用于 API 集成测试，测试会创建并清理随机命名测试库；不会复用生产业务库。

启动连接隔离 API 的 Web 后运行：

```bash
pnpm --filter web exec playwright install chromium
FWX_E2E_BASE_URL=http://127.0.0.1:5173 pnpm --filter web test:e2e
```

如使用本机已安装 Chrome，再设置 `FWX_E2E_BROWSER_CHANNEL=chrome`。浏览器测试只接受 localhost 并拦截外部请求；会创建专用测试账号和作品，不能把本机 API 转发至生产库。跨设备恢复测试只转移登录会话，不转移作品或程序缓存。
