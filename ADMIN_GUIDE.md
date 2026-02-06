# 管理后台使用指南

## 📋 概述

管理后台提供了用户管理功能，可以查看所有注册用户的信息和统计数据。

## 🔐 访问方式

### 直接访问
访问地址：`http://localhost:5173/admin`

**注意：** 需要先登录才能访问管理后台。未登录用户会被重定向到登录页面。

## 📊 功能特性

### 1. 统计卡片
显示以下统计信息：
- ✅ **总用户数**：所有注册用户的数量
- ✅ **学生用户**：角色为学生的用户数量
- ✅ **教师用户**：角色为教师的用户数量
- ✅ **管理员**：角色为管理员的用户数量

### 2. 用户列表
显示所有用户的详细信息：
- **用户名**：登录时使用的用户名
- **昵称**：用户的显示名称
- **角色**：用户角色（学生/教师/管理员），如未设置则显示"未设置"
- **注册时间**：用户注册的日期
- **最后登录**：用户最后一次登录的时间，如从未登录则显示"从未登录"

## 🎨 页面特点

- ✨ 独立的全屏布局（不使用主导航栏）
- 📊 可视化的统计卡片
- 📋 清晰的表格展示
- 🎯 响应式设计（支持移动端）
- 🌓 深色模式支持
- 💡 提示信息（说明当前数据来源）

## 🔧 当前数据来源

**本地存储模式（开发阶段）**
- 用户数据从浏览器 `localStorage` 中读取
- 存储键：`flightwoodx-users`
- 数据结构：
  ```typescript
  {
    "username": {
      username: string
      nickname: string
      password: string
      createdAt: string
      lastLogin?: string
      role?: 'student' | 'teacher' | 'admin'
    }
  }
  ```

**连接后端后**
- 将调用 API 客户端的 `getAllUsers()` 方法
- 从服务器获取完整的用户数据
- 支持更多的用户管理功能（编辑、删除等）

## 🚀 未来功能扩展

### 计划中的功能：
- [ ] 编辑用户信息
- [ ] 修改用户角色
- [ ] 删除用户
- [ ] 搜索和筛选用户
- [ ] 批量操作
- [ ] 导出用户列表
- [ ] 用户活跃度统计
- [ ] 权限管理

## 📝 添加管理后台入口

### 方案一：在 Navbar 用户菜单中添加（推荐）

编辑 `src/components/layout/Navbar.tsx`，在用户菜单中添加管理后台链接：

```tsx
{showUserMenu && (
  <div className="...">
    <NavLink to="/profile" ...>
      个人中心
    </NavLink>

    {/* 添加管理后台入口 */}
    <NavLink
      to="/admin"
      className="block px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-wood-50 dark:text-slate-200 dark:hover:bg-slate-800"
      onClick={() => setShowUserMenu(false)}
    >
      管理后台
    </NavLink>

    <button type="button" onClick={handleLogout} ...>
      退出登录
    </button>
  </div>
)}
```

### 方案二：在 ProfilePage 中添加

在个人中心页面添加一个"管理后台"按钮，使用 `useNavigate()` 导航到 `/admin`。

## 🔐 权限控制（后端开发后）

连接后端 API 后，建议实现以下权限控制：

1. **后端验证**
   - 检查用户的 `role` 字段
   - 只允许 `admin` 角色访问管理后台 API

2. **前端保护**
   - 创建 `AdminRoute` 组件
   - 检查当前用户是否有管理员权限
   - 无权限时显示"权限不足"页面

示例代码：
```tsx
// src/components/layout/AdminRoute.tsx
export function AdminRoute() {
  const { user } = useAuthStore()

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

// 在 App.tsx 中使用
<Route element={<AdminRoute />}>
  <Route path="/admin" element={<AdminPage />} />
</Route>
```

## 💡 使用技巧

1. **查看用户详情**
   - 表格中显示所有关键信息
   - 鼠标悬停会高亮显示行

2. **角色识别**
   - 不同角色有不同颜色的标签
   - 管理员（红色）、教师（蓝色）、学生（绿色）

3. **时间显示**
   - 注册时间显示年月日
   - 最后登录显示年月日 + 时分

## 🐛 故障排查

### 问题：无法访问管理后台
**解决方案：**
1. 确认已登录
2. 清除浏览器缓存
3. 检查控制台错误信息

### 问题：用户列表为空
**解决方案：**
1. 确认已注册用户
2. 检查 localStorage 中是否有 `flightwoodx-users` 数据
3. 使用浏览器开发者工具查看：Application → Local Storage

### 问题：数据不更新
**解决方案：**
1. 刷新页面
2. 清除 localStorage 并重新注册用户

## 📞 技术支持

如有问题或建议，请：
1. 查看浏览器控制台错误信息
2. 检查 localStorage 数据
3. 查看 `src/pages/Admin/AdminPage.tsx` 源代码
