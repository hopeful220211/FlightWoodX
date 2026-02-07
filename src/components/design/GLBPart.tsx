// src/components/design/GLBPart.tsx

import { useGLTF } from '@react-three/drei';
import { useEffect, useMemo, useRef, useCallback } from 'react';
import * as THREE from 'three';
import type { PartInstance } from '../../types/design';
import { useDesignStore } from '../../stores/designStore';
import { partsData } from '../../data/parts';
import { usePartConnectors } from '../../hooks/usePartConnectors';

// 点击检测阈值（像素）
const CLICK_THRESHOLD = 5;

// 高亮颜色 - 温暖的棕色调，与主题配色一致
const HIGHLIGHT_COLOR = new THREE.Color('#D4A574');
const HIGHLIGHT_INTENSITY = 0.3;

interface GLBPartProps {
  instance: PartInstance;
  partData?: { id: string; name: string; modelUrl: string };
}

export function GLBPart({ instance, partData: propPartData }: GLBPartProps) {
  const partData = propPartData || partsData.find((p) => p.id === instance.partId);
  const setSelectedInstanceId = useDesignStore((state) => state.setSelectedInstanceId);
  const selectedInstanceId = useDesignStore((state) => state.selectedInstanceId);
  const groupRef = useRef<THREE.Group>(null);

  // 检查当前零件是否被选中
  const isSelected = selectedInstanceId === instance.instanceId;

  // 如果找不到 partData，渲染 null
  if (!partData) {
    console.error(`[GLBPart] Part data not found for partId: ${instance.partId}`);
    return null;
  }

  // 预加载连接点数据（调用 hook 以填充缓存）
  usePartConnectors(partData.modelUrl);

  const { scene } = useGLTF(partData.modelUrl);

  // 调试日志
  useEffect(() => {
    const partInfo = partsData.find((p) => p.id === instance.partId);
    if (partInfo) {
      console.log(`[Debug] Scene graph for ${partInfo.name} (${instance.instanceId}):`, scene);
      const childNames: string[] = [];
      scene.traverse((obj) => {
        childNames.push(`${obj.name || '(unnamed)'} (${obj.type})`);
      });
      console.log(`[Debug] Child objects in ${partInfo.name}:`, childNames);
    }
  }, [scene, instance.instanceId, instance.partId]);

  // 追踪指针位置来区分点击和拖拽
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = useCallback((e: any) => {
    e.stopPropagation();
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handlePointerUp = useCallback((e: any) => {
    e.stopPropagation();
    if (!pointerDownPos.current) return;

    const dx = Math.abs(e.clientX - pointerDownPos.current.x);
    const dy = Math.abs(e.clientY - pointerDownPos.current.y);
    const distance = Math.sqrt(dx * dx + dy * dy);

    // 只有当指针移动距离小于阈值时才视为点击
    if (distance < CLICK_THRESHOLD) {
      console.log('[Debug] Clicked on instance:', instance.instanceId);
      setSelectedInstanceId(instance.instanceId);
    }

    pointerDownPos.current = null;
  }, [instance.instanceId, setSelectedInstanceId]);

  // 克隆场景以创建独立实例，并应用木质材质
  const clonedScene = useMemo(() => {
    const cloned = scene.clone();

    // 木质材质的基础颜色（温暖的浅棕色）
    const woodColor = new THREE.Color('#A0826D');

    // 深度克隆材质，避免影响其他实例，并应用木质效果
    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];

        const processedMaterials = materials.map((mat) => {
          const clonedMat = mat.clone();

          // 应用木质材质属性
          if (clonedMat instanceof THREE.MeshStandardMaterial ||
              clonedMat instanceof THREE.MeshPhysicalMaterial) {
            // 设置木质颜色（保留原材质的颜色信息，与木色混合）
            if (clonedMat.color) {
              clonedMat.color.multiply(woodColor);
            } else {
              clonedMat.color = woodColor.clone();
            }

            // 木质材质特性
            clonedMat.roughness = 0.85;  // 木头表面粗糙
            clonedMat.metalness = 0;     // 木头不是金属

            // 保存原始颜色用于高亮效果
            clonedMat.userData.originalColor = clonedMat.color.clone();
          }

          return clonedMat;
        });

        child.material = Array.isArray(child.material) ? processedMaterials : processedMaterials[0];
      }
    });

    return cloned;
  }, [scene]);

  // 根据选中状态更新材质高亮效果
  useEffect(() => {
    if (!clonedScene) return;

    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];

        materials.forEach((material) => {
          if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial) {
            if (isSelected) {
              // 保存原始自发光颜色（如果还没保存）
              if (!material.userData.originalEmissive) {
                material.userData.originalEmissive = material.emissive.clone();
                material.userData.originalEmissiveIntensity = material.emissiveIntensity;
              }
              // 设置高亮自发光
              material.emissive.copy(HIGHLIGHT_COLOR);
              material.emissiveIntensity = HIGHLIGHT_INTENSITY;
            } else {
              // 恢复原始自发光
              if (material.userData.originalEmissive) {
                material.emissive.copy(material.userData.originalEmissive);
                material.emissiveIntensity = material.userData.originalEmissiveIntensity ?? 0;
              }
            }
            material.needsUpdate = true;
          }
        });
      }
    });
  }, [clonedScene, isSelected]);

  return (
    <group
      ref={groupRef}
      position={instance.position}
      rotation={instance.rotation}
      scale={instance.scale || [1, 1, 1]}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <primitive name={instance.instanceId} object={clonedScene} />
    </group>
  );
}
