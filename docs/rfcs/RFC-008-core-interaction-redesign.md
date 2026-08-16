# RFC-008：核心交互重构、业务规则与代码整合

> **状态**：待实施
> **作者**：小城（产品决策） + 同伴技术评审 + Claude（整理）
> **日期**：2026-04-27
> **预计工期**：10-14 天（分 6 个 PR）
> **Claude Code 执行**：是
> **复杂度**：⭐⭐⭐⭐⭐（极高 —— 涉及核心交互逻辑重写）

---

## 0. 工作流要求

**这是 FlightWoodX 至今复杂度最高的 RFC**，包含 6 个不同性质的问题。流程必须严格：

1. **必读**：完整文档 + 同伴提供的两个 ZIP 中的所有代码
2. **PR 0（前置）**：产出 `RFC-008a-implementation-plan.md`，包括：
   - 同伴代码 vs 现有代码的**详细对比报告**（每个组件的功能差异、UI 差异、推荐取舍）
   - 6 个 PR 的具体文件改动清单
   - 模糊点的 2-3 个选项建议
   - 风险点 + 缓解方案
3. 我 review 后才进入 PR 1
4. 每个 PR 提交后等 review 再做下一个
5. **禁止盲目合并**两份代码 —— 必须做"取其精华"的融合

**核心原则**：

> **"以同伴的新代码为基础融合，不是简单拼凑"** —— 这意味着新代码代表更新的设计思路，但现有代码也有运行验证过的稳定性。每一处合并都要给出明确理由：保留 A、用 B、还是融合 AB？

---

## 1. 背景与问题清单

本 RFC 解决以下 **6 个问题** 的组合包：

### 1.1 问题清单

| # | 类型 | 问题 | 严重度 |
|---|---|---|---|
| 1 | 架构 | models 文件夹按 4 类重组，前端代码需更新读取路径 | 🟦 中 |
| 2 | 架构 | 同伴提供 2 个 ZIP（预览页 + 诊断报告），需融合到现有代码 | 🟦 高 |
| 3 | 业务规则 | 飞机配置 5 条硬约束（数量、对称、重量上限） | 🟩 高 |
| 4 | 交互 | 拖拽时显示了多余的卡片背景，应只显示零件 | 🟧 中 |
| 5 | 交互 | 衔接件可跳过引发疑问，建议"马达放最后一步" | 🟧 高 |
| 6 | 交互 | 吸附偏移问题（特别是吸附点多时） | 🟧 极高（最影响用户体验） |

### 1.2 优先级与依赖关系

```
PR 0 (前置)：代码对比报告
  │
  ├─ PR 1：models 路径迁移 + 数据结构升级（问题 1）
  │   │
  │   └─ PR 2：同伴代码整合（问题 2）
  │       │
  │       └─ PR 3：业务规则系统（问题 3）
  │           │
  │           ├─ PR 4：拖拽 UI 修复 + 工作流重构（问题 4 + 问题 5）
  │           │
  │           └─ PR 5：智能吸附系统重写（问题 6 —— 灵魂改动）
  │
  └─ PR 6：体验细化（实时反馈 UI、零件库分类筛选等）
```

---

## 2. PR 0：代码对比与取舍报告（前置）

### 2.1 目标

**禁止 Claude Code 直接动手合并代码**。必须先做对比分析。

### 2.2 任务清单

1. 解压 `apps/web/预览页面.zip` 和 `apps/web/飞机模型诊断报告.zip` 到临时目录
2. 列出每个 ZIP 中的文件结构
3. 对每个新文件（或修改的现有文件），做以下对比：

| 维度 | 同伴新代码 | 现有代码 | 推荐 |
|---|---|---|---|
| 功能完整度 | ... | ... | A / B / 融合 |
| UI 设计 | ... | ... | A / B / 融合 |
| 代码质量 | ... | ... | A / B / 融合 |
| 性能考虑 | ... | ... | A / B / 融合 |
| TypeScript 类型 | ... | ... | A / B / 融合 |
| 集成成本 | ... | ... | 估算工时 |

4. 输出最终决策表：

```markdown
## 代码取舍决策

### 完全采用同伴新代码的部分
- [ ] 文件 X：理由 ...

### 完全保留现有代码的部分
- [ ] 文件 Y：理由 ...

### 需要融合的部分
- [ ] 文件 Z：保留 X 的功能 A，采用同伴的 B 部分，原因是 ...
```

### 2.3 我对融合的预判（供参考）

我猜测同伴的 **预览页** 大概率包含：
- 优化的 3D 整机渲染（可能用了更好的相机控制）
- 更好的 UI 布局
- 可能用了不同的状态管理方式

