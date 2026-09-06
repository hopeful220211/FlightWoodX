// One safe transport view for registration, login, session reload and profile edits.
// Compatibility fields (username/profile) accompany the shared User fields.
function toAuthUser(user) {
  const profile = user.profile || {}
  return {
    id: String(user._id),
    username: user.username,
    nickname: profile.displayName || user.username,
    email: user.email,
    role: user.role,
    profile: {
      displayName: profile.displayName,
      avatar: profile.avatar,
      school: profile.school,
      grade: profile.grade,
      studentId: profile.studentId,
    },
    avatarUrl: profile.avatar,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin,
  }
}

function usernameError(username) {
  return typeof username !== 'string' || username.trim().length < 3 || username.trim().length > 40
    ? '用户名应为3–40个字符' : null
}

function passwordError(password) {
  if (typeof password !== 'string' || password.length < 6) return '密码至少6个字符'
  // bcrypt only uses the first 72 bytes; reject new passwords that would be silently truncated.
  if (Buffer.byteLength(password, 'utf8') > 72) return '密码过长，请使用不超过72字节的密码'
  return null
}

function profileUpdates(body) {
  const updates = {}
  if (body.username !== undefined) {
    const error = usernameError(body.username)
    if (error) return { error }
    updates.username = body.username.trim()
  }
  if (body.profile !== undefined) {
    if (!body.profile || typeof body.profile !== 'object' || Array.isArray(body.profile)) {
      return { error: '个人资料格式无效' }
    }
    for (const [field, limit] of Object.entries({ displayName: 40, avatar: 2048, school: 100, grade: 40, studentId: 80 })) {
      const value = body.profile[field]
      if (value === undefined) continue
      if (typeof value !== 'string' || value.trim().length > limit) return { error: '个人资料字段格式无效或过长' }
      updates[`profile.${field}`] = value.trim()
    }
  }
  if (Object.keys(updates).length === 0) return { error: '没有可更新的字段' }
  return { updates }
}

function accountWriteError(error) {
  if (error && error.code === 11000) {
    return error.keyPattern && error.keyPattern.email ? '邮箱已被注册' : '用户名已被占用'
  }
  if (error && (error.name === 'ValidationError' || error.name === 'CastError')) return '账号资料格式无效'
  return null
}

module.exports = { toAuthUser, usernameError, passwordError, profileUpdates, accountWriteError }
