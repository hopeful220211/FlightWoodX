# FlightWoodX 项目完整说明与开发交接

> 状态：2026-08-17 GitHub 异地接续版本
>
> 更新时间：2026-08-17
>
> 适用范围：项目定位、当前框架、目录职责、运行时架构、数据与安全边界、已完成改动、模块进度、本地运行、部署骨架、GitHub 接续和后续开发方法
>
> 替代关系：这是面向接手开发的综合说明；当前完成度仍以 [CURRENT_STATUS.md](../CURRENT_STATUS.md) 为准，稳定工程边界以 [AGENTS.md](../AGENTS.md) 和 [ARCHITECTURE.md](../ARCHITECTURE.md) 为准，产品验收以 [核心流程规格](./product-specs/core-flow.md) 为准

## 1. 先看结论

FlightWoodX 是一个木质榫卯无人机 STEAM 教育平台。当前仓库已经具备 React 前端、Express API、MongoDB 数据模型、共享运行时契约、三维拼装、Blockly 编程、浏览器视觉仿真、作品保存、用户零件绘制、社区与赛事基础接口、管理后台骨架、对象存储适配、部分 CAD 导出和部署骨架。

本轮工程整改已经把代码整理成 pnpm monorepo，并建立 Harness Engineering 规则、分层文档、项目专用 Skill、静态架构门禁、测试、安全审计和 CI。当前自动化基线为 101 项 Harness 测试与 134 项应用/共享包测试，共 235 项。

项目仍不是可直接发布或可承诺真实飞行、制造的完成版。最重要的未完成项是：

1. 起落架数量存在 4–8 个与恰好 4 个的规则冲突。
2. 用户绘制零件尚未通过统一契约进入正式拼装器。
3. 官方零件没有获批、可追溯的二维制造图。
4. 视觉仿真不是物理仿真，也没有硬件或实飞证据。
5. 多设备作品冲突、真实 MongoDB/OSS、系统级 E2E、未成年人合规和生产运维未闭环。
6. 管理后台只有概览真实接线，用户、课程、零件和审计页面仍为占位。

本次 GitHub 交付分支规划为：

- 分支：codex/clean-handoff-2026-08-17
- 形式：只包含当前完整文件树的单提交快照
- 原因：公开远端尚未包含本机 37 个祖先提交，项目又登记了历史凭据风险；快照分支避免新增公开这些祖先
- 不做：不覆盖 main，不强制推送，不修改原始脏工作树，不改变仓库可见性

## 2. 文档和事实的读取顺序

后续任何开发任务都按下列顺序读取：

1. [AGENTS.md](../AGENTS.md)：全仓不可违反的规则、权限顺序和完成定义。
2. [文档入口](./index.md)：产品、质量、计划、RFC 和历史资料的导航。
3. [ARCHITECTURE.md](../ARCHITECTURE.md)：当前模块、依赖方向和正式数据流。
4. [CURRENT_STATUS.md](../CURRENT_STATUS.md)：最近一次有证据的完成度、测试结果和发布阻塞。
5. 当前目录的 AGENTS.md：Web、API 或共享包的就近规则。
6. 当前功能的产品规格、接口契约、实际代码和测试。

聊天记录、旧路线图、截图、页面存在或 RFC 文件名都不能单独证明功能完成。跨任务长期有效的结论必须写回仓库。

## 3. 产品目标与证据边界

当前核心闭环是：

~~~text
绘制或选择零件
  → 拼装无人机
  → Blockly 编写飞行程序
  → 浏览器视觉仿真
  → 保存与重新打开作品
  → 导出当前已有数据
~~~

这条主线包含两个相互独立的领域：

| 领域 | 负责内容 | 不负责内容 |
| --- | --- | --- |
| 机体领域 | 零件、连接、二维几何、装配规则、制造数据来源 | 飞行程序执行、真机通信 |
| 飞行程序领域 | Blockly、CommandProgram IR、模拟适配器、未来真机适配器 | 结构强度、材料、公差、真实可飞性 |

必须始终保留以下边界：

- 结构检查只能说明软件规则是否满足，不能证明真实可飞。
- Three.js 和 AR 页面只是视觉演示，不能证明物理精度或真机能力。
- DXF/SVG 只有在来源几何合法且获批时才是可继续验证的制造输入，不能自动等于可直接加工。
- 客户端提交的 owner、role、score、audit、public、manufacturing、flight 或 verified 状态均不可信。
- 发布、徽章或评分若依赖飞行检查，必须由服务端按受控规则和证据版本重算。
- 首页现有文字按当前要求不改，但其中缺乏来源的飞行、奖项、案例和供应承诺仍是发布阻塞。

## 4. 当前技术栈

### 4.1 仓库与工具

| 范围 | 当前选择 | 用途 |
| --- | --- | --- |
| 仓库结构 | pnpm workspace monorepo | 统一管理 Web、API 和四个共享包 |
| Node.js | 20 或更高 | 前后端构建、测试和 API 运行 |
| 包管理器 | pnpm 9.12.0 | 冻结安装和 workspace 链接 |
| TypeScript | 根 5.5+，应用实际 5.9.x | Web 与共享包类型检查；API 使用有限 JS 检查 |
| CI | GitHub Actions | Harness、类型、测试、lint、安全和生产构建 |
| 项目治理 | Harness Engineering | 把架构、文档、安全边界变成可执行门禁 |

### 4.2 Web 前端

| 能力 | 技术 |
| --- | --- |
| UI | React 19.2.8、React DOM 19.2.8 |
| 构建 | Vite 7.3.5 |
| 路由 | React Router 8.3，页面级懒加载 |
| 本地状态 | Zustand 5 |
| 服务端状态 | TanStack Query 5 |
| 三维 | Three.js 0.182、React Three Fiber、Drei |
| 编程 | Blockly 12.5 |
| 绘图 | Paper.js、perfect-freehand、use-gesture |
| 动画与图标 | Framer Motion、Lucide |
| 样式 | Tailwind CSS 3.4、PostCSS |
| 导出 | JSZip、共享 geometry 包 |
| 测试 | Vitest 4.1 |

### 4.3 API 后端

| 能力 | 技术 |
| --- | --- |
| HTTP API | Express 4 |
| 数据库 | MongoDB、Mongoose 8 |
| 身份 | JWT HS256、bcryptjs |
| 安全中间件 | Helmet、CORS、express-rate-limit |
| 文件与对象存储 | 本地磁盘、S3 兼容存储、阿里云 OSS |
| ZIP 导出 | archiver |
| 代码形式 | CommonJS JavaScript |
| 测试 | Node 内置 node:test |

### 4.4 当前仓库规模

2026-08-17 的受版本控制快照约包含：

| 项目 | 数量 |
| --- | ---: |
| 受版本控制文件 | 868 |
| 受版本控制内容 | 约 154.9 MB |
| Web 源码文件 | 231 |
| API 源码文件 | 58 |
| Web 测试文件 | 12 |
| API 测试文件 | 12 |
| Web public 静态文件 | 358 |
| 官方零件注册表条目 | 94 |

