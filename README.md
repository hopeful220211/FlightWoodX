# FlightWoodX

木质榫卯无人机 STEAM 教育系统。

> 📖 完整开发文档见 [`CLAUDE.md`](./CLAUDE.md) 和 [`docs/`](./docs/)

## 快速开始

```bash
pnpm install          # 安装全部依赖
pnpm dev              # 同时启动前后端
pnpm dev:web          # 仅启动前端 (http://localhost:5173)
pnpm dev:api          # 仅启动后端 (http://localhost:3000)
```

## 项目结构

- `apps/web/` — React + Vite 前端
- `apps/api/` — Node.js + Express 后端
- `packages/parts-schema/` — 前后端共享的零件类型定义
- `docs/` — 开发文档
