/**
 * SimulatorPage — 仿真试飞。
 *
 * 消费 CommandProgram IR → SimAdapter 执行 → Three.js 场景渲染飞行。
 * 支持：运行/暂停/重置、遥测 HUD、飞行轨迹、障碍物、RunResult 事件日志。
 */
import { useCallback, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Play, Pause, RotateCcw, Eye, Activity, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '../../components/common/Button'
import { useToast } from '../../components/common/Toast'
import { FlightScene } from '../../simulator/FlightScene'
import { SimAdapter, type SimObstacle } from '../../simulator/SimAdapter'
import type { Telemetry, RunResult, CommandProgram } from '@fwx/shared'
import { COMMAND_PROTOCOL_VERSION } from '@fwx/shared'
import { useProgramStore } from '../../stores/programStore'

/** Demo obstacles for the default scene */
const DEFAULT_OBSTACLES: SimObstacle[] = [
  { posCm: [0, 0, 200], radiusCm: 30 },
  { posCm: [100, 0, 350], radiusCm: 25 },
  { posCm: [-80, 0, 500], radiusCm: 35 },
]

/** Demo program: takeoff → fly forward → avoid obstacle → land */
const DEMO_PROGRAM: CommandProgram = {
  version: COMMAND_PROTOCOL_VERSION,
  metadata: { name: '示例飞行', author: '系统', createdAt: new Date().toISOString() },
  commands: [
    { type: 'takeoff', params: { altitudeCm: 100 } },
    { type: 'move', params: { direction: 'forward', distanceCm: 150, speedCmS: 40 } },
    { type: 'led', params: { r: 0, g: 255, b: 0 } },
    { type: 'hover', params: { durationMs: 500 } },
    { type: 'rotate', params: { degrees: 90 } },
    { type: 'move', params: { direction: 'forward', distanceCm: 100, speedCmS: 30 } },
    { type: 'rotate', params: { degrees: -90 } },
    { type: 'move', params: { direction: 'forward', distanceCm: 200, speedCmS: 40 } },
    { type: 'led', params: { r: 0, g: 0, b: 255 } },
    { type: 'land' },
  ],
}

export function SimulatorPage() {
  const { id } = useParams()
  const toast = useToast()

  const adapterRef = useRef<SimAdapter | null>(null)
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null)
  const [trail, setTrail] = useState<[number, number, number][]>([])
  const [ledColor, setLedColor] = useState<[number, number, number]>([0, 0, 0])
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<RunResult | null>(null)
  const [currentCmdIndex, setCurrentCmdIndex] = useState(-1)

  const handleRun = useCallback(async () => {
    // 优先运行用户在编程器里真实保存的程序；没有则回退示例飞行。
    const saved = useProgramStore.getState().commandProgram
    const program = saved && saved.commands.length > 0 ? saved : DEMO_PROGRAM
    if (program === DEMO_PROGRAM) {
      toast.push('info', '未找到已保存的程序，运行示例飞行')
    }

    const adapter = new SimAdapter({
      speed: 1,
      obstacles: DEFAULT_OBSTACLES,
      tickMs: 50,
    })
    adapterRef.current = adapter

    setRunning(true)
    setResult(null)
    setTrail([])
    setLedColor([0, 0, 0])
    setCurrentCmdIndex(-1)

    await adapter.execute(program, {
      onCommandStart: (index) => {
        setCurrentCmdIndex(index)
      },
      onTelemetry: (t) => {
        setTelemetry({ ...t })
        setTrail(prev => [...prev, [...t.posCm]])
        // Check for LED changes from adapter state
        const state = adapter.getState()
        setLedColor([...state.ledColor])
      },
      onFinish: (r) => {
        setResult(r)
        setRunning(false)
        toast.push(r.success ? 'success' : 'error', r.success ? '飞行完成！' : '飞行中止')
      },
    })
  }, [toast])

  const handleStop = useCallback(() => {
    adapterRef.current?.stop()
    setRunning(false)
  }, [])

  const handleReset = useCallback(() => {
    adapterRef.current?.stop()
    setRunning(false)
    setResult(null)
    setTelemetry(null)
    setTrail([])
    setLedColor([0, 0, 0])
    setCurrentCmdIndex(-1)
  }, [])

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-sky-100 bg-white px-4 py-2">
        <div className="flex items-center gap-2">
          {!running ? (
            <Button size="sm" onClick={handleRun} leftIcon={<Play size={14} />}>
              {result ? '重新运行' : '运行'}
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={handleStop} leftIcon={<Pause size={14} />}>
              停止
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={handleReset} leftIcon={<RotateCcw size={14} />}>
            重置
          </Button>
        </div>

        {/* Telemetry HUD */}
        {telemetry && (
          <div className="hidden sm:flex items-center gap-4 text-xs font-mono text-ink-600">
            <span className="inline-flex items-center gap-1">
              <Activity size={12} className="text-sky-400" />
              X:{telemetry.posCm[0].toFixed(0)} Y:{telemetry.posCm[1].toFixed(0)} Z:{telemetry.posCm[2].toFixed(0)}
            </span>
            <span>H:{telemetry.headingDeg.toFixed(0)}°</span>
            <span>前方:{telemetry.frontDistanceCm.toFixed(0)}cm</span>
            {currentCmdIndex >= 0 && <span className="text-sky-500">指令 #{currentCmdIndex + 1}</span>}
          </div>
        )}

        <div className="flex items-center gap-2">
          {result && (
            <span className={`inline-flex items-center gap-1 text-xs font-medium ${result.success ? 'text-success' : 'text-error'}`}>
              {result.success ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              {result.success ? '完成' : '中止'}
            </span>
          )}
        </div>
      </div>

      {/* 3D Scene */}
      <div className="flex-1 relative min-h-0">
        <FlightScene
          telemetry={telemetry}
          obstacles={DEFAULT_OBSTACLES}
          trail={trail}
          ledColor={ledColor}
        />

        {/* Event log overlay */}
        {result && result.events.length > 0 && (
          <div className="absolute bottom-4 left-4 max-w-xs max-h-40 overflow-auto rounded-xl bg-white/90 backdrop-blur border border-sky-100 p-3 shadow-soft">
            <h4 className="text-xs font-semibold text-ink-700 mb-1">飞行日志 ({result.events.length})</h4>
            <ul className="space-y-0.5">
              {result.events.map((evt, i) => (
                <li key={i} className="text-xs text-ink-500 font-mono">{evt}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
