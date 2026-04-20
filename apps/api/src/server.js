const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
require('dotenv').config()

const app = express()

// ===== 中间件配置 =====
app.use(cors())                    // 允许前端跨域访问
app.use(express.json())            // 解析 JSON 请求体
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
app.use('/api/auth', authRoutes)

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
    message: err.message
  })
})
