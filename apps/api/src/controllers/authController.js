const User = require('../models/User')
const jwt = require('jsonwebtoken')

// 与注册逻辑保持一致的密码最小长度（与 User 模型 schema minlength 一致）
const MIN_PASSWORD_LENGTH = 6

// 生成 JWT Token
function generateToken(userId) {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
}

// 注册
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body

    if (!username || !email || !password) {
      return res.status(400).json({
        error: '请提供用户名、邮箱和密码'
      })
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: '密码至少6个字符'
      })
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    })

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ error: '邮箱已被注册' })
      }
      if (existingUser.username === username) {
        return res.status(400).json({ error: '用户名已被占用' })
      }
    }

    const user = new User({
      username,
      email,
      password
    })

    await user.save()

    const token = generateToken(user._id)

    res.status(201).json({
      message: '注册成功！',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    })

  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({
      error: '注册失败，请稍后再试',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// 登录
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        error: '请提供邮箱和密码'
      })
    }

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({
        error: '邮箱或密码错误'
      })
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({
        error: '邮箱或密码错误'
      })
    }

    user.lastLogin = new Date()
    await user.save()

    const token = generateToken(user._id)

    res.json({
      message: '登录成功！',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({
      error: '登录失败，请稍后再试',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// 获取当前用户信息
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password')

    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }

    res.json({ user })

  } catch (error) {
    console.error('GetMe error:', error)
    res.status(500).json({
      error: '获取用户信息失败',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// 更新个人资料
exports.updateProfile = async (req, res) => {
  try {
    const allowedFields = ['username', 'profile']
    const updates = {}

    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key]
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: '没有可更新的字段' })
    }

    const user = await User.findByIdAndUpdate(req.userId, updates, {
      new: true,
      runValidators: true,
    }).select('-password')

    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }

    res.json({ user })
  } catch (error) {
    console.error('UpdateProfile error:', error)
    res.status(500).json({
      error: '更新个人资料失败',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    })
  }
}

// 修改密码（需要登录）
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body

    // 必须是非空字符串：否则数字 newPassword 无 .length、与字符串严格比较不等，
    // Mongoose 又会把它强转回字符串，导致能把密码"改"成原密码；非字符串 oldPassword
    // 还会让 bcrypt 抛错返回 500。统一在此拦成 400。
    if (!oldPassword || !newPassword
      || typeof oldPassword !== 'string' || typeof newPassword !== 'string') {
      return res.status(400).json({
        error: '请提供原密码和新密码'
      })
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        error: `密码至少${MIN_PASSWORD_LENGTH}个字符`
      })
    }

    if (newPassword === oldPassword) {
      return res.status(400).json({
        error: '新密码不能与原密码相同'
      })
    }

    // 默认查询会带上 password 字段，用于校验原密码
    const user = await User.findById(req.userId)
    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }

    const isMatch = await user.comparePassword(oldPassword)
    if (!isMatch) {
      return res.status(401).json({
        error: '原密码错误'
      })
    }

    // 写入明文新密码，由 User 模型的 pre('save') 钩子统一用 bcrypt 加密
    // （salt rounds 与注册完全一致，避免在此重复加密导致双重哈希）
    user.password = newPassword
    await user.save()

    // 响应中绝不包含任何 password 字段
    res.json({
      message: '密码修改成功！'
    })

  } catch (error) {
    console.error('ChangePassword error:', error)
    res.status(500).json({
      error: '修改密码失败，请稍后再试',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// 获取所有用户（管理员功能）
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })

    res.json({
      total: users.length,
      users
    })

  } catch (error) {
    console.error('GetAllUsers error:', error)
    res.status(500).json({
      error: '获取用户列表失败',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}
