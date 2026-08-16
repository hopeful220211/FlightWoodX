# 05 — 国内部署迁移（Deployment Migration）

> **本文档目的**：把 FlightWoodX 从 Vercel（前端）+ Railway（后端）+ MongoDB Atlas（数据库）的海外基础设施，完整迁移至国内云服务商，以满足公立学校用户的访问速度、合规备案、数据留存要求。
> **重要提醒**：迁移是**不可逆操作**，每一步都要有回滚预案。
> **预期耗时**：1–2 周（含备案等待）

---

## 1. 为什么要迁移

| 问题 | 现状影响 | 迁移后 |
|------|----------|--------|
| 访问速度 | Vercel 在国内平均 TTFB > 1.5s，Railway > 2s | 国内 CDN < 100ms |
| 合规性 | 公立学校采购要求「服务器在中国境内」 | 满足《网络安全法》与招标要求 |
| 备案 | Vercel 域名不可备案 | 使用国内服务器后域名可 ICP 备案 |
| 数据留存 | MongoDB Atlas 在美国，学生数据跨境传输风险 | 国内云，数据不出境 |
| 成本 | Vercel/Railway 按用量付费，学校量上来后不可控 | 国内按带宽包年，成本可预测 |

---

## 2. 国内云服务商选型

### 2.1 三家主流对比

| 维度 | 阿里云 | 腾讯云 | 华为云 |
|------|--------|--------|--------|
| 生态完整度 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 教育行业客户 | 最多 | 多（腾讯教育） | 政企 |
| 备案体验 | 成熟、速度快（3–7 天） | 成熟 | 较慢 |
| 文档质量 | 最好 | 好 | 一般 |
| 对象存储 | OSS | COS | OBS |
| 文件上传限制 | 5GB | 5GB | 5GB |
| MongoDB 托管服务 | 有（云数据库 MongoDB 版） | 有 | 有 |
| 免费额度/优惠 | 新用户很慷慨 | 教育优惠多 | 一般 |
| 发票 & 合同 | 企业采购友好 | 友好 | 友好 |

### 2.2 建议选择

**首选：阿里云**。理由：
1. 生态最完整，前后端 + 数据库 + CDN + 对象存储可在同一个账号下管理
2. 学校甲方熟悉阿里云，走采购流程时方便
3. 教育行业优惠力度大
4. 云效（DevOps 平台）可以替代一部分 GitHub Actions 的能力

**备选：腾讯云**。如果将来要和微信生态打通（小程序、企业微信），腾讯云体验更好。

> 本文后续以**阿里云**为例写方案，腾讯云的方案类比即可。

---

## 3. 阿里云目标架构

```
┌──────────────────────────────────────────────────────────────┐
│                    用户浏览器 / 平板 App                        │
└──────────────────────────────────────────────────────────────┘
           │ https://www.flightwoodx.com (已备案)
           ▼
┌──────────────────────────────────────────────────────────────┐
│              阿里云 CDN（全球加速 + 国内边缘节点）              │
└──────────────────────────────────────────────────────────────┘
           │ 静态资源    │ API 请求
           ▼             ▼
┌─────────────────┐   ┌────────────────────────────────────────┐
│ 对象存储 OSS    │   │ SLB 负载均衡 (api.flightwoodx.com)    │
│ (前端静态资源 + │   └────────────────────────────────────────┘
│  GLB 模型 +    │              │
│  缩略图)       │              ▼
└─────────────────┘   ┌────────────────────────────────────────┐
                      │ ECS 云服务器（Node.js / Express）      │
                      │ (最小 2 核 4G，生产环境建议双机)       │
                      └────────────────────────────────────────┘
                                 │
                                 ▼
                      ┌────────────────────────────────────────┐
                      │ 云数据库 MongoDB（副本集版）            │
                      │ (2 核 4G，起步）                        │
                      └────────────────────────────────────────┘
```

### 3.1 资源清单

