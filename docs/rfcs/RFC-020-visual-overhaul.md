# RFC-020 · 全站视觉整改（全局基座 + 我负责的页面）

> 来源：`全站视觉整改-给工程师助理-全局基座+其余页面.md`（参考 Awwwards 获奖站 Voltpile 的"张力方法论"）。
> 负责人：工程师助理（本人）。模块（社区/赛事/零件库）由 1/2/3 号各自改，模块外 + 全局基座归我。
> 分支：`feat/visual-base`（基座，先落）→ 后续 `feat/visual-pages`（页面）。push 交 5 号整合，不自己合。

## 1. 目标与红线

**目标**：系统性解决全站"没张力"四通病——字号层级太平 / 留白不够狠 / 对比度不够 / 产品图只是平铺。手段=引入一套"张力令牌 + 共享组件",全站统一套用。

**红线（验收时逐条自查）**：
- ✅ 不改整体色调——**保留浅色 sky-blue 基调**,只搬 Voltpile 的方法论(字号/留白/对比/点睛色/圆角/布局),**不搬深绿配色**。
- ✅ 点睛色纪律:全站 80% 低饱和背景蓝+浅色,高饱和点睛蓝面积 **<5%**,只用于按钮/编号/关键数字/关键词。忌到处蓝渐变。
- ✅ **不动 `@fwx/shared` 数据契约**——基座是样式/组件层,不是数据契约。
- ✅ 对比度 ≥ WCAG AA(正文 4.5:1、大标题 3:1)。
- ✅ 后台只补视觉,**不动任何功能/数据/接口**。
- ✅ 成长页不和"成长工程师"撞文件(本人即成长工程师,自行统筹)。

## 2. 顺序（硬约束）

```
Phase 1  ①全局基座(本 RFC 重点) ──push──▶ 5号合主干 ──▶ 通知 1/2/3 rebase
Phase 2  ②首页  ③登录/注册  ④后台  ⑤成长页  （基座落地后并行，各拆子 agent）
Phase 3  ⑥全站一致性巡检（只动我的页面+基座；模块内问题回报 1/2/3，不替改）
```

## 3. Phase 1 · 全局设计基座（先落，三处改动）

### 3.1 字体（index.html + tailwind.config.js）
- index.html 增引 **Space Grotesk**(400/500/600,Google Fonts)。中文正文沿用现有 **MiSans/PingFang**。保留钉钉进步体不动。
- tailwind `fontFamily` 增 `grotesk: ['"Space Grotesk"', ...]`;`display` 维持现有。字重只暴露 400/500/600(靠字号不靠粗体)。

### 3.2 设计令牌（扩展现有，不替换）
**index.css `:root` 新增流体字号 + 间距 CSS 变量**（移动端有下限不塌、桌面跟视口放大）：
```
--fs-hero: max(56px,7vw); --fs-h2: max(40px,4.5vw); --fs-h3: max(28px,3vw);
--fs-title-sm: 24px; --fs-body: 18px; --fs-label: 13px; --fs-stat: 48px;
--pad-section: 6vw; --gap-block: 100px;
```
**tailwind.config.js 扩展（保留所有现有 sky/wood/ink/paper/accent 不动）**：
- `colors.accent.spark = '#1E9BFF'`（唯一高饱和点睛蓝,<5% 面积；区别于现有低饱和 accent.sky #4AA3F0）。
- `colors.surface = { white:'#F5F9FF', ice:'#EAF2FB' }`（浅色区块交替,不上深色）。
- `borderRadius` 增 `pill:'40px'`、`card:'20px'`、`tag:'10px'`（现有 2xl=16px 等保留）。
- `fontSize` 增映射到上面变量的 `hero/h2/h3/title-sm/body/label/stat`(便于 `text-hero` 直接用)。

> ⚠️ 兼容:全部为**新增 key**,不改任何现有 token 值 → 1/2/3 现有类名零破坏,rebase 后才"可选"用新令牌。

