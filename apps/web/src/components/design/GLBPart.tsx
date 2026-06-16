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

// 高亮颜色 - 温暖的金色调，在浅色木质上更醒目
const HIGHLIGHT_COLOR = new THREE.Color('#FFB74D');
const HIGHLIGHT_INTENSITY = 0.8;

interface GLBPartProps {
  instance: PartInstance;
  partData?: { id: string; name: string; modelUrl: string };
  dimmed?: boolean;
}

export function GLBPart({ instance, partData: propPartData, dimmed = false }: GLBPartProps) {
  // 守卫放在不含 hook 的外层：找不到零件数据直接渲染 null。
  // 内层组件拿到「保证存在」的 partData，所有 hook 都无条件调用（满足 rules-of-hooks）。
  const partData = propPartData || partsData.find((p) => p.id === instance.partId);
  if (!partData) {
    console.error(`[GLBPart] Part data not found for partId: ${instance.partId}`);
    return null;
  }
  return <GLBPartInner instance={instance} partData={partData} dimmed={dimmed} />;
}

interface GLBPartInnerProps {
  instance: PartInstance;
  partData: { id: string; name: string; modelUrl: string };
  dimmed: boolean;
}

function GLBPartInner({ instance, partData, dimmed }: GLBPartInnerProps) {
  const setSelectedInstanceId = useDesignStore((state) => state.setSelectedInstanceId);
  const selectedInstanceId = useDesignStore((state) => state.selectedInstanceId);
  const groupRef = useRef<THREE.Group>(null);

  // 检查当前零件是否被选中
  const isSelected = selectedInstanceId === instance.instanceId;

  // 预加载连接点数据（调用 hook 以填充缓存）
  usePartConnectors(partData.modelUrl);

  const { scene } = useGLTF(partData.modelUrl);

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
      setSelectedInstanceId(instance.instanceId);
    }

    pointerDownPos.current = null;
  }, [instance.instanceId, setSelectedInstanceId]);

  // 克隆场景以创建独立实例，并应用木质材质
  const clonedScene = useMemo(() => {
    const cloned = scene.clone();

    // 木质材质的基础颜色（中等原木色，介于浅色和深色之间）
    const woodColor = new THREE.Color('#C4A882');

    // 深度克隆材质，避免影响其他实例，并应用木质效果
    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        // 投射 / 接收阴影，增强立体感（配合 ThreeCanvas 的平行光 + 地面）
        child.castShadow = true;
        child.receiveShadow = true;

        const materials = Array.isArray(child.material) ? child.material : [child.material];

        const processedMaterials = materials.map((mat) => {
          const clonedMat = mat.clone();

          // 统一所有零件为同一木质颜色（不保留原始色差）
          if ('color' in clonedMat && clonedMat.color instanceof THREE.Color) {
            clonedMat.color.copy(woodColor);
          }

          // 统一 PBR 物理属性
          if (clonedMat instanceof THREE.MeshStandardMaterial ||
              clonedMat instanceof THREE.MeshPhysicalMaterial) {
            clonedMat.roughness = 0.75;
            clonedMat.metalness = 0;
            clonedMat.envMapIntensity = 0.3;
          }

          // 保存处理后的颜色用于高亮效果
          if ('color' in clonedMat && clonedMat.color instanceof THREE.Color) {
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
              // 保存原始属性（如果还没保存）
              if (!material.userData.originalEmissive) {
                material.userData.originalEmissive = material.emissive.clone();
                material.userData.originalEmissiveIntensity = material.emissiveIntensity;
                material.userData.originalColor = material.color.clone();
                material.userData.originalRoughness = material.roughness;
              }
              // 设置高亮效果
              material.emissive.copy(HIGHLIGHT_COLOR);
              material.emissiveIntensity = HIGHLIGHT_INTENSITY;
              // 稍微提亮颜色，增加对比度
              const brighterColor = material.userData.originalColor.clone();
              brighterColor.multiplyScalar(1.2);
              material.color.copy(brighterColor);
              // 稍微降低粗糙度，增加光泽感
              material.roughness = Math.max(0.4, material.userData.originalRoughness - 0.3);
            } else {
              // 恢复原始属性
              if (material.userData.originalEmissive) {
                material.emissive.copy(material.userData.originalEmissive);
                material.emissiveIntensity = material.userData.originalEmissiveIntensity ?? 0;
                material.color.copy(material.userData.originalColor);
                material.roughness = material.userData.originalRoughness ?? 0.85;
              }
            }
            material.needsUpdate = true;
          }
        });
      }
    });
  }, [clonedScene, isSelected]);

  // Dim parts during drag (semi-transparent + desaturated)
  useEffect(() => {
    if (!clonedScene) return;
    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((mat) => {
          if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
            mat.transparent = true;
            mat.opacity = dimmed ? 0.4 : 1;
            mat.needsUpdate = true;
          }
        });
      }
    });
  }, [clonedScene, dimmed]);

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
