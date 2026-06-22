# RFC-017 impl · 社区视觉张力整改（全站视觉大整改 · 社区模块）

> 来源：`全站视觉整改-给1号-社区.md`（军师）。本轮**只补视觉细节、不动功能、不动色调**（保留浅 sky-blue 基调）。参考 Voltpile / Awwwards 的"制造张力"方法论：字号层级 + 狠留白 + 对比 + 点睛色 + 圆角 + 不对称布局。

## 目标（可验收）
把社区从"字号平、留白弱、对比低、产品图平铺"升级到有"大气压场"的编辑级视觉。逐条对应文档 A/B/C：
- **A 作品广场**：① Hero 巨字标题（`max(56px,7vw)`/行高1/字距-0.3px）② 卡片字号层级拉开（标题中标题级+500 / 作者12px黑70% / 数据12px次级），沿用站酷封面 hover 放大裁切、卡片本体不抬不投影 ③ 点睛蓝只点睛（<5% 面积）④ 狠留白。
- **B 作品详情**：⑤ 左文右图不对称（info 左 / 3D 右，`5fr/7fr`）⑥ ExplodedHotspots 思路（见"关键判断 3"）⑦ TechLabel 等宽参数标注（**只用真数据**）⑧ 按钮全胶囊化（复用/收藏/分享）。
- **C 排行榜/弹窗**：⑨ 前三名分数用 BigStat（≥48px 大字）；弹窗保留 `scale(0.8)→1` 进场；顺手把排行榜残留的 `ink-*` 灰统一为黑+透明度。

## 关键判断（我自定的技术取舍，记录备查）
1. **不碰任何全局/共享文件**。文档明确"令牌+共享组件由工程师助理先落到全局/shared，你 rebase 后直接用、不要自己另造"。助理尚未落（trunk 最新 `fd6f05f` 只有契约）。故本轮**全部改动落在社区自有文件**，用现有 Tailwind 令牌 + 内联类实现"张力"。不动 `index.html` / 全局 `index.css` / `tailwind.config.js` / `@fwx/shared`。助理日后落全局令牌后，我这边自动继承。
2. **字体作用域到社区**。Space Grotesk 不写进全局，改由 `CommunityShell` 用 React 19 可提升的 `<link>` 注入 + 一个作用域 `<style>` 暴露 `.fwx-display`（'Space Grotesk','MiSans','PingFang SC' 混排：拉丁/数字走 Grotesk、中文走苹方）和 `.fwx-mono`（等宽，给 TechLabel）。只社区生效，不污染全局；助理落全局字体后我这份是无害重复，可一行删。
3. **ExplodedHotspots 诚实处理**。爆炸图需要"分解视角底图"——文档要求"缺图找军师生成、别自己凑"，且多数示例作品没有真 3D 零件数据。**绝不生成假爆炸图 / 假零件**（违反"别自己凑"+ 不虚构）。做法：详情右侧 3D 区做到自身就够高级（更大、更好打光、拖动提示、角落 TechLabel 真参数）；有真零件的作品用既有 `AssembledDrone` 实时 3D；爆炸图①②③叠图版作为**后续增强**，在报告里向军师提"每件作品的爆炸底图"这一资产需求。
4. **点睛蓝用现有 sky 令牌**，不新增 `#1E9BFF` 全局 token（属助理）。靠"用得少（<5% 面积，只点赞/关键 CTA/编号/关键数字）"实现点睛，而非靠更高饱和度。
5. **TechLabel 只标真数据**：零件数（真）、轴数（有零件时由电机/桨数推导）；总重/卡扣点等拿不到的不编、不显。无零件的示例作品只在等宽样式里显已知项（点赞/收藏/评论数）。

## 分工（3 子代理并行 + 我集成）
- **A**：`CommunityPage.tsx` + `WorkCard.tsx` + `MasonryGrid.tsx` + `CommunityShell.tsx`（含字体/工具类注入）。
- **B**：`CommunityPostPage.tsx`。
- **C**：`LeaderboardPage.tsx` + `QuickViewModal.tsx`。
- **集成（我）**：跨文件契约（`<QuickViewModal postId onClose>`、`<MasonryGrid posts animateKey>` 接口不变）、一致性扫尾、typecheck/lint、真库浏览器点验、Codex 两轮评审、push 交 5 号。

## 量化验收（DoD 五条全绿）
1. 真库无 mock（28 件示例 + 真点赞/收藏数）。
2. `pnpm --filter web lint && pnpm --filter web typecheck` 绿。
3. 后端真连库（Atlas）跑起来。
4. 给可亲手点验的点击路径（巨字标题 / 卡片层级 / 详情不对称+真参数 / 胶囊按钮 / 弹窗进场 / 排行榜大字 / 狠留白）。
5. 列出动过的共享文件（预期：**无全局共享文件**；只社区自有文件）。

## 红线
不改色调（浅 sky-blue 保留）；不动 `@fwx/shared`；不碰社区外模块；不引 npm 新依赖（动效用已装 framer-motion / CSS）；做完 push 交 5 号、不自己合。
