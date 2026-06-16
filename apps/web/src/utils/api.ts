import type { CommandProgram } from '@fwx/shared'

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
export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  // Attach admin access key for /admin/* endpoints
  if (endpoint.startsWith('/admin')) {
    const adminKey = sessionStorage.getItem('adminAccessKey')
    if (adminKey) {
      headers['X-Admin-Access-Key'] = adminKey
    }
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    })

    const result = await response.json()

    if (!response.ok) {
      // Clear admin key on 401 for admin endpoints
      if (response.status === 401 && endpoint.startsWith('/admin')) {
        sessionStorage.removeItem('adminAccessKey')
      }
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
  return apiFetch<UserResponse[]>('/admin/users')
}

// ============= 管理后台 API =============

/**
 * Verify admin access key (pre-check for admin gate)
 */
export async function verifyAdminAccessKey(key: string): Promise<ApiResponse> {
  return apiFetch('/admin/verify-access-key', {
    method: 'POST',
    headers: { 'X-Admin-Access-Key': key },
  })
}

// ============= 设计导出 API =============

/**
 * Export design as CAD ZIP.
 * Returns a Blob for browser download.
 */
export async function exportDesignCad(
  designId: string,
  design: { name: string; parts: unknown[]; updatedAt: string; stats?: unknown; checkResults?: unknown },
  username: string,
): Promise<{ success: true; blob: Blob; fileName: string } | { success: false; error: string }> {
  const token = getToken()
  try {
    const response = await fetch(`${API_URL}/designs/${designId}/export-cad`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ design, username }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      return { success: false, error: (err as { error?: string }).error || '导出失败' }
    }

    const blob = await response.blob()
    const disposition = response.headers.get('Content-Disposition') || ''
    const fileNameMatch = disposition.match(/filename="?([^"]+)"?/)
    const fileName = fileNameMatch ? decodeURIComponent(fileNameMatch[1]) : `flightwoodx-export-${designId}.zip`

    return { success: true, blob, fileName }
  } catch (error) {
    return { success: false, error: '网络请求失败' }
  }
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

// ============= 项目 (2.0) 相关 API =============

export interface ProjectData {
  id: string
  ownerId: string
  name: string
  designId?: string
  programId?: string
  coverUrl?: string
  visibility: 'private' | 'public'
  createdAt: string
  updatedAt: string
}

/** 获取当前用户的所有项目 */
export async function getProjects(): Promise<ApiResponse<ProjectData[]>> {
  const res = await apiFetch<{ projects: ProjectData[] }>('/projects')
  // Backend returns { projects: [...] }
  if (res.success && res.data) {
    const projects = (res.data as unknown as { projects?: ProjectData[] }).projects ?? res.data
    return { ...res, data: projects as ProjectData[] }
  }
  return res as ApiResponse<ProjectData[]>
}

/** 获取单个项目 */
export async function getProject(projectId: string): Promise<ApiResponse<ProjectData>> {
  const res = await apiFetch<{ project: ProjectData }>(`/projects/${projectId}`)
  if (res.success && res.data) {
    const project = (res.data as unknown as { project?: ProjectData }).project ?? res.data
    return { ...res, data: project as ProjectData }
  }
  return res as ApiResponse<ProjectData>
}

/** 创建新项目 */
export async function createProject(data: {
  name: string
  designId?: string
  programId?: string
  visibility?: string
}): Promise<ApiResponse<ProjectData>> {
  const res = await apiFetch<{ project: ProjectData }>('/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (res.success && res.data) {
    const project = (res.data as unknown as { project?: ProjectData }).project ?? res.data
    return { ...res, data: project as ProjectData }
  }
  return res as ApiResponse<ProjectData>
}