我猜测同伴的 **诊断报告** 大概率包含：
- 完整的检查规则实现（图 3 的 5 条规则可能已在里面）
- 更细致的 UI 视觉设计

如果我猜对了，**优先采用同伴的检查规则实现**（避免重复造轮子），但 UI 上要和 RFC-005 / RFC-006 已建立的设计语言对齐（钉钉进步体、wood 色系、scroll-reveal 等）。

### 2.4 验收标准

- [ ] 输出 `docs/rfcs/RFC-008-code-merge-report.md`
- [ ] 我 review 通过后才进入 PR 1

---

## 3. PR 1：models 路径迁移 + 数据结构升级

### 3.1 文件夹结构变化

**变更前**：
```
apps/web/public/models/
├─ part_001.glb
├─ part_002.glb
└─ ... (77 个零件平铺)
```

**变更后**：
```
apps/web/public/models/
├─ 主板件/    (~30 GLB)
├─ 连接件/    (~15 GLB)
├─ 起落架/    (~40 GLB)
└─ 保护板/    (~40 GLB)
```

### 3.2 改动要点

#### 3.2.1 中文文件夹名的处理

中文文件夹在生产环境（Vercel）会被 URL 编码为 `%E4%B8%BB%E6%9D%BF%E4%BB%B6/`，可能导致路径解析失败。

**强烈建议**：把文件夹名改成英文：

```
apps/web/public/models/
├─ mainboards/   (主板件)
├─ joints/       (连接件)
├─ landings/     (起落架)
└─ guards/       (保护板)
```

英文路径无编码风险，且符合代码规范。**Claude Code 应该向用户提议这个变更**，如果用户接受，PR 1 包含文件夹改名。

如果用户坚持中文文件夹，那么需要：
- 在所有 fetch URL 处用 `encodeURIComponent`
- 在 Vite config 中处理静态资源路径

#### 3.2.2 parts schema 更新

`packages/parts-schema` 中的零件元数据需要：
- 新增 `category` 字段（`mainboard` / `joint` / `landing` / `guard`）
- 路径前缀按类别拼接：`/models/{category-folder}/{part_id}.glb`
- 旧的扁平 ID 体系映射到新结构

#### 3.2.3 重量字段 ×0.3 全局缩放

按 Q5 决策，所有零件 weight 字段全局缩放：

```javascript
// scripts/scale-weights.js
const partsData = require('../packages/parts-schema/parts.json');
partsData.forEach(part => {
  part.weight = Math.round(part.weight * 0.3 * 10) / 10; // 保留 1 位小数
});
fs.writeFileSync(/* ... */);
```

执行后：
- 平均装机重量从 100g+ 降到 30g 左右
- 配合后面的"35g 上限"业务规则

### 3.3 验收

- [ ] 所有 GLB 文件正确分组到 4 个文件夹
- [ ] parts schema 的 category 字段填充完整
- [ ] 前端能正确加载新路径下的所有零件
- [ ] 重量字段已 ×0.3 缩放
- [ ] 现有功能（设计、保存、加载）不受影响

---

## 4. PR 2：同伴代码整合

### 4.1 目标

把同伴提供的 2 个 ZIP 中的代码，**按 PR 0 的取舍报告**融合进现有代码。

### 4.2 整合原则

按以下顺序判断每一处冲突：

1. **业务正确性优先**：哪个版本的逻辑符合图 3 的 5 条规则？
2. **代码质量优先**：哪个版本类型更清晰、更易维护？
3. **设计对齐优先**：哪个版本符合 RFC-005 已建立的视觉语言？
4. **运行稳定性优先**：现有代码已经在 prod 运行，新代码可能有未测试的 bug

### 4.3 必须做的事

- 引入同伴的所有**新增功能**（不能丢）
- 不能让现有功能**回归**（已修复的 bug 不能复现）
- TypeScript 类型必须**完整**（不允许 any）
- 视觉风格必须**统一**到 RFC-005 设计语言

### 4.4 必须不做的事

- 不要简单的"覆盖"或"复制粘贴"
- 不要保留两套相似但不同的实现（DRY 原则）
- 不要在没有 PR 0 报告的情况下改代码

### 4.5 验收

- [ ] 所有同伴代码的新功能都已整合
- [ ] 现有的引导式搭建、Step 1-6、保存等功能正常
- [ ] 没有视觉风格断层

---

## 5. PR 3：飞机配置约束系统

### 5.1 业务规则（图 3 + 业务理解）

