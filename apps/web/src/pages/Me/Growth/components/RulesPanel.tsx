import type { ReactNode } from 'react'
import { SUBLEVEL_POINTS } from '@fwx/shared'
import { Modal } from '../../../../components/common/Modal'

export interface RulesPanelProps {
  open: boolean
  onClose: () => void
}

interface RuleItem {
  action: string
  points: string
  /** 防刷 / 上限等补充说明。 */
  note?: string
}

/**
 * 各行为加分明细。数值与 @fwx/shared 的 `pointsForEvent` 保持一致：
 * lesson_completed +20 / project_published +40 / project_liked +2 /
 * project_favorited +3 / project_was_forked +50 / daily_task_completed +10 /
 * login_streak +5 / competition_ranked（第 1 名 +200，前 3 +120，前 10 +60，其余 +40）。
 */
const RULES: RuleItem[] = [
  { action: '完成一节课程', points: '+20' },
  { action: '发布一件原创作品', points: '+40' },
  { action: '完成每日任务', points: '+10' },
  { action: '连续打卡签到', points: '+5', note: '每次打卡' },
  { action: '作品被同伴点赞', points: '+2', note: '社交加分每日有上限，防止刷分' },
  { action: '作品被同伴收藏', points: '+3', note: '社交加分每日有上限，防止刷分' },
  { action: '作品被同伴复用', points: '+50', note: '自己复用自己不加分' },
  { action: '参赛获得名次', points: '+40 ~ +200', note: '第 1 名 +200，前 3 名 +120，前 10 名 +60，其余 +40' },
]

function Row({ children }: { children: ReactNode }) {
  return <div className="flex items-start gap-3 py-2.5">{children}</div>
}

/** 成长值规则说明弹窗：升级规则 + 各行为加分明细，给孩子看得懂。 */
export function RulesPanel({ open, onClose }: RulesPanelProps) {
  return (
    <Modal open={open} title="成长值规则" onClose={onClose}>
      <div className="space-y-5">
        <section className="rounded-2xl bg-sky-50 p-4">
          <h4 className="text-sm font-bold text-ink-900">怎么升级？</h4>
          <p className="mt-1 text-sm text-ink-500">
            每攒满{' '}
            <span className="font-grotesk font-bold text-accent-spark">{SUBLEVEL_POINTS}</span>{' '}
            点成长值就升一小级。攒得越多，从「学徒」一路升到「设计师」「首席设计师」。
          </p>
        </section>

        <section>
          <h4 className="mb-1 text-sm font-bold text-ink-900">怎么涨成长值？</h4>
          <div className="divide-y divide-black/5">
            {RULES.map((rule) => (
              <Row key={rule.action}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-900">{rule.action}</p>
                  {rule.note && <p className="mt-0.5 text-xs text-ink-400">{rule.note}</p>}
                </div>
                <span className="shrink-0 font-grotesk text-sm font-bold text-accent-spark">{rule.points}</span>
              </Row>
            ))}
          </div>
        </section>

        <p className="text-xs text-ink-400">
          成长值只记录你的努力与成长，不能兑换任何商品或折扣。
        </p>
      </div>
    </Modal>
  )
}
