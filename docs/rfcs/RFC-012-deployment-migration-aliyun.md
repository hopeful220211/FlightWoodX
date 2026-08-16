# RFC-012 — 后端部署迁移：Railway / Atlas → 阿里云（完整版 v1.0）

> **状态**：✅ 已批准执行（用户 2026-06-15 确认「直接迁阿里云，按 RFC 执行」）
> **作者**：后端工程师（Claude Code）
> **日期**：2026-06-15
> **分支**：`feat/platform-2.0`
> **触发事件**：Railway 免费额度耗尽 → 后端服务下线（`Application not found`）→ 线上登录 `Load failed`
> **关联**：操作细则承接 [`docs/05-deployment-migration.md`](../05-deployment-migration.md)；现状依据本次会话体检与诊断
> **定位**：主战场**国内为主**（最终客户是中国公立中小学）；全球化为后置增量，不替代国内

---

## 0. 摘要（TL;DR）

线上后端（Railway）因免费额度耗尽已下线，触发本次迁移。决定把 **后端 + 数据库迁至阿里云**、**前端迁至阿里云 OSS+CDN**，满足公立校采购的「境内 + 备案 + 数据不出境」硬要求。

执行分两条并行线：
- **人类线**：启动 ICP 备案（阻塞关键路径，3–7 天）→ 开通阿里云基建（ECS / MongoDB / OSS / CDN）。
- **Claude Code 线**：立即开工 **Phase A 代码可移植化**（容器化 + 连接健壮性 + 对象存储抽象，**不依赖阿里云**）→ 基建就绪后做 **Phase C 接线 + 数据迁移**。

数据安全：用户数据在 MongoDB Atlas，**未受 Railway 下线影响**（本地后端已验证可正常读写）；迁移为同结构 `mongodump`→`mongorestore`，全程可回滚。

---

## 1. 触发与背景

### 1.1 触发事件：Railway 后端下线（诊断证据）

本次会话诊断结论（附录 A 有完整记录）：

| 探测 | 结果 | 结论 |
|---|---|---|
| 抓线上前端 bundle | 无 `localhost`，`VITE_API_URL` 正确指向 `https://flightwoodx-backend-production.up.railway.app/api` | **前端配置正常** |
| `GET {railway}/api/health` | `HTTP 404` + `x-railway-fallback: true` + `{"message":"Application not found"}` | **Railway 后端已下线**（请求未触达 Express） |
| 本地起后端 + 假账号登录 | `/api/health` 200；登录返回标准 `401` | **登录代码 + Atlas 连接均正常** |

→ 线上 `Load failed` 根因 = **Railway 平台层后端不存在**（额度耗尽），非代码、非 CORS、非数据问题。

### 1.2 现状架构（三平台均在海外/跨境）

| 层 | 平台 | 证据 | 位置 |
|---|---|---|---|
| 前端 | Vercel（Hobby） | 根 `vercel.json`（vite，仅产出 `apps/web/dist`，纯静态 SPA） | 海外 |
| 后端 | Railway | `flightwoodx-backend-production.up.railway.app`，零配置 nixpacks（`node src/server.js`） | 海外（us-west2） |
| 数据库 | MongoDB Atlas | `cluster0.kxhyybc.mongodb.net` | 美国 |

> 有利信号：`.env` 的 `AI_BASE_URL` 已指向阿里云百炼（`dashscope.aliyuncs.com`），**团队已有阿里云账号**。

### 1.3 体检发现的现状偏差（本 RFC 纠正 `docs/05`）

`docs/05` 写于早期，部分指令与现状不符，执行前必须纠正：

