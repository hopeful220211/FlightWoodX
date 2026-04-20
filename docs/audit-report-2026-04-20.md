# FlightWoodX 代码库体检报告

**体检日期**：2026-04-20
**体检人**：Claude Code
**代码库 commit**：4aa82de5a48b2e27fc12e5c17dff02f818cff1e9

## 一、整体评分

| 维度 | 评分（1–5） | 简评 |
|------|------|------|
| 仓库与构建 | 3.5 | Monorepo 已搭建，pnpm workspace 正常；缺 CI/CD、husky、lint-staged |
| 前端结构 | 4 | Zustand + React Router v7 + Tailwind 结构清晰；缺测试、懒加载、i18n |
| 3D 与 WebGL | 4 | 已用静态缩略图规避 Context 溢出；Draco 压缩 + Suspense 到位；缺 LOD |
| 后端结构 | 2 | 仅 5 个端点、1 个 Model、无 Service 层、无校验库、无日志、无安全中间件 |
| 数据库 | 2.5 | 仅 User collection；无 parts/projects/courses/progress 表；M0 免费档 |
| 认证与权限 | 2.5 | JWT 基本可用；无 refresh token、无 RBAC、admin 路由无角色校验 |
| 课程内容 | 3 | Markdown 硬编码在前端 data/courses.ts；支持断点续学（localStorage） |
| 作品与社区 | 3 | Gallery 有筛选/排序/点赞 UI；Featured 数据硬编码；无后端持久化 |
| 管理后台 | 2 | 仅能查看用户列表；无角色校验（任何登录用户都能访问 /admin） |
| 部署与监控 | 2 | Vercel 部署正常；无 CI/CD、无错误监控、无性能监控；.env 泄露 |
| **加权总分** | **2.9 / 5** | 前端较成熟，后端和基础设施薄弱 |

---

## 二、Top 10 技术债（按 ROI 排序）

### #1 生产凭证泄露在 Git 历史中

- **严重度**：🔴 高
- **影响**：数据库可被任何查看过 repo 的人访问；JWT 可被伪造
- **现状**：`apps/api/.env` 已被 commit，含 MongoDB Atlas 密码 `j1peo5dMu8xhJ2wc` 和 JWT Secret
- **建议修复**：立即轮换 MongoDB 密码和 JWT Secret；用 `git filter-branch` 或 BFG 清除历史
- **预计工时**：1 小时

### #2 Admin 路由无角色权限校验

- **严重度**：🔴 高
- **影响**：任何已登录用户访问 `/admin` 即可查看全部用户数据
- **现状**：`apps/web/src/components/layout/ProtectedRoute.tsx` 仅检查 `isAuthenticated`；后端 `GET /api/auth/users` 同样只有 `authenticate` 中间件
- **建议修复**：后端增加 `requireRole('admin')` 中间件；前端 admin 路由检查 `user.role === 'admin'`
- **预计工时**：2 小时

### #3 后端缺少安全中间件

- **严重度**：🔴 高
- **影响**：无 rate-limit（可被暴力破解登录）、无 helmet（缺安全 headers）、CORS 全开
- **现状**：`apps/api/src/server.js` 仅有 `cors()` + `express.json()`
- **建议修复**：安装 `helmet`、`express-rate-limit`、`cors` 配白名单
- **预计工时**：2 小时

### #4 零件分类与 GLB 实际分组不一致

- **严重度**：🔴 高（阻塞引导式搭建重构）
- **影响**：线上 parts.ts 使用旧分类（body/arm/wing/tail/connector/motor/other），与 GLB 文件新分类（HUB/ARM/PLATE/JOINT/LAND/DECO）不匹配
- **现状**：`apps/web/src/data/parts.ts` 的 category 字段用旧值
- **建议修复**：按 `docs/03-parts-system.md` 重新映射分类；复用 `@fwx/parts-schema` 的 `PartCategoryEnum`
- **预计工时**：4 小时

### #5 无自动化测试（前后端均为 0 覆盖）

- **严重度**：🟡 中
- **影响**：重构时无回归保障；上线靠手动验证
- **现状**：无任何 `.test.*` 或 `.spec.*` 文件；无 Vitest/Jest/Supertest 配置
- **建议修复**：先为核心路径写集成测试（auth API + design store + snap logic）
- **预计工时**：1–2 天

### #6 课程内容硬编码在前端

- **严重度**：🟡 中
- **影响**：内容更新需要重新部署；无法让运营人员自行编辑
- **现状**：`apps/web/src/data/courses.ts` 含全部课程 Markdown；进度存 localStorage
- **建议修复**：短期可接受（课程稳定）；中期迁移到 CMS 或后端 API
- **预计工时**：视方案，0.5–3 天

### #7 无 CI/CD 流水线

