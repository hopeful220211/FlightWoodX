# 资源文件使用说明

## 📁 文件夹结构

```
public/resource/
├── videos/              # 视频文件
│   └── demo.mp4        # 主页演示视频（放在这里）
├── picture/
│   ├── student_works/  # 学生作品图片（放在这里）
│   ├── flight_png/     # 产品图片
│   ├── learning_kids/  # 学习场景图片
│   ├── UI/            # UI 截图
│   └── awards/        # 奖项图标
└── models/            # 3D 模型文件
```

## 🎬 视频文件

### 主页演示视频
- **路径**: `public/resource/videos/demo.mp4`
- **建议规格**:
  - 格式: MP4 (H.264 编码)
  - 分辨率: 1920x1080 (1080p) 或 1280x720 (720p)
  - 比例: 16:9
  - 文件大小: < 50MB (推荐)
  - 时长: 1-3 分钟
- **用途**: 主页"观看视频"按钮播放

**如何添加:**
1. 将视频文件重命名为 `demo.mp4`
2. 放入 `public/resource/videos/` 文件夹
3. 刷新页面即可

## 🖼️ 学生作品图片

### 更新步骤

1. **准备图片**
   - 格式: JPG, PNG, WebP
   - 建议分辨率: 1600x900 或更高
   - 比例: 16:9
   - 文件大小: < 500KB (推荐压缩后上传)

2. **放置图片**
   - 将图片放入: `public/resource/picture/student_works/`
   - 命名示例: `zhuying-01.jpg`, `sumu-01.png` 等

3. **更新代码**
   编辑文件: `src/data/featuredWorks.ts`

```typescript
export const featuredWorks: FeaturedWork[] = [
  {
    id: 'fw_01',
    name: '竹影一号',
    authorName: '小林',
    createdAt: '2026-01-05',
    likes: 128,
    thumbnailUrl: '/resource/picture/student_works/zhuying-01.jpg', // 修改这里
    description: '轻量机身 + 加大机翼，稳定起飞。',
  },
  // ... 其他作品
]
```

### 示例

```typescript
{
  id: 'fw_01',
  name: '竹影一号',
  authorName: '小林',
  createdAt: '2026-02-06',
  likes: 128,
  thumbnailUrl: '/resource/picture/student_works/zhuying-01.jpg',
  description: '这是一架轻量级木质无人机，采用竹制机身。',
}
```

## 🎨 图片优化建议

- 使用图片压缩工具 (如 TinyPNG, Squoosh) 减小文件大小
- 保持 16:9 宽高比，确保显示效果一致
- 使用清晰、专业的产品照片
- 建议白色或浅色背景

## 🚀 部署后生效

修改文件后需要：
1. 提交到 Git
2. 推送到 GitHub
3. Vercel 会自动重新部署

## 💡 快速命令

```bash
# 查看当前资源文件
ls -lh public/resource/picture/student_works/
ls -lh public/resource/videos/

# 添加并提交更改
git add public/resource/
git commit -m "Update student works and demo video"
git push origin main
```
