// src/components/design/woodMaterial.ts
// 木质零件统一外观：编辑器画布与缩略图预览共用，保证「编辑器里是木色、抓出来的封面也是木色」。
import * as THREE from 'three'
import { assetUrl } from '../../utils/assetUrl'

/**
 * 浅原木色（木质零件本体）：低饱和、偏白的暖木色，像浅色桦木/原木板。
 * 这个色会与木纹贴图相乘——刻意取接近白的暖灰白，让贴图本身的淡雅木纹透出来、
 * 不被高饱和橙压成深橙色。这是 3D 模型本色，不是 UI 土色，别改成蓝。
 */
export const WOOD_COLOR = new THREE.Color('#EADFCB')

/** 偏粗糙、零金属：木头不反光，让转折面靠受光差异产生明暗层次。 */
const WOOD_ROUGHNESS = 0.72
const WOOD_METALNESS = 0
const WOOD_BOARD_TEXTURE_URL = assetUrl('/textures/wood-board.png')
// 适度放大木纹（6 → 4）：纹路更大、更清楚一点点，仍保持自然淡雅、不变成深重花纹。
const WOOD_BOARD_TEXTURE_REPEAT = 4

let woodBoardTexture: THREE.Texture | null = null

function getWoodBoardTexture(): THREE.Texture | null {
  if (woodBoardTexture) return woodBoardTexture
  if (typeof window === 'undefined') return null

  woodBoardTexture = new THREE.TextureLoader().load(WOOD_BOARD_TEXTURE_URL)
  woodBoardTexture.colorSpace = THREE.SRGBColorSpace
  woodBoardTexture.wrapS = THREE.RepeatWrapping
  woodBoardTexture.wrapT = THREE.RepeatWrapping
  woodBoardTexture.repeat.set(WOOD_BOARD_TEXTURE_REPEAT, WOOD_BOARD_TEXTURE_REPEAT)
  woodBoardTexture.anisotropy = 8
  woodBoardTexture.needsUpdate = true

  return woodBoardTexture
}

/**
 * 克隆 GLB 场景，并把每个网格材质统一替换为暖木色 MeshStandard 外观。
 *
 * 关键：本项目多数零件 GLB 不自带材质，three 会套用规范默认材质（metalness = 1）。
 * 全金属材质在没有环境贴图时只反射环境（空 = 黑），会渲染成纯黑剪影——这正是
 * 作品卡缩略图发黑的根因。这里强制 metalness = 0 + 暖木色，从材质层根治黑团。
 *
 * 同时把 originalColor 存进 userData，供选中高亮逻辑还原颜色。
 */
export function prepareWoodScene(scene: THREE.Object3D): THREE.Object3D {
  const cloned = scene.clone(true)

  cloned.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.material) return

    const materials = Array.isArray(child.material) ? child.material : [child.material]
    const processed = materials.map((mat) => {
      // 默认材质是全局共享单例，必须先克隆再改，否则会污染其他零件。
      const m = mat.clone()

      if ('color' in m && m.color instanceof THREE.Color) {
        m.color.copy(WOOD_COLOR)
      }
      if (m instanceof THREE.MeshStandardMaterial || m instanceof THREE.MeshPhysicalMaterial) {
        m.map = getWoodBoardTexture()
        m.roughness = WOOD_ROUGHNESS
        m.metalness = WOOD_METALNESS
        m.envMapIntensity = 0.3
        m.needsUpdate = true
      }
      if ('color' in m && m.color instanceof THREE.Color) {
        m.userData.originalColor = m.color.clone()
      }
      return m
    })

    child.material = Array.isArray(child.material) ? processed : processed[0]
  })

  return cloned
}