体积主要来自模型、图片、视频和字体。当前单文件最大约 14.8 MB，没有超过 GitHub 单文件 100 MB 限制，但长期应把大资源迁往对象存储并核验授权。

## 5. 仓库目录结构

~~~text
flightwoodx/
├── AGENTS.md
├── ARCHITECTURE.md
├── CURRENT_STATUS.md
├── README.md
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── .github/
│   └── workflows/ci.yml
├── .agents/
│   └── skills/flightwoodx-development/
├── apps/
│   ├── web/
│   │   ├── AGENTS.md
│   │   ├── src/
│   │   ├── public/
│   │   └── .env.example
│   └── api/
│       ├── AGENTS.md
│       ├── src/
│       ├── test/
│       ├── assets/cad/parts/
│       └── .env.example
├── packages/
│   ├── AGENTS.md
│   ├── shared/
│   ├── parts-schema/
│   ├── geometry/
│   └── flight-check/
├── docs/
│   ├── index.md
│   ├── PROJECT_GUIDE.md
│   ├── product-specs/
│   ├── quality/
│   ├── exec-plans/
│   └── rfcs/
├── scripts/
│   ├── check-harness.mjs
│   ├── check-harness.test.mjs
│   └── check-secrets.mjs
└── deploy/
    ├── docker-compose.yml
    ├── nginx/
    ├── scripts/
    └── .env.example
~~~

目录职责：

| 路径 | 职责 | 禁止事项 |
| --- | --- | --- |
| apps/web | 页面、编辑器、浏览器状态、3D、Blockly、前端导出 | 不能承担最终权限或把视觉结果当工程证明 |
| apps/api | 鉴权、授权、持久化、领域路由、存储与服务端编排 | 不能信任客户端权威字段 |
| packages/shared | 跨端契约、角色权限、命令协议和共享模型 | 不依赖 React、Express、Mongoose |
| packages/parts-schema | 官方零件、搭建步骤、用户零件与设计快照结构 | 不依赖任何应用 |
| packages/geometry | 确定性二维几何校验与 DXF/SVG | 不声明制造可行性 |
| packages/flight-check | 结构和受控证据规则检查 | 不声明真实适航 |
| docs | 当前事实、规格、质量和执行证据 | 历史文档不能覆盖当前状态 |
| deploy | Docker、Nginx、Mongo、OSS 和运维脚本骨架 | 没有目标环境证据时不能视为已上线 |

依赖方向固定为：应用可以依赖共享包，共享包不得依赖应用。共享包内部当前只有 shared → parts-schema。

## 6. 运行时总架构

~~~mermaid
flowchart LR
  subgraph Browser["浏览器 · apps/web"]
    UI["页面与编辑器"]
    Local["Zustand + localStorage"]
    Query["TanStack Query"]
    Blocks["Blockly 编译器"]
    Sim["Three.js + SimAdapter"]
    WebExport["浏览器导出组装器"]
  end

  subgraph Packages["共享包"]
    Shared["@fwx/shared"]
    Parts["@fwx/parts-schema"]
    Geometry["@fwx/geometry"]
    Flight["@fwx/flight-check"]
  end

  subgraph API["服务端 · apps/api"]
    Express["Express 中间件与路由"]
    Domain["控制器与领域辅助模块"]
    Models["Mongoose 模型"]
    Storage["disk / S3 / OSS"]
    Cad["受控 CAD 备用导出"]
  end

  Mongo[(MongoDB)]
  Objects[(对象存储)]

  UI <--> Local
  UI <--> Query
  UI --> Blocks --> Shared --> Sim
  UI --> Parts
  UI --> Flight
  UI --> WebExport --> Geometry
  Query <--> Express
  Express --> Domain --> Models --> Mongo
  Domain --> Storage --> Objects
  Domain --> Cad
  Express --> Shared
  Express --> Parts
  Express --> Geometry
  Shared --> Parts
~~~

正式事实来源：

| 数据 | 正式来源 | 浏览器角色 |
| --- | --- | --- |
| 登录用户作品 | 服务端 DroneDesign | 本地草稿、离线副本和交互缓存 |
| 飞行程序 | 服务端 Program，通过 programId 绑定作品 | 按 designId 保存未提交 Blockly 草稿 |
| 官方零件元数据 | parts-schema registry | 只做展示和实例化 |
| 用户零件 | 服务端 CustomPart | 绘制、预览和草稿 |
| 社区/赛事/fork 存量兼容 | Project 桥接层 | 只消费经过 API 授权的数据 |
| 飞行证据 | 未来服务端受控、版本化 registry | 客户端状态不能作为证据 |

## 7. Web 前端架构

### 7.1 应用启动

入口是 apps/web/src/main.tsx。根节点依次装配：

1. React StrictMode。
2. BrowserRouter。
3. TanStack QueryClientProvider。
4. 全局 ErrorBoundary。
5. ToastProvider。
6. App 路由树。

TanStack Query 默认把数据视为 30 秒内新鲜，失败重试一次，窗口重新聚焦时不自动刷新。开发 API 默认是 http://localhost:3000/api，生产未配置时使用同域 /api。

### 7.2 路由

路由真源是 apps/web/src/App.tsx，全部主要页面按路由懒加载。

#### 身份页面

| 路径 | 页面 | 当前行为 |
| --- | --- | --- |
| /auth | LoginRedirect | 回首页并打开登录弹窗 |
| /login | LoginRedirect | 同上 |
| /register | AuthPage | 全屏注册页 |

#### 全屏编辑器

| 路径 | 页面 | 职责 |
| --- | --- | --- |
| /design、/design/:id | DesignPageRouter | 拼装无人机 |
| /code、/code/:id | CodingPage | Blockly 编程 |
| /simulator、/simulator/:id | SimulatorPage | 浏览器视觉仿真 |

三者共用 EditorLayout，多作品标签页存储在 fwx_editor_open_tabs。

#### 公开页面

| 路径 | 页面 |
| --- | --- |
| / | 首页 |
| /community | 社区作品流 |
| /community/leaderboard | 排行榜 |
| /community/:postId | 社区作品详情 |
| /u/:userId | 作者页 |
| /collections/:id | 公开收藏夹 |
| /part-studio | 用户零件绘制 |

#### 受保护页面

| 路径 | 页面 | 当前成熟度 |
| --- | --- | --- |
| /dashboard | DashboardPage | 当前作品库主入口 |
| /projects | ProjectsPage | 已退休并重定向到 dashboard |
| /projects/:id | ProjectDetailPage | 旧 Project 兼容详情 |
| /collections | CollectionsPage | 个人收藏 |
| /feed | FollowingFeedPage | 需要真实登录 token |
| /fly/:id | FlyPage | 真机适配占位 |
| /me | MePage | 部分内容仍为占位 |
| /profile | ProfilePage | 本地资料与设置为主 |
| /design/export-preview/:designId | ExportPreviewPage | 部分导出预览 |
| /design/ar-flight/:designId | ARFlightPage | 摄像头背景加简化运动演示 |

