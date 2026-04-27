import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDesignStore } from '../../../../stores/designStore'
import { useToast } from '../../../../components/common/Toast'

/**
 * Step 6: Motor auto-install animation.
 * Shows a sequence: text → motors appear one by one → celebration → done.
 */
export function MotorInstallStep() {
  const navigate = useNavigate()
  const toast = useToast()
  const activeDesign = useDesignStore(s => s.getActiveDesign())
  const [phase, setPhase] = useState<'preparing' | 'installing' | 'spinning' | 'done'>('preparing')
  const [motorsInstalled, setMotorsInstalled] = useState(0)

  const landingCount = activeDesign?.parts.filter(p => p.category === 'landing').length ?? 0

  // Animation sequence
  useEffect(() => {
    if (phase === 'preparing') {
      const t = setTimeout(() => setPhase('installing'), 800)
      return () => clearTimeout(t)
    }

    if (phase === 'installing') {
      if (motorsInstalled < landingCount) {
        const t = setTimeout(() => setMotorsInstalled(n => n + 1), 250)
        return () => clearTimeout(t)
      } else {
        const t = setTimeout(() => setPhase('spinning'), 300)
        return () => clearTimeout(t)
      }
    }

    if (phase === 'spinning') {
      const t = setTimeout(() => setPhase('done'), 1200)
      return () => clearTimeout(t)
    }
  }, [phase, motorsInstalled, landingCount])

  const handleSave = useCallback(() => {
    toast.push('success', '已保存')
  }, [toast])

  const handleExport = useCallback(() => {
    if (!activeDesign) return
    navigate(`/design/export-preview/${activeDesign.id}`)
  }, [activeDesign, navigate])

  const handleArFlight = useCallback(() => {
    if (!activeDesign) return
    navigate(`/design/ar-flight/${activeDesign.id}`)
  }, [activeDesign, navigate])

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      {phase === 'preparing' && (
        <p className="font-display text-[32px] font-semibold text-ink-900 animate-pulse">
          准备安装电机...
        </p>
      )}

      {phase === 'installing' && (
        <div className="space-y-4">
          <p className="font-display text-2xl font-semibold text-ink-900">
            正在安装电机
          </p>
          <div className="flex items-center justify-center gap-2">
            {Array.from({ length: landingCount }).map((_, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-full transition-all duration-300 flex items-center justify-center text-xs font-bold ${
                  i < motorsInstalled
                    ? 'bg-wood-500 text-white scale-100'
                    : 'bg-gray-200 text-gray-400 scale-75'
                }`}
              >
                {i < motorsInstalled ? '✓' : i + 1}
              </div>
            ))}
          </div>
          <p className="text-sm text-ink-400">
            {motorsInstalled} / {landingCount} 个电机已安装
          </p>
        </div>
      )}

      {phase === 'spinning' && (
        <div className="space-y-4">
          <p className="font-display text-2xl font-semibold text-ink-900">
            螺旋桨启动中...
          </p>
          <div className="text-4xl animate-spin" style={{ animationDuration: '0.5s' }}>
            ⟳
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div className="space-y-6">
          <div className="text-5xl mb-2">🎉</div>
          <p className="font-display text-[36px] font-semibold text-ink-900">
            飞机准备完毕！
          </p>
          <p className="text-base text-ink-600">
            所有 {landingCount} 个电机和螺旋桨已安装
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
            <button
              onClick={handleArFlight}
              className="inline-flex w-fit items-center gap-2 whitespace-nowrap px-5 py-2.5 text-sm font-medium text-wood-500 border border-wood-500/30 bg-paper-100 rounded-md hover:bg-paper-200 transition-colors"
            >
              AR 试飞
            </button>
            <button
              onClick={handleSave}
              className="inline-flex w-fit items-center whitespace-nowrap px-5 py-2.5 text-sm font-medium text-ink-900 border border-ink-200 rounded-md hover:bg-paper-100 transition-colors"
            >
              保存
            </button>
            <button
              onClick={handleExport}
              className="inline-flex w-fit items-center gap-2 whitespace-nowrap px-5 py-2.5 text-sm font-medium text-white bg-wood-500 rounded-md hover:brightness-[0.92] transition-all"
            >
              保存并导出 →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
