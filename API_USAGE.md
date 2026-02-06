# API 客户端使用指南

## 📁 文件结构

```
src/
├── utils/
│   └── api.ts          # API 客户端（已创建）
├── stores/
│   └── authStore.ts    # 认证状态管理
.env                     # 环境变量配置
.env.example            # 环境变量模板
```

## 🔧 配置

### 1. 环境变量

在项目根目录的 `.env` 文件中配置 API 地址：

```env
VITE_API_URL=http://localhost:3000/api
```

生产环境可以改为：
```env
VITE_API_URL=https://your-api-domain.com/api
```

## 📦 API 客户端特性

✅ 完整的 TypeScript 类型支持
✅ 自动处理 token 认证（从 authStore 读取）
✅ 统一的错误处理
✅ 统一的响应格式

## 🚀 使用示例

### 认证相关

#### 1. 注册（连接后端）

```typescript
import { register } from '@/utils/api'
import { useAuthStore } from '@/stores/authStore'

async function handleRegister() {
  const result = await register({
    username: 'testuser',
    nickname: '测试用户',
    password: 'password123'
  })

  if (result.success && result.data) {
    // 后端注册成功后，更新本地状态
    const authStore = useAuthStore.getState()
    authStore.login(result.data.user.username, password) // 自动登录

    console.log('注册成功:', result.data.user)
  } else {
    console.error('注册失败:', result.error)
  }
}
```

#### 2. 登录（连接后端）

```typescript
import { login } from '@/utils/api'
import { useAuthStore } from '@/stores/authStore'

async function handleLogin() {
  const result = await login({
    username: 'testuser',
    password: 'password123'
  })

  if (result.success && result.data) {
    // 更新 authStore 状态
    const authStore = useAuthStore.getState()
    // 这里需要修改 authStore 来接受后端返回的用户数据

    console.log('登录成功:', result.data.user)
  } else {
    console.error('登录失败:', result.error)
  }
}
```

#### 3. 获取当前用户信息

```typescript
import { getMe } from '@/utils/api'

async function fetchCurrentUser() {
  const result = await getMe()

  if (result.success && result.data) {
    console.log('用户信息:', result.data)
  } else {
    console.error('获取失败:', result.error)
  }
}
```

### 设计作品相关

#### 1. 获取用户的所有设计

```typescript
import { getUserDesigns } from '@/utils/api'

async function fetchMyDesigns() {
  const result = await getUserDesigns()

  if (result.success && result.data) {
    console.log('我的设计:', result.data)
  } else {
    console.error('获取失败:', result.error)
  }
}
```

#### 2. 创建新设计

```typescript
import { createDesign } from '@/utils/api'

async function saveDesign(designData: any) {
  const result = await createDesign({
    name: '我的飞机',
    parts: designData.parts,
    thumbnailUrl: designData.thumbnail
  })

  if (result.success && result.data) {
    console.log('保存成功:', result.data)
  } else {
    console.error('保存失败:', result.error)
  }
}
```

#### 3. 更新设计

```typescript
import { updateDesign } from '@/utils/api'

async function updateMyDesign(designId: string, newName: string) {
  const result = await updateDesign(designId, {
    name: newName
  })

  if (result.success) {
    console.log('更新成功')
  } else {
    console.error('更新失败:', result.error)
  }
}
```

#### 4. 删除设计

```typescript
import { deleteDesign } from '@/utils/api'

async function removeDesign(designId: string) {
  const result = await deleteDesign(designId)

  if (result.success) {
    console.log('删除成功')
  } else {
    console.error('删除失败:', result.error)
  }
}
```

### 文件上传

#### 上传头像或缩略图

```typescript
import { uploadFile } from '@/utils/api'

async function handleFileUpload(file: File) {
  const result = await uploadFile(file)

  if (result.success && result.data) {
    console.log('文件上传成功，URL:', result.data.url)
    return result.data.url
  } else {
    console.error('上传失败:', result.error)
  }
}

// 在表单中使用
function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0]
  if (file) {
    handleFileUpload(file)
  }
}
```