ProtectedRoute 允许游客会话进入部分页面。游客没有服务端 token，需要服务端身份的操作仍必须在页面和 API 层拒绝。

#### 管理后台

| 路径 | 页面 | 状态 |
| --- | --- | --- |
| /admin | OverviewPage | 已有真实概览请求 |
| /admin/users | ModulePlaceholder | 未实现 |
| /admin/courses | ModulePlaceholder | 未实现 |
| /admin/parts | ModulePlaceholder | 未实现 |
| /admin/audit | ModulePlaceholder | 未实现 |

前端使用 admin 角色路由和 sessionStorage 中的临时后台访问密钥；最终权限仍由 API 同时验证 JWT、角色和后台密钥。

### 7.3 浏览器状态

| Store | 持久化键 | 职责 |
| --- | --- | --- |
| authStore | auth-storage | 用户、JWT、游客会话、登录恢复 |
| designStore | drone_app_design_store | 本地作品、当前作品、步骤、删除墓碑 |
| programStore | drone_app_program_store | 每个作品的 Blockly XML、IR 和服务端 Program ID |
| editorTabsStore | fwx_editor_open_tabs | 多作品编辑标签 |
| learningStore | 项目常量定义 | 学习进度 |
| profileStore | 项目常量定义 | 本地个人资料 |
| settingsStore | 项目常量定义 | 主题与偏好 |
| uiStore | 内存短状态 | 登录弹窗等 UI 状态 |

当前重要行为：

- 游客会生成本地会话，不拥有服务端 JWT。
- 登出会清除作品和程序状态，降低学校共用电脑串号风险。
- designStore 通过删除墓碑阻止已删除作品在同步后复活。
- 服务端与本地目前按 updatedAt 选择较新版本，没有正式冲突状态、版本号或人工合并。
- programStore 按 designId 隔离程序草稿，旧版单一草稿由首次打开的具体作品认领。
- Web 自有角色类型尚未完整包含共享模型中的 parent，需后续统一。

### 7.4 API 客户端

apps/web/src/utils/api.ts 目前是约 800 行的单文件客户端，负责：

- 从认证持久化状态读取 Bearer token。
- 为后台请求附加 X-Admin-Access-Key。
- 统一处理成功、错误和网络失败。
- 兼容不同历史响应格式。
- 覆盖身份、作品、程序、用户零件、社区、评论、关注、收藏、复用、活动和后台接口。

已知债务：

- DroneDesign、旧 designs 和 Project 三套作品语义仍并存。
- Web 内仍有重复 DTO，没有全部使用共享运行时 schema。
- 单文件继续扩张会让变更和测试范围失控，后续应按领域拆分。
- 若要删除看似未调用的兼容函数，必须先完成全仓符号与运行路径核对。

## 8. 零件、拼装、编程、仿真和导出

### 8.1 用户零件绘制

入口是 /part-studio，核心实现位于 apps/web/src/features/partStudio。

当前流程：

1. 用户用指针自由绘制轮廓。
2. 前端简化路径并检测闭合。
3. 转换为二维折线。
4. 以固定 2 mm 厚度生成三维拉伸预览。
5. 估算面积与质量。
6. 登录用户保存到 /api/custom-parts。
7. 服务端再次解析 SVG 路径、复核几何并把制造通过状态强制设为 false。

当前支持 guard、joint、deco、landing 四类用户结构件。

未完成：

- PX_PER_MM=4 仍是临时换算，没有真实标尺校准。
- 没有孔位编辑和连接点编辑。
- 没有最小筋宽、材料、公差、刀缝或强度验证。
- 用户零件仍未进入正式拼装器。

### 8.2 官方零件与拼装

官方零件的唯一元数据来源是 packages/parts-schema/src/registry.ts。当前注册表有 94 个条目：

| 类别 | 数量 |
| --- | ---: |
| 主板 | 16 |
| 起落/支撑 | 39 |
| 保护 | 28 |
| 连接 | 11 |

当前引导式五步为 HUB、ARM、GUARD、DECO、REVIEW。DesignPageRouter 会恢复未完成作品，新建主路径进入 GuidedDesignPage，旧自由模式保留在 DesignPage。

连接点来自 GLB 节点命名，支持 SOCKET_、PLUG_ 和 conn_socket 等形式；连接成功后两端都会标记为占用。连接规则和实时限制位于 Web 工具层，最终结构检查来自 @fwx/flight-check。

当前 P0 冲突：

- parts-schema 的搭建说明允许 4–8 个起落架。
- flight-check 的 REQUIRED_ARM_COUNT 是 4，要求恰好 4 个。
- 负责人冻结唯一规则前，任何新功能都不能再复制其中任意一份。

当前页面没有受控 VerifiedFlightEnvelope，因此结构完整时仍返回 assembly-only、EVIDENCE_MISSING 和 canTakeoff=false。这是正确边界。

### 8.3 作品保存

作品保存链路：

~~~mermaid
flowchart LR
  Edit["编辑器改动"] --> Local["Zustand 本地持久化"]
  Local -->|"登录用户，约 2 秒防抖"| Sync["PUT /api/drone-designs"]
  Sync -->|"ownerId + localId 幂等"| Server["DroneDesign"]
  Server -->|"登录后拉取并校验"| Local
~~~

当前规则：

- 登录作品的正式来源是服务端 DroneDesign。
- localId 是稳定幂等键。
- 快照进入服务端前经过版本化 DroneDesignSnapshotSchema。
- 游客只保存本机。
- 保存失败必须保留本地内容并显式反馈。

未完成：

- 没有乐观锁或服务端版本号。
- 多设备同时编辑没有冲突状态与人工解决流程。
- Project 仍为社区、赛事和 fork 提供兼容语义。

### 8.4 Blockly 编程

CodingPage 的流程：

1. 根据当前作品 ID 读取独立草稿。
2. 恢复 Blockly XML。
3. 编译为共享 CommandProgram。
4. 显示指令计划或编译错误。
5. 保存本地草稿。
6. 登录用户创建或更新服务端 Program。
7. 把 programId 写回 DroneDesign。
8. 运行时进入 /simulator/:id。

正式路径不会为空白作品静默载入演示程序。损坏 XML 不会被空工作区覆盖，多个启动块会产生明确错误。

共享命令包括起飞、降落、移动、旋转、悬停、LED、等待条件、锁定轴、条件和循环。共享 schema 还限制高度、距离、速度、旋转、悬停、循环次数、命令总数和嵌套深度。

### 8.5 浏览器视觉仿真

SimulatorPage 只读取当前作品的 CommandProgram。SimAdapter 以 50 ms tick 执行共享指令，FlightScene 显示三维无人机、轨迹、LED、遥测和当前命令。

当前仿真使用固定障碍、简化运动学、简化碰撞和固定电量。RunResult 只存在于页面内，不持久化，不构成物理或实飞证据。

ARFlightPage 只是摄像头背景加简化运动演示；没有空间追踪或真机连接。FlyPage 仍是未来真机适配入口。

### 8.6 部分导出

