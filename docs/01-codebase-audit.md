# 01 — 代码库全面复盘（Codebase Audit）

> **本文档目的**：指导 Claude Code 对 FlightWoodX 现有代码库做一次完整体检，输出一份可执行的整改清单，为后续重构提供依据。
> **预期耗时**：2–3 小时
> **交付物**：`docs/audit-report-YYYY-MM-DD.md`

---

## 1. 复盘原则

1. **只诊断，不治疗**。这一步只负责找问题，不直接改代码。所有改动建议都写进报告，由人类审阅后再决定是否执行。
2. **用量化评分**。每个模块给 1–5 分（1=严重问题，5=生产可用），避免模糊评价。
3. **按影响面排序**。问题清单按「影响用户数 × 修复成本倒数」排序，先解决影响面大且成本低的。
4. **对照新需求做 gap 分析**。不是孤立看现有代码好不好，而是看它离「引导式搭建 + 国内部署 + 设计升级」的目标还差多少。

---

## 2. 复盘清单（按模块）

### 2.1 仓库与构建

- [ ] `package.json` 中依赖版本是否都在 LTS 或最新稳定版？列出所有已过期 > 6 个月的包。
- [ ] 是否有 `pnpm-lock.yaml` / `package-lock.json`？锁文件是否与 `package.json` 同步？
- [ ] `tsconfig.json` 是否开启 `strict`？是否有 `skipLibCheck: true` 之外的质量开关？
- [ ] Vite 配置是否合理？是否配置了 `base` 以支持子路径部署？是否配置了 code splitting？
- [ ] 是否有 ESLint + Prettier？是否和 `lint-staged` + `husky` 联动？
- [ ] 是否有 `.env.example`？实际使用的环境变量有哪些？有没有硬编码？
- [ ] CI/CD 状态：GitHub Actions？Vercel 自动部署？Railway 自动部署？

### 2.2 前端结构（apps/web）

- [ ] 目录组织是按「功能域」还是「文件类型」？现状是哪种？是否合理？
- [ ] 路由管理：react-router v6? 路由表在哪里？是否支持懒加载？
- [ ] 状态管理：用 Context？Zustand？Redux Toolkit？复杂度是否合适？
- [ ] 数据获取：fetch 封装？axios？SWR / TanStack Query？有无统一的错误处理？
- [ ] 表单：react-hook-form？原生？校验库用的什么（zod / yup）？
- [ ] 国际化：是否预留了 i18n 能力？当前是否只支持中文？（未来可能要做新马华人市场）
- [ ] 样式方案：Tailwind? CSS Modules? styled-components? 是否混用？
- [ ] 组件是否有 Storybook / 独立预览？
- [ ] 是否有单元测试（Vitest / Jest）？覆盖率多少？
- [ ] 无障碍（a11y）：Tab 键是否能遍历所有交互元素？颜色对比度是否符合 WCAG AA？

### 2.3 3D 与 WebGL

- [ ] Three.js 版本？是用 `three` 原生还是 `react-three-fiber`？
- [ ] GLB 加载方式：`useGLTF` 是否启用了 Draco 压缩？有没有加 Suspense 边界？
- [ ] **【关键】** 零件列表页的 WebGL Context 数量：当前实现每张卡片是否各自创建 Canvas？
- [ ] 是否已经实现「静态预览图 + 详情 3D」方案？如果没有，预渲染图片放在哪里、尺寸多少、格式是 webp 还是 png？
- [ ] 卡扣点（snap point）元数据：JSON schema 是什么样？是否每个 GLB 都有对应的 JSON？
- [ ] 3D 场景性能：`shadows` 开了没？`pixelRatio` 限制在 [1, 2] 吗？是否用 `Detailed`、`Instanced` 等优化？
- [ ] 缩放、旋转、拖拽的交互代码是否抽取为可复用 hook？

### 2.4 后端结构（apps/api）

- [ ] Express 版本？中间件栈：cors / helmet / morgan / express-rate-limit 有没有都装？
- [ ] 路由是集中在一个大文件，还是按资源（`/users`, `/parts`, `/projects`）拆分？
- [ ] Controller / Service / Repository 三层是否分离？
- [ ] 数据校验：用 zod / joi / class-validator？入口校验覆盖率？
- [ ] 错误处理：是否有统一的 error middleware？错误码是否标准化？
- [ ] 日志：用 `console.log` 还是 winston / pino？是否区分级别？
- [ ] 是否有 OpenAPI / Swagger 文档？
- [ ] 测试：有 supertest 或 vitest 写的接口测试吗？

### 2.5 数据库（MongoDB）

列出所有 collections 及其当前 schema。典型应该至少有：

- [ ] `users`：字段、索引
- [ ] `projects`（学生作品）：字段、索引
- [ ] `parts`（零件元数据）：字段、索引
- [ ] `courses`（课程 / 课时）：字段、索引
- [ ] `progress`（学习进度）：字段、索引
- [ ] `likes`（作品点赞）：字段、索引

检查点：
- [ ] 每个 collection 的主查询路径是否都有对应索引？
- [ ] 是否有文档级别的 `createdAt` / `updatedAt`？
- [ ] 是否有软删除字段（`deletedAt`）？还是硬删？
- [ ] 密码是否 bcrypt 加密且不在 `.select('+password')` 外暴露？
- [ ] 512 MB 的 M0 限制下，当前使用了多少空间？GLB 文件是存在数据库还是对象存储？