## 🔄 与现有 authStore 集成

### 方案一：保持本地存储（推荐用于开发阶段）

当前的 `authStore` 已经实现了本地用户注册和登录，可以继续使用。等后端开发完成后再切换到 API。

### 方案二：连接后端 API

修改 `authStore.ts` 中的 `login` 和 `register` 方法，调用 API 客户端：

```typescript
// src/stores/authStore.ts
import { login as apiLogin, register as apiRegister } from '../utils/api'

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // ... 其他代码

      register: async (username, nickname, password) => {
        // 调用后端 API
        const result = await apiRegister({ username, nickname, password })

        if (result.success && result.data) {
          const user: User = {
            id: result.data.user.id,
            username: result.data.user.username,
            nickname: result.data.user.nickname,
          }
          set({ user, token: result.data.token, isAuthenticated: true })
          return { success: true, message: '注册成功' }
        } else {
          return { success: false, message: result.error || '注册失败' }
        }
      },

      login: async (username, password) => {
        // 调用后端 API
        const result = await apiLogin({ username, password })

        if (result.success && result.data) {
          const user: User = {
            id: result.data.user.id,
            username: result.data.user.username,
            nickname: result.data.user.nickname,
          }
          set({ user, token: result.data.token, isAuthenticated: true })
          return { success: true, message: '登录成功' }
        } else {
          return { success: false, message: result.error || '登录失败' }
        }
      },
    }),
    // ...
  )
)
```

## 📝 后端 API 预期格式

### 注册接口
```
POST /api/auth/register
Content-Type: application/json

{
  "username": "testuser",
  "nickname": "测试用户",
  "password": "password123"
}

响应：
{
  "user": {
    "id": "user_123",
    "username": "testuser",
    "nickname": "测试用户",
    "createdAt": "2026-02-06T10:00:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 登录接口
```
POST /api/auth/login
Content-Type: application/json

{
  "username": "testuser",
  "password": "password123"
}

响应：
{
  "user": {
    "id": "user_123",
    "username": "testuser",
    "nickname": "测试用户"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 获取当前用户
```
GET /api/auth/me
Authorization: Bearer <token>

响应：
{
  "id": "user_123",
  "username": "testuser",
  "nickname": "测试用户",
  "createdAt": "2026-02-06T10:00:00Z"
}
```

## 🛠 开发建议

1. **开发阶段**：继续使用本地存储的认证系统
2. **测试 API**：可以先用 Postman 或类似工具测试后端 API
3. **逐步迁移**：后端开发完成后，逐步将功能迁移到 API
4. **错误处理**：在 UI 层使用 toast 提示用户错误信息

## 🔐 安全注意事项

1. Token 自动从 authStore 的 localStorage 中读取
2. 所有需要认证的请求会自动添加 `Authorization` 头
3. 建议后端实现 token 过期机制
4. 生产环境务必使用 HTTPS

## 📞 需要的后端接口列表

- [x] `POST /api/auth/register` - 用户注册
- [x] `POST /api/auth/login` - 用户登录
- [x] `GET /api/auth/me` - 获取当前用户信息
- [x] `POST /api/auth/logout` - 退出登录
- [x] `POST /api/auth/change-password` - 修改密码
- [ ] `GET /api/users` - 获取所有用户（管理员）
- [ ] `PATCH /api/users/:id` - 更新用户信息
- [ ] `GET /api/designs` - 获取用户设计列表
- [ ] `GET /api/designs/:id` - 获取设计详情
- [ ] `POST /api/designs` - 创建设计
- [ ] `PATCH /api/designs/:id` - 更新设计
- [ ] `DELETE /api/designs/:id` - 删除设计
- [ ] `GET /api/designs/public` - 获取公开作品
- [ ] `POST /api/upload` - 文件上传
- [ ] `GET /api/courses` - 获取课程列表
- [ ] `GET /api/courses/:id` - 获取课程详情
