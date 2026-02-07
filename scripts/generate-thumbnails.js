/**
 * 为所有 GLB 模型生成静态缩略图
 * 使用离屏 Canvas 渲染，生成 200x200 的 PNG 图片
 */

const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');
const THREE = require('three');
const { GLTFLoader } = require('three/examples/jsm/loaders/GLTFLoader.js');
const { DRACOLoader } = require('three/examples/jsm/loaders/DRACOLoader.js');

// 使用 node-canvas 创建离屏渲染器
const createOffscreenRenderer = (width, height) => {
  const canvas = createCanvas(width, height);
  const gl = require('gl')(width, height, { preserveDrawingBuffer: true });

  return { canvas, gl };
};

// 生成单个模型的缩略图
async function generateThumbnail(modelPath, outputPath, size = 200) {
  return new Promise((resolve, reject) => {
    try {
      // 创建场景
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf5f5f5); // 浅灰背景

      // 创建相机
      const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
      camera.position.set(0.4, 0.3, 0.4);
      camera.lookAt(0, 0, 0);

      // 添加光照
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
      scene.add(ambientLight);

      const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1.5);
      directionalLight1.position.set(2, 2, 2);
      scene.add(directionalLight1);

      const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
      directionalLight2.position.set(-2, -1, -2);
      scene.add(directionalLight2);

      // 加载模型
      const loader = new GLTFLoader();
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
      loader.setDRACOLoader(dracoLoader);

      console.log(`Loading model: ${modelPath}`);

      loader.load(
        modelPath,
        (gltf) => {
          try {
            // 计算边界盒并居中
            const box = new THREE.Box3().setFromObject(gltf.scene);
            const center = box.getCenter(new THREE.Vector3());
            const boxSize = box.getSize(new THREE.Vector3());

            gltf.scene.position.sub(center);

            // 调整相机距离以适应模型
            const maxDim = Math.max(boxSize.x, boxSize.y, boxSize.z);
            const fov = camera.fov * (Math.PI / 180);
            const cameraZ = Math.abs(maxDim / Math.tan(fov / 2)) * 1.8;
            const distance = Math.max(cameraZ, maxDim * 2.5);

            // 45度角视图
            camera.position.set(distance * 0.5, distance * 0.4, distance * 0.5);
            camera.lookAt(0, 0, 0);
            camera.updateProjectionMatrix();

            scene.add(gltf.scene);

            // 创建渲染器（使用 headless-gl）
            const canvas = createCanvas(size, size);
            const gl = require('gl')(size, size, { preserveDrawingBuffer: true });

            const renderer = new THREE.WebGLRenderer({
              canvas: canvas,
              context: gl,
              antialias: true,
              alpha: true,
            });

            renderer.setSize(size, size);
            renderer.setClearColor(0xf5f5f5, 1);

            // 渲染
            renderer.render(scene, camera);

            // 保存为 PNG
            const buffer = canvas.toBuffer('image/png');
            fs.writeFileSync(outputPath, buffer);

            console.log(`✅ Generated: ${outputPath}`);

            // 清理
            renderer.dispose();
            dracoLoader.dispose();

            resolve();
          } catch (error) {
            console.error(`❌ Error rendering ${modelPath}:`, error);
            reject(error);
          }
        },
        undefined,
        (error) => {
          console.error(`❌ Error loading ${modelPath}:`, error);
          reject(error);
        }
      );
    } catch (error) {
      console.error(`❌ Error processing ${modelPath}:`, error);
      reject(error);
    }
  });
}

// 批量生成所有模型的缩略图
async function generateAllThumbnails() {
  const modelsDir = path.join(__dirname, '../public/models');
  const thumbnailsDir = path.join(__dirname, '../public/thumbnails');

  // 创建缩略图目录
  if (!fs.existsSync(thumbnailsDir)) {
    fs.mkdirSync(thumbnailsDir, { recursive: true });
  }

  // 获取所有 GLB 文件
  const files = fs.readdirSync(modelsDir).filter(file => file.endsWith('.glb'));

  console.log(`Found ${files.length} models to process\n`);

  // 逐个生成缩略图（避免内存溢出）
  for (const file of files) {
    const modelPath = path.join(modelsDir, file);
    const thumbnailPath = path.join(thumbnailsDir, file.replace('.glb', '.png'));

    // 跳过已存在的缩略图
    if (fs.existsSync(thumbnailPath)) {
      console.log(`⏭️  Skipping existing: ${file}`);
      continue;
    }

    try {
      await generateThumbnail(modelPath, thumbnailPath, 200);
      // 添加延迟避免内存问题
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Failed to generate thumbnail for ${file}:`, error);
    }
  }

  console.log('\n🎉 All thumbnails generated!');
}

// 运行
generateAllThumbnails().catch(console.error);
