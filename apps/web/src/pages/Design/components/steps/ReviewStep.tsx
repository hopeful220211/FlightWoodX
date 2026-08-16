import { useMemo } from 'react'
import { Weight, Gauge, Scaling, Clock, CheckCircle2, AlertCircle, Rocket } from 'lucide-react'
import { useDesignStore } from '../../../../stores/designStore'
import {
  calculateStats,
  getWeightLabel,
  getSymmetryLabel,
  getFlightTimeLabel,
} from '../../../../utils/designStats'
import { flightReadiness } from '../../../../utils/flightReadiness'

const CORAL = '#E0653B' // 失败用珊瑚红，不用金黄/琥珀（RFC-022 §3）

/** 单项体检卡：图标 + 儿童词（科学词小字）+ 读数 + 彩色仪表 + 大白话结论。 */
function MetricCard({
  icon,
  name,
  sci,
  value,
  fillPct,
  label,
  ok,
}: {
  icon: React.ReactNode
  name: string
  sci?: string
  value: string
  fillPct: number
  label: string
  ok: boolean
}) {
  return (
    <div className="rounded-xl bg-white ring-1 ring-gray-100 p-3">
      <div className="flex items-center gap-2">
        <span className="text-sky-400">{icon}</span>
        <span className="text-xs font-medium text-gray-600">{name}</span>
        {sci && <span className="text-[10px] text-gray-400">{sci}</span>}
        <span className="ml-auto text-sm font-bold text-ink-900 tabular-nums">{value}</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${Math.max(4, Math.min(100, fillPct))}%`,
            backgroundColor: ok ? '#22C55E' : CORAL,
          }}
        />
      </div>
      <p className="mt-1.5 text-xs font-medium" style={{ color: ok ? '#16A34A' : CORAL }}>
        {label}
      </p>
    </div>
  )
}

/**
 * 第 5 步结构检查报告。真实飞行结论必须另外传入已验证的硬件证据。
 * 儿童词在前、科学词小字在后；总判定接 flightReadiness；失败用蓝/珊瑚红、不用金黄；
 * 空设计显占位 + 下一步动作提示。
 */
export function ReviewStep() {
  const parts = useDesignStore((s) => s.getActiveDesign()?.parts)

  const { stats, weight, symmetry, flight, readiness, isEmpty } = useMemo(() => {
    const p = parts ?? []
    const stats = calculateStats(p)
    return {
      stats,
      weight: getWeightLabel(stats.totalWeightG),
      symmetry: getSymmetryLabel(stats.symmetryPercent),
      flight: getFlightTimeLabel(stats.estimatedFlightMinutes),
      readiness: flightReadiness(p),
      isEmpty: p.length === 0,
    }
  }, [parts])

  if (isEmpty) {
    return (
      <div className="p-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-sky-50 text-sky-400">
          <Rocket size={26} />
        </div>
        <p className="text-sm font-semibold text-ink-900">还没有可以检查的飞机</p>
        <p className="mt-1.5 text-xs text-gray-500">先装主板和 4 个起落架，再检查装配结构</p>
      </div>
    )
  }

  const ratio = stats.thrustWeightRatio
  const powerOk = ratio !== null && ratio >= 2
  const powerLabel =
    ratio === null
      ? '还没有动力点，先装 4 个起落架'
      : ratio >= 2
        ? '动力够强'
        : ratio >= 1.5
          ? '快够了，再轻一点'
          : '动力不够'

  return (
    <div className="p-4 space-y-3">
      {/* 总判定（接 flightReadiness） */}
      <div
        className={`rounded-2xl p-4 text-center ring-1 ${
          readiness.canTakeoff ? 'bg-green-50 ring-green-200' : 'bg-sky-50 ring-sky-200'
        }`}
      >
        <div className="flex items-center justify-center gap-2">
          {readiness.canTakeoff ? (
            <CheckCircle2 size={22} className="text-green-500" />
          ) : (
            <AlertCircle size={22} className="text-sky-500" />
          )}
          <span
            className={`text-lg font-extrabold ${
              readiness.canTakeoff ? 'text-green-600' : 'text-sky-700'
            }`}
          >
            {readiness.canTakeoff ? '都检查好了' : '还差一点'}
          </span>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          {readiness.canTakeoff
            ? `已通过 ${readiness.passedCount}/${readiness.totalChecks} 项已验证条件`
            : readiness.primaryFix ?? '当前只完成装配检查'}
        </p>
      </div>

      {/* 四项体检（儿童词在前） */}
      <div className="space-y-2.5">
        <MetricCard
          icon={<Weight size={15} />}
          name="身体轻不轻"
          sci="重量"
          value={`${stats.totalWeightG.toFixed(1)}g`}
          fillPct={(stats.totalWeightG / 35) * 100}
          label={weight.text}
          ok={weight.ok}
        />
        <MetricCard
          icon={<Gauge size={15} />}
          name="动力数据"
          sci="实测推重比"
          value={ratio !== null ? `${ratio}` : '—'}
          fillPct={ratio !== null ? (ratio / 2) * 100 : 0}
          label={powerLabel}
          ok={powerOk}
        />
        <MetricCard
          icon={<Scaling size={15} />}
          name="左右平不平"
          sci="对称性"
          value={`${stats.symmetryPercent}%`}
          fillPct={stats.symmetryPercent}
          label={symmetry.text}
          ok={symmetry.ok}
        />
        <MetricCard
          icon={<Clock size={15} />}
          name="续航数据"
          sci="实测续航"
          value={stats.estimatedFlightMinutes !== null ? `${stats.estimatedFlightMinutes} 分钟` : '—'}
          fillPct={stats.estimatedFlightMinutes !== null ? (stats.estimatedFlightMinutes / 12) * 100 : 0}
          label={stats.estimatedFlightMinutes !== null ? flight.text : '缺少电池和动力实测数据'}
          ok={flight.ok && stats.estimatedFlightMinutes !== null}
        />
      </div>

      {/* 一条主建议（动力够不够 = 总推力 ÷ 总重量） */}
      {!readiness.canTakeoff && readiness.primaryFix && (
        <div className="rounded-xl bg-sky-50 p-3">
          <p className="text-xs font-semibold text-sky-700 mb-0.5">先调这一处</p>
          <p className="text-xs text-sky-600">{readiness.primaryFix}</p>
        </div>
      )}
    </div>
  )
}