- **严重度**：🟡 中
- **影响**：无 lint/typecheck 门禁；人为失误可直接上线
- **现状**：无 `.github/workflows/`、无 husky、无 lint-staged
- **建议修复**：创建 GitHub Actions（lint + typecheck + build）；加 husky pre-commit
- **预计工时**：3 小时

### #8 后端仅有 User model，缺少业务数据持久化

- **严重度**：🟡 中
- **影响**：学生作品、零件元数据、课程进度均无后端存储；换设备即丢失
- **现状**：MongoDB 仅有 `users` collection；前端 design/learning 数据全存 localStorage
- **建议修复**：按需增加 projects / parts / progress collections
- **预计工时**：2–3 天

### #9 路由无懒加载（Code Splitting）

- **严重度**：🟢 低
- **影响**：首屏加载所有页面 JS（含 Three.js 等重型库）
- **现状**：`apps/web/src/App.tsx` 直接 import 所有 page 组件
- **建议修复**：`React.lazy()` + `Suspense` 拆分 Design / Learn / Admin 页面
- **预计工时**：1 小时

### #10 Draco Decoder 依赖外网 CDN

- **严重度**：🟢 低（国内部署时升级为中）
- **影响**：Draco 解码器从 `gstatic.com` 加载，国内可能慢或被墙
- **现状**：`apps/web/src/hooks/usePartConnectors.ts:160` 使用 `https://www.gstatic.com/draco/versioned/decoders/1.5.6/`
- **建议修复**：将 draco decoder 文件复制到 `public/draco/` 并修改路径
- **预计工时**：30 分钟

---

## 三、Gap 分析（对三大新需求）

### 3.1 引导式搭建

| 现状 | 目标 | 差距 |
|------|------|------|
| 自由拖拽，无步骤约束 | 分步引导（HUB → ARM → MOTOR → GUARD → DECO → REVIEW） | 需新增状态机 |
| `designStore` 管理零件列表和选中 | 需增加 `currentStep`、`stepComplete` 条件、步骤解锁逻辑 | 扩展 store |
| 基础合规检查（缺机身/机翼警告） | 每步有明确完成条件（如 HUB 步 = 已选 1 个 hub） | 可合并为规则引擎 |
| `addPartSmart()` 已有 hub-first 约束 | 需更严格：非当前步骤的零件禁用 | 修改过滤逻辑 |
| 无进度持久化 | `project.buildStepReached` 需入库 | 需后端 API |

**可复用**：ThreeCanvas、GLBPart、snap.ts、usePartConnectors、SocketHighlights
**需重写**：DesignPage 左侧面板（分步 UI）、designStore 流程控制部分

### 3.2 零件分类重构

| 现状 | 目标 | 差距 |
|------|------|------|
| 旧分类：body/arm/wing/tail/connector/motor/other | 新六类：HUB/ARM/PLATE/JOINT/LAND/DECO | 需重新映射 |
| GLB 命名：`core_hub_01.glb`、`arm_01.glb` 等 | 规范：`FW-HUB-001` 格式 | 需批量改名或映射表 |
| `data/parts.ts` 硬编码 90+ 零件 | 应从 `@fwx/parts-schema` 驱动 | 需迁移数据源 |
| 数据库无 parts collection | 需 parts collection + API | 需新建后端 CRUD |

**映射关系**（现有 → 新）：
- body / core_hub → HUB
- arm → ARM
- wing / core_plate → PLATE
- connector / joint → JOINT
- landing → LAND
- decoration / deco → DECO
- motor/other → 暂移除（电机/螺旋桨不在 GLB 零件库中）

### 3.3 国内部署迁移

| 检查项 | 结果 |
|--------|------|
| 硬编码 vercel.app / railway.app 域名 | 0 处（仅在文档中出现） |
| Vercel-only API（@vercel/og、@vercel/edge） | 0 处 |
| 外部 CDN 依赖 | 1 处：Draco decoder（gstatic.com） |
| 数据库切换涉及文件 | 仅 `.env` 中的 `MONGODB_URI` |
| 代码可移植性 | ✅ 高：前端纯静态 SPA、后端标准 Express |

**迁移工作量评估**：
- 前端：改 `VITE_API_URL` 环境变量 + 搬 Draco decoder 到本地 = 0.5 天
- 后端：改 `.env` + 配置国内 MongoDB 实例 + 加进程管理器 = 1 天
- DNS + 备案 + SSL：人工操作，2–4 周审批

---

## 四、推荐的整改执行顺序（2026 Q2–Q3）

**周 1（紧急安全修复）**：
- 轮换 MongoDB 密码 + JWT Secret
- 清除 git 历史中的 .env
- 加 helmet + rate-limit + CORS 白名单
- Admin 路由加角色校验