| `docs/05` 假设 | 实际现状 | 纠正 |
|---|---|---|
| `pnpm --filter api build` → `pm2 start dist/index.js` | **api 是纯 JS/CommonJS，无 build、无 dist**；`package.json` 无 `build` 脚本；入口 `src/server.js` | 直接跑 `node src/server.js`（容器内），**无 build 步骤** |
| "替换所有 S3 SDK / Vercel Edge API" | 后端**根本没用** S3 SDK / `@vercel/*` | 此项为 no-op；`/upload` 尚未实现，迁移时用对象存储 SDK 写第一版 |
| 新增 `GET /healthz` | 已有 `GET /api/health` | 复用 + 加 `/healthz` 别名（SLB 探活） |
| （未提及） | 缺 `trust proxy`、连接超时/重连、优雅关闭、404 处理 | 反代/容器必需，纳入 Phase A |

### 1.4 现状的好处

后端**无平台耦合**（未用 Railway/Vercel 私有 API），配置已基本 env 化。迁移成本主要在**基建开通 + 备案 + 数据搬迁**，代码改动小且独立。

---

## 2. 目标与非目标

### 2.1 目标
1. **可移植化**：后端用一个 `Dockerfile` 在任意平台跑起来，切换平台只改 env。
2. **国内落地**：前端 OSS+CDN、后端容器跑 ECS、数据库阿里云 MongoDB，全部在阿里云华东/华北，域名 ICP 备案。
3. **合规**：学生数据不出境；满足《个人信息保护法》对 14 岁以下儿童的特殊要求。
4. **零数据丢失、可回滚**：不可逆操作均有回滚预案，海外资源保留 ≥1 周兜底。

### 2.2 非目标
- ❌ 国内+海外双活（无明确全球业务前性价比低，后置）。
- ❌ 本 RFC 内改 MongoDB 索引/集合结构（同结构迁移；结构升级、等保 2.0 另案）。
- ❌ 引入 k8s（单机 Docker 足够）。
- ❌ 引入付费 SaaS（监控用阿里云 ARMS 或自建开源；禁止付费 Sentry/Algolia —— CLAUDE.md §3.5）。

---

## 3. 关键决策

| # | 决策 | 理由 |
|---|---|---|
| D1 | 国内为主，落阿里云 | 客户是公立校，境内+备案+数据不出境是采购硬门槛；团队已有阿里云账号 |
| D2 | 前后端分开部署 | 前端纯静态 SPA（OSS+CDN，零运维）；后端长驻 Node（需容器）。生命周期不同，分开后前端可全球 CDN、后端按主战场放 |
| D3 | 后端容器化（Dockerfile），ECS 上 `docker compose` 运行 | 比 Railway 零配置/裸 pm2 更可移植，不引入 k8s。换平台 = 换跑镜像的地方 |
| D4 | 真迁移前先做 Phase A 可移植化 | Phase A 不依赖阿里云、不改对外行为、为迁移与 `/upload` 铺路，可与备案并行，ROI 最高 |
| D5 | 对象存储用 S3 兼容协议封装 | OSS/COS/S3 均兼容 S3 SDK；上传抽象成适配层，切换只改 endpoint |
| D6 | 起步用「降本档」，上量后升「生产档」 | 早期个人/小规模，云数据库 MongoDB 副本集 500/月偏重；详见 §4.2，需 §13 拍板 |

---

## 4. 目标架构（阿里云）

### 4.1 架构图

```
浏览器/平板 → 阿里云CDN ─┬─→ OSS（前端静态 + GLB + 缩略图）
                         └─→ SLB/Nginx → ECS(Docker: Express :3000) → 阿里云 MongoDB
```

唯一相对 `docs/05 §3` 的修正：ECS 上后端以**容器**运行 `node src/server.js`，无 build。

### 4.2 资源清单与成本（两档）

**降本档（建议起步，迁移期与小规模试点）**

| 资源 | 规格 | 月费估算 |
|---|---|---|
| 轻量应用服务器 / ECS | 2C2G | ≈ 60–120 |
| 云数据库 MongoDB | **Serverless 版 或 最小单副本集** | ≈ 60–150 |
| OSS | 40GB + 100GB/月流量 | ≈ 20 |
| CDN | 100GB/月起 | ≈ 20 |
| 合计 | | **≈ 160–310 / 月** |

