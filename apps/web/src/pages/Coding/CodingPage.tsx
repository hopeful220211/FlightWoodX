/**
 * CodingPage — 积木编程器。
 *
 * 左侧：Blockly 工作区（自定义无人机积木）
 * 右侧：实时编译的 CommandProgram IR 预览
 *
 * 积木 → 编译为 IR → 仿真器 / 真机适配器消费（硬件解耦红线）。
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
import { useProgramStore } from '../../stores/programStore'
import { createProgram, getPrograms, updateProgram } from '../../utils/api'

export function CodingPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const user = useAuthStore(s => s.user)
  const token = useAuthStore(s => s.token)
  const isGuest = useAuthStore(s => s.user?.isGuest)
  const [saving, setSaving] = useState(false)

  const blocklyDiv = useRef<HTMLDivElement>(null)
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null)
  const [ir, setIr] = useState<CommandProgram | null>(null)
  const [compileError, setCompileError] = useState<string | null>(null)
  // 上次持久化的 XML，用于过滤掉点击/滚动等非内容变化事件
  const lastXmlRef = useRef('')

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

    // 恢复上次的程序（本地持久化）——离开编程页再回来不丢
    const savedXml = useProgramStore.getState().blocklyXml
    if (savedXml) {
      try {
        Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(savedXml), ws)
      } catch {
        // 损坏的 XML 忽略，从空白开始
      }
    }

    // Live compile on workspace change
    const onWorkspaceChange = () => {
      try {
        const program = compileWorkspace(ws, {
          name: id ? `项目 ${id.slice(0, 6)}` : '未命名程序',
          author: user?.username || '设计师',
        })
        setIr(program)
        setCompileError(null)

        // 序列化当前积木 XML
        const xml = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(ws))

        // 仅在积木内容真正变化时持久化（项目详情页据此显示编程预览）
        if (xml !== lastXmlRef.current) {
          lastXmlRef.current = xml
          useProgramStore.getState().setProgram(xml, program)
        }
      } catch (err) {
        setCompileError(err instanceof Error ? err.message : '编译错误')
      }
    }

    ws.addChangeListener(onWorkspaceChange)
    onWorkspaceChange() // 初始编译一次：恢复的程序立即显示在 IR 预览里

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

  // 登录后从账号回填：本地工作区为空时，把后端最近一次保存的程序拉回来（跨设备/新设备还原）。
  useEffect(() => {
    if (!token || isGuest) return
    let cancelled = false

    getPrograms().then(res => {
      if (cancelled || !res.success || !res.data || res.data.length === 0) return
      const latest = res.data[0] // 后端按 updatedAt 倒序
      const ws = workspaceRef.current
      if (!ws) return

      // 本地已有内容则不覆盖（本地是离线工作副本）；仅认领 serverId 让后续保存走 PATCH。
      const hasLocal = useProgramStore.getState().blocklyXml.trim() !== ''
      if (!hasLocal) {
        try {
          ws.clear()
          Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(latest.blocklyXml), ws)
          lastXmlRef.current = latest.blocklyXml
          useProgramStore.getState().setProgram(latest.blocklyXml, latest.commandProgram)
        } catch {
          // 损坏的 XML 忽略
        }
      }
      useProgramStore.getState().setServerId(latest.id)
    })

    return () => {
      cancelled = true
    }
  }, [token, isGuest])

  const handleUndo = useCallback(() => {
    workspaceRef.current?.undo(false)
  }, [])

  const handleRedo = useCallback(() => {
    workspaceRef.current?.undo(true)
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
    if (!ir) {
      toast.push('error', '请先拼出程序再运行')
      return
    }
    // 把最新程序落到本地缓存，仿真器从中读取真实 IR 后跳转试飞
    if (workspaceRef.current) {
      const xml = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspaceRef.current))
      useProgramStore.getState().setProgram(xml, ir)
    }
    navigate('/simulator')
  }, [ir, navigate, toast])

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Left: Blockly workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-2 border-b border-sky-100 bg-white px-4 py-2">
          <Button size="sm" variant="ghost" onClick={handleUndo} leftIcon={<Undo2 size={14} />}>撤销</Button>
          <Button size="sm" variant="ghost" onClick={handleRedo} leftIcon={<Redo2 size={14} />}>重做</Button>
          <div className="flex-1" />
          <Button size="sm" variant="outline" onClick={handleSave} disabled={saving} leftIcon={<Save size={14} />}>{saving ? '保存中…' : '保存'}</Button>
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
