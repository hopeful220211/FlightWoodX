/**
 * CodingPage — 积木编程器。
 *
 * 左侧：Blockly 工作区（自定义无人机积木）
 * 右侧：实时编译的 CommandProgram IR 预览
 *
 * 积木 → 编译为 IR → 仿真器 / 真机适配器消费（硬件解耦红线）。
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import * as Blockly from 'blockly'
import 'blockly/blocks'
import { Play, Save, Undo2, Redo2, Code2, AlertCircle } from 'lucide-react'
import { Button } from '../../components/common/Button'
import { useToast } from '../../components/common/Toast'
import { useAuthStore } from '../../stores/authStore'

// Register custom blocks + get toolbox XML
import { DRONE_TOOLBOX } from '../../blockly/blocks'
import { compileWorkspace } from '../../blockly/compiler'
import { serializeProgram, type CommandProgram } from '@fwx/shared'

export function CodingPage() {
  const { id } = useParams()
  const toast = useToast()
  const user = useAuthStore(s => s.user)

  const blocklyDiv = useRef<HTMLDivElement>(null)
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null)
  const [ir, setIr] = useState<CommandProgram | null>(null)
  const [compileError, setCompileError] = useState<string | null>(null)
  const [blocklyXml, setBlocklyXml] = useState<string>('')

  // Initialize Blockly workspace
  useEffect(() => {
    if (!blocklyDiv.current || workspaceRef.current) return

    const ws = Blockly.inject(blocklyDiv.current, {
      toolbox: DRONE_TOOLBOX,
      grid: { spacing: 20, length: 3, colour: '#e0efff', snap: true },
      zoom: { controls: true, wheel: true, startScale: 0.9, maxScale: 2, minScale: 0.3 },
      trashcan: true,
      move: { scrollbars: true, drag: true, wheel: true },
      renderer: 'zelos',
      theme: Blockly.Themes.Classic,
    })

    workspaceRef.current = ws

    // Live compile on workspace change
    const onWorkspaceChange = () => {
      try {
        const program = compileWorkspace(ws, {
          name: id ? `项目 ${id.slice(0, 6)}` : '未命名程序',
          author: user?.username || '设计师',
        })
        setIr(program)
        setCompileError(null)

        // Save XML state
        const xml = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(ws))
        setBlocklyXml(xml)
      } catch (err) {
        setCompileError(err instanceof Error ? err.message : '编译错误')
      }
    }

    ws.addChangeListener(onWorkspaceChange)

    return () => {
      ws.removeChangeListener(onWorkspaceChange)
      ws.dispose()
      workspaceRef.current = null
    }
  }, [id, user?.username])

  // Resize Blockly on window resize
  useEffect(() => {
    const handleResize = () => {
      if (workspaceRef.current) {
        Blockly.svgResize(workspaceRef.current)
      }
    }
    window.addEventListener('resize', handleResize)
    // Initial resize after mount
    const timer = setTimeout(handleResize, 100)
    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(timer)
    }
  }, [])

  const handleUndo = useCallback(() => {
    workspaceRef.current?.undo(false)
  }, [])

  const handleRedo = useCallback(() => {
    workspaceRef.current?.undo(true)
  }, [])

  const handleSave = useCallback(() => {
    // TODO M3: save Program to backend (blocklyXml + ir)
    toast.push('success', '程序已保存')
  }, [toast])

  const handleRun = useCallback(() => {
    if (!ir) {
      toast.push('error', '请先拼出程序再运行')
      return
    }
    // TODO M4: pass IR to SimAdapter
    toast.push('info', `编译成功！${ir.commands.length} 条指令，等待仿真器接入（M4）`)
  }, [ir, toast])

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Left: Blockly workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-2 border-b border-sky-100 bg-white px-4 py-2">
          <Button size="sm" variant="ghost" onClick={handleUndo} leftIcon={<Undo2 size={14} />}>撤销</Button>
          <Button size="sm" variant="ghost" onClick={handleRedo} leftIcon={<Redo2 size={14} />}>重做</Button>
          <div className="flex-1" />
          <Button size="sm" variant="outline" onClick={handleSave} leftIcon={<Save size={14} />}>保存</Button>
          <Button size="sm" onClick={handleRun} leftIcon={<Play size={14} />}>运行</Button>
        </div>

        {/* Blockly inject target */}
        <div ref={blocklyDiv} className="flex-1 min-h-0" />
      </div>

      {/* Right: IR preview sidebar */}
      <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-sky-100 bg-slate-50 flex flex-col min-h-0">
        <div className="flex items-center gap-2 border-b border-sky-100 px-4 py-2.5">
          <Code2 size={16} className="text-sky-500" />
          <h3 className="text-sm font-semibold text-ink-700">指令协议 IR</h3>
          {ir && (
            <span className="ml-auto text-xs text-ink-400">{ir.commands.length} 条指令</span>
          )}
        </div>

        <div className="flex-1 overflow-auto p-4">
          {compileError ? (
            <div className="flex items-start gap-2 rounded-lg bg-error/10 p-3">
              <AlertCircle size={16} className="text-error mt-0.5 shrink-0" />
              <div className="text-sm text-error">{compileError}</div>
            </div>
          ) : ir ? (
            <pre className="rounded-lg bg-white border border-sky-100 p-3 font-mono text-xs text-ink-600 whitespace-pre-wrap break-all">
              {serializeProgram(ir)}
            </pre>
          ) : (
            <div className="text-center py-8">
              <Code2 size={32} className="mx-auto text-sky-200 mb-2" />
              <p className="text-sm text-ink-400">拖拽左侧积木开始编程</p>
              <p className="text-xs text-ink-400 mt-1">积木会实时编译为指令协议 IR</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
