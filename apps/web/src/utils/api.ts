// API 基础配置
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

// 类型定义
export interface RegisterData {
  username: string
  email: string
  password: string
}

export interface LoginData {
  email: string
  password: string
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface UserResponse {
  id: string
  username: string
  nickname: string
  avatarUrl?: string
  createdAt: string
}

export interface AuthResponse {
  user: UserResponse
  token: string
}

// ============= 工具函数 =============

/**
 * 获取保存的 token
 */
function getToken(): string | null {
  const authStorage = localStorage.getItem('auth-storage')
  if (!authStorage) return null

  try {
    const parsed = JSON.parse(authStorage)
    return parsed.state?.token || null
  } catch {
    return null
  }
}

/**
 * 通用的 fetch 封装
 */
async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  // 如果有 token，添加到请求头
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: result.error || result.message || '请求失败',
      }
    }

    // 兼容不同的后端响应格式
    // 1. { data: [...] }
    // 2. { users: [...] }
    // 3. 直接返回数组 [...]
    let data = result.data || result.users || result

    return {
      success: true,
      data: data,
      message: result.message,
    }
  } catch (error) {
    console.error('API fetch error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '网络请求失败',
    }
  }
}

// ============= 认证相关 API =============

/**
 * 用户注册
 */
export async function register(data: RegisterData): Promise<ApiResponse<AuthResponse>> {
  return apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * 用户登录
 */
export async function login(data: LoginData): Promise<ApiResponse<AuthResponse>> {
  return apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * 获取当前用户信息
 */
export async function getMe(): Promise<ApiResponse<UserResponse>> {
  return apiFetch<UserResponse>('/auth/me')
}

/**
 * 退出登录（如果后端需要处理）
 */
export async function logoutApi(): Promise<ApiResponse> {
  return apiFetch('/auth/logout', {
    method: 'POST',
  })
}

// ============= 用户相关 API =============

/**
 * 获取所有用户（管理员）
 */
export async function getAllUsers(): Promise<ApiResponse<UserResponse[]>> {
  return apiFetch<UserResponse[]>('/auth/users')
}

/**
 * 更新用户信息
 */
export async function updateUser(
  userId: string,
  data: Partial<{ nickname: string; avatarUrl: string }>
): Promise<ApiResponse<UserResponse>> {
  return apiFetch<UserResponse>(`/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * 修改密码
 */
export async function changePassword(data: {
  oldPassword: string
  newPassword: string
}): Promise<ApiResponse> {
  return apiFetch('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// ============= 设计作品相关 API =============

export interface Design {
  id: string
  name: string
  userId: string
  parts: any[]
  thumbnailUrl?: string
  createdAt: string
  updatedAt: string
}

/**
 * 获取用户的所有设计
 */
export async function getUserDesigns(): Promise<ApiResponse<Design[]>> {
  return apiFetch<Design[]>('/designs')
}

/**
 * 获取单个设计详情
 */
export async function getDesign(designId: string): Promise<ApiResponse<Design>> {
  return apiFetch<Design>(`/designs/${designId}`)
}

/**
 * 创建新设计
 */
export async function createDesign(data: {
  name: string
  parts: any[]
  thumbnailUrl?: string
}): Promise<ApiResponse<Design>> {
  return apiFetch<Design>('/designs', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * 更新设计
 */
export async function updateDesign(
  designId: string,
  data: Partial<{ name: string; parts: any[]; thumbnailUrl: string }>
): Promise<ApiResponse<Design>> {
  return apiFetch<Design>(`/designs/${designId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * 删除设计
 */
export async function deleteDesign(designId: string): Promise<ApiResponse> {
  return apiFetch(`/designs/${designId}`, {
    method: 'DELETE',
  })
}

/**
 * 获取公开的设计作品（作品展示页）
 */
export async function getPublicDesigns(): Promise<ApiResponse<Design[]>> {
  return apiFetch<Design[]>('/designs/public')
}

// ============= 文件上传相关 API =============

/**
 * 上传文件（头像、设计缩略图等）
 */
export async function uploadFile(file: File): Promise<ApiResponse<{ url: string }>> {
  const token = getToken()
  const formData = new FormData()
  formData.append('file', file)

  try {
    const response = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: result.error || '上传失败',
      }
    }

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '上传失败',
    }
  }
}

// ============= 学习课程相关 API =============

export interface Course {
  id: string
  title: string
  description: string
  thumbnailUrl: string
  duration: string
  difficulty: string
}

/**
 * 获取所有课程
 */
export async function getCourses(): Promise<ApiResponse<Course[]>> {
  return apiFetch<Course[]>('/courses')
}

/**
 * 获取课程详情
 */
export async function getCourse(courseId: string): Promise<ApiResponse<Course>> {
  return apiFetch<Course>(`/courses/${courseId}`)
}