| 资源 | 规格 | 月费估算（RMB） | 用途 |
|------|------|---------------:|------|
| ECS 云服务器 | 2 核 4G，100G ESSD 系统盘 | ≈ 200–300 | Node.js API |
| SLB 负载均衡 | 标准规格 | ≈ 30 | API 入口 |
| 云数据库 MongoDB | 副本集 2 核 4G | ≈ 500 | 业务数据 |
| 对象存储 OSS | 40GB + 每月 100GB 流量 | ≈ 20 | 静态资源 & GLB |
| CDN | 100GB/月起 | ≈ 20 | 加速分发 |
| 域名 | .com 续费 | ≈ 70/年 | www.flightwoodx.com |
| SSL 证书 | 免费 DV 证书 | 0 | HTTPS |
| **总计** | | **≈ 800–900 / 月** | |

> 随学校数量增长，MongoDB 与 ECS 规格需要扩容，预算要相应增加。

### 3.2 为什么不用 Serverless（函数计算 FC）

阿里云函数计算可以替代 ECS 跑 Node.js API，成本更低，但：
- 冷启动延迟在课堂场景不可接受（老师点进去第一次卡 1–2 秒）
- Three.js GLB 文件预渲染管线需要 headless browser，函数计算环境限制多
- 目前的 Express 单体架构迁移到 FC 要拆路由，成本高

**结论**：用传统 ECS。未来某天服务拆得足够小了，可以迁移一部分到 FC。

---

## 4. 迁移步骤（按执行顺序）

### Step 0 — 准备（Day 1）

- [ ] 注册阿里云企业账号（用「芬奇答奥（重庆）科技有限公司」营业执照）
- [ ] 完成实名认证（企业类型）
- [ ] 绑定对公账户或法人手机号支付
- [ ] 领取新用户教育优惠代金券

### Step 1 — 域名备案（Day 1–7，阻塞关键路径）

**这是整个迁移中最慢的一步，必须第一个启动。**

- [ ] 登录阿里云控制台，进入「备案管理」
- [ ] 提交 `flightwoodx.com` 域名备案申请
- [ ] 需要材料：
  - 营业执照扫描件
  - 法人身份证正反面
  - 网站负责人身份证正反面 + 核验单
  - 公司公章扫描件
  - 承诺书
- [ ] 阿里云初审（1–3 个工作日）
- [ ] 管局审核（3–20 个工作日，各省不同，重庆通常 5–7 天）
- [ ] **备案下来后**，才能解析域名到国内服务器

> 备案期间：继续使用 Vercel 的 flightwoodx.com，业务不中断。

### Step 2 — 开通基础设施（Day 3–5，与备案并行）

#### 2.1 开通 ECS
- [ ] 购买 1 台 2 核 4G 的 ECS，操作系统 Ubuntu 22.04 LTS
- [ ] 地域选择：**华北 2（北京）** 或 **华东 1（杭州）**（学校主要在东部和北方）
- [ ] 购买时不绑定公网 IP，改用**弹性公网 IP（EIP）** 方便未来切换
- [ ] 安全组开放：22（SSH，限 IP）、80、443
- [ ] 初始化：安装 Node.js 20 LTS、pnpm、pm2、nginx

#### 2.2 开通云数据库 MongoDB
- [ ] 购买副本集版，2 核 4G，存储 50G
- [ ] 与 ECS 同一个可用区
- [ ] 设置白名单：ECS 的内网 IP
- [ ] 创建数据库 `flightwoodx` 和用户 `fwx_app`
- [ ] 记录连接串，放进 ECS 的 `.env`

#### 2.3 开通 OSS
- [ ] 创建 bucket `flightwoodx-assets`，权限「公共读」（用于前端静态资源和 GLB）
- [ ] 创建 bucket `flightwoodx-private`，权限「私有」（用于用户上传的作品截图）
- [ ] 记录 AccessKey 和 SecretKey（存 ECS `.env`，**永远不要 commit**）

#### 2.4 开通 CDN
- [ ] 源站：OSS bucket
- [ ] 加速域名：`cdn.flightwoodx.com`（需备案后生效）
- [ ] 开启 HTTPS（用免费证书）
- [ ] 缓存规则：
  - `*.html` → 缓存 10 分钟
  - `*.js / *.css` → 缓存 1 年（文件名带 hash）
  - `*.glb / *.webp / *.png` → 缓存 1 年
  - `/api/*` → 不缓存

