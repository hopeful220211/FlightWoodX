import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { ScrollReveal } from '../../components/common/ScrollReveal'
import type { CheckResult } from '../../utils/exportChecks'
import { calculateScore, getScoreLabel } from '../../utils/exportChecks'

interface FlightCheckReportProps {
  checks: CheckResult[]
}

const LEVEL_ICON = {
  pass: <CheckCircle2 size={18} className="text-accent-leaf shrink-0" />,
  warning: <AlertTriangle size={18} className="text-accent-gold shrink-0" />,
  error: <XCircle size={18} className="text-[#E04545] shrink-0" />,
}

const LEVEL_BG = {
  pass: 'bg-accent-leaf/10',
  warning: 'bg-accent-gold/10',
  error: 'bg-[#E04545]/10',
}

export function FlightCheckReport({ checks }: FlightCheckReportProps) {
  const score = calculateScore(checks)
  const { text: scoreLabel, color: scoreColor } = getScoreLabel(score)
  const passed = checks.filter(c => c.level === 'pass').length
  const warnings = checks.filter(c => c.level === 'warning').length
  const errors = checks.filter(c => c.level === 'error').length

  return (
    <section className="py-12 lg:py-16 bg-white">
      <div className="mx-auto max-w-5xl px-4">
        <ScrollReveal>
          <h2 className="font-display text-3xl lg:text-[40px] font-semibold text-ink-900">飞行检查报告</h2>
        </ScrollReveal>

        {/* Score */}
        <ScrollReveal delay={100}>
          <div className="mt-8 flex items-center gap-6">
            <div className="w-24 h-24 rounded-lg bg-paper-100 flex flex-col items-center justify-center">
              <span className={`font-display text-4xl font-semibold ${scoreColor}`}>{score}</span>
              <span className={`text-sm font-medium ${scoreColor}`}>{scoreLabel}</span>
            </div>
            <div className="text-sm text-ink-600 space-y-1">
              <p className="text-accent-leaf">✅ {passed} 项已通过</p>
              {warnings > 0 && <p className="text-accent-gold">⚠️ {warnings} 项建议改进</p>}
              {errors > 0 && <p className="text-[#E04545]">❌ {errors} 项必须修复</p>}
            </div>
          </div>
        </ScrollReveal>

        {/* Check list */}
        <ScrollReveal delay={200}>
          <div className="mt-8 space-y-2">
            {checks.map(check => (
              <div
                key={check.id}
                className={`flex items-start gap-3 px-4 py-3 rounded-md ${LEVEL_BG[check.level]}`}
              >
                {LEVEL_ICON[check.level]}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-900">{check.title}</p>
                  {check.detail && <p className="text-xs text-ink-600 mt-0.5">{check.detail}</p>}
                  {check.fixHint && check.level !== 'pass' && (
                    <p className="text-xs text-ink-400 mt-0.5">💡 {check.fixHint}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