#### 规则 1：主板件数量与位置

```
- 数量：1-2 个
- 当为 2 个时：必须放置在两个互相平行的水平面上
  （一个在底层 Y=0，一个在顶层 Y=H，不能斜放或交叉）
- 单板模式：经典四旋翼布局
- 双板模式：上下叠加，机身更稳固
```

**验证逻辑**：
```typescript
function validateMainboardConstraint(mainboards: Part[]): ValidationResult {
  if (mainboards.length === 0) return { valid: false, message: '至少需要 1 块主板' };
  if (mainboards.length > 2) return { valid: false, message: '最多只能放 2 块主板' };
  
  if (mainboards.length === 2) {
    // 检查 Y 高度差是否 > 阈值（说明在不同水平面）
    const yDiff = Math.abs(mainboards[0].position.y - mainboards[1].position.y);
    if (yDiff < 0.05) {
      return { valid: false, message: '两块主板要放在上下两层（不能在同一高度）' };
    }
    
    // 检查两块都是水平的（X 和 Z 旋转应接近 0）
    const tilt1 = Math.max(Math.abs(mainboards[0].rotation.x), Math.abs(mainboards[0].rotation.z));
    const tilt2 = Math.max(Math.abs(mainboards[1].rotation.x), Math.abs(mainboards[1].rotation.z));
    if (tilt1 > 0.1 || tilt2 > 0.1) {
      return { valid: false, message: '两块主板都要保持水平' };
    }
  }
  
  return { valid: true };
}
```

#### 规则 2：起落架数量与吸附目标

```
- 数量：4-8 个
- 必须吸附在主板上（不能吸附到其他零件）
```

**验证逻辑**：
```typescript
function validateLandingConstraint(landings: Part[], mainboards: Part[]): ValidationResult {
  if (landings.length < 4) return { valid: false, message: '至少需要 4 个起落架' };
  if (landings.length > 8) return { valid: false, message: '最多 8 个起落架' };
  
  // 检查每个起落架的"吸附父零件"
  for (const landing of landings) {
    if (!isAttachedToAny(landing, mainboards)) {
      return { 
        valid: false, 
        message: `起落架 ${landing.id} 没有装在主板上`
      };
    }
  }
  
  return { valid: true };
}
```

#### 规则 3：保护板数量与吸附目标

```
- 数量：1（一体式）/ 2（半体式）/ 4（分体式）
- 必须吸附在起落架上
```

**验证逻辑**：
```typescript
function validateGuardConstraint(guards: Part[], landings: Part[]): ValidationResult {
  const validCounts = [1, 2, 4];
  if (!validCounts.includes(guards.length)) {
    return { valid: false, message: '保护板数量应为 1（整体）、2（半体）或 4（分体）' };
  }
  
  for (const guard of guards) {
    if (!isAttachedToAny(guard, landings)) {
      return { 
        valid: false, 
        message: `保护板 ${guard.id} 没有装在起落架上` 
      };
    }
  }
  
  return { valid: true };
}
```

#### 规则 4：模型必须保持对称

**对称性检测**：
```typescript
function checkSymmetry(parts: Part[]): SymmetryResult {
  // 计算 X 轴对称：每个零件的镜像位置应该有对应零件
  let asymmetricCount = 0;
  
  for (const part of parts) {
    if (Math.abs(part.position.x) < 0.05) continue; // 在 X=0 上的零件不需要镜像
    
    const mirroredPos = { ...part.position, x: -part.position.x };
    const mirrorPart = parts.find(p => 
      p.partId === part.partId && 
      distance(p.position, mirroredPos) < 0.05
    );
    
    if (!mirrorPart) asymmetricCount++;
  }
  
  return {
    isSymmetric: asymmetricCount === 0,
    asymmetricCount,
    score: 100 - (asymmetricCount / parts.length) * 100
  };
}
```

**自动镜像安装**（建议在 PR 4 工作流中）：
- 用户拖一个起落架到左侧 → 系统自动在右侧对称位置预览另一个
- 用户确认后两个一起安装
- 这是 Tinkercad 的"对称建模"思路

#### 规则 5：总重量 ≤ 35g

```typescript
function validateWeight(parts: Part[]): ValidationResult {
  const total = parts.reduce((sum, p) => sum + p.weight, 0);
  if (total > 35) {
    return { 
      valid: false, 
      message: `已经超重啦（${total.toFixed(1)}g / 35g 上限）`,
      hint: '可以试试拆掉一些装饰件'
    };
  }
  return { valid: true, currentWeight: total };
}
```

### 5.2 实时反馈 UI（关键体验）

