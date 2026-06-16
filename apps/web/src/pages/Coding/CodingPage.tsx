/**
 * CodingPage — 积木编程器。
 *
 * 左侧：Blockly 工作区（自定义无人机积木）
 * 右侧：默认「飞行计划」大白话预览，可切「开发者视图」看原始 IR
 *
 * 积木 → 编译为 IR → 仿真器 / 真机适配器消费（硬件解耦红线）。
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as Blockly from 'blockly'
import 'blockly/blocks'
import { Play, Save, Undo2, Redo2, ListTree } from 'lucide-react'
import { Button } from '../../components/common/Button'
import { useToast } from '../../components/common/Toast'
import { useAuthStore } from '../../stores/authStore'
import { useProgramStore } from '../../stores/programStore'

// Register custom blocks + get toolbox XML
import { DRONE_TOOLBOX } from '../../blockly/blocks'
import { compileWorkspace } from '../../blockly/compiler'
import { EXAMPLE_PROGRAM_XML } from '../../blockly/exampleProgram'
import { FlightPlanPanel } from './components/FlightPlanPanel'
import { EmptyCanvasGuide } from './components/EmptyCanvasGuide'
import type { CommandProgram } from '@fwx/shared'

export function CodingPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const user = useAuthStore(s => s.user)
  const setProgram = useProgramStore(s => s.setProgram)

  const blocklyDiv = useRef<HTMLDivElement>(null)
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null)
  const [ir, setIr] = useState<CommandProgram | null>(null)
  const [compileError, setCompileError] = useState<string | null>(null)
  const [blocklyXml, setBlocklyXml] = useState<string>('')
  // 画布上真实的顶层积木数，决定是否显示空态引导（比"编译出的命令数"更准：
  // 残块/缺条件时命令数可能为 0，但画布并不空）。
  const [blockCount, setBlockCount] = useState(0)

  // 编译元数据（项目名/作者）放 ref，让它随 id/登录态更新，
  // 但**不触发 Blockly 重新 inject**（否则会清空孩子拖好的积木）。
  const metaRef = useRef({ id, username: user?.username })
  useEffect(() => {
    metaRef.current = { id, username: user?.username }
  }, [id, user?.username])

  const isEmpty = blockCount === 0

  // Initialize Blockly workspace（只在挂载时 inject 一次）
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
      setBlockCount(ws.getTopBlocks(false).length)
      try {
        const { id, username } = metaRef.current
        const program = compileWorkspace(ws, {
          name: id ? `项目 ${id.slice(0, 6)}` : '未命名程序',
          author: username || '设计师',
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
  }, [])

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

  // 整理画布：把散乱的积木竖直对齐排好
  const handleCleanup = useCallback(() => {
    workspaceRef.current?.cleanUp()
  }, [])

  // 「从示例开始」：仅在空画布载入示例，避免和已有积木叠加
  const handleLoadExample = useCallback(() => {
    const ws = workspaceRef.current
    if (!ws) return
    if (ws.getTopBlocks(false).length > 0) return
    const dom = Blockly.utils.xml.textToDom(EXAMPLE_PROGRAM_XML)
    Blockly.Xml.domToWorkspace(dom, ws)
  }, [])

  const handleSave = useCallback(() => {
    // TODO M3: save Program to backend (blocklyXml + ir)
    toast.push('success', '程序已保存')
  }, [toast])

  const handleRun = useCallback(() => {
    if (!ir || ir.commands.length === 0) {
      toast.push('error', '请先拼出程序再运行')
      return
    }
    // 把 IR 交给仿真页（运行交接 store），再跳转到仿真入口
    setProgram(ir, blocklyXml)
    navigate(id ? `/simulator/${id}` : '/simulator')
  }, [ir, blocklyXml, setProgram, navigate, id, toast])

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Left: Blockly workspace */}
      <div className="flex-1 flex flex-col min-w-0 min-h-[280px]">
        {/* Toolbar */}
        <div className="flex items-center gap-2 border-b border-sky-100 bg-white px-4 py-2">
          <Button size="sm" variant="ghost" onClick={handleUndo} leftIcon={<Undo2 size={14} />}>撤销</Button>
          <Button size="sm" variant="ghost" onClick={handleRedo} leftIcon={<Redo2 size={14} />}>重做</Button>
          <Button size="sm" variant="ghost" onClick={handleCleanup} leftIcon={<ListTree size={14} />}>整理</Button>
          <div className="flex-1" />
          <Button size="sm" variant="outline" onClick={handleSave} leftIcon={<Save size={14} />}>保存</Button>
          <Button size="sm" onClick={handleRun} leftIcon={<Play size={14} />}>运行</Button>
        </div>

        {/* Blockly inject target + empty-state guide overlay */}
        <div className="relative flex-1 min-h-0">
          <div ref={blocklyDiv} className="absolute inset-0" />
          {isEmpty && <EmptyCanvasGuide onLoadExample={handleLoadExample} />}
        </div>
      </div>

      {/* Right: flight-plan preview (default) / developer IR view */}
      <FlightPlanPanel ir={ir} compileError={compileError} />
    </div>
  )
}
