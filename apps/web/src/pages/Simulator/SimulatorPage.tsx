import { useParams } from 'react-router-dom'
import { Play, RotateCcw, Pause, Eye } from 'lucide-react'
import { Button } from '../../components/common/Button'

export function SimulatorPage() {
  const { id } = useParams()

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-sky-100 bg-white px-4 py-2">
        <div className="flex items-center gap-2">
          <Button size="sm" leftIcon={<Play size={14} />}>运行</Button>
          <Button size="sm" variant="outline" leftIcon={<Pause size={14} />}>暂停</Button>
          <Button size="sm" variant="outline" leftIcon={<RotateCcw size={14} />}>重置</Button>
        </div>
        <div className="text-sm text-ink-400">
          {id ? `项目 #${id.slice(0, 6)}` : '模拟器'}
        </div>
        <Button size="sm" variant="ghost" leftIcon={<Eye size={14} />}>视角</Button>
      </div>

      {/* 3D Canvas Placeholder */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-sky-100 to-sky-50">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-2xl bg-white/80 shadow-soft">
            <Play size={40} className="text-sky-400" />
          </div>
          <h2 className="text-xl font-semibold text-sky-800">仿真试飞器</h2>
          <p className="text-sm text-sky-600/70 mt-2 max-w-md">
            Three.js 3D 场景 · SimAdapter 执行指令协议 IR · 障碍物 + 传感器 · 单步高亮积木
          </p>
          <p className="text-xs text-ink-400 mt-4">阶段三 M4 接入</p>
        </div>
      </div>
    </div>
  )
}
