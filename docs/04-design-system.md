# 04 — 设计系统优化（Design System）

> **本文档目的**：为 FlightWoodX 建立一套完整的视觉与交互设计系统，替代当前略显模板化的界面，向一线设计公司的官网水准看齐。
> **读者**：Claude Code 在做任何 UI 改动前先读本文。
> **设计负责人**：小城（北师大 UX 硕士，可以做最终判断）。

---

## 1. 品牌基因（Brand DNA）

### 1.1 三个关键词
- **木质温度** — 每一个界面都要让人联想到椴木板的质地、榫卯卡合的微响
- **未来理性** — 毕竟核心产品是无人机，不是纯手工作坊
- **童心未泯** — 用户是 6–15 岁孩子，避免过度「高端冷静」的设计语言

### 1.2 一句话设计宣言

> 「像 MUJI 一样克制，像 Apple 一样精确，像 LEGO 一样可亲。」

### 1.3 要避免的设计陷阱

- ❌ 花里胡哨的渐变彩色（容易变成 K12 教培机构那种廉价感）
- ❌ 大量卡通吉祥物（显得幼稚，无法赢得老师与家长信任）
- ❌ 过度拟物化的木纹贴图（做不好就土）
- ❌ 过度 3D 特效（加载慢、手机掉帧）

---

## 2. 参考标杆（Benchmarks）

Claude Code 在做视觉决策时，优先参考以下产品/网站，**不要参考国内教培机构的网站**（同质化严重）：

| 维度 | 推荐参考 | 参考点 |
|------|----------|--------|
| 整体排版 | Linear.app | 严格的栅格、呼吸感、克制的色板 |
| 木质材料呈现 | Teenage Engineering 官网 | 木件的静物摄影、去背白底 |
| 教育产品 | duolingo.com | 游戏化进度条、即时反馈的文案 |
| 3D 展示 | Apple AirPods Max 页面 | 3D 产品旋转、滚动触发动效 |
| 儿童产品 | LEGO.com | 产品图清晰，UI 不抢戏 |
| 学术/奖项 | If Design Award 官网 | 获奖展示方式、证书的利用 |
| 设计灵感聚合 | Mobbin, Godly.website | 当代 Web 组件趋势 |
| 日式克制 | MUJI labo, SSENSE | 留白、字距、极简色板 |

---

## 3. 设计 Token（Design Tokens）

### 3.1 色板

```css
/* tokens/colors.css */
:root {
  /* 主色：榫卯木 */
  --color-wood-50:  #FBF7F1;   /* 大面积背景 */
  --color-wood-100: #F4ECE0;   /* 卡片背景 */
  --color-wood-200: #E6D6BE;   /* 边框、分隔线 */
  --color-wood-300: #D4BC99;   /* 次级按钮、hover */
  --color-wood-400: #BC9A6F;   /* 品牌色·浅 */
  --color-wood-500: #A8814F;   /* 品牌色·核心 */  /* ← 主色调 */
  --color-wood-600: #8A6638;   /* 品牌色·深 */
  --color-wood-700: #6B4E2A;   /* 文字·辅助 */
  --color-wood-800: #4A3620;   /* 文字·主 */
  --color-wood-900: #2B1F14;   /* 文字·最强 */
  
  /* 功能色（克制，仅用于状态反馈） */
  --color-success: #3B8B5C;    /* 绿：可飞行 */
  --color-warning: #D4993A;    /* 黄：可试飞 */
  --color-danger:  #C24B4B;    /* 红：不可飞 */
  --color-info:    #3A6FA3;    /* 蓝：提示 */
  
  /* 中性 */
  --color-white:   #FFFFFF;
  --color-gray-50: #FAFAFA;
  --color-gray-100:#F0F0F0;
  --color-gray-200:#DDDDDD;
  --color-gray-500:#888888;
  --color-gray-900:#1A1A1A;
}
```

**使用原则**：
- 大面积背景用 `wood-50` 或 `white`，**不要用深色**（儿童产品深色背景阅读疲劳）。
- 品牌色 `wood-500` 只用于关键 CTA 和 logo，**每屏出现面积不超过 5%**。
- 功能色只用于状态反馈，不能用作装饰。
- 纯黑（#000）几乎不用，文字最深用 `wood-900`。

### 3.2 字体

```css
:root {
  /* 西文 */
  --font-sans: 'Inter', 'SF Pro Display', system-ui, sans-serif;
  --font-display: 'Instrument Serif', 'Noto Serif', serif; /* hero 标题 */
  --font-mono: 'JetBrains Mono', 'SF Mono', monospace;
  
  /* 中文 */
  --font-sans-cn: 'MiSans', 'HarmonyOS Sans', 'PingFang SC', system-ui, sans-serif;
  --font-display-cn: 'Source Han Serif', 'Noto Serif SC', serif;
}
```

**推荐 MiSans**（小米开源、免费商用、覆盖全字重、CDN 可达），兜底 HarmonyOS Sans、PingFang SC。

### 3.3 字号