#### 5.2.1 顶部重量进度条

工作台顶部新增一个**永远可见**的重量条：

```
┌──────────────────────────────────────────────┐
│   当前装机：23.5g / 35g                      │
│   [████████░░░░░░░░░░]  67%                  │
└──────────────────────────────────────────────┘
```

颜色规则：
- 0-70% （0-24.5g）：绿色 `accent-leaf`
- 70-90% （24.5-31.5g）：黄色 `accent-gold`
- 90-100% （31.5-35g）：橙色 `wood-500`
- > 100% （> 35g）：红色 `#E04545`，开始闪烁警告

#### 5.2.2 即时违规提示

用户尝试违反规则时：

- **不要**用浏览器原生 alert
- **不要**在底部静默 toast
- **要**用气泡提示从被拖动零件位置弹出
- **要**给出具体修复建议

例：
```
[气泡] 起落架要装在主板上哦！
       👆 主板亮起来的位置可以装
```

#### 5.2.3 友好的"拒绝"

当违反规则时：
- 零件**不允许**放置在错的位置（弹回原处）
- 弹出 1.5 秒后自动消失的引导气泡
- **不要**抛 error，**不要**让用户点击"OK"

### 5.3 验收

- [ ] 5 条规则都有对应的验证函数
- [ ] 验证函数有完整的单元测试
- [ ] 顶部重量条永远可见且实时更新
- [ ] 违规时气泡提示友好且具体
- [ ] 不能用 alert 或浏览器原生弹窗

---

## 6. PR 4：拖拽 UI 修复 + 工作流重构

### 6.1 拖拽显示问题（图 4）

#### 6.1.1 现象

拖拽零件时，DragImage 显示的是整个**零件库卡片**（含背景、padding、阴影、文字），不是零件本身。

#### 6.1.2 根因

可能的原因：
- 使用了 HTML5 拖拽 API 的默认 DragImage（默认就是被拖元素的快照）
- 没有自定义 `setDragImage`

#### 6.1.3 修复方案

**方案 A（推荐）：自定义 DragImage 为零件预览图**

```typescript
function handleDragStart(e: DragEvent, part: Part) {
  // 创建一个临时图片元素，只包含零件 PNG（无背景）
  const img = new Image();
  img.src = `/parts/thumbnails/${part.id}.png`;  // 透明背景的零件 PNG
  img.style.position = 'absolute';
  img.style.top = '-9999px';
  document.body.appendChild(img);
  
  e.dataTransfer.setDragImage(img, 32, 32);
  e.dataTransfer.setData('partId', part.id);
  
  // 清理
  setTimeout(() => document.body.removeChild(img), 0);
}
```

**前置条件**：每个零件需要一张透明背景的预览 PNG（`apps/web/public/parts/thumbnails/{part_id}.png`）。如果没有，**Claude Code 写个脚本批量从 GLB 截图生成**。

**方案 B（备用）：完全自定义拖拽（不用 HTML5 API）**

用 React 的 `onMouseMove` 事件 + `transform: translate` 实现：

```typescript
const [dragging, setDragging] = useState<Part | null>(null);
const [dragPos, setDragPos] = useState({ x: 0, y: 0 });

return (
  <>
    <div onMouseDown={() => setDragging(part)}>...</div>
    {dragging && (
      <div 
        style={{
          position: 'fixed',
          left: dragPos.x - 32,
          top: dragPos.y - 32,
          pointerEvents: 'none',
          opacity: 0.7,
          transform: 'scale(1.1)'
        }}
      >
        <PartThumbnail part={dragging} />
      </div>
    )}
  </>
);
```

更灵活，但需要自己处理 drop target 检测。

**推荐方案 A**（更简单），方案 B 作为备用。

#### 6.1.4 视觉细节（重要）

参考 Notion / Figma 的拖拽预览：
- 拖拽时零件**轻微放大** (`scale(1.1)`)
- 半透明 `opacity: 0.7`
- 跟随光标时**有轻微弹性**（不要"硬跟"）
- 鼠标在画布上方时，零件颜色略偏 `wood-500`（提示"可放置"）

### 6.2 拖拽时背景半透明（图 5）

同伴提到："**有点影响查找吸附点和观察模型，建议缩小去掉背景只显示半透明模型**"

#### 6.2.1 实现

拖拽过程中：
```typescript
// 当 isDragging === true 时
.canvas-during-drag {
  /* 已有零件 */
  opacity: 0.4;  /* 半透明 */
  filter: grayscale(0.3);  /* 略微去色 */
}

.canvas-during-drag .socket-highlight {
  /* 吸附点高亮 */
  opacity: 1;  /* 全亮 */
  z-index: 100;
}
```

