/**
 * CodingPage — 积木编程器。
 *
 * 左侧：Blockly 工作区（自定义无人机积木）
 * 右侧：默认「飞行计划」大白话预览，可切「开发者视图」看原始 IR
 *
 * 积木 → 编译为 IR → 仿真器 / 真机适配器消费（硬件解耦红线）。
 * 程序持久化：本地 programStore（离线优先，项目详情页/一键试飞/仿真交接读它）
 * + 登录后存账号（/api/programs，进页面回填）。
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
import { createProgram, getPrograms, updateProgram } from '../../utils/api'

// 自定义主题 + JSON 工具箱 + 分类图标注入（内部已 import './blocks' 注册积木）
import { DRONE_THEME, DRONE_TOOLBOX, applyCategoryIcons } from '../../blockly/blocklyTheme'
import '../../blockly/blocklyTheme.css'
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
  const token = useAuthStore(s => s.token)
  const isGuest = useAuthStore(s => s.user?.isGuest)

  const blocklyDiv = useRef<HTMLDivElement>(null)
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null)
  const [ir, setIr] = useState<CommandProgram | null>(null)
  const [compileError, setCompileError] = useState<string | null>(null)
  // 画布上真实的顶层积木数，决定是否显示空态引导（比"编译出的命令数"更准：
  // 残块/缺条件时命令数可能为 0，但画布并不空）。
  const [blockCount, setBlockCount] = useState(0)
  const [saving, setSaving] = useState(false)
  // 上次持久化的 XML，用于过滤掉点击/滚动等非内容变化事件
  const lastXmlRef = useRef('')

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

    // 更强的磁吸半径，让两块积木更容易「啪」地连成一串
    Blockly.config.snapRadius = 36
    Blockly.config.connectingSnapRadius = 36

    const ws = Blockly.inject(blocklyDiv.current, {
      toolbox: DRONE_TOOLBOX,
      grid: { spacing: 20, length: 3, colour: '#e0efff', snap: true },
      zoom: { controls: true, wheel: true, startScale: 0.9, maxScale: 2, minScale: 0.3 },
      trashcan: true,
      move: { scrollbars: true, drag: true, wheel: true },
      renderer: 'zelos',
      theme: DRONE_THEME,
    })

    workspaceRef.current = ws
    // 给分类图标 chip 注入白色 glyph（toolbox 已同步构建完成）
    applyCategoryIcons(blocklyDiv.current)

    // 恢复上次的程序（本地持久化）——离开编程页再回来不丢
    const savedXml = useProgramStore.getState().blocklyXml
    if (savedXml) {
      try {
        Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(savedXml), ws)
        lastXmlRef.current = savedXml
      } catch {
        // 损坏的 XML 忽略，从空白开始
      }
    }

    // Live compile on workspace change
    const onWorkspaceChange = () => {
      const topBlocks = ws.getTopBlocks(false).length
      setBlockCount(topBlocks)
      try {
        const { id, username } = metaRef.current
        const program = compileWorkspace(ws, {
          name: id ? `项目 ${id.slice(0, 6)}` : '未命名程序',
          author: username || '设计师',
        })
        setIr(program)
        setCompileError(null)

        const xml = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(ws))

        // 仅在「有真实积木」且内容变化时持久化：空画布的 XML 也是非空字符串，
        // 若持久化它，会让登录回填把"本地已有程序"误判为真，吞掉账号里的程序。
        if (topBlocks > 0 && xml !== lastXmlRef.current) {
          lastXmlRef.current = xml
          useProgramStore.getState().setProgram(xml, program)
        }
      } catch (err) {
        // 编译失败：清空 IR，确保「运行」被拦住，不会拿旧程序去跑（如拖了第二个「开始」）
        setIr(null)
        setCompileError(err instanceof Error ? err.message : '编译错误')
      }
    }

    ws.addChangeListener(onWorkspaceChange)
    onWorkspaceChange() // 初始编译一次：恢复的程序立即显示在预览里

    return () => {
      ws.removeChangeListener(onWorkspaceChange)
      ws.dispose()
      workspaceRef.current = null
    }
  }, [])

  // 登录后从账号回填：本地工作区为空时，把后端最近一次保存的程序拉回来（跨设备/新设备还原）
  useEffect(() => {
    if (!token || isGuest) return
    let cancelled = false
    getPrograms().then(res => {
      if (cancelled || !res.success || !res.data || res.data.length === 0) return
      const latest = res.data[0] // 后端按 updatedAt 倒序
      const ws = workspaceRef.current
      if (!ws) return
      // 本地是否已有「真实程序」（按编译后的命令数判断，避免空画布 XML 误判）
      const local = useProgramStore.getState().commandProgram
      const hasLocal = !!local && local.commands.length > 0
      // 仅当本地为空才回填账号程序并认领其 serverId；本地有草稿时不动，
      // 也不认领后端 id（否则下次保存会 PATCH 覆盖账号里那条已有程序）。
      if (!hasLocal) {
        try {
          ws.clear()
          Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(latest.blocklyXml), ws)
          lastXmlRef.current = latest.blocklyXml
          useProgramStore.getState().setProgram(latest.blocklyXml, latest.commandProgram)
          useProgramStore.getState().setServerId(latest.id)
        } catch {
          // 损坏的 XML 忽略
        }
      }
    })
    return () => {
      cancelled = true
    }
  }, [token, isGuest])

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

  const handleSave = useCallback(async () => {
    if (!ir || !workspaceRef.current) {
      toast.push('error', '请先拼出程序再保存')
      return
    }
    const xml = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspaceRef.current))
    // 先本地缓存（离线优先，项目详情页据此预览）
    useProgramStore.getState().setProgram(xml, ir)

    // 游客 / 未登录：仅本地保存
    if (!token || isGuest) {
      toast.push('success', '已本地保存（登录后可同步到账号）')
      return
    }

    setSaving(true)
    const name = ir.metadata?.name || '未命名程序'
    const payload = { name, blocklyXml: xml, commandProgram: ir }
    const serverId = useProgramStore.getState().serverId

    let res = serverId
      ? await updateProgram(serverId, payload)
      : await createProgram(payload)
    // serverId 已失效（记录被删）→ 退回新建，避免保存永久失败
    if (serverId && !res.success) {
      res = await createProgram(payload)
    }
    setSaving(false)

    if (res.success && res.data) {
      useProgramStore.getState().setServerId(res.data.id)
      toast.push('success', '程序已保存到账号')
    } else {
      toast.push('error', res.error || '保存到账号失败（已本地保存）')
    }
  }, [ir, token, isGuest, toast])

  const handleRun = useCallback(() => {
    const ws = workspaceRef.current
    if (!ir || ir.commands.length === 0 || !ws) {
      toast.push('error', '请先拼出程序再运行')
      return
    }
    // 运行前从工作区重新序列化，确保交接给仿真页的是最新积木（不依赖可能滞后的 state）
    const xml = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(ws))
    useProgramStore.getState().setProgram(xml, ir)
    navigate(id ? `/simulator/${id}` : '/simulator')
  }, [ir, navigate, id, toast])

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
          <Button size="sm" variant="outline" onClick={handleSave} disabled={saving} leftIcon={<Save size={14} />}>{saving ? '保存中…' : '保存'}</Button>
          <Button size="sm" onClick={handleRun} leftIcon={<Play size={14} />}>运行</Button>
        </div>

        {/* Blockly inject target + empty-state guide overlay。
            coding-blockly-shell 把 blocklyTheme.css 的作用域限定在编程页。 */}
        <div className="relative flex-1 min-h-0">
          <div ref={blocklyDiv} className="coding-blockly-shell absolute inset-0" />
          {isEmpty && <EmptyCanvasGuide onLoadExample={handleLoadExample} />}
        </div>
      </div>

      {/* Right: flight-plan preview (default) / developer IR view */}
      <FlightPlanPanel ir={ir} compileError={compileError} />
    </div>
  )
}
