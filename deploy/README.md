# FlightWoodX 部署（阿里云 ECS · RFC-024 §4.8）

零密码骨架：所有凭证走 `deploy/.env`（已被 `.gitignore` 忽略），仓库不含任何真实 AK/SK/连接串。
目标机：阿里云 ECS 成都 · Ubuntu 22.04 · 2C2G · 3Mbps。当前发布默认把官方模型、缩略图、纹理和优化图片同源托管；OSS 可用性与权限通过实际验证后再启用。用户上传由独立的 `STORAGE_DRIVER` 控制。

> 2026-09-07：线上 OSS 返回 403，当前登录账号控制台显示未开通。此次已有 ECS 升级采用磁盘覆盖配置，原凭据不改、不新购服务。备份恢复已验证；实际发布结果见 `CURRENT_STATUS.md`。

## 架构
```
浏览器 ──HTTPS──> nginx(80/443) ──/api──> api:3000 ──内网──> mongo(仅内网,无公网端口)
   │                                                              └── 命名卷持久化
   ├── 官方模型/图片：同源静态文件，VITE_ASSET_BASE 留空
   └── 用户封面：/uploads（磁盘命名卷）或经验证的 OSS/S3
```

## 首次上线顺序

以下只适用于已获批准的全新服务器。现有 FlightwoodX.com 应走下方升级检查，不重跑装机、迁移或证书初始化。所有命令从仓库根目录执行，不先进入 `deploy/`。

1. 宿主机先安装 Node 22（最低 22.12.0）和 pnpm 9.12.0，确认 `node --version` 与 `pnpm --version`。前端构建在宿主机执行；Node 22 的 API 镜像不能替代宿主机环境，`setup-server.sh` 也不安装 Node/pnpm。
2. `sudo REGISTRY_MIRROR=<加速器地址> bash deploy/setup-server.sh` — 安装 swap、Docker、certbot 等并生成自签占位证书。它不启动 nginx；已有服务器不要盲目执行此步骤。
3. `cp -n deploy/.env.example deploy/.env`，再编辑 `deploy/.env` 填真实凭证。保留已有配置；明确选择已验证的 OSS 或磁盘上传方式。初次启动使用占位证书文件：`FWX_SSL_CERT=/etc/letsencrypt/live/flightwoodx.com/fullchain.pem`、`FWX_SSL_CERT_KEY=/etc/letsencrypt/live/flightwoodx.com/privkey.pem`。
4. 默认 `VITE_ASSET_BASE=`；需要 CDN 时才上传并验证读取与 CORS。不要为解决 403 把私有备份桶公开。确认目标分支后执行 `bash deploy/deploy.sh`，先让 nginx 和 ACME HTTP 路径实际启动。此时自签 HTTPS 不是正式上线成功，不让用户绕过证书警告登录。
5. 确认申请的两个域名均解析到该服务器，公网 80 端口与 `/.well-known/acme-challenge/` 可达，再申请正式证书。新证书用独立名称，保留原占位文件和全部已有证书，不清空证书目录：

   ```bash
   sudo certbot certonly --webroot -w "$PWD/deploy/nginx/certbot-www" --cert-name flightwoodx-production -d flightwoodx.com -d www.flightwoodx.com
   sudo certbot certificates
   ```