效果：
- 背景的已有零件变淡
- 吸附点变得突出
- 用户视线聚焦在"我能放哪里"

#### 6.2.2 退出条件

- 拖拽结束（mouseup） → 恢复正常
- 拖拽到无效位置 → 弹回 + 恢复

### 6.3 工作流重构（图 5）

#### 6.3.1 现状问题

当前 6 步：
```
1. 主板 → 2. 机臂 → 3. 电机 → 4. 保护罩 → 5. 衔接件 → 6. 检查
```

**问题**：
- 步骤 5「衔接件」可有可无 → 用户跳过 → "这一步不重要" 的认知建立 → 引导式 UI 权威感降低
- 电机在步骤 3 → 后面装零件时电机已经"挡路"

#### 6.3.2 新工作流（推荐）

```
1. 主板（必选）
2. 起落架（必选 4-8 个，吸附主板）  ← 新增（之前没有专门步骤？）
3. 保护板（必选 1/2/4 个，吸附起落架）
4. 装饰件（可选）  ← 衔接件改成"装饰件"，明确为可选
5. 检查
6. 安装电机（自动完成 + 庆祝动画）  ← 最后一步！
```

#### 6.3.3 设计思考

**为什么把电机放最后？**

这是同伴的精彩提议：
- 电机像"启动钥匙"——装上电机后飞机才"活了"
- 给孩子**仪式感**：所有静态零件搭好后，"咔嚓"装上电机 → 螺旋桨开始旋转 → 完成！
- 视觉上最后一步**戏剧性**最强

#### 6.3.4 衔接件的处理

衔接件不再是必选步骤，但：
- 在零件库里依然可见（在"装饰件"分类下）
- 可以作为可选步骤插入第 4 步"装饰件"
- 移除"必须经过这一步"的强制约束

#### 6.3.5 自动安装电机的具体动画

第 6 步进入时：
1. 屏幕中央出现文字"准备安装电机..."（钉钉进步体 32px）
2. 0.5 秒后：每条机臂顶部位置依次"砰"地出现一个电机 GLB
3. 一个一个出现（间隔 200ms），每个出现时有粒子特效
4. 全部装好后：螺旋桨开始转动
5. 屏幕显示"飞机准备完毕！" + 撒花动画
6. 出现"完成"按钮

参考交互：抖音/instagram 的"完成"庆祝动画，但**克制一些**（这是教育产品）。

### 6.4 验收

- [ ] 拖拽时只显示零件本体（无卡片背景）
- [ ] 拖拽时画布上的已有零件变半透明
- [ ] 步骤更新为 1-6 新顺序
- [ ] 衔接件改为"装饰件"，标记为可选
- [ ] 第 6 步电机自动安装动画完整
- [ ] 完整流程从 Step 1 到 Step 6 跑通

---

## 7. PR 5：智能吸附系统重写（最关键）

这是产品**交互的灵魂**。值得花最多时间打磨。

### 7.1 现状问题（图 6）

> "吸附点的问题，有时候吸附会吸偏（特别是吸附点比较多的时候）"

**根因分析**：
- 当画布上吸附点很多时（一个主板有 16 个 socket，4 个起落架又有 4×N 个）
- 系统按"距离最近"算法吸附 → 用户拖到 A 处，但更近的 B 被吸附
- **没有"上下文感知"**——不管什么零件都尝试连所有点

### 7.2 新吸附系统：基于"装配规则"的智能吸附

#### 7.2.1 核心思想

借鉴 **Onshape 的 Mate Connectors** 和 **Tinkercad 的吸附**：

> **拖什么零件，就只激活那些零件能连接的吸附点**

具体规则（来自图 3 + 图 6 的同伴评审）：

```
拖动的零件          被激活的吸附点
─────────────────  ─────────────────────────────
主板件              • 世界原点（用于第一块）
                    • 已有主板的"上方平面"（用于第二块）

起落架              • 主板上的吸附点
                    （其他零件的吸附点 - 关闭）

保护板              • 起落架上的吸附点
                    （主板和其他保护板的吸附点 - 关闭）

衔接件 / 装饰件      • 主板上的吸附点（仅主板，不能吸附其他）
                    （图 6 同伴明确说："连接件只能吸附主板"）

电机                • 机臂的"顶部"吸附点（自动安装阶段）
```

#### 7.2.2 数据结构

每个零件的 `conn_socket_*` 和 `conn_plug_*` 需要新增 `compatibleWith` 字段：

