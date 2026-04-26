import { useState } from 'react'
import { Package, Ruler, Lightbulb, ChevronDown } from 'lucide-react'
import { ScrollReveal } from '../../components/common/ScrollReveal'
import type { MaterialEstimate } from '../../utils/materialEstimate'

interface MaterialPreparationProps {
  estimate: MaterialEstimate
}

export function MaterialPreparation({ estimate }: MaterialPreparationProps) {
  const [expanded, setExpanded] = useState(estimate.dxfFiles.length <= 5)
  const totalDxfCount = estimate.dxfFiles.reduce((s, f) => s + f.count, 0)
  const visibleFiles = expanded ? estimate.dxfFiles : estimate.dxfFiles.slice(0, 5)

  return (
    <section className="py-12 lg:py-16">
      <div className="mx-auto max-w-5xl px-4">
        <ScrollReveal>
          <h2 className="font-display text-3xl lg:text-[40px] font-semibold text-ink-900">制作准备</h2>
          <p className="mt-2 text-sm text-ink-600">导出后你将得到这些 CAD 文件</p>
        </ScrollReveal>

        {/* DXF file list */}
        <ScrollReveal delay={100}>
          <div className="mt-8 bg-paper-100 rounded-md p-6">
            <div className="flex items-center gap-2 text-ink-900 font-medium mb-4">
              <Package size={18} />
              导出包内容（共 {totalDxfCount} 个 .dxf 文件）
            </div>
            <div className="bg-paper-50 rounded-md p-4 font-mono text-sm text-ink-700 space-y-1">
              {visibleFiles.map(f => (
                <p key={f.name}>
                  {f.name}.dxf{f.count > 1 ? ` × ${f.count} 份` : ''}
                </p>
              ))}
            </div>
            {!expanded && estimate.dxfFiles.length > 5 && (
              <button
                onClick={() => setExpanded(true)}
                className="mt-2 inline-flex items-center gap-1 text-sm text-wood-500 hover:text-wood-600"
              >
                展开全部（{estimate.dxfFiles.length} 项）
                <ChevronDown size={14} />
              </button>
            )}
          </div>
        </ScrollReveal>

        {/* Material estimate */}
        <ScrollReveal delay={200}>
          <div className="mt-6 bg-paper-100 rounded-md p-6">
            <div className="flex items-center gap-2 text-ink-900 font-medium mb-4">
              <Ruler size={18} />
              切割材料估算
            </div>
            <ul className="space-y-2 text-sm text-ink-700">
              <li>• 总切割长度：约 {estimate.totalCutLengthMm} mm</li>
              <li>• 建议木板尺寸：{estimate.suggestedBoardSize} × {estimate.boardCount} 张</li>
              <li>• 切割时间估算：约 {estimate.cutTimeMinutes} 分钟</li>
            </ul>
          </div>
        </ScrollReveal>

        {/* How to use */}
        <ScrollReveal delay={300}>
          <div className="mt-6 bg-accent-sky/10 rounded-md p-6">
            <div className="flex items-center gap-2 text-ink-900 font-medium mb-2">
              <Lightbulb size={18} className="text-accent-gold" />
              怎么使用这些文件？
            </div>
            <p className="text-sm text-ink-600 leading-relaxed">
              把 .dxf 文件交给激光切割机，机器会按图纸切出每一片木头。
              切完后，照着 FlightWoodX 上的设计把零件拼起来就行了！
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
