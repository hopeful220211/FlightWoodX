# 环境配置指南

## 📁 环境变量文件

项目现在支持不同环境的配置：

```
.env                    - 通用配置（已被 .gitignore 忽略）
.env.development        - 开发环境配置（已创建）
.env.production         - 生产环境配置（已创建）
.env.example            - 环境变量模板（可提交到 Git）
```

## 🔧 当前配置

### 开发环境 (.env.development)
```env
VITE_API_URL=http://localhost:3000/api
```

### 生产环境 (.env.production)
```env
# 需要替换为你的实际后端地址
VITE_API_URL=https://your-backend-domain.railway.app/api
```

## 🚀 使用方式

### 开发模式
```bash
npm run dev
# 自动使用 .env.development 配置
# API 地址: http://localhost:3000/api
```

### 生产构建
```bash
npm run build
# 自动使用 .env.production 配置
# API 地址: 你在 .env.production 中配置的地址
```

### 预览生产构建
```bash
npm run preview
# 使用生产环境的配置
```

## 📝 部署到 Railway

### 1. 准备后端
确保你的后端已部署到 Railway，并获取到部署 URL，例如：
```
https://flightwoodx-backend-production.up.railway.app
```

### 2. 更新 .env.production
打开 `.env.production` 文件，更新为你的实际后端地址：
```env
VITE_API_URL=https://flightwoodx-backend-production.up.railway.app/api
```

### 3. 构建生产版本
```bash
npm run build
```

这会生成 `dist/` 目录，其中包含生产环境的构建文件。

### 4. 部署前端到 Vercel

#### 方式一：通过 Vercel CLI
```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
vercel
```

#### 方式二：通过 Vercel 网站
1. 访问 [vercel.com](https://vercel.com)
2. 连接你的 GitHub 仓库
3. 配置环境变量：
   - 在 Vercel 项目设置中添加：
   - `VITE_API_URL` = `https://your-backend-domain.railway.app/api`
4. 部署

## 🔐 安全注意事项

### .gitignore 已更新
以下文件已被添加到 `.gitignore`，不会被提交到 Git：
```
.env
.env.local
.env.development
.env.production
.env*.local
```

### 敏感信息保护
- ❌ 不要将 `.env` 文件提交到 Git
- ✅ 使用 `.env.example` 作为模板
- ✅ 在部署平台上配置环境变量

## 🧪 测试不同环境

### 测试开发环境
```bash
# 1. 确保后端运行在 localhost:3000
node server.js

# 2. 启动前端开发服务器
npm run dev

# 3. 访问 http://localhost:5173
```

### 测试生产环境（本地）
```bash
# 1. 临时设置生产环境 API 地址
# 编辑 .env.production

# 2. 构建生产版本
npm run build

# 3. 预览生产构建
npm run preview

# 4. 访问 http://localhost:4173
```

## 📊 环境变量优先级

Vite 的环境变量加载顺序（从高到低）：
1. `.env.[mode].local` - 本地特定模式配置（不会提交到 Git）
2. `.env.[mode]` - 特定模式配置（development / production）
3. `.env.local` - 本地配置（不会提交到 Git）
4. `.env` - 通用配置

其中 `[mode]` 是：
- `development` - 开发模式（npm run dev）
- `production` - 生产模式（npm run build）

## 🔍 调试环境变量

### 检查当前使用的 API 地址
在浏览器控制台输入：
```javascript
console.log(import.meta.env.VITE_API_URL)
```

### 查看所有环境变量
```javascript
console.log(import.meta.env)
```

## 📦 package.json 脚本

```json
{
  "scripts": {
    "dev": "vite",                    // 使用 .env.development
    "build": "vite build",            // 使用 .env.production
    "preview": "vite preview"         // 预览生产构建
  }
}
```

## 🐛 常见问题

### Q1: 环境变量修改后没有生效？
**解决：** 需要重启开发服务器
```bash
# 停止当前服务器 (Ctrl+C)
# 重新启动
npm run dev
```

### Q2: 生产构建连接的是本地 API？
**解决：** 检查 `.env.production` 是否正确配置
```bash
cat .env.production
# 应该显示生产环境的 API 地址
```

### Q3: API 请求失败，显示 CORS 错误？
**解决：** 确保后端已配置 CORS
```javascript
// 后端 server.js 应该包含：
app.use(cors({
  origin: ['http://localhost:5173', 'https://your-frontend-domain.vercel.app']
}))
```

### Q4: Vercel 部署后 API 调用失败？
**解决：** 在 Vercel 项目设置中添加环境变量
1. 进入 Vercel 项目设置
2. 找到 "Environment Variables"
3. 添加 `VITE_API_URL`
4. 重新部署

## 🎯 完整部署流程

### 步骤 1: 部署后端（Railway）
```bash
# 1. 推送后端代码到 GitHub
# 2. 在 Railway 创建新项目
# 3. 连接 GitHub 仓库
# 4. 获取部署 URL
```

### 步骤 2: 配置前端环境变量
```bash
# 编辑 .env.production
echo "VITE_API_URL=https://your-backend.railway.app/api" > .env.production
```

### 步骤 3: 提交前端代码
```bash
git add .
git commit -m "Update production API URL"
git push origin main
```

### 步骤 4: 部署前端（Vercel）
```bash
# 方式 1: 使用 Vercel CLI
vercel --prod

# 方式 2: 通过 Vercel 网站导入 GitHub 仓库
```

### 步骤 5: 测试
```bash
# 访问你的 Vercel 域名
https://your-project.vercel.app

# 测试注册/登录功能
# 检查浏览器控制台是否有错误
```

## 📝 检查清单

部署前确认：
- [ ] 后端已部署到 Railway
- [ ] 获取到后端 URL
- [ ] 更新 `.env.production` 文件
- [ ] 后端配置了正确的 CORS
- [ ] 测试本地构建（npm run build && npm run preview）
- [ ] `.gitignore` 包含环境变量文件
- [ ] 在 Vercel 中配置环境变量（如果使用 Vercel）
- [ ] 部署后测试所有功能

## 🔗 相关文档

- [Vite 环境变量文档](https://vitejs.dev/guide/env-and-mode.html)
- [Vercel 环境变量](https://vercel.com/docs/concepts/projects/environment-variables)
- [Railway 部署指南](https://docs.railway.app/)