### 3.3 共享组件（落 `apps/web/src/components/common/`，1/2/3 全员复用）
| 组件 | API（props 草案） | 用途 |
|------|------|------|
| `PillButton` | `{children, onClick?, href?, variant?:'primary'\|'ghost', arrow?:boolean, type?}` 全圆角胶囊 r-pill,min-h 56–64/min-w 180,内嵌 56px 圆形箭头(底色 accent.spark) | 主行动/下一步/提交 |
| `SectionLabel` | `{children, vertical?:boolean}` 大写小标签 fs-label 字距 1.2px | 章节名/分类 |
| `BigStat` | `{value, label, unit?}` ≥48px 大号数据(font-grotesk)+小字说明 | 学员数/获奖/课时/分数 |
| `ExplodedHotspots` | `{image, hotspots:{n,x,y,title,desc}[], moreHref?}` 爆炸图+编号热点(点睛蓝圆)+左侧文字对应 | 产品分解讲解 |
| `HoverReveal` | `{image, alt}` 默认模糊/略暗→悬停揭示清晰 | 航拍/作品图 |
| `TechLabel` | `{items:{k,v}[]}` 等宽字体技术参数标注 | `飞行高度120m/续航25min` |

组件实现遵循:现有 `cn` 工具、TS strict、无 `any`、复用现有 Button 不重复造轮子的地方就复用、`prefers-reduced-motion` 友好。

### Phase 1 验收
- `pnpm --filter web lint && pnpm --filter web typecheck` 全绿。
- 建一个临时 `/__kitchen-sink`(或 Storybook 式 demo 页,仅本分支自查用,不进最终)展示 6 组件 + 令牌,截图自查;合并前删除或保留为内部 demo(交 5 号定)。
- 不破坏现有任何页面(新增为主,token 为纯新增 key)。
- 列出动过的"共享/全局"文件:`index.html`、`src/index.css`、`tailwind.config.js`、`src/components/common/*`（新增 6 文件）。

## 4. Phase 2 · 页面（基座落地后）

- **②首页**:巨型品牌字背景层 + 3D 无人机悬浮图;卖点标签条(SectionLabel);深浅区块交替(surface.white/ice)+ 巨字宣言(fs-h2);三张数据卡(BigStat);可选 HoverReveal;导航/按钮胶囊化。
- **③登录/注册**:窄容器(max-w 480–560)居中 + Hero 大标题 + 狠留白;PillButton 提交;点睛蓝只在提交/关键链接。(注:登录页色调上轮已转 sky,此处只加张力,不回炉。)
- **④后台**:套字号层级/留白/r-card/胶囊化;表格行距对齐收拾;统计卡用 BigStat。**零功能改动**。
- **⑤成长页**:等级大卡用 fs-hero/BigStat(大 Lv+进度数字)、徽章墙留白、权益网格对齐、胶囊按钮。与成长功能重做(RFC-011-E4)合并推进。

### Phase 2 子 agent 拆分（基座 API 冻结后并行）
A 首页 ｜ B 登录注册 ｜ C 后台 ｜ D 成长页。每个 agent 凭"基座令牌+组件 API"独立改各自页面文件,不互撞。

## 5. 缺图清单（交军师生成，本人只列"位置/尺寸/内容"）

> Phase 1 基座**不需要图**(纯令牌/组件)→ 不阻塞。下列为 Phase 2 首页所需,届时提交军师:
- Hero 3D 无人机悬浮图(透明 PNG,长边 ≥2000px,带轻微发光/倒影余地)。
- 数据卡配图 ×3(入门/进阶/竞赛集训,无人机场景,4:3,≥1200px)。
- 航拍揭示图(HoverReveal 用,16:9,≥1600px)。
- 产品爆炸/分解图(ExplodedHotspots 用,透明 PNG,正面分解,≥2000px)。

## 6. 边界 / 不做

- 不动 1/2/3 的模块内页面实现(发现不一致→回报,不替改)。
- 不动 `@fwx/shared`、后端数据、后台功能。
- 不引入付费 SaaS;字体走 Google Fonts/本地。
- 全程 feature 分支,push 交 5 号,不自己合并主干。
