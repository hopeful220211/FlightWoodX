import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, XCircle } from 'lucide-react'
import { ScrollReveal } from '../../components/common/ScrollReveal'
import { useToast } from '../../components/common/Toast'
import { useAuthStore } from '../../stores/authStore'
import { exportDesignCad } from '../../utils/api'
import type { CheckResult } from '../../utils/exportChecks'
import type { Design } from '../../types/design'

interface ExportActionsProps {
  checks: CheckResult[]
  design: Design
}

export function ExportActions({ checks, design }: ExportActionsProps) {
  const navigate = useNavigate()
  const toast = useToast()
  const user = useAuthStore(s => s.user)
  const hasBlockingErrors = checks.some(c => c.level === 'error')
  const errorCount = checks.filter(c => c.level === 'error').length
  const [exporting, setExporting] = useState(false)
  const [exported, setExported] = useState(false)

  const handleExport = async () => {
    if (hasBlockingErrors || exporting) return
    setExporting(true)

    const result = await exportDesignCad(
      design.id,
      {
        name: design.name,
        parts: design.parts,
        updatedAt: design.updatedAt,
        checkResults: checks.map(c => ({ id: c.id, level: c.level })),
      },
      user?.username ?? '设计师',
    )

    if (result.success) {
      // Trigger browser download
      const url = URL.createObjectURL(result.blob)
      const a = document.createElement('a')
      a.href = url
      a.download = result.fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.push('success', 'ZIP 已下载')
      setExported(true)
      setTimeout(() => setExported(false), 3000)
    } else {
      toast.push('error', result.error)
    }

    setExporting(false)
  }

  return (
    <section className="py-12 lg:py-16 bg-white">
      <div className="mx-auto max-w-5xl px-4">
        <ScrollReveal>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/design')}
              className="inline-flex w-fit items-center whitespace-nowrap px-6 py-3 text-sm font-medium text-ink-900 border border-ink-200 rounded-md hover:bg-paper-100 transition-colors"
            >
              返回继续修改
            </button>
            <button
              onClick={handleExport}
              disabled={hasBlockingErrors || exporting}
              className="group inline-flex w-fit items-center gap-2 whitespace-nowrap px-6 py-3 text-sm font-medium text-white bg-wood-500 rounded-md hover:brightness-[0.92] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {exported ? '✓ 已下载' : exporting ? '正在打包...' : hasBlockingErrors ? '请先修复必须改的问题' : '确认导出'}
              {!exporting && !exported && !hasBlockingErrors && (
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              )}
            </button>
          </div>

          {hasBlockingErrors && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-[#E04545]">
              <XCircle size={16} />
              请先修复 {errorCount} 个必须改的问题
            </div>
          )}
        </ScrollReveal>
      </div>
    </section>
  )
}