### 2.6 认证与权限

- [ ] JWT secret 的强度？（不少于 32 字节随机）
- [ ] token 刷新机制：只有 access token 还是 access + refresh？
- [ ] 角色体系：目前有 `student` / `teacher` / `admin` 吗？RBAC 还是单标志位？
- [ ] 学校实体是否存在？一个学生属于哪个学校、哪个班级，数据模型里如何表达？

### 2.7 课程内容系统

- [ ] 15 课时的内容现在存在哪里？硬编码在前端？还是在数据库？还是在 markdown 文件？
- [ ] 课程进度如何记录？是否支持断点续学？
- [ ] 视频在哪里托管？（当前图上显示「视频加载中…」是占位符）
- [ ] 图文内容的富文本编辑器用的是什么？

### 2.8 作品与社区

- [ ] 作品截图是自动生成（Three.js `toDataURL`）还是用户上传？
- [ ] 点赞防刷：是否有频率限制？
- [ ] 精选机制：是手动运营标记还是算法？

### 2.9 管理后台

- [ ] 是独立的 `/admin` 路由还是独立 app？
- [ ] 权限控制是服务端强校验还是只有前端隐藏？
- [ ] 当前能管理什么：用户、作品、课程、零件？

### 2.10 部署与监控

- [ ] Vercel 项目配置：自定义域名？环境变量？preview deployment？
- [ ] Railway 项目配置：内存规格？自动重启？健康检查？
- [ ] MongoDB Atlas：IP 白名单策略？是否开了审计？
- [ ] 错误监控：有 Sentry 吗？还是只有 console.error？
- [ ] 性能监控：有 Lighthouse CI 吗？核心 Web Vitals 如何？

---

## 3. 对标新需求的 Gap 分析

为三项主要新需求各做一次 gap 分析：

### 3.1 Gap — 引导式搭建流程

针对 [`02-guided-build-flow.md`](02-guided-build-flow.md) 的产品规格，评估：

- 现有零件拖拽代码中，哪些可以复用？哪些必须重写？
- 状态管理是否能容纳「搭建步骤 + 步骤完成条件 + 解锁逻辑」这套状态机？
- 当前的「合规检查」代码和新的「步骤完成检查」是否可以合并为一个规则引擎？
- 数据模型要增加哪些字段（比如 `project.buildStepReached`）？

### 3.2 Gap — 零件分类重构

针对 [`03-parts-system.md`](03-parts-system.md)，评估：

- 现有前端的零件分类 tab（机身 / 机臂 / 机翼 / 尾翼 / 连接件 / 电机座 / 其他）和新分类（HUB / ARM / PLATE / JOINT / LAND / DECO）的映射关系是怎样的？
- GLB 文件的命名是否符合 `FW-[类别码]-[三位序号]` 规范？不符合的要批量改名吗？
- 数据库里 `parts` collection 的 `category` 字段值需要做数据迁移吗？

### 3.3 Gap — 国内部署迁移

针对 [`05-deployment-migration.md`](05-deployment-migration.md)，评估：

- 代码里有多少处硬编码了 `vercel.app` 或 `railway.app` 的域名？
- 有多少外部依赖只能从 CDN 加载（如 jsDelivr / unpkg）？这些在国内访问快吗？
- 是否用了只能在 Vercel 跑的 API（如 `@vercel/og`、`@vercel/edge`）？
- 数据库连接串、对象存储 URL 切换需要改哪些文件？

---

## 4. 输出报告模板

复盘完成后，按以下结构输出 `docs/audit-report-YYYY-MM-DD.md`：

````markdown
# FlightWoodX 代码库体检报告

**体检日期**：YYYY-MM-DD
**体检人**：Claude Code
**代码库 commit**：{git rev-parse HEAD}

## 一、整体评分

| 维度 | 评分（1–5） | 简评 |
|------|------|------|
| 仓库与构建 | x | |
| 前端结构 | x | |
| 3D 与 WebGL | x | |
| 后端结构 | x | |
| 数据库 | x | |
| 认证与权限 | x | |
| 课程内容 | x | |
| 作品与社区 | x | |
| 管理后台 | x | |
| 部署与监控 | x | |
| **加权总分** | **x.x / 5** | |

## 二、Top 10 技术债（按 ROI 排序）

1. …
2. …

每条用以下格式：

### #1 {问题简述}
- **严重度**：🔴 高 / 🟡 中 / 🟢 低
- **影响**：影响用户数 / 影响场景
- **现状**：代码在 `path/to/file.ts:line`，具体问题是……
- **建议修复**：……
- **预计工时**：x 小时 / x 天

## 三、Gap 分析（对三大新需求）

### 3.1 引导式搭建
### 3.2 零件分类重构
### 3.3 国内部署迁移

## 四、推荐的整改执行顺序（2026 Q2–Q3）

周 1–2：…
周 3–4：…
…

## 五、附录

### 5.1 依赖清单（过期 / 有更新）
### 5.2 代码结构树（深度 3）
### 5.3 数据库 schema 截图 / 导出
### 5.4 CI/CD 当前配置摘录
````

---

## 5. 提醒

- 报告写完后，**不要立即开始改代码**。等人类确认整改顺序后再动手。
- 报告用中文写，但代码路径、变量名、错误信息保留英文原样。
- 如果某些检查项因为权限或环境问题无法执行（比如看不到 Vercel / Railway / Atlas 的管理后台），在报告里明确标注「需要人类协助」并列出需要的信息。
