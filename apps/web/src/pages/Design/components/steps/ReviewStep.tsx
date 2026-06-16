import { useMemo } from 'react'
import { Weight, Gauge, Scaling, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { useDesignStore } from '../../../../stores/designStore'
import {
  calculateStats,
  getWeightLabel,
  getThrustLabel,
  getSymmetryLabel,
  getFlightTimeLabel,
} from '../../../../utils/designStats'

/** 单项体检指标的可视化卡：图标 + 名称 + 读数 + 一条彩色仪表 + 大白话结论。 */
function MetricCard({
  icon,
  name,
  value,
  fillPct,
  label,
  ok,
}: {
  icon: React.ReactNode
  name: string
  value: string
  fillPct: number
  label: string
  ok: boolean
}) {
  const barColor = ok ? 'bg-green-500' : 'bg-accent-gold'
  const labelColor = ok ? 'text-green-600' : 'text-accent-gold'
  return (
    <div className="rounded-xl bg-white ring-1 ring-gray-100 p-3">
      <div className="flex items-center gap-2">
        <span className="text-sky-400">{icon}</span>
        <span className="text-xs text-gray-500">{name}</span>
        <span className="ml-auto text-sm font-bold text-ink-900 tabular-nums">{value}</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${barColor}`}
          style={{ width: `${Math.max(4, Math.min(100, fillPct))}%` }}
        />
      </div>
      <p className={`mt-1.5 text-xs font-medium ${labelColor}`}>{label}</p>
    </div>
  )
}

/**
 * 第 5 步「检查飞行能力」的友好体检报告（RFC-012-A G3）。
 * 把重量 / 推重比 / 对称性 / 续航四项做成可视化仪表 + 大白话结论，
 * 顶部给一个「能飞 / 还差点」总判定。重量口径与顶部重量条统一（calculateStats 内部复用 calculateWeight）。
 */
export function ReviewStep() {
  const parts = useDesignStore((s) => s.getActiveDesign()?.parts)

  const { stats, weight, thrust, symmetry, flight, canFly } = useMemo(() => {
    const p = parts ?? []
    const stats = calculateStats(p)
    const weight = getWeightLabel(stats.totalWeightG)
    const thrust = getThrustLabel(stats.thrustWeightRatio)
    const symmetry = getSymmetryLabel(stats.symmetryPercent)
    const flight = getFlightTimeLabel(stats.estimatedFlightMinutes)
    // 总判定：三项飞行关键指标（重量 / 推力 / 对称）都过关才算「能飞」
    const canFly = weight.ok && thrust.ok && symmetry.ok
    return { stats, weight, thrust, symmetry, flight, canFly }
  }, [parts])

  const tips = [
    !weight.ok && '减一点重量（少装几个零件或换轻一点的）',
    !thrust.ok && '多装几个机臂/电机，推力会更足',
    !symmetry.ok && '让零件左右对称一些，重心更稳',
  ].filter(Boolean) as string[]

  return (
    <div className="p-4 space-y-3">
      {/* 总判定 */}
      <div
        className={`rounded-2xl p-4 text-center ${
          canFly ? 'bg-green-50 ring-1 ring-green-200' : 'bg-amber-50 ring-1 ring-amber-200'
        }`}
      >
        <div className="flex items-center justify-center gap-2">
          {canFly ? (
            <CheckCircle2 size={22} className="text-green-500" />
          ) : (
            <AlertCircle size={22} className="text-accent-gold" />
          )}
          <span className={`text-lg font-extrabold ${canFly ? 'text-green-600' : 'text-accent-gold'}`}>
            {canFly ? '能飞了！' : '还差一点'}
          </span>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          {canFly ? '四项检查都不错，去试飞吧' : '按下面提示调一调就能飞'}
        </p>
      </div>

      {/* 四项体检 */}
      <div className="space-y-2.5">
        <MetricCard
          icon={<Weight size={15} />}
          name="重量"
          value={`${stats.totalWeightG.toFixed(1)}g`}
          fillPct={(stats.totalWeightG / 35) * 100}
          label={weight.text}
          ok={weight.ok}
        />
        <MetricCard
          icon={<Gauge size={15} />}
          name="推重比"
          value={stats.thrustWeightRatio !== null ? `${stats.thrustWeightRatio}` : '—'}
          fillPct={stats.thrustWeightRatio !== null ? (stats.thrustWeightRatio / 2) * 100 : 0}
          label={thrust.text}
          ok={thrust.ok}
        />
        <MetricCard
          icon={<Scaling size={15} />}
          name="对称性"
          value={`${stats.symmetryPercent}%`}
          fillPct={stats.symmetryPercent}
          label={symmetry.text}
          ok={symmetry.ok}
        />
        <MetricCard
          icon={<Clock size={15} />}
          name="续航估算"
          value={stats.estimatedFlightMinutes !== null ? `${stats.estimatedFlightMinutes} 分钟` : '—'}
          fillPct={stats.estimatedFlightMinutes !== null ? (stats.estimatedFlightMinutes / 12) * 100 : 0}
          label={flight.text}
          ok={flight.ok}
        />
      </div>

      {/* 改进提示 */}
      {tips.length > 0 && (
        <div className="rounded-xl bg-sky-50 p-3">
          <p className="text-xs font-semibold text-sky-700 mb-1">小提示</p>
          <ul className="space-y-1">
            {tips.map((t, i) => (
              <li key={i} className="text-xs text-sky-600 flex gap-1.5">
                <span className="text-sky-400">·</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
