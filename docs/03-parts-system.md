# 03 — 零件系统重构（Parts System）

> **本文档目的**：定义 FlightWoodX 零件库的新分类体系、命名规范、元数据 schema，以及前端的展示与交互规范。
> **重构动因**：团队在 2026/2/8 最新整理的 GLB 分组与线上零件库的分类不一致；另外每张卡片独立 Canvas 导致 WebGL Context 溢出。

---

## 1. 新零件分类（对齐团队最新 GLB 分组）

### 1.1 六大类定义

| 类别码 | 中文名 | 英文名 | 文件前缀 | 当前数量 | 在搭建流程中的位置 | 说明 |
|:------:|--------|--------|----------|:------:|:------:|------|
| **HUB** | 主板 | Core Hub | `core_hub_XX.glb` | 9 | Step 1 | 无人机核心底座，所有其他零件都连接在它上面 |
| **ARM** | 机臂 | Arm | `arm_XX.glb` | 35 | Step 2 | 从主板向外延伸的结构，末端安装电机 |
| **PLATE** | 保护罩·一体版 | Guard Plate (Integrated) | `core_plate_XX.glb` | 6 | Step 4 (A) | 一整块环绕式螺旋桨保护罩 |
| **JOINT** | 保护罩·分体版 | Guard Joint (Split) | `joint_XX.glb` | 11 | Step 4 (B) | 四个独立的螺旋桨保护罩 |
| **LAND** | 保护罩·半体版 | Guard Landing (Half) | `Landing_XX.glb` | 6 | Step 4 (C) | 一半一半的螺旋桨保护罩 |
| **DECO** | 衔接件 | Deco Joint | `deco_XX.glb` | 9 | Step 5 | 固定双层主板的衔接件，不落地 |

### 1.2 子类：电子元件（不是 GLB 木件）

| 类别码 | 中文名 | 说明 |
|:------:|--------|------|
| **MOTOR** | 电机 | 小/中/大三档（7mm / 8.5mm / 10mm） |
| **PROP** | 螺旋桨 | 黑/白/红三色，尺寸随电机联动 |

电子元件**不存 GLB**，在前端用 SVG 或基础 Three.js primitive 渲染，数据库里记录型号即可。

### 1.3 已弃用的旧分类

以下旧分类在新体系中**不再使用**，前端要移除或隐藏：

- ❌ 「机身」（歧义，拆分为 HUB 和 PLATE）
- ❌ 「机翼」（不适用于旋翼无人机）
- ❌ 「尾翼」（同上）
- ❌ 「连接件」（歧义，拆分为 DECO 和 JOINT）
- ❌ 「电机座」（整合进 ARM 的末端卡扣点）
- ❌ 「其他」（具体化或删除）

---

## 2. 命名规范

### 2.1 零件编号

格式：`FW-[类别码]-[三位序号]`

示例：
- `FW-HUB-001` ~ `FW-HUB-009`
- `FW-ARM-001` ~ `FW-ARM-035`
- `FW-PLATE-001` ~ `FW-PLATE-006`
- `FW-JOINT-001` ~ `FW-JOINT-011`
- `FW-LAND-001` ~ `FW-LAND-006`
- `FW-DECO-001` ~ `FW-DECO-009`

序号在类内保持**紧密连续**；如果某序号废弃（比如设计师删了某款），**不要回填**，新款直接用下一个序号。

### 2.2 GLB 文件命名

物理文件保留现有 `arm_01.glb` / `core_hub_02.glb` 的命名（避免破坏已有协作），但在数据库与前端代码里**永远使用 FW 编号作为 ID**，GLB 文件名只作为资源映射：

```ts
// parts-schema/src/registry.ts
export const PART_REGISTRY = {
  'FW-HUB-001': { file: 'core_hub_01.glb', category: 'HUB' },
  'FW-HUB-002': { file: 'core_hub_02.glb', category: 'HUB' },
  // ...
  'FW-ARM-001': { file: 'arm_01.glb', category: 'ARM' },
  // ...
};
```

### 2.3 类别码到旧 tab 的映射（用于数据迁移）

如果数据库里已有零件数据用了旧 category 值，迁移脚本按下表映射：

| 旧值 | 新值 |
|------|------|
| `body` / `fuselage` / `机身` | 需人工审阅，根据形态判断是 `HUB` 还是 `PLATE` |
| `arm` / `机臂` | `ARM` |
| `wing` / `tail` / `机翼` / `尾翼` | 标记 `deprecated: true`，不在新前端展示 |
| `connector` / `joint` / `连接件` | 需人工审阅，大部分是 `DECO`，少部分是 `JOINT` |
| `motor_mount` / `电机座` | 合并进 `ARM` |
| `other` / `其他` | 人工审阅 |

---

## 3. 零件元数据 Schema