/** 更新项目 */
export async function updateProject(
  projectId: string,
  data: Partial<{ name: string; designId: string; programId: string; coverUrl: string; visibility: string }>,
): Promise<ApiResponse<ProjectData>> {
  const res = await apiFetch<{ project: ProjectData }>(`/projects/${projectId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  // 后端返回 { project }，与 getProject/createProject 一致地解包，否则上层拿到的是包裹层而非项目本体
  if (res.success && res.data) {
    const project = (res.data as unknown as { project?: ProjectData }).project ?? res.data
    return { ...res, data: project as ProjectData }
  }
  return res as ApiResponse<ProjectData>
}

/**
 * 上传项目封面（当前阶段无人机定格图）。
 * 直接传图片二进制（canvas.toBlob 的 Blob 当 body），不用 FormData。
 */
export async function uploadProjectCover(
  projectId: string,
  blob: Blob,
): Promise<ApiResponse<{ coverUrl: string }>> {
  return apiFetch<{ coverUrl: string }>(`/projects/${projectId}/cover`, {
    method: 'POST',
    headers: { 'Content-Type': blob.type || 'image/webp' },
    body: blob,
  })
}

/** 删除项目 */
export async function deleteProject(projectId: string): Promise<ApiResponse> {
  return apiFetch(`/projects/${projectId}`, {
    method: 'DELETE',
  })
}

// ============= 我的成就统计 / 活动 API =============

export interface MeStats {
  projectCount: number
  studyMinutes: number
  designMinutes: number
  lessonsCompleted: number
  totalLessons: number
  flightCount: number
}

/** 我的成就统计（工作台顶部成就区） */
export async function getMyStats(): Promise<ApiResponse<MeStats>> {
  return apiFetch<MeStats>('/me/stats')
}

/** 上报学习/设计活跃时长（秒，后端累加；单次上限由后端限制为 3600） */
export async function postActivity(
  type: 'study' | 'design',
  seconds: number,
): Promise<ApiResponse<{ studyMinutes: number; designMinutes: number }>> {
  return apiFetch('/me/activity', {
    method: 'POST',
    body: JSON.stringify({ type, seconds }),
  })
}

/** 标记某课时完成（lessonId 去重累加，重复调不重复计） */
export async function completeLesson(
  lessonId: string,
): Promise<ApiResponse<{ lessonsCompleted: number }>> {
  return apiFetch('/me/lessons/complete', {
    method: 'POST',
    body: JSON.stringify({ lessonId }),
  })
}

/** 更新用户个人资料 */
export async function updateProfile(data: {
  username?: string
  profile?: { displayName?: string; avatar?: string; grade?: string }
}): Promise<ApiResponse> {
  return apiFetch('/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

// ============= 无人机设计 (DroneDesign) API =============

export interface DroneDesignData {
  id: string
  _id?: string
  ownerId: string
  name: string
  params: { hubType: string; layer: string; armCount: number; armLengthMm: number; guardStyle?: string }
  parts: unknown[]
  weightG: number
  status: string
  glbUrl?: string
  thumbnailUrl?: string
  localId?: string
  /** RFC-013 方案 B：前端 Design 完整快照（后端原样存取，用于跨设备还原） */
  designData?: unknown
  createdAt: string
  updatedAt: string
}

/** List current user's drone designs */
export async function getDroneDesigns(): Promise<ApiResponse<DroneDesignData[]>> {
  const res = await apiFetch<{ designs: DroneDesignData[] }>('/drone-designs')
  if (res.success && res.data) {
    const designs = (res.data as unknown as { designs?: DroneDesignData[] }).designs ?? res.data
    return { ...res, data: designs as DroneDesignData[] }
  }
  return res as ApiResponse<DroneDesignData[]>
}

/** Save (create) a drone design to backend */
export async function createDroneDesign(data: {
  name: string
  params?: DroneDesignData['params']
  parts?: unknown[]
  weightG?: number
  localId?: string
}): Promise<ApiResponse<DroneDesignData>> {
  const res = await apiFetch<{ design: DroneDesignData }>('/drone-designs', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (res.success && res.data) {
    const design = (res.data as unknown as { design?: DroneDesignData }).design ?? res.data
    return { ...res, data: design as DroneDesignData }
  }
  return res as ApiResponse<DroneDesignData>
}

/**
 * Idempotent upsert by localId（RFC-013 正路）——同一 localId 只对应一条记录，
 * 抗重复、抗弱网重试。存整份 designData 快照，支撑跨设备还原。
 */
export async function putDroneDesign(data: {
  localId: string
  name: string
  designData: unknown
  weightG?: number
  thumbnailUrl?: string
  status?: string
}): Promise<ApiResponse<DroneDesignData>> {
  const res = await apiFetch<{ design: DroneDesignData }>('/drone-designs', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  if (res.success && res.data) {
    const design = (res.data as unknown as { design?: DroneDesignData }).design ?? res.data
    return { ...res, data: design as DroneDesignData }
  }
  return res as ApiResponse<DroneDesignData>
}

/** Update a drone design */
export async function updateDroneDesign(
  designId: string,
  data: Partial<{ name: string; params: DroneDesignData['params']; parts: unknown[]; weightG: number; status: string }>,
): Promise<ApiResponse<DroneDesignData>> {
  return apiFetch<DroneDesignData>(`/drone-designs/${designId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/** Delete a drone design */
export async function deleteDroneDesign(designId: string): Promise<ApiResponse> {
  return apiFetch(`/drone-designs/${designId}`, { method: 'DELETE' })
}

// ============= 积木程序 (Program) API =============

export interface ProgramRecord {
  id: string
  _id?: string
  ownerId: string
  name: string
  blocklyXml: string
  commandProgram: CommandProgram
  createdAt: string
  updatedAt: string
}

/** 规整后端 { program } / { programs } 包裹，统一返回 id（兼容 _id）。 */
function normalizeProgram(p: ProgramRecord): ProgramRecord {
  return { ...p, id: p.id || (p as unknown as { _id: string })._id }
}

/** List current user's programs（按 updatedAt 倒序） */
export async function getPrograms(): Promise<ApiResponse<ProgramRecord[]>> {
  const res = await apiFetch<{ programs: ProgramRecord[] }>('/programs')
  if (res.success && res.data) {
    const programs = (res.data as unknown as { programs?: ProgramRecord[] }).programs ?? res.data
    return { ...res, data: (programs as ProgramRecord[]).map(normalizeProgram) }
  }
  return res as ApiResponse<ProgramRecord[]>
}

/** Get a single program by id */
export async function getProgram(programId: string): Promise<ApiResponse<ProgramRecord>> {
  const res = await apiFetch<{ program: ProgramRecord }>(`/programs/${programId}`)
  if (res.success && res.data) {
    const program = (res.data as unknown as { program?: ProgramRecord }).program ?? res.data
    return { ...res, data: normalizeProgram(program as ProgramRecord) }
  }
  return res as ApiResponse<ProgramRecord>
}

/** Create (save) a program to backend */
export async function createProgram(data: {
  name: string
  blocklyXml: string
  commandProgram: CommandProgram
}): Promise<ApiResponse<ProgramRecord>> {
  const res = await apiFetch<{ program: ProgramRecord }>('/programs', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (res.success && res.data) {
    const program = (res.data as unknown as { program?: ProgramRecord }).program ?? res.data
    return { ...res, data: normalizeProgram(program as ProgramRecord) }
  }
  return res as ApiResponse<ProgramRecord>
}

/** Update a program */
export async function updateProgram(
  programId: string,
  data: Partial<{ name: string; blocklyXml: string; commandProgram: CommandProgram }>,
): Promise<ApiResponse<ProgramRecord>> {
  const res = await apiFetch<{ program: ProgramRecord }>(`/programs/${programId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  if (res.success && res.data) {
    const program = (res.data as unknown as { program?: ProgramRecord }).program ?? res.data
    return { ...res, data: normalizeProgram(program as ProgramRecord) }
  }
  return res as ApiResponse<ProgramRecord>
}

/** Delete a program */
export async function deleteProgram(programId: string): Promise<ApiResponse> {
  return apiFetch(`/programs/${programId}`, { method: 'DELETE' })
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

// ===== 社区（RFC-017）=====
// 展示 DTO 在前端本地组合；社交原语契约来自 @fwx/shared，不在此重定义。

export interface CommunityAuthor {
  id: string
  username: string
  avatar?: string
}

export interface CommunityPostCard {
  id: string
  title: string
  description: string
  author: CommunityAuthor | null
  projectId: string
  coverUrl?: string
  forkFromId?: string
  likeCount: number
  likedByMe: boolean
  createdAt: string
}

export interface CommunityPostDetail {
  id: string
  title: string
  description: string
  author: CommunityAuthor | null
  project: { id: string; name: string; coverUrl?: string; designId?: string; programId?: string } | null
  forkFrom: { postId: string; title: string; authorName?: string } | null
  likeCount: number
  likedByMe: boolean
  createdAt: string
}

export interface CommunityListResult {
  items: CommunityPostCard[]
  total: number
  page: number
  pageSize: number
}

export interface CommunityListQuery {
  page?: number
  pageSize?: number
  sort?: 'new' | 'hot'
  q?: string
}

/** 社区作品分页列表（公域，游客可看） */
export async function getCommunityPosts(query: CommunityListQuery = {}): Promise<ApiResponse<CommunityListResult>> {
  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.pageSize) params.set('pageSize', String(query.pageSize))
  if (query.sort) params.set('sort', query.sort)
  if (query.q) params.set('q', query.q)
  const qs = params.toString()
  return apiFetch<CommunityListResult>(`/community/posts${qs ? `?${qs}` : ''}`)
}

/** 社区作品详情 */
export async function getCommunityPost(id: string): Promise<ApiResponse<CommunityPostDetail>> {
  const res = await apiFetch<{ post: CommunityPostDetail }>(`/community/posts/${id}`)
  if (res.success && res.data) {
    const post = (res.data as unknown as { post?: CommunityPostDetail }).post ?? (res.data as unknown as CommunityPostDetail)
    return { ...res, data: post as CommunityPostDetail }
  }
  return res as ApiResponse<CommunityPostDetail>
}

/** 发布作品到社区（仅 public Project，幂等） */
export async function createCommunityPost(data: {
  projectId: string
  title?: string
  description?: string
}): Promise<ApiResponse<{ post: { id: string; projectId: string; title: string }; alreadyPublished?: boolean }>> {
  return apiFetch(`/community/posts`, { method: 'POST', body: JSON.stringify(data) })
}

/** 点赞（幂等） */
export async function likeCommunityPost(id: string): Promise<ApiResponse<{ likeCount: number; likedByMe: boolean }>> {
  return apiFetch(`/community/posts/${id}/like`, { method: 'POST' })
}

/** 取消点赞（幂等） */
export async function unlikeCommunityPost(id: string): Promise<ApiResponse<{ likeCount: number; likedByMe: boolean }>> {
  return apiFetch(`/community/posts/${id}/like`, { method: 'DELETE' })
}