```typescript
interface Connector {
  id: string;
  type: 'socket' | 'plug';
  position: Vector3;
  quaternion: Quaternion;
  
  // 新增：兼容性
  compatibleWith: PartCategory[];  // 这个连接点能接什么类别的零件
  
  // 例如主板上的 socket：{ compatibleWith: ['landing', 'joint'] }
  // 例如起落架的 socket：{ compatibleWith: ['guard'] }
}
```

#### 7.2.3 吸附点的视觉状态

拖拽过程中，每个吸附点有 4 种状态：

| 状态 | 视觉 | 含义 |
|---|---|---|
| **隐藏** | 不显示 | 不能连接当前拖拽的零件 |
| **可用** | 蓝色脉冲圆点（`accent-sky`） | 可以连接 |
| **临近** | 橙色亮圆 + 光晕（`accent-gold`） | 鼠标接近，准备吸附 |
| **吸附中** | 绿色实心 + 锁定动画（`accent-leaf`） | 已经吸附 |

参考图：
```
默认拖拽：
[拖动的零件] ╳ ╳ ╳ ●(蓝) ●(蓝) ●(蓝) ╳ ╳

接近一个：
[拖动的零件] ╳ ╳ ╳ ●(蓝) ◉(橙发光) ●(蓝) ╳ ╳
                        ↑ 鼠标接近

吸附后：
[拖动的零件 ⮕ 吸附位置] ◉(绿色实心)
```

#### 7.2.4 吸附判定算法

```typescript
function findBestSnapTarget(
  draggedPart: Part,
  cursorPos: Vector3,
  allParts: Part[]
): SnapTarget | null {
  // 1. 找出所有"激活"的吸附点（compatibleWith 匹配）
  const activeSockets = allParts.flatMap(part => 
    part.connectors
      .filter(c => 
        c.type === 'socket' && 
        c.compatibleWith.includes(draggedPart.category)
      )
      .map(c => ({ part, connector: c }))
  );
  
  // 2. 按距离排序
  const sorted = activeSockets
    .map(({ part, connector }) => ({
      part,
      connector,
      distance: cursorPos.distanceTo(connector.position)
    }))
    .filter(s => s.distance < SNAP_THRESHOLD)  // 阈值内才考虑
    .sort((a, b) => a.distance - b.distance);
  
  // 3. 返回最近的（如果存在）
  return sorted[0] || null;
}

const SNAP_THRESHOLD = 0.5;  // 米，可调
```

#### 7.2.5 吸附"魔术"细节（来自 Tinkercad）

让吸附**感觉聪明**的几个 trick：

1. **磁吸缓动**：靠近吸附点 0.3m 时，零件位置开始**轻微偏向**吸附点（像被磁铁吸）。距离 0.1m 时**完全锁定**。这给用户"系统在帮我"的感觉。

2. **吸附前的预览**：在零件正式 drop 前，显示一个**半透明预览**在吸附位置。用户可以确认后再松手。

3. **撤销吸附**：拖动距离 > 0.4m 时**断开吸附**，让用户能更换目标。

4. **音效（可选）**：吸附成功时播放轻微"咔哒"声（来自 LEGO 的体验）。**第一版不做**（增加复杂度，不是必须）。

### 7.3 自动镜像安装（对称性辅助）

来自规则 4 "模型保持对称"。

#### 7.3.1 实现

用户拖一个起落架到主板左前角的吸附点：

1. 系统检测到这是"非中心"位置
2. 自动计算 X 轴对称的镜像位置
3. 在镜像位置显示一个**虚影预览**（半透明，闪烁）
4. 文字提示："要不要在右边也装一个？"
5. 用户确认 → 两个一起安装
6. 用户拒绝 → 只装当前这个

这是 Tinkercad 的"对称建模"思路，**显著降低孩子的认知负担**——他们不用思考"对称怎么放"。

#### 7.3.2 技术细节

镜像位置计算：
```typescript
function getMirroredPosition(originalPos: Vector3, axis: 'x' | 'y' | 'z' = 'x'): Vector3 {
  return new Vector3(
    axis === 'x' ? -originalPos.x : originalPos.x,
    axis === 'y' ? -originalPos.y : originalPos.y,
    axis === 'z' ? -originalPos.z : originalPos.z
  );
}
```

镜像零件的旋转也要镜像（朝向相反方向）：
```typescript
function getMirroredRotation(originalRot: Euler, axis: 'x' = 'x'): Euler {
  // X 轴镜像 = Y 旋转取反 + Z 旋转取反
  return new Euler(
    originalRot.x,
    -originalRot.y,
    -originalRot.z
  );
}
```

