import { Trophy, Users, Globe } from 'lucide-react'
import { GROWTH_TIERS, type LeaderboardEntry, type LeaderboardScope, type GrowthTierId } from '@fwx/shared'
import { cn } from '../../../../utils/cn'
import { Tabs } from '../../../../components/common/Tabs'
import { EmptyState } from '../../../../components/common/EmptyState'

export interface LeaderboardProps {
  entries: LeaderboardEntry[]
  scope: LeaderboardScope
  onScopeChange: (s: LeaderboardScope) => void
  loading?: boolean
  meUserId?: string
}

const TIER_NAME: Record<GrowthTierId, string> = Object.fromEntries(
  GROWTH_TIERS.map((t) => [t.id, t.name]),
) as Record<GrowthTierId, string>

/** 前 3 名奖牌配色（金 / 银 / 铜）；其余用普通名次样式。 */
const MEDAL_STYLE: Record<number, string> = {
  1: 'bg-accent-gold text-white',
  2: 'bg-ink-300 text-white',
  3: 'bg-[#cd7f32] text-white',
}

function RankBadge({ rank }: { rank: number }) {
  const medal = MEDAL_STYLE[rank]
  return (
    <span
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-grotesk text-sm font-bold tabular-nums',
        medal ?? 'bg-black/5 text-ink-500',
      )}
      aria-label={`第 ${rank} 名`}
    >
      {rank}
    </span>
  )
}

function Avatar({ entry }: { entry: LeaderboardEntry }) {
  if (entry.avatarUrl) {
    return (
      <img
        src={entry.avatarUrl}
        alt=""
        className="h-9 w-9 shrink-0 rounded-full object-cover"
        loading="lazy"
      />
    )
  }
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-600"
      aria-hidden="true"
    >
      {entry.nickname.slice(0, 1)}
    </span>
  )
}

function SkeletonRows() {
  return (
    <ul className="space-y-2" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white p-3">
          <span className="h-8 w-8 shrink-0 rounded-full bg-black/10" />
          <span className="h-9 w-9 shrink-0 rounded-full bg-black/10" />
          <span className="h-4 flex-1 rounded bg-black/10" />
          <span className="h-4 w-12 shrink-0 rounded bg-black/10" />
        </li>
      ))}
    </ul>
  )
}

/** 成长排行榜：全站 / 班级切换，前 3 名奖牌高亮，命中「你」的行特殊标注。 */
export function Leaderboard({ entries, scope, onScopeChange, loading = false, meUserId }: LeaderboardProps) {
  return (
    <div className="space-y-4">
      <Tabs<LeaderboardScope>
        value={scope}
        onChange={onScopeChange}
        items={[
          { value: 'global', label: '全站', icon: <Globe size={15} aria-hidden="true" /> },
          { value: 'class', label: '班级', icon: <Users size={15} aria-hidden="true" /> },
        ]}
      />

      {loading ? (
        <SkeletonRows />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<Trophy size={20} aria-hidden="true" />}
          title="排行榜还空着"
          description={scope === 'class' ? '班级里还没有人上榜，快去完成任务抢占第一名吧。' : '还没有人上榜，快去完成任务抢占第一名吧。'}
        />
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => {
            const isMe = meUserId !== undefined && entry.userId === meUserId
            return (
              <li
                key={entry.userId}
                className={cn(
                  'flex items-center gap-3 rounded-2xl border p-3 transition',
                  isMe ? 'border-sky-400 bg-sky-50 ring-1 ring-sky-300' : 'border-black/10 bg-white',
                )}
              >
                <RankBadge rank={entry.rank} />
                <Avatar entry={entry} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-bold text-ink-900">{entry.nickname}</span>
                    {isMe && (
                      <span className="shrink-0 rounded-full bg-sky-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        你
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-ink-400">
                    {TIER_NAME[entry.tier]} · Lv.{entry.subLevel}
                  </span>
                </div>
                <span className="shrink-0 font-grotesk text-sm font-bold tabular-nums text-ink-900">
                  {entry.totalPoints}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