#### 2.5 申请 SSL 证书
- [ ] 为 `www.flightwoodx.com`、`flightwoodx.com`、`api.flightwoodx.com`、`cdn.flightwoodx.com` 分别申请免费 DV 证书（或一张通配符）

### Step 3 — 后端迁移（Day 5–7）

#### 3.1 代码层改造

```bash
# apps/api 目录中
```

- [ ] 扫描硬编码的 Railway 域名、Vercel 域名，全部替换为 `process.env.API_BASE_URL` / `FRONT_BASE_URL`
- [ ] `.env.production` 新增：
  ```
  MONGODB_URI=<由密钥管理器注入>
  OSS_ENDPOINT=oss-cn-beijing-internal.aliyuncs.com
  OSS_ACCESS_KEY_ID=...
  OSS_ACCESS_KEY_SECRET=...
  OSS_BUCKET=flightwoodx-assets
  CDN_DOMAIN=https://cdn.flightwoodx.com
  CORS_ORIGIN=https://www.flightwoodx.com
  ```
- [ ] 替换所有 S3 SDK 调用为 `ali-oss` SDK（如果之前用了 S3）
- [ ] 替换所有 Vercel Edge 特有 API（`@vercel/og`, `@vercel/edge`）为原生 Node 实现
- [ ] 新增健康检查接口 `GET /healthz`，返回 `{status: "ok", version: "...", timestamp: ...}`

#### 3.2 部署

```bash
# 在 ECS 上
$ git clone git@github.com:xxx/flightwoodx.git
$ cd apps/api
$ pnpm install --prod
$ pnpm build
$ pm2 start dist/index.js --name fwx-api -i max
$ pm2 save
$ pm2 startup
```

#### 3.3 Nginx 反向代理

```nginx
# /etc/nginx/sites-available/api.flightwoodx.com
server {
    listen 443 ssl http2;
    server_name api.flightwoodx.com;
    
    ssl_certificate     /etc/ssl/flightwoodx/fullchain.pem;
    ssl_certificate_key /etc/ssl/flightwoodx/privkey.pem;
    
    client_max_body_size 10M;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }
}
server {
    listen 80;
    server_name api.flightwoodx.com;
    return 301 https://$host$request_uri;
}
```

### Step 4 — 前端迁移（Day 7–8）

#### 4.1 构建配置

```ts
// vite.config.ts
export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
});
```

#### 4.2 环境变量

```
# .env.production
VITE_API_BASE_URL=https://api.flightwoodx.com
VITE_CDN_BASE_URL=https://cdn.flightwoodx.com
```

#### 4.3 部署到 OSS

```bash
# CI 脚本示意
$ pnpm build
$ ossutil cp -r dist/ oss://flightwoodx-assets/web/ --update
$ aliyun cdn RefreshObjectCaches --ObjectPath "https://cdn.flightwoodx.com/"
```

配置 OSS 静态网站托管：
- 默认首页：`index.html`
- 错误页：`index.html`（SPA 路由必须）

或者更稳妥：把前端也放 ECS 上用 Nginx 服务，避免 OSS 静态托管的一些怪异行为。

### Step 5 — 数据库迁移（Day 6，可提前）

```bash
# 从 Atlas 导出
$ mongodump --uri="mongodb+srv://<atlas>/..." --out=/tmp/fwx-dump

# 传到 ECS
$ scp -r /tmp/fwx-dump ecs:/tmp/

# 在 ECS 上导入到阿里云 MongoDB
$ mongorestore --uri="$MONGODB_URI" /tmp/fwx-dump
```

**关键**：
- 迁移当天停止写入（开维护公告）
- 验证数据完整性：collection 数、文档数、索引数一致
- 验证关键业务：登录、加载作品、查看课程

### Step 6 — 切换域名（Day 7–8，备案通过后）

#### 6.1 切换前检查
- [ ] 国内服务器接口全部测试通过（用 `api.flightwoodx.com` 直连）
- [ ] 前端资源通过 CDN 访问正常
- [ ] 数据库数据一致
- [ ] Nginx 日志干净，没有明显错误

