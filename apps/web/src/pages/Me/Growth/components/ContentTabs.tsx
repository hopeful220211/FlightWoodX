import { useState } from 'react'
import { Box, Star, Activity, ImageOff } from 'lucide-react'
import type { GrowthEvent } from '@fwx/shared'
import { Tabs } from '../../../../components/common/Tabs'
import { EmptyState } from '../../../../components/common/EmptyState'
import { EventTimeline } from './EventTimeline'

interface ContentItem {
  id: string
  name: string
  thumbnailUrl?: string
}

export interface ContentTabsProps {
  recentEvents: GrowthEvent[]
  projects: ContentItem[]
  favorites: ContentItem[]
  loading?: boolean
}

type ContentTab = 'projects' | 'favorites' | 'events'

function ItemCard({ item }: { item: ContentItem }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white transition hover:shadow-lift">
      <div className="flex aspect-[4/3] items-center justify-center bg-sky-50/60">
        {item.thumbnailUrl ? (
          <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <ImageOff size={24} className="text-ink-300" aria-hidden="true" />
        )}
      </div>
      <p className="truncate px-3 py-2.5 text-sm font-semibold text-ink-900">{item.name}</p>
    </div>
  )
}

function ItemGrid({ items }: { items: ContentItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  )
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-black/5 bg-white">
          <div className="aspect-[4/3] bg-black/10" />
          <div className="px-3 py-2.5">
            <div className="h-4 w-2/3 rounded bg-black/10" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** 作品 / 收藏 / 动态三页签：作品与收藏走缩略图网格，动态复用成长足迹时间线。 */
export function ContentTabs({ recentEvents, projects, favorites, loading = false }: ContentTabsProps) {
  const [tab, setTab] = useState<ContentTab>('projects')

  return (
    <div className="space-y-4">
      <Tabs<ContentTab>
        value={tab}
        onChange={setTab}
        items={[
          { value: 'projects', label: '作品', icon: <Box size={15} aria-hidden="true" /> },
          { value: 'favorites', label: '收藏', icon: <Star size={15} aria-hidden="true" /> },
          { value: 'events', label: '动态', icon: <Activity size={15} aria-hidden="true" /> },
        ]}
      />

      <div role="tabpanel">
        {tab === 'projects' &&
          (loading ? (
            <SkeletonGrid />
          ) : projects.length === 0 ? (
            <EmptyState
              icon={<Box size={20} aria-hidden="true" />}
              title="还没有作品"
              description="去设计工作台搭一架属于你的木质无人机吧。"
            />
          ) : (
            <ItemGrid items={projects} />
          ))}

        {tab === 'favorites' &&
          (loading ? (
            <SkeletonGrid />
          ) : favorites.length === 0 ? (
            <EmptyState
              icon={<Star size={20} aria-hidden="true" />}
              title="还没有收藏"
              description="逛逛社区，把喜欢的作品收藏起来。"
            />
          ) : (
            <ItemGrid items={favorites} />
          ))}

        {tab === 'events' &&
          (recentEvents.length === 0 ? (
            <EmptyState
              icon={<Activity size={20} aria-hidden="true" />}
              title="还没有动态"
              description="完成课程、发布作品后，这里会留下你的成长足迹。"
            />
          ) : (
            <EventTimeline events={recentEvents} />
          ))}
      </div>
    </div>
  )
}