### 7.4 验收

- [ ] 拖动主板时，只激活合理的吸附点
- [ ] 拖动起落架时，只激活主板上的吸附点
- [ ] 拖动保护板时，只激活起落架上的吸附点
- [ ] 拖动衔接件时，只激活主板上的吸附点
- [ ] 吸附点的 4 种状态（隐藏/可用/临近/吸附）视觉正确
- [ ] 磁吸缓动效果存在
- [ ] 吸附预览（半透明）出现
- [ ] 自动镜像安装的虚影 + 询问气泡

---

## 8. PR 6：体验细化与零件库重组

### 8.1 零件库分类筛选

125 个零件不能再像 77 个那样平铺。

#### 8.1.1 UI 重构

```
┌──────────────────────────────────────┐
│  零件库                              │
│  ─────────────────────────────────   │
│  [全部] [主板] [起落架] [保护板] [装饰] │  ← Tab 切换
│  ─────────────────────────────────   │
│                                      │
│  [搜索框：找一个零件...]             │
│                                      │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐                │
│  │  │ │  │ │  │ │  │                │
│  └──┘ └──┘ └──┘ └──┘                │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐                │
│  │  │ │  │ │  │ │  │                │
│  └──┘ └──┘ └──┘ └──┘                │
│                                      │
│  [向下滚动看更多 ↓]                  │
└──────────────────────────────────────┘
```

#### 8.1.2 智能过滤

进入某个步骤时，零件库**自动只显示**该步骤需要的类别：

```
Step 1（主板）→ 自动切换到"主板" Tab，禁用其他 Tab
Step 2（起落架）→ 自动切换到"起落架" Tab
Step 3（保护板）→ 自动切换到"保护板" Tab
Step 4（装饰）→ 自动切换到"装饰" Tab
Step 5（检查）→ 隐藏零件库
```

用户可以手动点 [全部] 看所有零件，但默认引导他们关注当前步骤。

### 8.2 顶部状态栏整合

把以下信息整合到顶部一个**统一的状态栏**：

```
┌────────────────────────────────────────────────────────────┐
│  当前步骤：起落架    ⊙ 重量 23.5g/35g    ✓ 对称 95%        │
│  [████████████░░░░░░] 67%                                  │
└────────────────────────────────────────────────────────────┘
```

实时更新所有关键指标，让孩子始终知道"我做得怎么样"。

### 8.3 验收

- [ ] 零件库 4 个分类 Tab + 搜索
- [ ] 进入步骤时自动切换 Tab
- [ ] 顶部状态栏永远可见且实时
- [ ] 重量条颜色按阈值变化

---

## 9. 优秀产品交互参考（给 Claude Code）

实施过程中可参考这些产品的具体细节：

### 9.1 Tinkercad（最重要的参考）
- **链接**：https://www.tinkercad.com
- **学什么**：吸附逻辑、对称建模、零件库分类、儿童友好的视觉
- **不学什么**：3D 建模工具的复杂度（我们不做建模工具）

### 9.2 LEGO Digital Designer（已停产但有研究价值）
- **学什么**：颜色指示"可吸附 vs 不可吸附"、装配预览
- **特别注意**：每个砖块的"吸附点"如何视觉化

### 9.3 Onshape Mate Connectors
- **链接**：https://cad.onshape.com（专业 CAD）
- **学什么**：基于"装配类型"的上下文吸附
- **不学什么**：专业 UI（太复杂）

### 9.4 Figma 拖拽
- **学什么**：拖拽预览的视觉、对齐辅助线的出现时机
- **特别注意**：不要"硬跟随"光标，要有微妙的弹性

### 9.5 Notion 拖拽块
- **学什么**：拖什么显示什么（不带 UI chrome）

### 9.6 Apple Watch 设置流程
- **学什么**：必要 vs 可选步骤的视觉区分

---

## 10. 风险清单

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| 同伴代码与现有代码冲突严重 | 高 | 高 | PR 0 详细对比报告 + 我 review 决策 |
| 中文文件夹路径问题 | 中 | 中 | 强烈建议改英文 |
| 吸附系统重写引入新 bug | 高 | 极高 | 单元测试 + 渐进式部署 |
| 重量缩放后用户已有作品异常 | 中 | 中 | 迁移脚本同时更新已存设计 |
| 零件库 125 个加载性能 | 中 | 中 | 懒加载 + 缩略图预生成 |
| 自动镜像逻辑误判 | 中 | 高 | 提供"取消镜像"按钮 |

---

## 11. 不做的事

