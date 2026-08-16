// src/components/design/SceneLighting.tsx
// 固定三点布光 + 半球环境光，编辑器画布与缩略图预览共用，保证两处观感一致。

interface SceneLightingProps {
  /** 主光是否投射阴影（编辑器可开，缩略图关掉省开销）。 */
  castShadow?: boolean
}

/**
 * 像 Blender / 犀牛那样的固定布光：所有灯都放在世界坐标的固定位置，
 * 不 parent 到相机或任何零件组——相机怎么转、零件怎么动，光都不动。
 *
 * 目标：相邻木质零件因受光方向不同而明暗分明，任意视角都能分清边界，
 * 不再像原来「均匀环境光压平画面」那样混成一团。
 *
 * 布光：半球光给上下面自然梯度（替代会压平的均匀 ambient）+ 主光 key 决定立体感
 *      + 弱补光 fill 抬暗部避免死黑 + 后方轮廓光 rim 勾边强化零件间分离。
 */
export function SceneLighting({ castShadow = false }: SceneLightingProps) {
  return (
    <>
      {/* 半球光：暖白天光 ↑ + 暖棕地面反光 ↓，让朝上/朝下的面有自然明暗差。 */}
      <hemisphereLight color="#fff3e0" groundColor="#7a6347" intensity={0.5} />

      {/* 主光 key：右上前方，决定主要亮面与体积感。 */}
      <directionalLight
        position={[4, 6, 3]}
        intensity={2.2}
        color="#fff6ea"
        castShadow={castShadow}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0005}
      />

      {/* 补光 fill：左前方弱冷光，托起暗部、保留细节，但不抹平主光的明暗。 */}
      <directionalLight position={[-5, 2, 1]} intensity={0.5} color="#e8f0ff" />

      {/* 轮廓光 rim：后方打来勾出零件边缘，强化相邻零件之间的分离感。 */}
      <directionalLight position={[-1, 3, -6]} intensity={0.9} color="#ffffff" />
    </>
  )
}
