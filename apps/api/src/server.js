const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
require('dotenv').config()

const app = express()

// 部署在 Nginx / SLB 反向代理之后：信任一层代理，
// 否则 express-rate-limit 会按代理 IP 限流，req.ip 也拿不到真实客户端 IP。
app.set('trust proxy', 1)

// ===== 中间件配置 =====
app.use(helmet())

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',')
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}))

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
})
app.use(limiter)

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: '请求过于频繁，请稍后再试' },
})

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ===== 路由 =====
// 健康检查：同时反映数据库连接状态，供 SLB / 容器探活用
app.get(['/api/health', '/healthz'], (req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting']
  const dbState = states[mongoose.connection.readyState] || 'unknown'
  const healthy = mongoose.connection.readyState === 1
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'OK' : 'DEGRADED',
    message: 'FlightWoodX Backend',
    db: dbState,
    timestamp: new Date().toISOString(),
  })
})

// 认证路由
const authRoutes = require('./routes/auth')
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/register', authLimiter)
app.use('/api/auth', authRoutes)

// 管理员路由
const adminRoutes = require('./routes/admin')
app.use('/api/admin', adminRoutes)

// 设计导出路由
const designRoutes = require('./routes/designs')
app.use('/api/designs', designRoutes)

// 项目路由（2.0 — 设计+程序的整合体）
const projectRoutes = require('./routes/projects')
app.use('/api/projects', projectRoutes)

// 社区路由（RFC-017 — 发布/列表/详情/点赞，社交原语走共享 Reaction 契约）
const communityRoutes = require('./routes/community')
app.use('/api/community', communityRoutes)

// 社区 P1（RFC-017 — 热门榜 / 评论+举报 / 收藏合集 / 关注作者 / 开源复用 fork）
// 同一 /api/community 基址下挂多路由器，路径在各自路由器内命名空间，互不遮蔽。
app.use('/api/community/trending', require('./routes/communityTrending')) // A 热门榜
app.use('/api/community', require('./routes/comments'))                    // B 评论
app.use('/api/community', require('./routes/reports'))                     // B 举报
app.use('/api/community/collections', require('./routes/collections'))     // C 收藏合集
app.use('/api/community', require('./routes/follows'))                     // D 关注/作者页/动态流
app.use('/api/community', require('./routes/forks'))                       // E 开源复用 fork

// 无人机设计路由（2.0 — 设计器产物持久化）
const droneDesignRoutes = require('./routes/droneDesigns')
app.use('/api/drone-designs', droneDesignRoutes)

// 积木程序路由（2.0 — Blockly XML + IR 持久化）
const programRoutes = require('./routes/programs')
app.use('/api/programs', programRoutes)

// 用户成就统计路由（需求二）
const meRoutes = require('./routes/me')
app.use('/api/me', meRoutes)

// 上传文件静态服务（disk 存储驱动用；生产走对象存储 + CDN）。
// 单独放开 CORP，允许前端跨源加载图片。
const { UPLOAD_DIR } = require('./lib/storage')
app.use('/uploads', express.static(UPLOAD_DIR, {
  setHeaders: (res) => res.set('Cross-Origin-Resource-Policy', 'cross-origin'),
}))

// ===== 404：未匹配任何路由，返回统一 JSON（而非默认 HTML）=====
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.originalUrl })
})

// ===== 错误处理（放在所有路由之后、监听之前）=====
app.use((err, req, res, next) => {
  console.error('Error:', err)
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  })
})

// ===== 连接数据库 =====
if (process.env.MONGODB_URI) {
  mongoose
    .connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })
    .then(() => {
      console.log('Connected to MongoDB')
    })
    .catch((error) => {
      console.error('MongoDB connection error:', error.message)
    })

  mongoose.connection.on('error', (error) => {
    console.error('MongoDB runtime error:', error.message)
  })
  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected — mongoose will attempt to reconnect')
  })
} else {
  console.warn('MONGODB_URI not set — skipping database connection')
}

// ===== 启动服务器 =====
const PORT = process.env.PORT || 3000
const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/api/health`)
})

// ===== 优雅关闭（容器 stop / pm2 reload 会发 SIGTERM）=====
function shutdown(signal) {
  console.log(`${signal} received — shutting down gracefully`)
  server.close(() => {
    mongoose.connection.close(false).then(() => {
      console.log('Closed out connections')
      process.exit(0)
    })
  })
  // 兜底：10s 内没关干净就强制退出
  setTimeout(() => {
    console.error('Could not close connections in time — forcing exit')
    process.exit(1)
  }, 10000).unref()
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