每个零件在数据库里对应一条文档，并且**每个 GLB 文件旁边有一个同名的 JSON 文件**存储结构化元数据（卡扣点、重量等）。

### 3.1 MongoDB `parts` collection

```ts
interface Part {
  _id: ObjectId;
  partNumber: string;           // "FW-HUB-001"
  category: PartCategory;       // 'HUB' | 'ARM' | 'PLATE' | 'JOINT' | 'LAND' | 'DECO'
  name: {                       // 显示名
    zh: string;                 // "主板·经典圆盘"
    en: string;                 // "Hub · Classic Disc"
  };
  description: {                // 简介
    zh: string;
    en: string;
  };
  asset: {
    glbPath: string;            // "/parts/core_hub_01.glb"
    thumbnailPath: string;      // "/parts/thumbs/core_hub_01.webp" ← 预渲染静态图
    previewPath?: string;       // "/parts/previews/core_hub_01.mp4" ← 可选旋转视频
  };
  geometry: {
    boundingBox: {              // 包围盒，单位 mm
      min: [number, number, number];
      max: [number, number, number];
    };
    volumeCm3: number;          // 体积
    estimatedWeightG: number;   // 估算重量（按 3mm 椴木板计算）
  };
  snapPoints: SnapPoint[];      // 关键！卡扣点，决定能接哪些零件
  compatibility: {              // 兼容性
    requiresCategory?: PartCategory[]; // 安装时需要哪类父零件
    acceptsCategory?: PartCategory[];   // 我能承接哪类子零件
    minQuantity?: number;               // 最少使用数量
    maxQuantity?: number;               // 最多使用数量
    symmetryRequired?: boolean;         // 是否必须对称安装
  };
  layer?: 'single' | 'double';  // 仅 HUB 有效：单层 / 双层
  tags: string[];               // ['初学者', '对称', '轻量', ...]
  deprecated?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface SnapPoint {
  id: string;                   // "sp-01", "sp-02", ...
  position: [number, number, number];
  normal: [number, number, number];  // 法线方向
  type: 'arm-mount' | 'guard-mount' | 'deco-mount' | 'motor-mount';
  mirrorOf?: string;            // 镜像关系，用于对称安装
}
```

### 3.2 GLB 同目录 JSON 文件格式

每个 GLB 旁放一个 `xxx.meta.json`，与 MongoDB 文档保持一致子集：

```json
{
  "partNumber": "FW-HUB-001",
  "category": "HUB",
  "geometry": {
    "boundingBox": { "min": [-50, -5, -50], "max": [50, 5, 50] },
    "volumeCm3": 12.3,
    "estimatedWeightG": 8.4
  },
  "snapPoints": [
    { "id": "sp-arm-01", "position": [50, 0, 0], "normal": [1, 0, 0], "type": "arm-mount", "mirrorOf": "sp-arm-03" },
    { "id": "sp-arm-02", "position": [0, 0, 50], "normal": [0, 0, 1], "type": "arm-mount", "mirrorOf": "sp-arm-04" },
    { "id": "sp-arm-03", "position": [-50, 0, 0], "normal": [-1, 0, 0], "type": "arm-mount" },
    { "id": "sp-arm-04", "position": [0, 0, -50], "normal": [0, 0, -1], "type": "arm-mount" }
  ],
  "layer": "single"
}
```

这个 JSON 是 **Rhino 导出流程的一部分**——Rhino 插件（或人工在 Rhino 中标记点后，脚本批量导出）负责生成。

---

## 4. 预渲染缩略图管线（解决 WebGL Context 溢出）

### 4.1 方案对比回顾

| 方案 | 优劣 | 选择 |
|------|------|------|
| A. 每张卡片独立 Canvas | Context 16 个上限 → 35+ 机臂白屏 | ❌ 放弃 |
| B. 预渲染静态图片 + 详情页 3D | 列表页永远 0 Context，性能最好，观感略逊 | ✅ **采用** |
| C. 单一共享 Canvas + RenderTarget | 实现复杂，滚动同步难 | ❌ 暂不 |
| D. 虚拟滚动延迟加载 | 只解决性能不解决上限 | ❌ 不行 |

### 4.2 预渲染流程

1. **自动化脚本**（Node.js + Puppeteer + 一个最小 Three.js 场景）：
   ```
   input:  assets/parts/*.glb
   output: assets/parts/thumbs/*.webp (512×512, 白底, 透视相机)
   ```
2. 每次 GLB 文件更新后，CI 跑这个脚本重新生成对应的缩略图。
3. 缩略图进 Git LFS（文件较大） 或者直接进对象存储。

### 4.3 详情页 3D（只在详情模态框里加载）

用户点击零件卡片 → 打开模态框 → 此时才创建 Three.js 场景、加载 GLB。模态框关闭后 `dispose()` 掉场景，释放 Context。

核心画布（设计工作台中间）始终只有 **1 个** WebGL Context，零件详情模态框临时开一个第 2 个，关闭就释放。永远不超过 2 个。

