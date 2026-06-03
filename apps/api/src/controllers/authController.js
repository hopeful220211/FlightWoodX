const User = require('../models/User')
const jwt = require('jsonwebtoken')

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
