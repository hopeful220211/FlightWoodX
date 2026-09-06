const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

// 定义用户数据结构
const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['student', 'teacher', 'parent', 'admin'],
    default: 'student'
  },
  profile: {
    displayName: String,
    avatar: String,
    school: { type: String, maxlength: 100, trim: true },
    grade: String,
    studentId: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  },
  // 每次改密递增；JWT 带签发时版本，旧版本立即失效。
  tokenVersion: {
    type: Number,
    default: 0,
    min: 0,
    select: false
  },
  // ===== 成就统计（需求二）=====
  // 时长以秒累计（前端按 seconds 上报），/me/stats 返回时换算成分钟
  studySeconds: {
    type: Number,
    default: 0
  },
  designSeconds: {
    type: Number,
    default: 0
  },
  // 已完成课时 id 列表（去重），lessonsCompleted = 长度
  completedLessons: {
    type: [String],
    default: []
  },
  // 仿真试飞次数（可选）
  flightCount: {
    type: Number,
    default: 0
  }
})

// 注册前加密密码
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next()
  }

  try {
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// 验证密码的方法
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password)
}

module.exports = mongoose.model('User', UserSchema)
