const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
require('dotenv').config()

const app = express()

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
// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'FlightWoodX Backend is running!',
    timestamp: new Date().toISOString()
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

// ===== 连接数据库 =====
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
      console.log('Connected to MongoDB')
    })
    .catch((error) => {
      console.error('MongoDB connection error:', error)
    })
} else {
  console.warn('MONGODB_URI not set — skipping database connection')
}

// ===== 启动服务器 =====
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/api/health`)
})

// ===== 错误处理 =====
app.use((err, req, res, next) => {
  console.error('Error:', err)
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  })
})