浏览器导出当前可生成：

~~~text
parts/<id>.dxf
parts/<id>.svg
BOM.csv
assembly.md
manifest.json
README.txt
~~~

只有存在合法二维几何时才生成 DXF/SVG。当前官方零件通常缺少获批二维源，因此可能只得到 BOM、说明和缺件信息。

@fwx/geometry 只接受 M/L/H/V/Z 闭合折线，拒绝曲线、自交、孔越界和坏坐标。它不做刀缝补偿、套料、材料库、多厚度、G-code 或 OBJ/GLB 反推。

旧 exportChecks 仍有与共享规则不一致的逻辑，不能作为最终规则来源。

## 9. API 后端架构

### 9.1 启动和中间件

apps/api 是 Node.js 20+、CommonJS JavaScript、Express 和 Mongoose 组成的单体 API。

关键入口：

| 文件 | 职责 |
| --- | --- |
| apps/api/src/app.js | 创建可测试的 Express app，不监听端口 |
| apps/api/src/server.js | 读取环境、连接 Mongo、监听端口、优雅关闭 |
| apps/api/src/db.js | MongoDB 连接与断开 |
| apps/api/src/config/env.js | 环境变量解析、默认值、安全校验和冻结 |

中间件顺序：

1. 请求方法、路径、状态码和耗时日志。
2. Helmet 安全响应头。
3. CORS 白名单。
4. 全局速率限制。
5. JSON 和 URL 编码请求体大小限制。
6. 领域路由。
7. 404。
8. 安全错误处理。

/api/health 和 /healthz 会同时报告进程与 Mongo 连接；数据库未连接时返回 503 DEGRADED。server.js 响应 SIGTERM 和 SIGINT，最长等待 10 秒关闭 HTTP 和 Mongo。

### 9.2 身份与授权

当前实现：

- 注册、登录、读取本人、修改资料和修改密码。
- 密码使用 bcrypt，salt rounds 为 10。
- JWT 仅允许 HS256，有效期 7 天。
- 每次受保护请求重新查询 User，并核对 tokenVersion。
- 修改密码递增 tokenVersion，使旧 token 失效。
- 角色包括 student、teacher、parent、admin。
- 管理后台同时要求有效 JWT、admin 角色和临时后台访问密钥。
- 后台密钥未配置时失败关闭，比较使用定时安全函数。

未完成：

- 密码重置、邮箱验证、刷新 token、正式登出与设备会话。
- 当前密码最低长度 6，生产策略偏弱。
- 正式账号启用/停用、学校、班级、监护人同意和未成年人状态。
- 管理员提升脚本的生产防误操作、审计和二次确认。
- 生产角色变更、会话撤销和真实数据库并发验证。

### 9.3 API 领域

| 挂载路径 | 当前能力 | 成熟度 |
| --- | --- | --- |
| /api/auth | 注册、登录、本人资料、改密 | 基础可用，生产账户体系未闭环 |
| /api/admin | 概览、分页用户列表 | 只读骨架 |
| /api/drone-designs | 作品 CRUD、公开列表、幂等同步、封面 | 主路径完成，多设备冲突未完成 |
| /api/programs | Blockly XML 与 CommandProgram CRUD | 作品级主路径可用 |
| /api/projects | 旧作品桥接、公开列表、封面 | 迁移兼容层 |
| /api/designs/:designId/export-cad | 当前用户作品的备用 CAD ZIP | 安全边界完成，制造数据不完整 |
| /api/custom-parts | 用户零件 CRUD | 基础可用，审核与制造验证未完成 |
| /api/community | 帖子、点赞、评论、举报、合集、关注、复用 | 功能面存在，系统权限和合规未验收 |
| /api/competitions | 列表、详情、报名、提交、排行榜 | 基础流程存在，评分后台未完成 |
| /api/me | 统计、活动、课时完成 | 可运行，部分事实来自客户端上报 |
| /api/growth | 成长事件与排行榜 | 派生逻辑存在，班级语义未完成 |
| /api/uploads/sts | OSS 单对象临时上传凭证 | 代码存在，真实环境未验证 |

当前共 18 个路由模块、4 个控制器、18 个 Mongoose 模型。大量社区、合集、关注和赛事业务仍直接写在路由中；新增或修改时应把可复用逻辑逐步下沉到独立领域模块。

### 9.4 数据模型

| 模型 | 主要职责 | 关键约束 |
| --- | --- | --- |
| User | 用户、角色、资料、成长数据、tokenVersion | email 和 username 唯一 |
| DroneDesign | 当前作品真相源 | ownerId + localId 条件唯一 |
| Program | Blockly XML 与 CommandProgram | 所有权和共享 IR 校验 |
| Project | 社区/赛事/fork 兼容作品 | 未来逐步退出新作品语义 |
| CustomPart | 用户二维零件 | owner、2mm 几何、审核状态 |
| CommunityPost | 社区发布记录 | authorId + projectId 唯一 |
| Comment | 评论和审核状态 | 目标、作者和创建时间索引 |
| Reaction | 点赞和收藏 | 用户、目标、类型唯一 |
| Follow | 关注关系 | follower + followee 唯一 |
| Collection / CollectionItem | 合集和条目 | collection + post 唯一 |
| Report | 举报 | 举报人 + 目标唯一 |
| Competition | 赛事与状态 | draft/open/running/closed |
| Registration | 赛事报名 | competition + user 唯一 |
| Submission | 赛事提交 | competition + user + project 唯一 |
| Score | 自动或人工评分 | 每个 submission 唯一 |
| AuditLog | 关键变更审计 | target + createdAt 索引 |
| Part | 旧硬件零件模型 | 与官方 registry 关系尚未统一 |

作品快照虽然经过共享 schema 的运行时校验，但 Mongo 中仍以 Mixed 保存。后续若演进字段，必须同时设计 schema 版本、迁移、兼容和回滚。

### 9.5 作品和程序完整性

已经实现：

- 私有作品查询按 ownerId 限定。
- 公开列表只返回白名单字段。
- ownerId + localId 唯一索引支持重试幂等。
- 设计快照由共享 DroneDesignSnapshotSchema 校验。
- 兼容 parts 数组最多 500 项。
- Program IR 由共享 CommandProgramSchema 校验。
- Design 或 Project 引用 Program 时验证所有权。
- 替换封面后尽力清理旧对象，失败时尽力回滚新对象。

仍需解决：

- 没有版本号和多设备冲突协议。
- 删除 Program 可能留下引用，没有统一引用完整性策略。
- Project 仍参与社区、赛事和 fork。
- API 响应信封并未完全统一。
- 旧 docs/contracts/drone-designs.md 仍是草案，不能当当前接口真值。

### 9.6 用户零件服务端复核

CustomPart 写入使用共享 UserPartDefSchema。服务端会重新解析 SVG 轮廓和孔，拒绝未闭合、自交、非法坐标和孔越界；客户端声称 manufacturability.passed=true 时仍强制保存为 false。创建、修改和删除会写审计记录。