**生产档（学校上量后，沿用 `docs/05 §3.1`）**：ECS + SLB + 云数据库 MongoDB 副本集 + OSS + CDN ≈ **800–900 / 月**。

> ⚠️ 数据安全红线：**不建议**用「ECS 上单机自建 MongoDB」——无副本、无自动备份，学生数据不可接受。降本档也要用云数据库 MongoDB（Serverless 或最小副本集），保证自动备份。详见 §13-Q3。

### 4.3 为什么 ECS+Docker（而非 Serverless FC / 裸 pm2）

- 不用函数计算 FC：冷启动在课堂场景不可接受；Express 单体迁 FC 要拆路由，成本高（`docs/05 §3.2`）。
- 不用裸 pm2：可移植性差，换平台要重配环境；Docker 镜像一次构建处处运行。
- ECS + `docker compose`（api + nginx）：单机起步够用，不引入 k8s 复杂度。

### 4.4 已开通资源现状（截至 2026-06-16）

| 项 | 实际值 | 评估 |
|---|---|---|
| ECS 实例 | `ecs.e-c1m1.large`，2C2G，Ubuntu 22.04，40G ESSD Entry，IP `8.156.92.182` | ✅ 符合降本档 |
| 地域/可用区 | **西南1（成都）可用区 B** | ⚠️ 见连带约束 |
| 公网带宽 | **3 Mbps 固定带宽**（公网 IP 非 EIP） | ⚠️ 见带宽约束 |
| 付费 | 包年包月，到期 2027-04-15 | ✅ 已锁定 |

**① 地域连带约束（硬）**：ECS 在成都 → **云数据库 MongoDB 必须同选「西南1成都 可用区 B」**（内网互通、低延迟、免内网流量费），OSS 选 `oss-cn-chengdu`，CDN 回源同区。**切勿把 MongoDB/OSS 买到其它地域。**

**② 地域 vs 学校分布**：成都适合西南（重庆/四川）。若首批含东部/北方学校，API（不走 CDN）延迟偏高。ECS 已包年，换地域成本高 → 除非东部学校延迟不可接受，否则维持成都（替代原 §13-Q1，待确认首批分布）。

**③ 带宽约束（硬）**：3 Mbps 仅够 API JSON。**前端静态 + GLB 必须走 OSS+CDN，绝不能从 ECS 出流量**，否则带宽打满。早期试点够用，上量再升带宽 / 转按量计费。

**④ 运维约定**：
- 公网 IP 建议**转 EIP**，换实例不必改 DNS。
- **不装宝塔面板**：与 Docker+nginx 重叠、增加安全面；保持容器化，利于 CI/CD 与可移植。

---

## 5. 代码层改造（Claude Code 执行）

### 5.1 Phase A — 可移植化（不依赖阿里云，立即开工）