采用 **Perfect Fourth (1.333)** 模块化尺度：

| Token | px | 用途 |
|-------|----:|------|
| `--text-xs` | 12 | 辅助信息、标签 |
| `--text-sm` | 14 | 正文·次级 |
| `--text-base` | 16 | 正文·默认 |
| `--text-lg` | 20 | 正文·强调 |
| `--text-xl` | 26 | 小标题 |
| `--text-2xl` | 34 | 页面标题 |
| `--text-3xl` | 44 | 区块标题 |
| `--text-4xl` | 60 | Hero 标题 |
| `--text-5xl` | 80 | 数字强调（如 500+ 学员） |

### 3.4 间距

基于 **4px 网格**：

```css
--space-1: 4px;   --space-2: 8px;   --space-3: 12px;
--space-4: 16px;  --space-5: 24px;  --space-6: 32px;
--space-7: 48px;  --space-8: 64px;  --space-9: 96px;
--space-10: 128px;
```

### 3.5 圆角

```css
--radius-sm: 6px;   /* 标签、输入框 */
--radius-md: 12px;  /* 卡片、按钮 */
--radius-lg: 20px;  /* 大卡片、模态框 */
--radius-xl: 32px;  /* 英雄区块 */
--radius-full: 9999px;
```

### 3.6 阴影（克制！）

```css
--shadow-sm: 0 1px 2px rgba(43, 31, 20, 0.04);
--shadow-md: 0 4px 12px rgba(43, 31, 20, 0.06);
--shadow-lg: 0 12px 32px rgba(43, 31, 20, 0.08);
--shadow-focus: 0 0 0 3px rgba(168, 129, 79, 0.3); /* 焦点环 */
```

**不使用**默认那种 Material Design 式的浮起阴影。阴影是用来分层，不是用来炫技的。

### 3.7 动效曲线

```css
--ease-out-expo: cubic-bezier(0.19, 1, 0.22, 1);
--ease-out-smooth: cubic-bezier(0.33, 1, 0.68, 1);

--duration-fast: 150ms;
--duration-base: 250ms;
--duration-slow: 400ms;
--duration-page: 600ms;
```

---

## 4. 组件库规格

### 4.1 技术选型

- **方案**：基于 **shadcn/ui**（Radix 无头组件 + 自定义样式）
- **样式**：Tailwind CSS v4 + CSS variables（token 在 `:root`）
- **图标**：Lucide React（或 Phosphor）
- **动效**：Framer Motion
- **3D**：react-three-fiber + drei

### 4.2 核心组件清单

每个组件要有：variants、sizes、states、disabled、loading 五个维度。

| 组件 | 用途 |
|------|------|
| `<Button>` | 主/次/幽灵三种，sm/md/lg 三档 |
| `<IconButton>` | 纯图标按钮 |
| `<Input>` | 表单输入 |
| `<Select>` | 下拉选择 |
| `<Tabs>` | 标签页（零件库用） |
| `<Card>` | 卡片容器 |
| `<Modal>` | 模态框 |
| `<Drawer>` | 侧边抽屉 |
| `<Toast>` | 轻提示 |
| `<Tooltip>` | 气泡提示 |
| `<Progress>` | 进度条（课程进度、搭建步骤） |
| `<Badge>` | 徽章（草稿/精选/已完成） |
| `<Avatar>` | 头像 |
| `<Skeleton>` | 骨架屏 |
| `<PartCard>` | 零件卡片（业务组件） |
| `<StepIndicator>` | 搭建步骤条（业务组件） |
| `<SafetyMeter>` | 飞行稳定度仪表盘（业务组件） |

### 4.3 特别说明：`<StepIndicator>`

搭建流程的核心组件，独立强调：

```tsx
<StepIndicator
  steps={[
    { id: 'hub', label: '主板', icon: 'Hexagon' },
    { id: 'arm', label: '机臂', icon: 'Spokes' },
    { id: 'motor', label: '电机', icon: 'Fan' },
    { id: 'guard', label: '保护罩', icon: 'Shield' },
    { id: 'deco', label: '衔接件', icon: 'Link' },
    { id: 'review', label: '检查', icon: 'CheckCircle' },
  ]}
  current={2}
  completed={[0, 1]}
  locked={[3, 4, 5]}
/>
```

视觉要求：
- 完成的步骤：实心木色圆点 + 连线
- 当前步骤：环形进度动画（木色 outline + 填充动画）
- 未解锁：灰色虚线圆 + 小锁图标
- 步骤之间的连线：完成部分木色实线，未完成部分灰色虚线

---

## 5. 页面级设计规范

### 5.1 首页（Landing）

参考当前截图做以下升级：

- **Hero 区**：
  - 左侧：大号 Instrument Serif 标题「让孩子亲手设计、搭建、飞起来」+ 副标 + CTA
  - 右侧：木质无人机 3D 模型（react-three-fiber，鼠标跟随缓慢旋转），**不要**用静态 PNG
  - 背景：木色 50 过渡到白色的细腻渐变