尚缺最小筋宽、材料范围、切割参数、公差、强度和正式审核状态机。apps/api/src/config/materials.js 仍保留一个未使用的 3 mm 旧材料配置，与当前 2 mm 契约冲突；它不能作为事实来源，应在硬件依据冻结后删除或重建。

### 9.7 备用 CAD 导出

服务端备用导出位于 apps/api/src/controllers/designExportController.js 和 apps/api/src/lib/cadExport.js。

当前安全边界：

- 只读取当前登录用户自己的 DroneDesign。
- 支持服务端 ID 或受限 localId。
- 作者来自服务端用户资料。
- 零件来自服务端作品快照。
- 忽略请求体里的作者、零件、统计和检查结果。
- 零件总数最多 512。
- partId 只允许 1–128 位字母、数字、下划线和连字符。
- 文件读取同时检查配置根、规范路径、真实路径和符号链接。
- 缺失 DXF 会写入 MISSING_PARTS.txt，不伪装成完整导出。

apps/api/assets/cad/parts 目前没有获批 DXF。因此这一端点只能称为安全的备用部分导出，不能称为完整加工包。

### 9.8 对象存储

storage.js 支持：

- disk：本地开发。
- s3：S3 兼容服务。
- oss：阿里云 OSS。

已有限制：

- 封面只允许 PNG、WebP、JPEG。
- 文件大小有配置上限。
- 对象键由服务端生成并包含随机值。
- 删除只接受当前配置生成的受管 URL。
- OSS STS 只允许向当前用户前缀内的一个随机对象 PutObject，15 分钟过期。
- STS 和封面上传有独立速率限制。

未完成：

- STS 返回的 maxBytes 只是提示，当前 RAM policy 没有真正限制上传体积。
- 没有上传后的 HEAD、内容类型、病毒、总配额和孤儿对象清理。
- 公共 assets bucket 可能让知道 URL 的人读取私有作品封面，需要产品与隐私决定。
- S3/OSS 替换、删除和故障恢复未在真实环境验证。

## 10. 四个共享包

### 10.1 @fwx/shared

主要内容：

| 文件 | 职责 |
| --- | --- |
| commandProtocol.ts | Blockly 命令协议、运行时校验、遥测、RunResult、DroneAdapter |
| models.ts | 用户、作品、程序、社区、赛事等共享模型 |
| api.ts | API 错误码、响应包络和分页 |
| rbac.ts | 权限码与角色映射 |
| admin.ts | 管理后台 DTO 与请求 schema |
| growth.ts | 积分、等级、徽章和排行榜规则 |
| project.ts | Project 兼容聚合 |
| social.ts | 关注、举报、分享、复用和收藏 |

### 10.2 @fwx/parts-schema

主要内容：

- 完整 PartSchema。
- 用户零件 v2 结构。
- 2 mm 几何约束。
- 连接点和制造状态。
- DroneDesignSnapshot。
- 94 个官方展示零件。
- 搭建步骤、类别和兼容辅助。

当前严格 PartSchema 与轻量 PartRegistryEntry 仍是两种成熟度，尚未完全统一。

### 10.3 @fwx/geometry

提供纯函数的二维折线解析、轮廓与孔校验、包围盒、DXF 和 SVG。所有输出应当对相同输入保持确定。

### 10.4 @fwx/flight-check

提供结构检查和受控 VerifiedFlightEnvelope 规则。没有经过负责人批准、版本化且由服务端控制的证据时，canTakeoff 必须保持 false。

四个包以 TypeScript ESM 开发，通过 tsup 生成 dist-cjs，供 API 的 CommonJS 运行时使用 runtime-cjs 入口。

## 11. 社区、赛事、成员和后台

### 11.1 社区

已有：

- 社区发布、列表和详情。
- 点赞。
- 评论。
- 举报。
- 收藏夹。
- 关注与关注流。
- fork/复用。

已有的安全意识：

- 作者公开信息使用白名单，不返回 email、grade、studentId。
- 评论拦截手机号、邮箱、网址、常见社交账号和部分辱骂词。
- 举报只写 Report，不直接下架内容。

未完成：

- 评论创建后直接 approved，没有正式审核流。
- 举报没有后台处理接口。
- 评论频率限制基于数据库计数，不是原子限流。
- 缺系统级越权、内容状态、审核和未成年人合规 E2E。

### 11.2 赛事

已有列表、详情、报名、提交和排行榜读取。赛事仍依赖 Project；提交本身不计算分数，排行榜读取既有 Score。

未完成：

- 正式评分入口。
- 评分审计。
- 仿真或受控证据绑定。
- 完整赛事状态转换管理。
- 系统级权限和并发测试。

### 11.3 成员、学生和课程后台

当前 Admin API 只有概览和分页用户列表。Course 模型不存在，课程统计固定为 0；User 没有 status、school、class、guardianConsent 等正式字段。Web 的 users、courses、parts、audit 都是占位页面。

因此，成员管理、学生管理、课程管理、零件审核、内容审核和审计查看目前都不能标为完成。

## 12. 安全与隐私现状

### 12.1 已建立的防线

- 密钥只从环境变量读取，当前文件密钥扫描接入 CI。
- JWT、角色、owner 和资源存在性在服务端验证。
- 用户零件由服务端重新校验几何。
- CAD 备用导出关闭了目录穿越、符号链接越界和客户端伪造字段。
- 请求体大小、上传类型、路径和频率有基础限制。
- CORS 在携带凭据时禁止通配符。
- 非测试环境拒绝过短或模板式 JWT_SECRET。
- 删除了仓库内会放宽 push、remote、restore 等权限的本地 settings.local.json。
- 完整依赖审计与生产依赖审计在最近基线均为 0 个已知漏洞。

### 12.2 仍未关闭的高风险

1. GitHub 仓库当前是公开仓库，但历史凭据轮换和受控历史清理尚未完成。
2. GitHub secret scanning、push protection 和 validity checks 当前未启用。
3. 仓库包含 8 个儿童相关图片文件，约 19.9 MB；肖像、来源和使用授权尚未核验。相关对象已存在于远端历史，但继续公开仍有合规风险。
4. JWT 存在 localStorage，若页面发生 XSS，token 可能被读取。
5. 临时 ADMIN_ACCESS_KEY 仍参与生产设计，正式 RBAC 后应移除。
6. 默认 Docker Compose Mongo 只依赖内网隔离，没有启用数据库认证。
7. 私有作品封面可能存入公共读 assets bucket。
8. STS 没有在云端策略中强制上传大小。
9. 密码最低长度 6，缺邮箱验证、找回和设备会话。
10. 未成年人私信、真实姓名、位置、外链、监护人同意和内容安全未形成完整产品规则与验收。

不能说仓库整体已经安全公开。优先建议是把仓库改为私有，完成儿童素材授权核验、凭据轮换、历史清理和 GitHub 安全功能配置后，再决定公开范围。本次任务没有获得修改可见性的授权，因此不会自动改成私有。

## 13. Harness Engineering 在本项目中的实现

