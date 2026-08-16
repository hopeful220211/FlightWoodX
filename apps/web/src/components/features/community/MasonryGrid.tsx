import { useState } from 'react'
import type { PostCard } from '../../../hooks/useCommunityFeed'
import { WorkCard } from './WorkCard'
import { QuickViewModal } from './QuickViewModal'

/**
 * 社区作品网格（社区广场 / 作者页 / 关注流 / 合集详情共用）。
 * 借鉴站酷：封面锁 4:3 + 定列 Grid + 顶对齐，排得整齐干净（替代早期不等高瀑布流）。
 * 点击任意卡片打开「快速预览弹窗」，不跳页。animateKey 变化时重挂载，重放入场。
 */
export function MasonryGrid({ posts, animateKey }: { posts: PostCard[]; animateKey?: string }) {
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <>
      <style>{'@keyframes fwxRise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}'}</style>
      <div
        key={animateKey}
        className="grid grid-cols-2 items-start gap-5 sm:grid-cols-3 sm:gap-6 xl:grid-cols-4 2xl:grid-cols-5"
      >
        {posts.map((post, i) => (
          <WorkCard
            key={post.id}
            post={post}
            onOpen={() => setOpenId(post.id)}
            style={{ animationDelay: `${Math.min(i, 11) * 35}ms` }}
          />
        ))}
      </div>
      {openId && <QuickViewModal postId={openId} onClose={() => setOpenId(null)} />}
    </>
  )
}
