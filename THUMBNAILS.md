# 🖼️ 缩略图生成指南

## 📋 概述

为了解决 WebGL context 限制导致的白屏问题，我们采用**预渲染静态图片**的方案。

## 🚀 快速开始

### 1. 启动本地开发服务器

```bash
npm run dev
```

### 2. 打开缩略图生成器

在浏览器中访问：
```
http://localhost:5173/thumbnail-generator.html
```

### 3. 生成所有缩略图

1. 点击 **"生成所有缩略图"** 按钮
2. 等待所有 77 个模型渲染完成（约 1-2 分钟）
3. 页面会显示所有生成的缩略图预览

### 4. 下载缩略图

**方式一：逐个下载**
- 点击每个缩略图下方的 **"下载 PNG"** 按钮
- 保存到 `public/thumbnails/` 目录

**方式二：批量下载（浏览器截图）**
- 使用浏览器的开发者工具
- 逐个右键点击 Canvas → "Save image as..."
- 保存到 `public/thumbnails/` 目录

**方式三：使用脚本（高级）**
```javascript
// 在缩略图生成器页面的控制台运行
document.querySelectorAll('canvas').forEach((canvas, i) => {
  const link = document.createElement('a');
  link.download = canvas.parentElement.querySelector('.name').textContent.split(' ')[0] + '.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});
```

## 📁 目录结构

```
public/
  models/           # 3D 模型文件 (.glb)
    arm_01.glb
    arm_02.glb
    ...
  thumbnails/       # 预渲染缩略图 (.png)
    arm_01.png      ← 需要手动保存到这里
    arm_02.png
    ...
  thumbnail-generator.html  # 缩略图生成工具
```

## ✅ 验证

保存好缩略图后：

1. **刷新设计页面**
   ```bash
   # 硬刷新清除缓存
   Ctrl + Shift + R (Windows)
   Cmd + Shift + R (Mac)
   ```

2. **检查零件库**
   - 切换到"机臂"分类
   - 应该能看到真实的 3D 渲染图片
   - 不再是图标占位符

3. **测试拖拽**
   - 拖拽零件应该流畅无卡顿
   - 不应该出现白屏
   - 控制台无 WebGL 错误

## 🎨 缩略图规格

- **尺寸：** 200x200 像素
- **格式：** PNG (透明背景)
- **视角：** 45度角 (0.4, 0.3, 0.4)
- **光照：** 环境光 + 双向光源
- **背景：** 浅灰色 (#f5f5f5)

## 🔧 自定义

如需修改缩略图样式，编辑 `public/thumbnail-generator.html`：

```javascript
// 调整相机角度
camera.position.set(0.4, 0.3, 0.4);  // X, Y, Z

// 调整光照强度
const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1.5);

// 调整背景颜色
scene.background = new THREE.Color(0xf5f5f5);
```

## 📝 注意事项

1. **首次生成可能较慢**
   - 77 个模型需要逐个加载和渲染
   - 建议在性能较好的设备上进行

2. **浏览器限制**
   - 同时渲染太多可能导致浏览器卡顿
   - 生成器已添加延迟避免此问题

3. **图片质量**
   - PNG 格式保证最佳质量
   - 建议不要压缩缩略图

4. **版本控制**
   - 缩略图应该提交到 Git
   - 确保所有团队成员都有最新图片

## 🐛 故障排除

### 问题：生成的缩略图是空白的

**原因：** 模型加载失败或路径错误

**解决：**
- 检查 `/models/` 目录下是否有对应的 GLB 文件
- 打开浏览器控制台查看错误信息

### 问题：某些模型无法渲染

**原因：** 模型文件损坏或格式不正确

**解决：**
- 使用 Blender 重新导出该模型
- 确保导出设置正确（GLB 格式，包含材质）

### 问题：缩略图太暗或太亮

**原因：** 光照设置不合适

**解决：**
- 调整 `ambientLight.intensity` 和 `directionalLight.intensity`
- 修改后重新生成该模型的缩略图

## 📚 相关文件

- `public/thumbnail-generator.html` - 浏览器端生成器
- `scripts/generate-thumbnails.js` - Node.js 批量生成脚本（需要额外依赖）
- `src/data/parts.ts` - 零件配置文件（包含 thumbnailUrl）
- `src/pages/Design/components/DraggablePartCard.tsx` - 零件卡片组件

## 🎯 最佳实践

1. **定期更新**
   - 添加新模型后及时生成缩略图
   - 保持缩略图与模型同步

2. **命名规范**
   - 缩略图文件名必须与模型 ID 完全一致
   - 例如：`arm_01.glb` → `arm_01.png`

3. **质量检查**
   - 生成后检查每个缩略图是否清晰
   - 确保模型居中、大小适中

4. **性能优化**
   - 缩略图文件应小于 50KB
   - 可以使用 TinyPNG 等工具压缩