Harness Engineering 在这里不是单独安装的第三方框架，也不是只靠一句提示词。它由以下可版本控制部分共同组成：

| 组成 | 当前文件 |
| --- | --- |
| 仓库总规则 | AGENTS.md |
| 就近模块规则 | apps/web/AGENTS.md、apps/api/AGENTS.md、packages/AGENTS.md |
| 当前事实 | ARCHITECTURE.md、CURRENT_STATUS.md、docs/index.md |
| 产品验收 | docs/product-specs/core-flow.md |
| 质量与风险 | docs/quality/ |
| 复杂任务计划 | docs/exec-plans/ |
| 项目工作流 Skill | .agents/skills/flightwoodx-development/SKILL.md |
| 自动门禁 | scripts/check-harness.mjs |
| 对抗测试 | scripts/check-harness.test.mjs |
| CI | .github/workflows/ci.yml |

当前 101 项 Harness 测试主要检查：

- 必需的规则和文档入口。
- 文档元数据与相对链接。
- 项目 Skill 单一来源。
- 遗留 Lark/Feishu Skill 和本地权限文件不得回流。
- workspace 清单和依赖方向。
- 应用之间、共享包到应用的直接依赖。
- package alias、workspace/file/link 路径。
- JS/TS import、require、动态 import、import.meta、Node path/fs、Vite glob。
- tsconfig/jsconfig 和 Vite alias/路径配置。
- package main/module/browser/types/exports/imports。
- CSS/SCSS/SASS/Less 静态导入。
- Vite HTML module script 和 stylesheet。
- 非生成目录中的仓库符号链接。
- API src 只使用精确 .js CommonJS 源码。

范围限制：

- 不是完整跨程序数据流分析。
- 不是所有 Vite 插件语义分析。
- 不是完整 CSS/HTML 解析器。
- 不能代替浏览器、真实数据库、对象存储、硬件、制造或实飞验证。

## 14. 本轮到底改了什么

工程基线提交 f8ab786 相对父基线 6d0f17c 的核心改动如下。

### 14.1 规则与知识结构

- 重写根 AGENTS.md，使其成为稳定的工程地图。
- 新增 Web、API、packages 的就近 AGENTS.md。
- 建立 docs/index.md。
- 建立核心流程规格。
- 建立 Harness、安全、可靠性、质量评分、技术债务和执行计划文档。
- 建立 CURRENT_STATUS 和 ARCHITECTURE 的当前事实结构。

### 14.2 项目专用 Skill

- 创建 .agents/skills/flightwoodx-development。
- 该 Skill 引导代理读取规则、确认工作树、测试先行、执行 Harness 和完整 CI。
- 通过官方 Skill 结构校验。

### 14.3 自动架构门禁