6. 根据 Certbot 实际输出，把 `deploy/.env` 的两个变量分别指向正式 `fullchain.pem` 和 `privkey.pem` 文件，不能只填目录。上述新名称通常位于 `/etc/letsencrypt/live/flightwoodx-production/`；若输出不同，以实际输出为准。先测试配置，再让 nginx 读取新环境变量：

   ```bash
   docker compose --env-file deploy/.env -f deploy/docker-compose.yml run --rm --no-deps nginx nginx -t
   docker compose --env-file deploy/.env -f deploy/docker-compose.yml up -d --no-deps --force-recreate nginx
   ```

   正式域名证书、资源和业务流程全部回读后才完成上线。续期后还需 reload nginx；续期定时器、reload 与恢复演练必须另行配置和验收。证书流程依据 [Certbot 官方说明](https://eff-certbot.readthedocs.io/en/stable/using.html#webroot)，当前未在目标服务器执行。
7. 只有确实需要 Atlas 迁移且已备份、获批时，才运行 `deploy/scripts/migrate-from-atlas.sh`；现站升级不运行迁移脚本。
8. 数据库备份 cron 见 `deploy/scripts/backup.cron`。它目前只备份 MongoDB，不包含上传文件或部署配置；见下方备份范围。

## 文件
| 文件 | 作用 |
|---|---|
| `docker-compose.yml` | api / mongo(内网) / nginx 三服务，`restart: unless-stopped` |
| `docker-compose.disk.yml` | 现站磁盘发布覆盖配置：显式已验证 API 镜像、上传驱动和原 Certbot webroot |
| `../apps/api/Dockerfile` | 多阶段、仅生产依赖、省内存 |
| `nginx/nginx.conf` + `nginx/templates/default.conf.template` | 静态托管 + 反代 /api + HTTPS（envsubst 注入域名/证书路径）|
| `deploy.sh` | 拉码 → 构建前端 → `compose up -d --build` |
| `setup-server.sh` | 首次装机（幂等）|
| `scripts/migrate-from-atlas.sh` | 迁移 + 逐集合对账（幂等）|
| `scripts/backup-daily.sh` + `backup.cron` | 仅 MongoDB 每日备份 → OSS 私有桶，保留 14 天；不包含上传卷 |
| `scripts/upload-assets.sh` | 资产 → OSS 公共读桶 |
| `.env.example` | 全部变量清单 |

## 现有站点升级前必须核对

1. 确认服务器 checkout 的分支、提交和未提交文件；当前修复位于 `codex/review-readiness-2026-09-07`，不能在旧分支只运行一次 pull 就认为得到修复。先确认该分支已推送且 CI 通过，不强制覆盖服务器改动。
   同时确认宿主机 Node 至少 22.12.0、pnpm 9.12.0；Docker 镜像升级不会改变宿主机的前端构建环境。
2. 保存当前提交、前端 `dist`、API 镜像标识和部署配置副本；配置含密钥，只保存在受限服务器目录，不上传 GitHub。
3. 备份 MongoDB 并确认备份可读。此次没有数据库删除或强制迁移，不运行 wipe/migrate 脚本，不使用 `docker compose down -v`。
4. 本轮给磁盘上传新增 `api-uploads` 命名卷。如果旧容器曾用 `STORAGE_DRIVER=disk` 且文件只在容器内，必须先从旧容器复制其上传目录到受限备份，填充新命名卷，再重建 API；否则旧封面会被新空卷遮住。旧配置若使用 OSS，也必须验证历史封面和新增封面的读取，不可仅验证静态模型。
5. `PUBLIC_BASE_URL=https://flightwoodx.com`，`VITE_API_URL` 建议 `/api`；`TRUST_PROXY_HOPS=1` 仅适用于本编排的一层 nginx。保留生产 JWT 与管理员密钥，不能用测试配置覆盖。
6. `docker compose --env-file deploy/.env -f deploy/docker-compose.yml config --quiet`、构建、`nginx -t` 和健康检查通过后，再浏览器验收。没有 Docker/证书/服务器访问时不能把模板检查视作实际容器启动成功。

### 备份范围

现有 `backup-daily.sh` 只执行 MongoDB 归档，不能作为全站恢复副本。发布前还必须分别保护 `api-uploads` 命名卷或旧容器上传目录、OSS 用户对象、部署配置和证书，并核对数据库引用与文件可读性。上传卷应另设受限、可恢复的备份流程；数据库归档成功不代表图片已备份。2026-09-07 已完成一次全站本机备份和数据库恢复演练，尚不等于每日自动、异机或 OSS 备份已可用。

### 现有服务器此次发布

原目录 `/root/flightwoodx` 不是 Git 仓库，必须保留。新目录 `/root/flightwoodx-release-20260907` 拉取已验证分支；不要在原目录强行初始化、覆盖或删除。服务器没有 Node，使用 `node:22-slim` 容器安装固定 pnpm 9.12.0、冻结依赖并构建 Web，`VITE_ASSET_BASE` 留空，`VITE_API_URL=/api`。API 使用仓库 Dockerfile 构建独立提交标签。预构建标签不代表最终修复已经发布。

- 受限备份：`/root/flightwoodx-backup-20260907-wJW7He`，包含原站、证书、MongoDB 归档、API 镜像、上传文件和容器配置；约 434 MB，归档与哈希可核验。容器配置和 `.env` 含密钥，不得上传 GitHub或粘贴到对话。
- 恢复演练：无网络临时 Mongo 容器恢复成功，20 个集合计数与正式库一致；临时容器和其临时卷已清理，正式 Mongo 卷未删除。
- 上传卷 `flightwoodx_api-uploads` 已填入旧 API 的 6 个文件，146,928 字节，逐字节一致；切换前再次核对增量。
- 复制原 `.env` 到新发布目录，权限 600，不输出值。环境覆盖只修改上传驱动和公开基址；保留 JWT、管理密钥、数据库与其他服务配置。
- Certbot 当前使用 `/root/flightwoodx/deploy/nginx/certbot-www`。覆盖文件强制设置 `FWX_CERTBOT_WEBROOT` 并挂载到相同容器目标，不能随着代码目录迁移而换成空 webroot。`deploy/scripts/reload-nginx-certificate.sh` 可安装为 deploy hook；只在验证配置后 reload，不删除或重签现有证书。
- 公开文件权限：私有 umask 下拉取的静态文件可能以 0600/0700 被 Vite 复制，nginx 普通工作进程无法读取。构建末尾 `finalize-public-assets.mjs` 只整理生成的 dist：目录 0755、普通文件 0644，拒绝符号链接/硬链接；绝不能对源码根、`.env`、证书或备份执行宽泛 chmod。上线后必须用 HTTPS 实际验证模型，成功构建不证明 nginx 可读取。

从新发布目录执行（把镜像标签替换为实际通过验证的提交，以下仅说明命令）：

```bash
export FWX_API_IMAGE=flightwoodx-api:<verified-commit>
export FWX_CERTBOT_WEBROOT=/root/flightwoodx/deploy/nginx/certbot-www
export WEB_DIST_DIR=/root/flightwoodx-release-20260907/apps/web/dist
docker compose -p flightwoodx --env-file deploy/.env -f deploy/docker-compose.yml -f deploy/docker-compose.disk.yml config --quiet
docker compose -p flightwoodx --env-file deploy/.env -f deploy/docker-compose.yml -f deploy/docker-compose.disk.yml run --rm --no-deps nginx nginx -t
docker compose -p flightwoodx --env-file deploy/.env -f deploy/docker-compose.yml -f deploy/docker-compose.disk.yml up -d --no-deps --no-build api nginx
```

保留 Compose 项目名 `flightwoodx`，不更新 Mongo 服务、不运行 `down -v`、迁移或 wipe。更新 API/nginx 会有短暂停机，不称零停机。03:20 已实际重建一次 API 并 reload nginx；专用测试作品、零件、程序和新上传均重新登录回读成功，Mongo 容器未变。

后续仅修改 Web 时，保留已验证的 API 镜像，不重建 API 或 Mongo。先在独立的全新目录 `/root/flightwoodx-web-<前端提交>` 构建候选文件，不能让 Vite 清空 nginx 正在使用的 dist。通过 Node 22 容器运行现有资产准备脚本和 Web 的 Vite，将新目录挂载为独立构建输出；调用 `finalize-public-assets.mjs` 导出的 `makeDistReadable`，仅整理这个生成目录的权限。核对完整资源与构建成功后，将 `WEB_DIST_DIR` 指向该候选目录，先 `nginx -t`，再用上述相同 Compose 项目、env 文件及两个覆盖文件，只重建 `nginx`。读取正式首页的 JS/CSS 文件名、资源和真实业务流程，才记录发布完成。前端回退只将 `WEB_DIST_DIR` 切回已保留的上一目录并重建 nginx，数据库、上传卷和 API 镜像均保持不动。

构建资源与应用资源分开设置：这台主机显示总内存约 1.6 GiB、swap 4 GiB。候选构建容器限制 1 CPU、1500 MiB 内存、3 GiB 内存与 swap 总额时，Node 自动选择的约 768 MiB 堆不足，已实际触发构建失败；本次重试仅给该临时构建进程显式设置 `NODE_OPTIONS=--max-old-space-size=2048`。不修改生产 API 的运行参数，不把失败的候选目录切给 nginx；完整构建、权限整理和资源核验均成功后才切换。

2026-09-07 04:00:59（北京时间）已按此方式切换前端至 `/root/flightwoodx-web-e47f0ca`，入口 `index-DqEFyc6i.js`。首页/入口 JS 的 SHA-256 与本机最终验证构建一致；API 镜像仍为 `flightwoodx-api:f5b12b3`，API 和 Mongo 未重建。原 release 内的 dist 保留，可只回退 nginx 前端挂载。

仅调整 nginx 路由时，不重建 Web/API/Mongo。先用相同 Compose 文件、现有证书、API 镜像及已验证的 `WEB_DIST_DIR` 启动唯一命名的临时 nginx，使用 `run --no-deps` 且只将 443 映射到 `127.0.0.1:18443`。以 `curl --resolve flightwoodx.com:18443:127.0.0.1` 验证 HTTPS（禁止跳过证书校验）、`/dashboard` 和 `/dashboard/`、真实图片/模型及缺失二进制资源；配置和实际响应全部通过后再仅重建正式 nginx。只停止并删除这次创建的临时容器，不删卷。SPA 的 `try_files` 只试文件，不试目录，否则 `public/dashboard` 会截获工作台页面。

实际切换：2026-09-07 02:33:58，提交 `f5b12b3`、镜像 `flightwoodx-api:f5b12b3`。原镜像另保留为 `flightwoodx-api:rollback-20260907`。03:17 左右服务器更新到 `a71e822`，日志与 0600 文件权限确认 403 根因后，仅整理生成 dist 的 919 个条目；244 个正式资源及 5 个缺失资源 404 检查通过。回滚必须继续保留新上传卷和 `/uploads` 反代，先验证旧镜像的 disk 支持；不能直接套回旧 OSS/无上传挂载的配置。旧版本不认识自制来源引用，禁止用整库旧备份覆盖新记录；必要时先暂停写入，避免旧客户端改写新格式作品。

### 已确认的历史 localhost 封面修复

生产 Project 原有 3 个 `coverUrl` 指向 localhost，3 个对应文件都存在；本轮已修正并回读，不要重复应用。维护脚本 `apps/api/scripts/repair-localhost-covers.js` 只接受该旧格式和已存在的普通文件，拒绝外部地址、查询参数、路径穿越、符号链接和缺失文件，转为同源 `/uploads/covers/...`。默认只读，执行需要明确数据库、精确条数和全新受限备份文件；条件更新不覆盖期间被用户改动的值。

```bash
node scripts/repair-localhost-covers.js --database=flightwoodx
# 确认只读结果为已核对的 3 条，且外部归档已经备份后才应用：
node scripts/repair-localhost-covers.js --database=flightwoodx --apply --expect-count=3 --backup=/protected-backup/project-covers.json
```

应用时在容器挂载服务器受限备份目录，不把备份放进公开 uploads。不会修改作品内容、所有者、公开范围、时间或删除文件。回滚按备份中每个 `_id` 和 `coverUrl === after` 条件，仅将 `coverUrl` 设回 `before`；先核对期间是否有用户更新，不恢复整个旧数据库覆盖新数据。本地真实 MongoDB 已验证备份、精确条数、重复运行拒绝、并发保护和条件回滚。

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
