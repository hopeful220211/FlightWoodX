# FlightWoodX Harness

> 状态：生效中的质量治理说明
>
> 更新时间：2026-08-15
>
> 适用范围：仓库知识、规格、计划、实现和验证之间的约束关系
>
> 替代关系：补充 `AGENTS.md` 的执行方式，不修改其事实优先级、工程规则或完成定义

Harness 是让开发持续服从产品真值、模块边界和证据要求的一组仓库载体，不是新的运行时模块，也不代表现有功能已经通过验收。

## 原则

1. **一个问题对应一个来源。** 规则在 `AGENTS.md`，当前架构在 `ARCHITECTURE.md`，完成证据在 `CURRENT_STATUS.md`，目标行为在产品规格，执行顺序在计划。
2. **事实、目标、计划和历史分开。** RFC 与规格说明要达到什么；计划说明怎样做；只有带日期和 commit 的验证可以推进当前状态。
3. **先定义失败，再实现成功。** 坏输入、越权、重复请求、并发、外部服务失败、刷新和恢复都进入验收。
4. **确定性结论只走确定性路径。** 大模型、客户端状态和视觉仿真不得替代权限、规则、制造、飞行或审核判定。
5. **必经路径优先于文件存在。** 页面、路由、按钮和测试文件存在都不等于用户路径可用。
6. **失败必须可见且可恢复。** 不得用 DEMO、mock、缓存旧值或静默吞错制造成功表象。
7. **状态随证据变化。** 代码、依赖、环境或外部服务变化后，旧结果仍是历史证据，不能自动视为当前通过。

## 载体

| 载体 | 作用 | 何时更新 |
|---|---|---|
| [`AGENTS.md`](../../AGENTS.md) | 仓库地图、冻结边界、事实优先级和完成定义 | 负责人改变项目级规则时 |
| [`apps/web/AGENTS.md`](../../apps/web/AGENTS.md)、[`apps/api/AGENTS.md`](../../apps/api/AGENTS.md)、[`packages/AGENTS.md`](../../packages/AGENTS.md) | 靠近实现的模块规则 | 模块边界或开发约束变化时 |
| [`ARCHITECTURE.md`](../../ARCHITECTURE.md) | 当前模块、数据来源和数据流 | 已验证的架构发生变化时 |
| [`CURRENT_STATUS.md`](../../CURRENT_STATUS.md) | 当前完成度、命令结果、人工证据和阻塞 | 获得新证据、回滚或证据失效时 |
| [`product-specs/core-flow.md`](../product-specs/core-flow.md) | 产品主线、目标验收和非目标 | 产品范围或验收标准被批准修改时 |
| [`QUALITY_SCORE.md`](./QUALITY_SCORE.md) | 统一评分口径 | 完成一次有证据的质量评估时 |
| [`SECURITY.md`](./SECURITY.md)、[`RELIABILITY.md`](./RELIABILITY.md) | 横切不变量和验证清单 | 风险面或要求变化时 |
| [`TECH_DEBT.md`](./TECH_DEBT.md) | 技术与验证债务、退出证据 | 发现债务或验证关闭时 |
| [`exec-plans/`](../exec-plans/) | 有范围的实施计划与执行记录 | 开始、调整、验证或结束一轮工作时 |
| [`rfcs/`](../rfcs/) | 目标方案和决策背景 | 新决策获批或旧决策被替代时 |
| [仓库 Skill](../../.agents/skills/flightwoodx-development/SKILL.md) | 引导代理执行项目闭环，不覆盖仓库规则 | 工作流改变时 |
| [`scripts/check-harness.mjs`](../../scripts/check-harness.mjs) 与 [CI](../../.github/workflows/ci.yml) | 检查必需入口、关键链接和受支持的静态架构边界；源码引用由 TypeScript compiler AST 解析，TypeScript/JavaScript 配置按当前工具链解析，样式与 Vite HTML 入口做有范围的静态扫描 | Harness 结构或边界变化时 |
| 代码、测试、完整 CI 和人工路径 | 功能与运行证据 | 每次相关实现变化后 |

Skill 只负责让代理在相关任务中按同一顺序工作。Harness 还包括仓库知识、架构、测试、浏览器和运行反馈，因此不能只安装一个 Skill，也不能只写一份提示词。

## 状态推进

```text
已批准目标 → 有范围的执行计划 → 实现与测试 → 自动化和人工验证 → 更新当前状态
```

- `草案`：可讨论，不约束实现。
- `已冻结`：目标或规则已确定，不表示实现完成。
- `实施中`：存在未完成步骤或未通过项。
- `已验证`：指定 commit 和适用环境的验收证据齐全。
- `历史`：只解释过去，不描述当前状态。

执行计划移入 `completed/` 只表示该计划记录的范围已经结束。产品是否完成仍由 `CURRENT_STATUS.md` 和 `AGENTS.md` 的完成定义判断。

## 最小证据记录

每次推进状态至少记录：

- 日期、commit、分支和适用环境。
- 执行命令及原始结果摘要。
- 人工页面、操作、视口、浏览器和结果。
- 正常、失败、越权、重复与恢复路径。
- 没有验证的内容、外部依赖和发布阻塞。
- 变更涉及的数据迁移、环境变量、回滚和负责人批准。

`pnpm run harness` 通过只证明当前静态门槛通过。它覆盖清单依赖、入口与别名，直接源码引用，常用 Node 文件路径，Vite glob/配置，样式与 HTML 本地入口，以及仓库符号链接；它不是完整的跨程序文件系统、数据流、Vite 插件或 CSS/HTML 语义分析。评分、文档评审或本地测试不能替代代码审查、功能路径、目标环境、真实外部服务、硬件、制造或实飞证据。

## 方法依据

- [OpenAI：Harness engineering](https://openai.com/index/harness-engineering/) 提出的核心做法包括：人负责目标与取舍、代理执行；以短入口映射仓库知识；将架构不变量机械化；让界面和可观测性可由代理读取；持续清理仓库熵。
- [Anthropic：Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) 强调把长任务拆成可连续推进的小步，并为下一轮留下干净、可接续的仓库状态。

本项目当前采用与现有规模匹配的基础层：分层规则、知识索引、执行计划、专用 Skill、结构检查和既有 CI。多代理编排、自动合并、周期性后台清理、完整本地可观测性和长时间自治，要在相应反馈能力与风险控制具备后再增加。
