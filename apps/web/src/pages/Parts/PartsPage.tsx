import { Search, Filter } from 'lucide-react'
import { PageContainer } from '../../components/layout/PageContainer'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/common/Card'
import { Input } from '../../components/common/Input'
import { Badge } from '../../components/common/Badge'

const categories = [
  { code: 'HUB', name: '飞机主板', count: 9, color: 'bg-sky-100 text-sky-700' },
  { code: 'ARM', name: '飞机支架', count: 35, color: 'bg-wood-100 text-wood-700' },
  { code: 'PLATE', name: '保护罩（一体）', count: 6, color: 'bg-accent-leaf/20 text-accent-leaf' },
  { code: 'JOINT', name: '保护罩（分体）', count: 11, color: 'bg-accent-gold/20 text-accent-gold' },
  { code: 'LAND', name: '保护罩（半体）', count: 6, color: 'bg-sky-100 text-sky-600' },
  { code: 'DECO', name: '飞机衔接件', count: 9, color: 'bg-wood-100 text-wood-600' },
]

export function PartsPage() {
  return (
    <PageContainer className="py-8 space-y-6">
      <PageHeader
        title="零件库"
        description="77 个标准化木质零件 · 6 大类别 · 榫卯结构"
      />

      {/* Search */}
      <div className="max-w-md">
        <Input placeholder="搜索零件..." />
      </div>

      {/* Category grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => (
          <Card key={cat.code} className="cursor-pointer">
            <div className="flex items-center gap-4">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${cat.color}`}>
                {cat.code}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-ink-900">{cat.name}</h3>
                <p className="text-sm text-ink-400 mt-0.5">{cat.count} 个零件</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Parts detail will be in M7 */}
      <div className="rounded-xl border-2 border-dashed border-sky-200 py-12 text-center">
        <p className="font-medium text-ink-600">零件详情浏览与 3D 预览</p>
        <p className="text-sm text-ink-400 mt-1">阶段三 M7 接入</p>
      </div>
    </PageContainer>
  )
}
