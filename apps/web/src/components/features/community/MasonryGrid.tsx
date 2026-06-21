import { useEffect, useMemo, useState } from 'react'
import type { PostCard } from '../../../hooks/useCommunityFeed'
import { WorkCard } from './WorkCard'
import { QuickViewModal } from './QuickViewModal'

// 响应式列数（matchMedia 派生，不用 scroll 监听）。
function columnsForWidth() {
  if (typeof window === 'undefined') return 4
  const w = window.innerWidth
  return w >= 1536 ? 5 : w >= 1280 ? 4 : w >= 768 ? 3 : 2
}
function useColumnCount() {
  const [cols, setCols] = useState(columnsForWidth)
  useEffect(() => {
    const onResize = () => setCols(columnsForWidth())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return cols
}

// 轮转分配到 N 列：可靠的瀑布流（避免 CSS columns 平衡怪相漏卡）；按行读为左→右，符合排序直觉。
function distribute<T>(items: T[], cols: number): T[][] {
  const out: T[][] = Array.from({ length: cols }, () => [])
  items.forEach((it, i) => out[i % cols].push(it))
  return out
}

/**
 * 社区瀑布流网格（社区广场 / 作者页 / 关注流 / 合集详情 / 排行榜共用）。
 * 高低错落（卡片自带随机比例）、铺满。点击任意卡片打开「快速预览弹窗」，不跳页。
 * animateKey 变化时整网格重挂载，重放 CSS stagger 入场。
 */
export function MasonryGrid({ posts, animateKey }: { posts: PostCard[]; animateKey?: string }) {
  const cols = useColumnCount()
  const columns = useMemo(() => distribute(posts, cols), [posts, cols])
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <>
      <style>{'@keyframes fwxRise{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}'}</style>
      <div key={animateKey} className="flex items-start gap-4 sm:gap-5">
        {columns.map((col, ci) => (
          <div key={ci} className="flex flex-1 flex-col gap-4 sm:gap-5">
            {col.map((post, ri) => (
              <WorkCard
                key={post.id}
                post={post}
                onOpen={() => setOpenId(post.id)}
                style={{ animationDelay: `${Math.min(ri * cols + ci, 11) * 40}ms` }}
              />
            ))}
          </div>
        ))}
      </div>
      {openId && <QuickViewModal postId={openId} onClose={() => setOpenId(null)} />}
    </>
  )
}
