# FlightWoodX Web

> 状态：当前模块入口
>
> 更新时间：2026-08-15
>
> 适用范围：`apps/web` 的开发入口和本地命令
>
> 替代关系：替代原始 Vite 模板说明；项目规则、架构和完成度仍以根文档为准

这是 FlightWoodX 的 React + Vite 前端。开始改动前读取：

1. [`../../AGENTS.md`](../../AGENTS.md)
2. [`AGENTS.md`](./AGENTS.md)
3. [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md)
4. [`../../CURRENT_STATUS.md`](../../CURRENT_STATUS.md)
5. 当前功能规格和实际代码

从仓库根目录运行：

```bash
pnpm dev:web
pnpm --filter web test
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web build
```

本地默认地址为 `http://localhost:5173`。页面存在或能启动不代表功能完成；验收要求见根规则和当前状态。