- **信任带**：获奖 logos（Red Dot + iF）+ 合作学校 logos（有了之后加）
- **特性区**：4 格，每格一个核心能力（榫卯结构 / AR 教程 / 3D 设计 / 真实飞行）
- **数据区**：500+ 学员 / 50+ 课程 / 98% 满意度 — **这些数字在未达成前写"已服务 N 所学校"这种真实数字**，不要虚夸
- **教师案例区**：未来填充真实学校案例
- **底部 CTA**：学校合作咨询表单

### 5.2 学习中心

当前截图的布局基本可用，优化点：
- 左侧章节列表：展开的章节用**木色边框**而非填充，当前课时用**填充**
- 中央视频区：去掉"视频加载中..."占位符，做一个骨架屏
- 图文内容：用 Notion 风格的富文本渲染，不要密密麻麻堆文字
- 侧边栏：**保留完成课时、总学习时长、学习天数，但用条形图替代纯数字**

### 5.3 设计工作台

这是本季度重点重构页面，完整规格见 [`02-guided-build-flow.md`](02-guided-build-flow.md) 第 5 节。

特别注意：
- 整个画布用**极浅的点阵网格**而非现在的粗线条网格
- 3D 模型用**物理正确的材质**（MeshPhysicalMaterial，启用 clearcoat 让木头有微微光泽）
- 环境光用 HDR `studio_small_03` 或类似室内摄影棚 HDR
- 不要任何 skybox（不沉浸，反而分心）

### 5.4 作品展示

当前卡片网格布局基本可用，优化点：
- 卡片 hover 时**缩放 1.02 + 阴影加深**，不要翻转或其他花哨效果
- 卡片标题下的元信息（作者·日期）字重更轻（400）、颜色更淡（`wood-600`）
- 点赞数和精选标签放卡片底部，不要挤在一起
- 筛选器「全部 / 我的 / 精选」做成**下划线 tab**，当前的按钮 style 太重
- 排序「最新 / 最热」做成下拉选择器

---

## 6. 交互规范

### 6.1 反馈原则

- 任何 > 250ms 的操作要有**loading 态**（骨架屏或旋转）
- 任何操作要有**成功/失败反馈**，最好在 1 秒内消失（toast）
- 小朋友的错误操作要用**温和的拟人文案**：
  - ❌「操作失败」
  - ✅「哎呀，这里放不下，再试试其他地方？」

### 6.2 动效原则

- 页面级转场：使用 `--ease-out-expo` + 400ms
- 元素级（按钮 hover、卡片缩放）：使用 `--ease-out-smooth` + 150ms
- 成就类（完成一步、发布作品）：可以用**更长、更戏剧化**的动效（500–800ms），配合微音效
- 所有动效尊重 `prefers-reduced-motion`

### 6.3 无障碍

- 所有交互元素键盘可达（Tab 顺序合理）
- 颜色对比度 WCAG AA（文字 >= 4.5:1，大字 >= 3:1）
- 所有图标按钮有 `aria-label`
- 表单错误有 `aria-describedby` 关联错误信息

---

## 7. 插画与图片

### 7.1 风格

- **木质静物摄影**：真实拍摄的木质无人机白底去背图，用于产品展示
- **线性插图**：用于教学内容中的原理图（榫卯结构、升力原理）。推荐风格参考 Undraw 但线条更细、更精致
- **不使用**：3D 卡通人物、emoji 风格插画、纸片风格扁平插图

### 7.2 课程插图

每课时配 1–2 张原理图。初期可由小城手绘 → AI 矢量化，后期可委外。

### 7.3 图标

- **系统图标**：Lucide React（线性、可变粗细）
- **步骤图标**：可考虑自定义 SVG，在木色基础上加一点中国传统纹样（但不能抢眼）

---

## 8. 实施路线

### 8.1 Phase 1（先跑通）
1. 建立 `packages/ui` 共享组件库
2. 迁移 Tailwind 到 CSS variables token 方案
3. 重做按钮、卡片、Tabs、输入框这 4 个基础组件
4. 替换字体到 MiSans

### 8.2 Phase 2（界面升级）
1. 首页 Hero 区 3D 化
2. 学习中心视觉微调
3. 作品展示卡片 hover 优化

### 8.3 Phase 3（搭建重构同步）
1. 配合 `02-guided-build-flow.md` 重构设计工作台
2. 新增 `<StepIndicator>`、`<SafetyMeter>`、`<PartCard>` 业务组件

---

## 9. 给 Claude Code 的执行清单

1. 第一步：创建 `packages/ui` 包，建立 tokens.css 和基础组件。
2. 不要一次性改所有页面。先从 Button / Card / Input 三个原子开始，让整个 App 都换过来，再处理页面级。
3. 改动可视化：**每个组件改动前，提供 before/after 截图**放在 PR 里。
4. 所有新组件必须有 Storybook 故事（或至少一个最小演示页）。
5. 不要引入 MUI、Ant Design、Chakra 这种整套 UI 框架。我们要自己的设计语言。