本次 RFC **不做**：

- ❌ 真正的物理引擎（cannon-es、rapier 等）
- ❌ AR 试飞（RFC-007）
- ❌ 多人协作
- ❌ 撤销/重做的全面重构（沿用现有）
- ❌ 移动端深度优化（沿用现有）
- ❌ 国际化
- ❌ Dark Mode

---

## 12. 总验收清单

完成所有 6 个 PR 后，跑一遍完整验收：

### 12.1 业务规则
- [ ] 主板 1-2 个，超过 2 个时无法添加
- [ ] 2 块主板时必须上下平行
- [ ] 起落架只能吸附主板，4-8 个
- [ ] 保护板只能吸附起落架，1/2/4 个
- [ ] 总重量超过 35g 时警告
- [ ] 对称性自动检测 + 自动镜像建议

### 12.2 交互细节
- [ ] 拖拽时只显示零件本体（无卡片背景）
- [ ] 拖拽时画布上其他零件变半透明
- [ ] 吸附点根据被拖零件类型智能激活
- [ ] 吸附有磁吸缓动效果
- [ ] 吸附前有半透明预览
- [ ] 自动镜像安装的虚影提示

### 12.3 工作流
- [ ] 6 步流程顺序：主板 → 起落架 → 保护板 → 装饰（可选）→ 检查 → 安装电机
- [ ] 衔接件改为"装饰件"，明确可选
- [ ] 电机最后一步自动安装 + 庆祝动画
- [ ] 进入步骤时零件库自动切换 Tab

### 12.4 实时反馈
- [ ] 顶部状态栏：步骤 / 重量 / 对称性
- [ ] 重量条颜色按阈值变化
- [ ] 违规操作有友好气泡提示

### 12.5 代码整合
- [ ] 同伴代码的所有新功能已融合
- [ ] 现有功能没有回归
- [ ] 视觉风格统一

### 12.6 性能
- [ ] 125 个零件库加载流畅
- [ ] 拖拽帧率 60fps
- [ ] 吸附判断不卡顿

---

## 附录 A：给 Claude Code 的核心原则

### ✅ 必须做
- PR 0 必须先做代码对比报告，等我 review
- 每个 PR 提交后等我 review
- 严格区分"业务规则"（强制）和"建议"（提示）
- 吸附系统的视觉状态必须严格按 4 状态实现
- 所有 UI 用钉钉进步体（标题）+ MiSans（正文）
- 颜色严格用 design tokens

### ❌ 不要做
- 不要在 PR 0 报告之前直接动同伴代码
- 不要用 alert / confirm
- 不要保留两套相似实现
- 不要忽略 TypeScript 类型
- 不要修改 RFC 范围外的页面
- 不要为了"快"跳过吸附状态的视觉细节

---

## 附录 B：零件兼容性映射表（业务真相）

```typescript
const PART_COMPATIBILITY: Record<PartCategory, PartCategory[]> = {
  // 主板的 socket 能接收什么
  mainboard: ['landing', 'joint'],
  
  // 起落架的 socket 能接收什么
  landing: ['guard'],
  
  // 保护板的 socket 能接收什么
  guard: [],  // 保护板是终点，不能再装别的
  
  // 衔接件 / 装饰件
  joint: [],  // 装饰件不再连别的（避免装配链过深）
  
  // 电机：自动安装到机臂顶部，不通过吸附逻辑
  motor: []
};
```

---

## 附录 C：步骤定义（PR 4 用）

```typescript
interface Step {
  id: number;
  name: string;
  category: PartCategory | null;  // null = 检查步骤
  required: boolean;
  countLimits: { min: number; max: number };
}

const STEPS: Step[] = [
  { id: 1, name: '主板', category: 'mainboard', required: true, countLimits: { min: 1, max: 2 } },
  { id: 2, name: '起落架', category: 'landing', required: true, countLimits: { min: 4, max: 8 } },
  { id: 3, name: '保护板', category: 'guard', required: true, countLimits: { min: 1, max: 4 } },
  { id: 4, name: '装饰', category: 'joint', required: false, countLimits: { min: 0, max: 20 } },
  { id: 5, name: '检查', category: null, required: true, countLimits: { min: 0, max: 0 } },
  { id: 6, name: '安装电机', category: null, required: true, countLimits: { min: 0, max: 0 } }
];
```

---

**RFC 结束**

> 下一步：
> 1. Claude Code 完成 PR 0（代码对比报告）
> 2. 我 review 取舍决策
> 3. 按 PR 1 → 6 顺序实施
> 4. 每个 PR 之间我必须 review
