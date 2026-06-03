import { useParams } from 'react-router-dom'
import { Code2, Play, Save, Undo2, Redo2 } from 'lucide-react'
import { Button } from '../../components/common/Button'

export function CodingPage() {
  const { id } = useParams()

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Left: Blockly workspace placeholder */}
      <div className="flex-1 flex flex-col border-r border-sky-100">
        {/* Toolbar */}
        <div className="flex items-center gap-2 border-b border-sky-100 bg-white px-4 py-2">
          <Button size="sm" variant="ghost" leftIcon={<Undo2 size={14} />}>撤销</Button>
          <Button size="sm" variant="ghost" leftIcon={<Redo2 size={14} />}>重做</Button>
          <div className="flex-1" />
          <Button size="sm" variant="outline" leftIcon={<Save size={14} />}>保存</Button>
          <Button size="sm" leftIcon={<Play size={14} />}>运行</Button>
        </div>

        {/* Blockly canvas placeholder */}
        <div className="flex-1 flex items-center justify-center bg-white">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-wood-100">
              <Code2 size={36} className="text-wood-500" />
            </div>
            <h2 className="text-xl font-semibold text-ink-900">积木编程器</h2>
            <p className="text-sm text-ink-400 mt-2 max-w-md">
              Google Blockly · 自定义行为积木 + 传感器/逻辑积木 · 编译为 CommandProgram IR
            </p>
            <p className="text-xs text-ink-400 mt-4">阶段三 M3 接入</p>
          </div>
        </div>
      </div>

      {/* Right: IR preview sidebar */}
      <div className="w-full lg:w-80 border-t lg:border-t-0 bg-slate-50 p-4 overflow-auto">
        <h3 className="text-sm font-semibold text-ink-700 mb-2">指令协议 IR 预览</h3>
        <div className="rounded-lg bg-white border border-sky-100 p-3 font-mono text-xs text-ink-600 min-h-[200px]">
          <pre>{JSON.stringify({
            version: '1.0',
            metadata: { name: '示例程序', author: '...', createdAt: '...' },
            commands: [
              { type: 'takeoff', params: { altitudeCm: 100 } },
              { type: 'move', params: { direction: 'forward', distanceCm: 50 } },
              { type: 'land' },
            ],
          }, null, 2)}</pre>
        </div>
        <p className="text-xs text-ink-400 mt-2">
          积木 → 编译为 IR → SimAdapter / RealDroneAdapter 消费
        </p>
      </div>
    </div>
  )
}