| ID | 改造 | 文件 | 关键实现 | 验收 |
|---|---|---|---|---|
| A1 | trust proxy | `src/server.js` | `app.set('trust proxy', 1)` | 反代后 `req.ip` 为真实 IP，限流按真实 IP |
| A2 | Mongo 连接健壮性 | `src/server.js` | `mongoose.connect(uri,{serverSelectionTimeoutMS:5000,socketTimeoutMS:45000})` + `connection.on('error'/'disconnected')` 日志 | 断网有明确日志，恢复自动重连，不静默 hang |
| A3 | 优雅关闭 | `src/server.js` | `SIGTERM/SIGINT` → `server.close()` + `mongoose.connection.close()` + 10s 兜底退出 | `docker stop`/`pm2 reload` 无半截连接 |
| A4 | 健康检查反映 DB | `src/server.js` | `app.get(['/api/health','/healthz'])`，按 `mongoose.connection.readyState` 返回 200/503 | SLB 可用 `/healthz` 探活，DB 挂时返回 503 |
| A5 | 404 + 错误中间件归位 | `src/server.js` | 路由后加 JSON 404；错误中间件移到 `listen` 前 | 未知路由返回 JSON 而非默认 HTML |
| A6 | 对象存储适配层 | 新增 `src/lib/storage.js` | `putObject(key,buffer,contentType)→url`；driver 由 env 选 `disk`/`s3`，S3 用 `@aws-sdk/client-s3`（兼容 OSS/COS/S3） | disk/s3 两实现 env 可切；单测覆盖 |
| A7 | Dockerfile | 新增 `apps/api/Dockerfile` + `.dockerignore` | `node:20-slim`，pnpm 装 prod 依赖，`CMD ["node","src/server.js"]` | `docker build` 成功，容器内 `/api/health` 200 |
| A8 | env 模板补全 | `.env.example` | 补 `OSS_*`/`CDN_DOMAIN`/`STORAGE_DRIVER`（占位） | 覆盖全部新变量，无真实密钥 |
| A9 | 清理死配置 | `.env`/`.env.example` | 移除无引用的 `AI_*`（RFC-009/010 stash 遗留）并轮换 | 无用密钥不再驻留 |

> A6/A7 同时是「后端功能补救」里 `/upload` 的前置依赖。

### 5.2 Phase C — 迁移接线（基建就绪后）

| ID | 改造 | 说明 |
|---|---|---|
| C1 | 生产 env | ECS 上写 `MONGODB_URI`（阿里云内网）、`CORS_ORIGIN=https://www.flightwoodx.com`、`OSS_*`、`STORAGE_DRIVER=s3`（不进 git） |
| C2 | `/upload` 接 OSS | 用 A6 storage 适配层，endpoint 指向 OSS 内网 |
| C3 | 数据迁移脚本 | 见 §6 |
| C4 | CI/CD | `.github/workflows/deploy.yml`：前端→ossutil 同步；后端→SSH 到 ECS `docker compose up -d --build`（去掉无效 api build，承接 `docs/05 §5`） |
| C5 | Nginx 反代 | `api.flightwoodx.com`→容器:3000（`docs/05 §3.3` 模板，配合 A1） |

### 5.3 对 `@fwx/shared` / IR / 零件 schema 的影响

**无破坏性影响。** 不改跨前后端类型；DB 同结构搬迁；A6 storage 只产出 URL，与现有 `glbUrl/thumbnailUrl/simReplayUrl` 字段契约一致。`commandProgram` 的 zod 入库校验属功能补救（RFC-013），不在本 RFC。

---

## 6. 数据迁移方案（Atlas → 阿里云 MongoDB）

### 6.1 原则
- **同结构搬迁**，不改集合/索引（CLAUDE.md §3.5）。
- **停写窗口**：迁移当天挂维护公告，停止写入，避免迁移中产生增量。
- **幂等 + 可校验**：脚本可重复跑；迁移后做完整性校验。

### 6.2 步骤（脚本 `scripts/migrate-atlas-to-aliyun.js`，纯 JS，沿用现有脚本风格）
1. `mongodump --uri="<Atlas>" --out=/tmp/fwx-dump`
2. `scp` 到 ECS（或在 ECS 上直连 Atlas dump）
3. `mongorestore --uri="<阿里云内网>" --drop /tmp/fwx-dump`
4. 校验（见 6.3）

### 6.3 完整性校验（迁移验收前置）
- 逐 collection 比对 **文档数**（`countDocuments`）
- 比对 **集合数** 与 **索引数**（`db.collection.indexes()`）
- 关键业务抽样：取 N 个 User / DroneDesign / Program / Project，逐字段比对
- 任一不一致 🛑 停止切换，排查或回滚

---

## 7. 执行计划与分工