- 新增 scripts/check-harness.mjs。
- 新增 101 项对抗测试。
- 接入根 harness、check 和 ci 命令。
- 接入 GitHub CI 独立 Repository harness 任务。
- 本次异地交付又把 codex/** 加入 push 触发，使 GitHub 快照分支也执行远端 CI。

### 14.4 清理

- 删除 27 个 Lark 实体 Skill。
- 删除两组共 54 个 Lark 遗留链接。
- 删除 Feishu Skill 锁文件。
- 删除旧 fwx-motion Skill。
- 删除 3 份跟踪中的 Claude 本地权限文件。
- 删除冲突的 Web CURRENT_STATUS、Admin、API 和环境旧教程。
- 把旧 Vite README 和资源说明改为当前文档入口。

所有删除均受 Git 管理，可以从历史恢复；它们没有从原始脏工作树中被直接删除。

### 14.5 依赖安全

- js-yaml 更新到 4.3.1。
- nanoid 3 更新到 3.3.18。
- @ungap/structured-clone 更新到 1.3.1。
- @aws-sdk/client-s3 更新到 3.1111.0。
- 当前完整与生产依赖审计均未报告已知漏洞。

### 14.6 CAD 导出安全

- 备用 CAD 目录从 Web 目录迁到 API 自有目录。
- 增加 partId、总数、路径、真实路径和符号链接检查。
- 增加 owner 范围的 DroneDesign 查询。
- 作者改从服务端用户读取。
- 请求体里的 username、parts、stats 和 checkResults 不再进入 ZIP。
- Web 备用调用不再发送可伪造的设计与作者请求体。
- 新增越权、路径、符号链接和伪造字段测试。

### 14.7 保持不变

- 没有修改首页呈现或首页文字。
- 没有把任何产品阻塞标成完成。
- 没有删除当前功能入口。
- 没有修改原始 /Users/nesty/Projects/flightwoodx 脏工作树。
- 没有合并或覆盖 GitHub main。

## 15. 自动化与证据

### 15.1 根命令

| 命令 | 用途 |
| --- | --- |
| pnpm run harness | 知识入口、文档和静态架构边界 |
| pnpm typecheck | Web 和共享包类型检查，API 有限 JS 项目检查 |
| pnpm check:api | 每个 API JavaScript 文件的 Node 语法检查 |
| pnpm test | Harness、共享包、Web 和 API 测试 |
| pnpm lint | workspace lint |
| pnpm security | 当前文件密钥扫描与完整依赖审计 |
| pnpm build | 共享包和 Web 生产构建 |
| pnpm run ci | 依次执行全部检查和生产构建 |

### 15.2 最近基线

| 范围 | 测试数 |
| --- | ---: |
| Harness | 101 |
| @fwx/shared | 25 |
| @fwx/geometry | 16 |
| @fwx/parts-schema | 8 |
| @fwx/flight-check | 6 |
| Web | 49 |
| API | 30 |
| 合计 | 235 |

现有测试主要是纯逻辑、schema、handler 和安全边界测试。尚无完整 React 页面测试、固定视口浏览器 E2E、无障碍扫描、真实 Mongo、真实 S3/OSS/STS 或目标 ECS 验证。

生产构建仍有体积提示：

- index 约 369.82 kB，gzip 约 113.55 kB。
- CSS 约 546.89 kB，gzip 约 226.36 kB。
- CodingPage 约 724.48 kB，gzip 约 192.34 kB。

这不是构建失败，但 CodingPage、字体和 CSS 应作为后续性能工作。

## 16. 本地运行

### 16.1 前置条件

- Node.js 20 或更高。
- Corepack。
- pnpm 9.12.0。
- 本地 MongoDB，或一个可用且受控的 MongoDB URI。
- 如使用 S3/OSS，再配置对应驱动；普通本地开发使用 disk 即可。

### 16.2 首次安装

~~~bash
corepack enable
corepack prepare pnpm@9.12.0 --activate
pnpm install --frozen-lockfile
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env
~~~

必须修改 apps/api/.env 中的 JWT_SECRET。非测试环境至少 32 字节，不能使用示例值。真实密钥、数据库凭据和云密钥不得提交。

### 16.3 启动

~~~bash
pnpm dev
~~~

默认地址：

- Web：http://localhost:5173
- API：http://localhost:3000
- API 健康检查：http://localhost:3000/api/health

也可分开启动：

~~~bash
pnpm dev:web
pnpm dev:api
~~~

### 16.4 开发前基线

~~~bash
pnpm install --frozen-lockfile
pnpm run harness
pnpm run ci
~~~

如果冻结安装或基线失败，应先判断是本机环境、外部服务还是仓库本身，不要直接放宽测试或更新 lockfile 掩盖问题。

## 17. 环境变量

### 17.1 Web

| 变量 | 用途 | 本地默认 |
| --- | --- | --- |
| VITE_API_URL | API 基址 | http://localhost:3000/api |
| VITE_ASSET_BASE | GLB、贴图、缩略图等资产基址 | 留空时使用本地路径 |

VITE_ 前缀变量会进入浏览器包，绝不能放秘密。

### 17.2 API

| 变量 | 用途 | 注意 |
| --- | --- | --- |
| MONGODB_URI | MongoDB 连接 | 必需 |
| PORT | API 端口 | 默认 3000 |
| JWT_SECRET | JWT 签名 | 生产必须足够长且非模板值 |
| NODE_ENV | 环境模式 | development/test/production |
| CORS_ORIGIN | 允许来源 | 可逗号分隔 |
| TRUST_PROXY_HOPS | 可信反向代理层数 | 直连 0，单层 Nginx 应为 1 |
| JSON_BODY_MAX_BYTES | JSON 请求体上限 | 默认 6 MB，最高 8 MB |
| CAD_PARTS_DIR | API 受控 DXF 目录 | 留空使用 API assets |
| ADMIN_ACCESS_KEY | 临时后台访问密钥 | 后续正式 RBAC 移除 |
| STORAGE_DRIVER | disk、s3 或 oss | 本地默认 disk |
| PUBLIC_BASE_URL | disk 文件公开基址 | 本地 API 地址 |
| CDN_DOMAIN | CDN 前缀 | 可选 |
| COVER_UPLOAD_MAX_BYTES | 封面大小 | 默认 5 MB |
| COVER_UPLOADS_PER_HOUR | 封面频率 | 默认 20 |
| STS_REQUESTS_PER_HOUR | STS 频率 | 默认 6 |
| S3_* | S3 连接 | 仅 s3 驱动 |
| OSS_* | OSS 与 STS | 仅 oss 驱动 |

危险清库脚本还要求单条命令临时设置 ALLOW_DESTRUCTIVE_SCRIPTS=WIPE_DESIGNS。不得写进长期环境文件。

## 18. 部署骨架与当前错配

当前部署设计：

~~~mermaid
flowchart LR
  Client["浏览器"] -->|"HTTPS"| Nginx["Nginx"]
  Nginx -->|"静态文件"| Web["Web dist"]
  Nginx -->|"/api"| API["Express :3000"]
  API --> Mongo["MongoDB 内网"]
  API --> OSS["OSS / S3"]
~~~

deploy 目录包含：

- Docker Compose：nginx、api、mongo。
- Node 20 多阶段 API 镜像。
- HTTPS 和 Certbot 配置。
- Atlas 迁移脚本。
- OSS 资产上传脚本。
- 每日备份脚本与 cron 示例。

这只是骨架，没有目标 ECS、真实证书、域名、数据库、OSS、备份恢复或上线回读证据。

交付审查发现的部署错配：

1. API 默认 TRUST_PROXY_HOPS=0，但正式结构经过一层 Nginx；deploy/.env.example 未设为 1。若按当前默认部署，限流可能把所有用户识别成同一个代理 IP。
2. Nginx client_max_body_size 是 2 MB，API 设计 JSON 默认允许 6 MB、封面默认 5 MB。合法的大请求可能先被 Nginx 拒绝。
3. 当前用户零件契约锁定 2 mm，但未使用的 apps/api/src/config/materials.js 仍声明 3 mm。
4. Docker Compose Mongo 没有启用数据库认证。
5. Atlas 迁移脚本使用 mongorestore --drop，缺显式目标确认和内置备份保护。
6. promote-to-admin 脚本缺少生产防误库和审计。

这些问题没有在本次上传任务中擅自修改，必须作为部署前 P1 处理并补测试。

## 19. GitHub 异地接续

### 19.1 为什么使用单提交快照

当前 GitHub 仓库已经公开，默认分支是 main。干净本地分支相对远端包含 37 个任何远端分支都不可达的祖先提交。直接推送会把这些历史一起变为公开可达，而当前状态仍登记历史凭据未完成轮换与清理。

因此本次上传只取最终已验证 Git tree，生成一个没有父提交的快照分支。它包含全部受版本控制的当前项目文件，但不包含这 37 个本机祖先提交。

代价：

- 快照分支与 main 没有共同 Git 祖先，不能直接做普通合并。
- 它适合异地继续开发和保全当前项目，不适合作为对 main 的普通 PR。
- 后续若要合并回 main，需要先决定安全历史、主线和迁移方式。

### 19.2 在另一台电脑取得

~~~bash
git clone --branch codex/clean-handoff-2026-08-17 --single-branch https://github.com/hopeful220211/flightwoodx.git
cd flightwoodx
corepack enable
corepack prepare pnpm@9.12.0 --activate
pnpm install --frozen-lockfile
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env
~~~

然后配置 apps/api/.env，启动 pnpm dev。

### 19.3 继续开发时的 Git 方式

从快照创建自己的功能分支：

~~~bash
git switch -c codex/parts-to-assembly
~~~

每次提交前：

~~~bash
pnpm run harness
pnpm run ci
git status --short
~~~

不要把 .env、真实密钥、数据库备份、用户数据、未核验儿童素材或构建缓存加入 Git。

## 20. 后续功能应该怎么写

### 20.1 每个任务的标准闭环

1. 先确认分支、工作树和基线全绿。
2. 读取根规则、当前状态、架构、模块规则和对应规格。
3. 写清输入、输出、权限、失败行为、非目标和验收证据。
4. 复杂任务在 docs/exec-plans/active 建立计划。
5. 先写一个确实失败的测试或检查。
6. 在正确模块实现最小完整改动。
7. 先跑目标测试，再跑 Harness 和完整 CI。
8. 涉及界面时在真实浏览器验证 390×844、768×1024、1440×900。
9. 涉及 API 时验证未登录、越权、非法输入、重试、所有权和依赖失败。
10. 更新状态、规格、技术债务和执行计划。

### 20.2 代码放置规则

| 新内容 | 应放位置 |
| --- | --- |
| React 页面和浏览器交互 | apps/web |
| 身份、所有权、数据库、对象存储和服务端编排 | apps/api |
| 跨前后端数据结构 | packages/shared 或 packages/parts-schema |
| 二维确定性计算 | packages/geometry |
| 装配/证据规则检查 | packages/flight-check |
| 复杂任务过程与证据 | docs/exec-plans |
| 可长期执行的架构规则 | AGENTS、测试或 Harness |

不要在 Web 组件、API 路由和共享包各复制一份相同业务常量。跨端输入必须有运行时 schema，不能只写 TypeScript interface。

## 21. 下一阶段主功能：零件进入拼装器

下一轮应只集中完成“零件 → 拼装”，不要同时扩张社区、赛事或后台。

### 阶段 1：冻结规则

负责人需要明确：

- 起落架究竟必须 4 个，还是允许 4–8 个。
- 哪些官方类别可以进入哪些步骤。
- 用户零件允许进入哪些步骤。
- 审核前用户零件是否只能私人使用。
- 哪些字段代表结构检查，哪些字段代表制造或飞行证据。

完成标准：

- 只有一个版本化来源。
- parts-schema、flight-check、实时检查、导出和测试全部消费它。
- 同一组 fixture 覆盖所有消费者。

### 阶段 2：统一拼装输入契约

为官方零件和用户零件定义共同形状，至少包含：

- 稳定 ID。
- 来源类型和来源记录 ID。
- 版本。
- 类别。
- 展示名称。
- 3D 预览来源。
- 二维几何引用。
- 连接点。
- 重量来源与证据级别。
- 审核状态。
- 制造验证状态。
- 是否允许公开、fork 或导出。

客户端不得自行把审核、制造或飞行状态改为已通过。

### 阶段 3：服务端和同步

- 作品保存时验证用户零件属于当前用户或已批准公开。
- 保存版本和来源，不复制整份零件几何。
- 删除或修改用户零件时定义作品如何处理。
- 增加越权、坏版本、已删除来源和重试测试。
- 保持 localId 幂等保存。

### 阶段 4：拼装器接入

- 让 StepPartPanel 同时读取官方和允许的用户零件。
- 把连接点、预览、重量和错误状态统一适配。
- 明确无 3D 预览、坏几何、未审核和离线状态。
- 不把制造未验证显示成可加工。

### 阶段 5：浏览器 E2E

至少覆盖：

1. 绘制并保存用户零件。
2. 刷新后重新读取。
3. 在拼装器选择该零件。
4. 合法连接。
5. 保存作品。
6. 刷新并重新打开。
7. 非本人不能引用私人零件。
8. 零件删除或版本变化时出现可恢复状态。
9. 三个默认视口无阻断。

通过后再继续 Blockly、仿真和部分导出，形成一条完整可重复的核心闭环。

## 22. 全项目优先级

### P0：发布前必须关闭

1. 冻结唯一装配规则。
2. 核验或降级首页等对外承诺。
3. 核验儿童图片的肖像、来源和使用授权。
4. 轮换历史凭据并受控清理 Git 历史。
5. 建立获批制造源、材料、公差、切割和硬件/实飞证据。
6. 完成真实 MongoDB、对象存储、会话与失败恢复验证。
7. 建立未成年人隐私、内容安全和监护人规则。
8. 完成日志、指标、告警、备份和恢复演练。

### P1：下一阶段工程

1. 用户零件统一进入拼装器。
2. DroneDesign 版本和多设备冲突协议。
3. Project 向 DroneDesign 迁移。
4. 部署代理层数、请求大小和 2/3 mm 冲突整改。
5. Admin 用户/学生、课程、零件审核和审计。
6. 社区、赛事、权限状态机和系统 E2E。
7. 真实 Mongo、S3/OSS/STS 集成测试。
8. API 路由业务下沉与响应包络统一。

### P2：可维护性和性能

1. 拆分单文件 Web API 客户端。
2. 统一重复 DTO。
3. 拆分超长 Harness 脚本，同时保持 101 项 fixture。
4. 优化 CodingPage、字体和 CSS 体积。
5. 增加组件测试、无障碍和视觉回归。
6. 把大静态资源迁到对象存储。

## 23. 模块进度总表

| 大模块 | 当前进度 | 自动化证据 | 下一步 |
| --- | --- | --- | --- |
| 工程框架与 Harness | 已建立 | 101 项 Harness、CI | 保持规则随错误演进 |
| 官方零件库 | 基础可用 | registry 与 8 项 parts-schema 测试 | 统一严格 PartSchema 和轻量 registry |
| 用户零件绘制 | 基础可用 | 几何、闭合、构建和 API 安全测试 | 标尺、孔、连接点、审核、拼装接入 |
| 无人机拼装 | 官方主路径可用 | store、零件和结构逻辑测试 | 冻结起落架规则、接用户零件、浏览器 E2E |
| Blockly 编程 | 作品级主路径可用 | 编译、计划和恢复测试 | 页面 E2E、服务端引用完整性 |
| 视觉仿真 | 简化演示可用 | SimAdapter 测试 | 明确证据边界、系统 E2E、真机适配另立项目 |
| 作品保存 | 主路径可用 | 快照、store、授权测试 | 多设备冲突、版本、Project 迁移 |
| 部分导出 | 软件路径可用 | geometry 与 CAD 安全测试 | 获批二维制造源和真实设备验证 |
| 鉴权 | 基础可用 | tokenVersion、配置、后台失败关闭 | 邮箱、找回、设备会话、强密码 |
| 社区 | 功能面存在 | 少量权限与完整性测试 | 审核、未成年人规则、系统 E2E |
| 赛事 | 基础接口存在 | 模型与局部路由逻辑 | 评分、证据、状态机、后台 |
| 成员/学生管理 | 未完成 | 仅用户列表基础 | 数据模型、权限、CRUD、审计 |
| 课程后台 | 未完成 | 无 Course 模型 | 先完成产品规格再实现 |
| 零件审核后台 | 未完成 | CustomPart 有状态字段 | 审核接口、权限、页面和审计 |
| 部署 | 构建和骨架存在 | 本地生产构建 | 修错配、目标环境回读、恢复演练 |

## 24. 完成定义

一个功能只有同时满足以下条件才可标为完成：

- 正式路径使用真实数据，没有未说明 mock、占位或静默回退。
- 输入、输出、权限、所有权、错误、重试和刷新行为明确。
- 跨端数据有运行时校验。
- 关键规则只有一个来源。
- 先有失败测试，再有修复。
- 目标测试、Harness 和完整 CI 通过。
- 涉及界面时，真实浏览器和三个视口通过。
- 涉及数据库、存储、硬件或目标环境时，有对应真实反馈。
- 产品文字不超过证据。
- 规格、状态、计划、风险和回滚说明已同步。

自动化全绿只说明工程满足当前门槛，不说明产品已经可发布、可制造或可飞。

## 25. 接手后第一天建议

1. 从 GitHub 快照分支单分支克隆。
2. 冻结安装并跑完整 CI。
3. 打开本地 Web 和 API，确认健康检查。
4. 只浏览核心路径，不立即改代码：part-studio、design、code、simulator、dashboard、export-preview。
5. 阅读起落架冲突的两个来源和现有测试。
6. 由负责人给出唯一装配规则。
7. 建立新的 active 执行计划。
8. 从统一拼装输入契约的失败 fixture 开始下一轮。

这份文档应随架构、模块状态、环境、验证或 GitHub 接续方式变化而更新。若本文与实测冲突，以当前代码、测试、目标环境反馈和 [CURRENT_STATUS.md](../CURRENT_STATUS.md) 的新证据为准。
