import { useMemo } from 'react'
import { useDesignStore } from '../../../stores/designStore'
import { calculateWeight, getWeightColor, getWeightTextColor } from '../../../utils/realtimeChecks'

const WEIGHT_LIMIT = 35

/**
 * Always-visible weight progress bar at the top of the design workspace.
 * Colors change at 70% / 90% / 100% thresholds. Flashes red above 100%.
 */
export function WeightBar() {
  const activeDesign = useDesignStore(s => s.getActiveDesign())
  const parts = activeDesign?.parts ?? []

  const weight = useMemo(() => calculateWeight(parts), [parts])
  const pct = Math.min((weight / WEIGHT_LIMIT) * 100, 120)
  const barColor = getWeightColor(weight)
  const textColor = getWeightTextColor(weight)
  const isOver = weight > WEIGHT_LIMIT

  return (
    <div className="px-4 py-2 bg-white border-b border-gray-100">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-ink-600">
          当前装机：<span className={`font-semibold ${textColor}`}>{weight.toFixed(1)}g</span> / {WEIGHT_LIMIT}g
        </span>
        <span className={`font-semibold ${textColor}`}>
          {Math.round(pct > 100 ? 100 : pct)}%
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor} ${isOver ? 'animate-pulse' : ''}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  )
}
