# RFC-019 · 零件库板块优化（3 号工程师）

| 字段 | 值 |
|---|---|
| 状态 | Draft（待人类确认 + 开工） |
| 负责 | 3 号工程师 |
| 关系 | 锚定 [RFC-011](RFC-011-platform-2.0-architecture.md) E2（零件库与零件社区）；**消费 [RFC-016 契约](RFC-016-platform-shared-contracts.md)**；UGC 衔接 [RFC-014 后台](RFC-014-admin-console.md)；为 [RFC-015 仿真](RFC-015-sim-flight.md) 补物理数据。 |
| 定位 | **零件库 = 可拼装零件目录与零件 UGC 入口。** 不拥有设计器装配流程、不另造分类码。 |
| 可先动 | ✅ Codex 评估：3 号最适合**先开工**——分类/WebGL 是独立紧急 bug，且反哺 RFC-015 数据地基，不被共享契约阻塞。 |

> **一句话**：把零件库从"6 个硬编码分类卡 + 占位"做成"分类→列表→详情（含安全的 3D 预览）"的真实目录，并修掉两个紧急 bug。

---

## 1. 现状（调研核实）
- 🔴 **分类码不一致**：零件页 6 大类卡片是**旧码硬编码**（HUB/ARM/PLATE/JOINT/LAND/DECO），而事实来源是 `@fwx/parts-schema` 的 `PartCategoryEnum`（mainboard/landing/guard/joint/MOTOR/PROP）+ `CATEGORY_ALIASES`。设计器用新码、零件页用旧码，**两套并存易失步**。
- 🔴 **WebGL Context 溢出**：`PartPreview3D` 每卡片各自建 Canvas/Context，35+ 零件超浏览器 16 上限 → 白屏。已有缓解件但零件库页面**没用**：`PartThumbnail`（离屏单帧出静态图）、`DesignPreview3D`（单全局 Canvas）。
- 详情页 / Live 3D **占位**（"M7 接入"虚线框），无 `/parts/:id`。
- 后端 `Part.js`（`name/type/spec/priceCents/imageUrl`）**实为采购 BOM（KitItem）**，与拼装零件脱节；零件数据现走静态 `registry.ts`（94 件），不读 DB。

## 2. 消费的共享契约（来自 RFC-016，禁止自造）
2.1 分页/搜索 · 2.2 社交原语（零件点赞/收藏，P1）· 2.7 零件分层（**Part=拼装、parts-schema 为唯一来源；Mongo Part=KitItem**）· 2.8 UGC 审核（`Moderation`）· 2.10 资产 · 2.11 列表 UI。

## 3. 目标与功能
| 功能 | 阶段 |
|---|---|
| 分类从 `PART_REGISTRY/PartCategoryEnum/STEP_INFO` **派生**（删硬编码旧码） | **P0** |
| 真实零件列表（分类内网格，显示零件中文名/缩略图/重量/标签） | **P0** |
| 零件详情页 `/parts/:id`（大图 + metadata + 兼容性/卡扣点提示） | **P0** |
| **缩略图方案修 WebGL 溢出**（列表用 `PartThumbnail` 静态图，详情用单 Canvas Live 3D） | **P0** |
| 搜索/筛选（名称/标签/重量范围） | **P0** |
| 详情页 Live 3D（单 Canvas，非每卡片） | P1 |
| 可拼装 Part 持久化 + UGC 上传 + 后台审核（衔接 RFC-014 M4） | P1 |
| 版本/`deprecated` + `bomItemIds` 关联 KitItem | P1 |
| **为 RFC-015 补电机/桨/电池零件 + 装配 transform + 物理参数** | P1（与 RFC-015 T0 协同） |
| BOM 导出（设计→零件清单） | P2 |
| 零件点赞/收藏（社交原语） | P2 |

## 4. P0 收口清单
1. **立刻修分类**：零件页分类 + 中文名 + 数量全部从 `parts-schema`（`PART_REGISTRY/PartCategoryEnum/STEP_INFO`）派生，删掉硬编码的 HUB/ARM/PLATE/JOINT/LAND/DECO。
2. **修 WebGL 溢出**：列表卡片用 `PartThumbnail` 离屏缩略图（或预生成 `.webp` 静态图），**禁止 35+ 零件各自长期持有 WebGL Canvas**。
3. 做真实零件列表/详情，**先读 `registry`，不急着写 Mongo**。
4. 明确后端 `Part.js` = KitItem，**不参与拼装零件浏览**（零件库消费 parts-schema）。

## 5. UI / 交互（沿线上 sky-blue + fwx-motion）
- 三层导航：**分类浏览**（现有 6 卡，改派生）→ **分类内列表**（网格，静态缩略图）→ **零件详情**（大图 + Live 3D + 重量/卡扣点/兼容零件提示）。
- 搜索框接真实过滤（名称/标签/重量）。
- 列表三态 + 分页；缩略图懒加载；动效用 `fwx-motion`。

## 6. 板块特有 API（`/api/parts/*`，P1 起）
P0 先走静态 registry（前端直接读 `@fwx/parts-schema`）。P1：`GET /api/parts`（DB）· `POST /api/parts`（UGC 提交，走 `Moderation`）· 审核接口衔接 RFC-014 M4。

## 7. 分期 / 验收 / 停止点
- [ ] **P0**：分类派生统一 + WebGL 溢出修复 + 真实列表/详情 + 搜索。**验收：零件页展示 35+ 机臂不白屏、分类码与 parts-schema 一致、能进单个零件详情。** 🛑
- [ ] **P1**：Live 3D 详情 + 可拼装 Part 持久化 + UGC + 为 RFC-015 补电机/桨/电池数据。🛑

## 8. 边界提醒（防越界/分叉）
- ❌ 不另造分类码——唯一来源 `@fwx/parts-schema`。
- ❌ 不拥有设计器装配流程（那是 B1）。
- ❌ 详情页 Live 3D 用**单 Canvas**，不要回到"每卡片一个 Context"。
- ✅ 与 RFC-014（后台零件管理）、RFC-015（物理数据）协同：电机/桨/电池零件 + 物理参数是共同需要，先对齐再补。

*— RFC-019 v0.1 · 2026-06-16 · 锚定 RFC-011 + RFC-016 —*