### 7.1 阶段总览与时间线

| 阶段 | 内容 | 执行者 | 起止（相对 Day 0） | 阻塞 |
|---|---|---|---|---|
| **Phase A** | A1–A9 代码可移植化 | Claude Code | Day 0–3 | 无（立即开工） |
| **Phase B** | 注册/实名、**ICP 备案**、开通 ECS/MongoDB/OSS/CDN | 人类 | Day 0 启动备案 | **备案 3–7 天，关键路径** |
| **Phase C** | 接线（C1–C5）+ 数据迁移脚本 + 预演 | Claude Code + 人类 | Day 5–7 | 依赖 B 基建就绪 |
| **切换** | 正式数据迁移 + 部署 + DNS 切换 | 人类 + Claude Code | 备案通过后 | 依赖备案 🛑 |
| **Phase D** | 监控/备份/runbook，观察 1 周后销毁海外资源 | 人类 + Claude Code | 切换 +1~7 天 | — |

> 备案期间线上**继续用海外**（但当前 Railway 已挂——见 §7.4 过渡方案）。

### 7.2 分工矩阵（谁做什么）

| 任务 | Claude Code | 人类（小城/运维） |
|---|---|---|
| Phase A 代码改造 | ✅ 全部 | 审阅 |
| 阿里云账号/实名/支付 | ❌ | ✅ |
| ICP 备案材料与提交 | ❌ | ✅ |
| 开通 ECS/MongoDB/OSS/CDN、安全组、SSL | ❌（提供配置模板） | ✅ 控制台操作 |
| Dockerfile / docker-compose / nginx 配置 | ✅ 生成 | 部署执行 |
| 数据迁移脚本 | ✅ 编写 | ✅ 执行（持密钥） |
| CI/CD workflow | ✅ 编写 | ✅ 配 GitHub Secrets |
| DNS 切换 | ❌ | ✅ |
| 监控/备份/runbook | ✅ 代码/文档 | ✅ 控制台配置 |

### 7.3 停止点 🛑
- Phase A 完成 → 汇报，人类确认再进 C。
- 备案通过前**不切换 DNS**。
- 数据完整性校验不过**不切换**。

### 7.4 当前线上中断的过渡方案（因 Railway 已挂）
线上后端**现在就是挂的**。三选一（§13-Q4 拍板）：
- (a) **不救 Railway**，加速迁移，迁好直接上国内（推荐：重构期，迁移本就在路上）。
- (b) Railway 充值/重开临时续命到迁移完成（若有真实用户在用）。
- (c) 临时把后端跑到一个便宜海外节点（Render 免费档等）顶到迁移完成。

---

## 8. CI/CD

承接 `docs/05 §5`，**修正**：后端不 build，改为构建并推送 Docker 镜像 / 在 ECS 上 `docker compose up -d --build`。前端 `pnpm --filter web build` → `ossutil` 同步 OSS → 刷新 CDN 缓存。Secrets（ECS_HOST/SSH_KEY/OSS AK）走 GitHub Secrets，永不进 git。

---

## 9. 量化验收标准（可勾选）

### Phase A
- [ ] `docker build -t fwx-api apps/api` 成功；`docker run` 后 `GET /api/health` 200
- [ ] `trust proxy` 后经反代限流按真实客户端 IP 计数
- [ ] Mongo 断连时 `/api/health` 返回 503 并有日志；恢复后自动重连
- [ ] `SIGTERM` 下进程优雅退出，无未关闭连接报错
- [ ] 未知路由返回 JSON 404
- [ ] `src/lib/storage.js` 的 disk/s3 实现 env 可切，单测覆盖 `putObject`
- [ ] `.env.example` 覆盖全部新增变量且无真实密钥；`.env` 死配置已清理
- [ ] `pnpm lint` 全绿（api 不参与 typecheck）

