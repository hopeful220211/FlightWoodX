import { useEffect, useMemo } from 'react'
import { Html, useBounds } from '@react-three/drei'
import type { DesignPartInstance, UserPart } from '@fwx/parts-schema'
import { useDesignStore } from '../../stores/designStore'
import { useAuthStore } from '../../stores/authStore'
import { buildCustomGeometry } from './customAssembly'
import { useCustomAssemblyPart } from './useCustomAssemblyPart'

function SourceMesh({ part, instance, interactive }: { part: UserPart; instance: DesignPartInstance; interactive: boolean }) {
  const geometry = useMemo(() => buildCustomGeometry(part.geometry), [part.geometry])
  const selected = useDesignStore(state => state.selectedInstanceId === instance.instanceId)
  const bounds = useBounds()
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => { bounds?.refresh().clip().fit() }, [bounds, geometry])
  return <mesh geometry={geometry} castShadow receiveShadow onClick={interactive ? event => { event.stopPropagation(); useDesignStore.getState().setSelectedInstanceId(instance.instanceId) } : undefined}>
    <meshStandardMaterial color={selected && interactive ? '#e9ad48' : '#cba77a'} roughness={0.82} />
  </mesh>
}

/** No GLB alias or invented sockets: render the authenticated source contour, or a visible failure. */
export function CustomAssemblyPart({ instance, interactive = false }: { instance: DesignPartInstance; interactive?: boolean }) {
  const query = useCustomAssemblyPart(instance)
  const token = useAuthStore(state => state.token)
  const available = !!token && !query.isError && !!query.data
  return <group position={instance.position} rotation={instance.rotation} scale={instance.scale}>
    {available ? <SourceMesh part={query.data!} instance={instance} interactive={interactive} /> : <Html center>
      <div role={query.isError || !token ? 'alert' : 'status'} className="w-52 rounded-lg border border-amber-300 bg-white p-3 text-xs text-amber-900 shadow">
        {!token ? '登录原账号后才能读取自制零件；来源引用仍保留' : query.isError ? `自制零件不可用：${query.error.message}` : '正在读取自制零件…'}
        {token && query.isError && <button type="button" className="mt-2 block underline" onClick={() => void query.refetch()}>重试读取零件</button>}
      </div>
    </Html>}
  </group>
}

export function CustomPartInspector({ instance }: { instance: DesignPartInstance }) {
  const query = useCustomAssemblyPart(instance)
  const usable = !query.isError && query.data
  const update = useDesignStore(state => state.updatePartInActiveDesign)
  return <div className="min-w-0 flex-1 text-xs">
    <button type="button" className="w-full truncate text-left text-sm font-bold" onClick={() => useDesignStore.getState().setSelectedInstanceId(instance.instanceId)}>{usable ? query.data!.name : '自制零件'}</button>
    <div className="text-amber-800">自由摆放 · 未连接 · 未验证制造与飞行</div>
    {usable ? <div>预估 {query.data!.flightImpact.massG} g · 来源版本 {instance.source?.version}</div> : <div role="alert">{query.isError ? query.error.message : '原零件尚未读取；引用保留'}<button type="button" onClick={() => void query.refetch()} className="ml-2 underline">重试</button></div>}
    <div className="mt-2 grid grid-cols-3 gap-1">
      {(['X', 'Y', 'Z'] as const).map((axis, index) => <label key={axis} className="min-w-0">{axis} (mm)<input aria-label={`自制零件 ${axis} 位置（毫米）`} className="w-full rounded border px-1 py-1" type="number" min={-1000} max={1000} step={1} value={+(instance.position[index] * 1000).toFixed(2)} onChange={event => {
        const value = event.currentTarget.valueAsNumber
        if (!Number.isFinite(value) || Math.abs(value) > 1000) return
        const position = [...instance.position] as [number, number, number]
        position[index] = value / 1000
        update(instance.instanceId, { position })
      }} /></label>)}
    </div>
  </div>
}
