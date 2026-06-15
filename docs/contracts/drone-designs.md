# 接口契约 — 设计持久化（drone-designs）

> RFC-013 交付物 · 状态：**草案，待统筹窗对齐后交前端对接**
> 供前端 `designStore` 改造 + 登录回填使用。所有端点需 JWT（`Authorization: Bearer <token>`），按 `ownerId` 隔离，**游客模式不调用**。

## 1. 数据形态（后端返回的 DroneDesign）

```jsonc
{
  "id": "string",            // 服务端记录 id（Mongo _id 序列化）
  "ownerId": "string",
  "name": "string",
  "designData": { },          // ★前端 Design 完整快照：含 parts / buildMode /
                              //   currentStep / stepReached / safetyCheck / thumbnail(base64)
                              //   后端不解析，原样存取
  "localId": "string",        // 前端本地 id（design.id），幂等键
  "thumbnailUrl": "string?",  // 可选（本期缩略图走 designData.thumbnail 的 base64，此字段留作将来 GLB/对象存储）
  "weightG": 0,               // 取自 safetyCheck.totalWeightG，便于列表展示/排序
  "status": "draft|published|archived",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

## 2. 端点

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/api/drone-designs` | 列出当前用户全部设计（updatedAt 倒序） |
| GET | `/api/drone-designs/:id` | 取单条 |
| **PUT** | `/api/drone-designs` | **★主保存入口（幂等 upsert）** |
| PATCH | `/api/drone-designs/:id` | 按服务端 id 局部更新 |
| DELETE | `/api/drone-designs/:id` | 删除 |

### GET `/api/drone-designs`
→ `200 { "designs": DroneDesign[] }`

### GET `/api/drone-designs/:id`
→ `200 { "design": DroneDesign }` ｜ `404 { "error": "设计不存在" }`

### PUT `/api/drone-designs` ★前端保存设计就调这个
按 `(ownerId, localId)` **创建或更新**——同一 `localId` 多次调用只产生一条记录，天然抗重复、抗弱网重试。
```jsonc
// Request body
{
  "localId": "design-1718...",   // 必填，= 前端 design.id
  "name": "我的无人机",            // 必填
  "designData": { },              // 必填，整个前端 Design 对象
  "weightG": 0,                   // 可选
  "thumbnailUrl": "string",       // 可选
  "status": "draft"               // 可选
}
```
→ `200 { "design": DroneDesign }`

### PATCH `/api/drone-designs/:id`
Body 为以下字段子集：`name / designData / params / parts / weightG / status / glbUrl / thumbnailUrl`
→ `200 { "design" }` ｜ `404`

### DELETE `/api/drone-designs/:id`
→ `200 { "message": "已删除" }` ｜ `404`

## 3. 前端对接指引（给前端工程师）

1. **保存**：设计变更 → debounce（建议 2s）→ `PUT`，`localId = design.id`、`designData = 整个 Design 对象`。**不再需要** `useDesignSync` 里的 `sessionStorage` id-map（幂等键改用 `localId`，后端负责去重）。
2. **登录回填**（当前缺失的关键）：登录后 `GET /api/drone-designs` → 把每条的 `designData` 还原进 `designStore`（按 `localId` 对齐本地）。这是「下次登录直接读取」的核心。
3. **缩略图**：放进 `design.thumbnail`（base64），随 `designData` 一起存取，**不需要** `/upload`。
4. **游客模式**：`isGuest` 时完全不调用上述接口（设计仍只在本地）。
5. **存量迁移**：用户首次登录时，把本地 `designs` 逐个 `PUT` 上去（`localId` = 本地 id）即完成一次性迁移；本地副本保留兜底。

## 4. 待统筹窗确认
- 字段命名与响应包络（`{ design }` / `{ designs }`）是否 OK
- 列表是否需要「轻量化」：数据量大后，列表可改为不返回完整 `designData`、只回 `name + thumbnail + updatedAt`，详情再拉 `designData`（本期规模小，暂返回完整）