### 切换（Phase C/D）
- [ ] 阿里云 MongoDB 的 collection 数 / 各 collection 文档数 / 索引数与 Atlas **完全一致**
- [ ] 关键路径回归：注册登录、加载/保存设计、查看课程、管理后台
- [ ] 前端经 CDN 首屏静态资源 TTFB 国内 < 100ms；API 经 SLB 国内 P95 < 300ms
- [ ] 海外资源保留 ≥1 周可一键回滚

---

## 10. 风险与回滚

承接 `docs/05 §7` 回滚矩阵（DNS 改回原 CNAME / env 回切 / Atlas 兜底 1 周），补充：

| 风险 | 缓解 |
|---|---|
| 备案耗时不可控（阻塞） | Day 0 即启动；备案期线上走 §7.4 过渡方案 |
| 迁移当天增量写入致不一致 | 停写窗口 + §6.3 完整性校验 + 必要时增量补偿 |
| 单台 ECS 单点故障 | 生产档双机 + SLB；Phase D 配监控告警 |
| 密钥泄露 | 仅存 ECS `.env` / GitHub Secrets / 阿里云 KMS，永不进 git |

---

## 11. 合规清单（承接 `docs/05 §6`）

- [ ] **ICP 备案**（关键路径，Day 0 启动）
- [ ] **公安备案**（备案通过后 30 天内）
- [ ] 全站底部备案号链接工信部
- [ ] **隐私政策**：明确数据存储位置（中国大陆）、用途、用户权利
- [ ] **儿童个人信息保护**（<14 岁）：注册需监护人同意、不收集非必要信息、提供数据删除通道
- [ ] 等保 2.0：拿到大单再做

---

## 12. 工程红线（CLAUDE.md §3.5）
- ❌ 不删 `public/models/`、`public/cad/` 下 GLB/CAD。
- ❌ 本 RFC 不改 MongoDB 索引/集合结构。
- ❌ 不引入付费 SaaS。
- ❌ 密钥一律 `.env`+`.env.example`（占位），永不 commit。
- ❌ 不虚构。

---

## 13. 待确认问题（请人类/统筹窗拍板）

- **Q1 ECS 地域**：✅ 已定 **西南1（成都）可用区 B**（团队在重庆就近；ECS 已包年）。连带 MongoDB/OSS/CDN 必须同选成都（见 §4.4）。**待确认**：首批学校是否以西南为主（影响东部学校 API 延迟）。
- **Q2 后端运行形态**：确认 D3「ECS + Docker」？
- **Q3 数据库档位**：降本档（Serverless / 最小副本集，§4.2）起步，还是直接生产档副本集？（红线：不接受单机自建无备份）
- **Q4 过渡方案**：§7.4 的 (a)/(b)/(c) 选哪个？（推荐 a：不救 Railway，加速迁移）
- **Q5 对象存储 SDK**：A6 用 `@aws-sdk/client-s3`（跨厂商，推荐）还是 `ali-oss`（绑定阿里）？

---

## 附录 A：本次会话诊断记录

1. 本地 3000 端口无监听 → 起后端后 `/api/health` 200、假账号登录 401 → 本地登录代码 + Atlas 均正常。
2. 线上 `www.flightwoodx.com` bundle（`/assets/index-BW8sVnaO.js`）无 `localhost`，`VITE_API_URL` = `https://flightwoodx-backend-production.up.railway.app/api` → 前端配置正常。
3. `GET {railway}/api/health` → `404 + x-railway-fallback:true + "Application not found"` → Railway 后端下线（额度耗尽）。
4. 结论：线上 `Load failed` = Railway 后端不存在；数据在 Atlas 安全；→ 直接迁阿里云。

---

> **执行入口**：本 RFC 批准后，Claude Code 立即开工 Phase A（§5.1）；人类并行启动 Phase B（备案 + 基建）。功能补救另出 RFC-013（接口契约先与统筹窗对齐）。
