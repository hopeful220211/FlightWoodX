import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { FlightCheckReport } from './FlightCheckReport'
import { FlightStats } from './FlightStats'
import { calculateStats } from '../../utils/designStats'

vi.mock('../../components/common/ScrollReveal', () => ({ ScrollReveal: ({ children }: { children: ReactNode }) => <>{children}</> }))

describe('export structure report', () => {
  it('does not present the record score as manufacturing or flight approval', () => {
    const rendered = renderToStaticMarkup(<FlightCheckReport checks={[{ id: 'fixture', level: 'pass', title: '记录存在' }]} />)
    expect(rendered).toContain('结构检查报告')
    expect(rendered).toContain('分数不代表制造或飞行安全')
    expect(rendered).not.toContain('优秀')
    expect(rendered).not.toContain('飞行检查报告')
  })

  it('labels incomplete catalogue estimates without displaying a fabricated aircraft total', () => {
    const stats = calculateStats([{ instanceId: 'missing', partId: 'not-in-catalogue', category: 'joint', position: [0, 0, 0], rotation: [0, 0, 0] }])
    const rendered = renderToStaticMarkup(<FlightStats stats={stats} />)
    expect(rendered).toContain('目录质量小计（估算）')
    expect(rendered).toContain('1 个零件缺少质量数据')
    expect(rendered).toContain('坐标镜像匹配率')
    expect(rendered).not.toMatch(/>0g<|>总重</)
  })
})