**周 2–3（引导式搭建基础）**：
- 零件分类重构（parts.ts 对齐新六类）
- 写 RFC：引导式搭建状态机设计
- 路由懒加载 + Draco decoder 本地化

**周 4–6（引导式搭建核心开发）**：
- 实现分步状态机 + 步骤 UI
- 每步零件过滤 + 完成条件检查
- 搭建流程集成测试

**周 7–8（后端补全）**：
- 增加 projects / parts collections + API
- 设计数据持久化（从 localStorage → 后端）
- 加 CI/CD（GitHub Actions + husky）

**周 9–10（国内部署）**：
- 备案 + 国内服务器搭建
- 数据迁移 + 灰度切换
- 性能监控上线

---

## 五、附录

### 5.1 依赖清单（关键包版本）

| 包名 | 当前版本 | 位置 |
|------|---------|------|
| react | ^19.2.0 | web |
| react-router-dom | ^7.12.0 | web |
| three | ^0.182.0 | web |
| @react-three/fiber | ^9.5.0 | web |
| @react-three/drei | ^10.7.7 | web |
| zustand | ^5.0.10 | web |
| vite | ^7.2.4 | web |
| typescript | ~5.9.3 | web |
| tailwindcss | ^3.4.17 | web |
| express | ^4.18.2 | api |
| mongoose | ^8.1.1 | api |
| jsonwebtoken | ^9.0.2 | api |
| bcrypt | ^5.1.1 | api |
| zod | ^3.23.0 | parts-schema |

### 5.2 代码结构树（深度 3）

```
flightwoodx/
├── apps/
│   ├── web/
│   │   ├── public/
│   │   │   ├── models/          # 77 GLB files
│   │   │   ├── thumbnails/      # 77 PNG previews
│   │   │   └── resource/        # images & videos
│   │   ├── src/
│   │   │   ├── components/      # common/ design/ features/ layout/
│   │   │   ├── data/            # parts.ts courses.ts featuredWorks.ts
│   │   │   ├── hooks/           # useHydrate usePartConnectors
│   │   │   ├── pages/           # Home/ Design/ Learn/ Gallery/ Profile/ Auth/ Admin/
│   │   │   ├── stores/          # authStore designStore learningStore profileStore settingsStore
│   │   │   ├── types/           # design.ts learning.ts profile.ts
│   │   │   └── utils/           # api.ts cn.ts localStorage.ts download.ts
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.js
│   │   └── tsconfig.json
│   └── api/
│       └── src/
│           ├── server.js
│           ├── controllers/authController.js
│           ├── middleware/auth.js
│           ├── models/User.js
│           └── routes/auth.js
├── packages/
│   └── parts-schema/
│       └── src/index.ts         # Zod schemas + TS types
├── docs/
│   ├── 01-codebase-audit.md
│   ├── 02-guided-build-flow.md
│   ├── 03-parts-system.md
│   ├── 04-design-system.md
│   ├── 05-deployment-migration.md
│   └── 06-roadmap.md
├── CLAUDE.md
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── vercel.json
```

### 5.3 数据库 Schema

**目前仅有 1 个 Collection：`users`**

```javascript
// apps/api/src/models/User.js
{
  username:    { type: String, required, unique, trim, minlength: 3 },
  email:       { type: String, required, unique, lowercase, trim },
  password:    { type: String, required, minlength: 6 },
  role:        { type: String, enum: ['student','teacher','admin'], default: 'student' },
  profile: {
    displayName: String,
    avatar:      String,
    grade:       String,
    studentId:   String
  },
  createdAt:   { type: Date, default: Date.now },
  lastLogin:   Date
}
```

索引：`username`（unique）、`email`（unique）
密码处理：bcrypt pre-save hook（10 轮盐）
无软删除字段

### 5.4 API 端点清单

| Method | Path | Auth | 功能 |
|--------|------|------|------|
| GET | /api/health | ❌ | 健康检查 |
| POST | /api/auth/register | ❌ | 注册（username + email + password） |
| POST | /api/auth/login | ❌ | 登录（email + password），返回 JWT |
| GET | /api/auth/me | ✅ | 获取当前用户信息 |
| GET | /api/auth/users | ✅ | 获取所有用户（无 admin 校验） |

### 5.5 需要人类协助的检查项

- [ ] **MongoDB Atlas 管理后台**：确认当前存储使用量、IP 白名单策略、是否开启审计日志
- [ ] **Vercel 管理后台**：确认环境变量配置、自定义域名绑定、preview deployment 设置
- [ ] **Railway 管理后台**：确认内存规格、自动重启策略、日志保留
- [ ] **域名备案状态**：www.flightwoodx.com 是否已在国内备案？
- [ ] **设计师提供**：是否每个 GLB 都有对应的卡扣点 JSON 元数据文件？还是卡扣点完全靠命名约定从 GLB 内提取？