---

## 5. 前端组件设计

### 5.1 零件库组件结构

```
<PartsLibrary>
  ├─ <CategoryTabs />          // HUB / ARM / PLATE / JOINT / LAND / DECO
  ├─ <PartSearchInput />
  ├─ <PartGrid>
  │    └─ <PartCard>           // 使用 <img> 缩略图，不是 Canvas
  │          ├─ <Thumbnail />  
  │          ├─ <PartNumber />  // FW-HUB-001
  │          ├─ <PartName />   // "主板·经典圆盘"
  │          └─ <InfoButton /> // 点击打开详情模态框
  └─ <PartDetailModal>         // 只有打开时才渲染 3D
       ├─ <ThreePreview />     // 3D 旋转查看
       ├─ <PartSpecs />        // 尺寸、重量、兼容性
       └─ <AddToCanvasButton />
```

### 5.2 当前步骤联动

零件库的 `<CategoryTabs>` 根据搭建状态机的当前步骤**自动切换到可用类别**：

- Step 1 → 只显示 HUB tab
- Step 2 → 只显示 ARM tab，其他 tab 灰掉 + tooltip「下一步才能用」
- Step 4 → 只显示 PLATE / JOINT / LAND
- Step 5 → 只显示 DECO
- 自由模式 → 全部 tab 可切换

### 5.3 搜索与筛选

- 搜索：按 `partNumber`、`name.zh`、`name.en`、`tags` 模糊匹配。
- 筛选（在当前类别内）：
  - 按 tag（初学者 / 对称 / 轻量 / 中国风）
  - 按 layer（仅 HUB）
  - 按 estimatedWeight 排序

---

## 6. 兼容性规则引擎（Compatibility Engine）

当用户点击一个零件尝试添加时，引擎检查：

```ts
function canAddPart(
  part: Part,
  currentProject: Project,
  targetSnapPoint?: SnapPoint,
): CompatibilityResult {
  // 1. 当前步骤允许这个类别吗
  if (!isCategoryAllowedInStep(part.category, currentProject.stepReached)) {
    return { ok: false, reason: 'WRONG_STEP' };
  }
  
  // 2. 卡扣点类型匹配吗
  if (targetSnapPoint && !matchesSnapType(part.category, targetSnapPoint.type)) {
    return { ok: false, reason: 'SNAP_TYPE_MISMATCH' };
  }
  
  // 3. 数量是否超限
  const currentCount = currentProject.parts.filter(p => p.category === part.category).length;
  if (part.compatibility.maxQuantity && currentCount >= part.compatibility.maxQuantity) {
    return { ok: false, reason: 'MAX_QUANTITY' };
  }
  
  // 4. 对称性要求
  if (part.compatibility.symmetryRequired) {
    // 自动镜像安装
  }
  
  return { ok: true };
}
```

每种 `reason` 对应一个**对小朋友友好的提示文案**：

- `WRONG_STEP` → 「哎呀，我们还在装机臂呢，等下一步再选这个吧！」
- `SNAP_TYPE_MISMATCH` → 「这个地方不能放这种零件，换个位置试试？」
- `MAX_QUANTITY` → 「你已经装了 8 条机臂啦，再多飞不动啦！」

---

## 7. BOM（物料清单）生成

学生完成一个设计后，系统要能生成一份 BOM 给制造端使用（激光切割 + 电子元件打包）：

```ts
interface BillOfMaterials {
  projectId: string;
  projectName: string;
  designer: string;
  woodParts: Array<{
    partNumber: string;
    quantity: number;
    estimatedWeightG: number;
    laserCutFile: string; // .dxf 路径
  }>;
  electronics: Array<{
    type: 'motor' | 'propeller' | 'battery' | 'flight-controller';
    spec: string;
    quantity: number;
  }>;
  totalWeight: number;
  totalCostRMB?: number; // 估算成本
}
```

BOM 导出支持：PDF、Excel、JSON 三种格式。供应链端祥子用 Excel，制造端用 PDF。

---

## 8. 给 Claude Code 的执行清单

1. 创建 `packages/parts-schema` 包，定义所有 TS 类型与 Zod schema。
2. 写迁移脚本：
   - 把 `assets/parts/` 下的 GLB 文件盘点，生成初始 `PART_REGISTRY`。
   - 把数据库中现有零件数据按第 2.3 节的映射表迁移。
3. 写预渲染脚本 `scripts/render-thumbnails.ts`，输出 webp 到 `assets/parts/thumbs/`。
4. 重写前端 `<PartsLibrary>` 组件，使用缩略图 + 详情模态框。
5. 写兼容性引擎 `packages/parts-schema/src/compatibility.ts`。
6. 写 BOM 生成 `packages/parts-schema/src/bom.ts`。
7. 每一步完成后加测试并发 PR。
