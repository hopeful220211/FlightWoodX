# FlightWoodX

木质榫卯无人机 STEAM 教育系统。

> 完整接手说明见 [`docs/PROJECT_GUIDE.md`](./docs/PROJECT_GUIDE.md)。项目入口见 [`AGENTS.md`](./AGENTS.md) 与 [`docs/index.md`](./docs/index.md)，当前架构见 [`ARCHITECTURE.md`](./ARCHITECTURE.md)，真实进度见 [`CURRENT_STATUS.md`](./CURRENT_STATUS.md)。`CLAUDE.md` 仅作兼容入口。

## 快速开始

```bash
pnpm install --frozen-lockfile  # 按锁文件安装全部依赖
pnpm dev              # 同时启动前后端
pnpm dev:web          # 仅启动前端 (http://localhost:5173)
pnpm dev:api          # 仅启动后端 (http://localhost:3000)
pnpm run harness      # 检查项目知识结构与静态架构边界
pnpm test             # 运行所有已有 workspace 测试
pnpm check            # 类型、API 语法、测试、lint 和安全检查
pnpm run ci           # 完整检查并生产构建
```

## 项目结构

- `apps/web/` — React + Vite 前端
- `apps/api/` — Node.js + Express 后端
- `packages/parts-schema/` — 前后端共享的零件类型定义
- `packages/shared/` — API、领域类型与飞行指令协议
- `packages/geometry/` — 二维轮廓到 DXF/SVG
- `packages/flight-check/` — 规则检查（不是物理仿真）
- `.agents/skills/flightwoodx-development/` — 项目开发工作流
- `docs/` — 产品、质量、计划与历史文档