#### 6.2 DNS 切换
- [ ] 在域名解析处（Godaddy / 阿里云 DNS），把 `www.flightwoodx.com` 从 Vercel 的 CNAME 改为阿里云 CDN 或 OSS 的 CNAME
- [ ] TTL 提前调到 60 秒，切换后观察 24 小时，没问题再调回 3600

#### 6.3 Vercel / Railway 停机
- [ ] Vercel 项目转为 preview 专用（不对外）
- [ ] Railway 项目降级到最低档（保留 1–2 周作为兜底）
- [ ] MongoDB Atlas 降级到免费档（保留 1 周作为兜底）
- [ ] 1 周后无问题，销毁海外资源

### Step 7 — 观察与收尾（Day 8–14）

- [ ] 配置 **阿里云监控**：ECS CPU / 内存 / 磁盘告警
- [ ] 配置 **MongoDB 慢查询告警**
- [ ] 配置 **Sentry 自建**（开源版部署在同一个 ECS 上，或用阿里云 ARMS）
- [ ] 配置**定时备份**：MongoDB 每日自动备份到 OSS，保留 30 天
- [ ] 编写**运维 runbook**：如何重启服务、如何扩容、如何恢复数据

---

## 5. CI/CD 替代方案

**原方案**：GitHub → Vercel 自动构建 / Railway 自动部署
**新方案**：GitHub Actions + 阿里云 Access Key

示意 workflow：

```yaml
# .github/workflows/deploy.yml
name: Deploy to Aliyun
on:
  push:
    branches: [main]
jobs:
  deploy-api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter api build
      - name: SSH Deploy
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.ECS_HOST }}
          username: ${{ secrets.ECS_USER }}
          key: ${{ secrets.ECS_SSH_KEY }}
          script: |
            cd /var/www/flightwoodx
            git pull
            cd apps/api && pnpm install --prod && pnpm build
            pm2 reload fwx-api
  
  deploy-web:
    runs-on: ubuntu-latest
    steps:
      # ... 构建后用 ossutil 同步到 OSS
```

---

## 6. 合规清单（教育产品额外要求）

- [ ] **ICP 备案**（Step 1）
- [ ] **公安备案**（备案通过后 30 天内，免费）
- [ ] **网站底部**：在所有页面底部加备案号链接到工信部
- [ ] **隐私政策**：明确数据存储位置（中国大陆）、数据用途、用户权利
- [ ] **儿童个人信息保护**：符合《个人信息保护法》对 14 岁以下儿童的特殊保护要求
  - 注册时需要监护人同意
  - 不收集非必要的儿童信息
  - 提供数据删除通道
- [ ] **数据安全等级保护（等保 2.0）**：学校大客户可能要求，等拿到大单再做（约 5 万元/次）

---

## 7. 回滚预案

每一步都有对应的回滚：

| 步骤 | 回滚方式 |
|------|----------|
| 域名切换 | DNS 改回 Vercel 的 CNAME（TTL 短，5 分钟生效） |
| 后端切换 | 前端 `VITE_API_BASE_URL` 改回 Railway 地址，重新构建发布 |
| 数据库切换 | 应用配置改回 Atlas 连接串，如果期间有新数据写入，用增量同步脚本合并 |
| 全面回滚 | 保留 Vercel/Railway/Atlas 1 周，期间可随时一键回滚 |

---

## 8. 给 Claude Code 的执行清单

Claude Code **不直接执行**这些运维操作（需要人类登录阿里云控制台、输入密码、完成实名认证等），但负责：

1. **代码层改造**：按第 3.1 节扫描并改造硬编码和 SDK 替换
2. **CI/CD 脚本**：按第 5 节写 GitHub Actions workflow
3. **Nginx 配置**：按第 3.3 节生成配置文件模板
4. **数据迁移脚本**：写 `scripts/migrate-atlas-to-aliyun.ts` 处理数据清洗和结构升级
5. **环境变量文档**：更新 `.env.example` 和部署文档
6. **监控代码**：接入阿里云 ARMS 或自建 Prometheus + Grafana

每一步改完代码后写成 PR，不要混在一起。
