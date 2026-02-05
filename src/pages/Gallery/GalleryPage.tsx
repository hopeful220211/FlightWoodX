import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, ExternalLink, Heart, Pencil, Share2, Sparkles } from 'lucide-react'
import { PageContainer } from '../../components/layout/PageContainer'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import { Badge } from '../../components/common/Badge'
import { EmptyState } from '../../components/common/EmptyState'
import { Modal } from '../../components/common/Modal'
import { Tabs } from '../../components/common/Tabs'
import { featuredWorks } from '../../data/featuredWorks'
import { useDesignStore } from '../../stores/designStore'
import { DesignPreview3D } from '../../components/design/DesignPreview3D'
import type { Design } from '../../types/design'
import { useToast } from '../../components/common/Toast'

type FilterType = 'all' | 'my' | 'featured'
type SortType = 'latest' | 'popular'

export function GalleryPage() {
  const nav = useNavigate()
  const toast = useToast()
  const [filter, setFilter] = useState<FilterType>('all')
  const [sort, setSort] = useState<SortType>('latest')
  const [selectedWork, setSelectedWork] = useState<Design | (typeof featuredWorks)[0] | null>(null)
  const setActiveDesignId = useDesignStore((s) => s.setActiveDesignId)
  const myDesigns = useDesignStore((s) => s.designs)

  const displayedWorks = useMemo(() => {
    let works: (Design | (typeof featuredWorks)[0])[] = []
    if (filter === 'all') {
      works = [...myDesigns, ...featuredWorks]
    } else if (filter === 'my') {
      works = [...myDesigns]
    } else {
      works = [...featuredWorks]
    }

    if (sort === 'latest') {
      works.sort((a, b) => {
        const ta = 'likes' in a ? a.createdAt : a.updatedAt
        const tb = 'likes' in b ? b.createdAt : b.updatedAt
        return new Date(tb).getTime() - new Date(ta).getTime()
      })
    } else {
      works.sort((a, b) => {
        const likesA = 'likes' in a ? a.likes : 0
        const likesB = 'likes' in b ? b.likes : 0
        return likesB - likesA
      })
    }
    return works
  }, [filter, sort, myDesigns])

  const handleOpenDesign = (work: Design | (typeof featuredWorks)[0]) => {
    if (!('likes' in work)) {
      setActiveDesignId(work.id)
    }
    setSelectedWork(work)
  }

  const handleDownload = (work: Design | (typeof featuredWorks)[0]) => {
    if (!('likes' in work)) {
      const json = JSON.stringify(work, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${work.name || 'design'}.json`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  return (
    <PageContainer className="py-8">
      <div className="mb-8">
        <h1 className="mb-6 text-3xl font-extrabold tracking-tight text-wood-900 dark:text-white">作品展示</h1>

        {/* 筛选栏 */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Tabs
            value={filter}
            onChange={(v) => setFilter(v as FilterType)}
            items={[
              { value: 'all', label: '全部' },
              { value: 'my', label: '我的作品' },
              { value: 'featured', label: '精选作品' },
            ]}
          />
          <div className="flex gap-2">
            <Button
              variant={sort === 'latest' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSort('latest')}
            >
              最新
            </Button>
            <Button
              variant={sort === 'popular' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSort('popular')}
            >
              最热
            </Button>
          </div>
        </div>

        {/* 作品网格 */}
        {displayedWorks.length === 0 && filter === 'my' ? (
          <EmptyState
            icon={<Sparkles size={18} />}
            title="你还没有任何作品哦"
            description="从零件库开始拼装，完成你的第一架榫卯无人机！"
            action={{
              label: '立即开始设计',
              onClick: () => nav('/design'),
              buttonProps: { variant: 'primary' },
            }}
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {displayedWorks.map((work) => {
              const workId = 'likes' in work ? `fw_${work.id}` : work.id
              const isFeatured = 'likes' in work
              const isDraft = !isFeatured
              return (
                <Card
                  key={workId}
                  hoverable
                  className="group relative cursor-pointer overflow-hidden"
                  onClick={() => handleOpenDesign(work)}
                >
                <div className="aspect-video overflow-hidden rounded-xl bg-slate-50 dark:bg-slate-900">
                  {isFeatured ? (
                    <img
                      src={work.thumbnailUrl || '/placeholder.svg'}
                      alt={work.name}
                      className="h-full w-full object-cover transition-transform hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <DesignPreview3D design={work} size={320} />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="mb-1 truncate text-lg font-extrabold text-wood-900 dark:text-white">
                    {work.name}
                  </h3>
                  <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
                    {'authorName' in work ? work.authorName : '我'} ·{' '}
                      {new Date('likes' in work ? work.createdAt : work.updatedAt).toLocaleDateString('zh-CN')}
                  </p>
                  <div className="flex items-center justify-between">
                      {isFeatured ? (
                        <div className="flex items-center gap-1 text-sm font-semibold text-wood-600 dark:text-wood-400">
                          <Heart className="h-4 w-4 fill-current" />
                          {work.likes}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 dark:text-slate-400">{work.parts.length} 个零件</div>
                      )}
                      <div>
                        {isFeatured ? <Badge variant="featured">精选</Badge> : <Badge variant="draft">草稿</Badge>}
                      </div>
                  </div>
                </div>

                  {/* 草稿遮罩：引导继续编辑 */}
                  {isDraft ? (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 transition-opacity group-hover:opacity-100 dark:bg-black/25">
                      <div className="pointer-events-auto">
                        <Button
                          leftIcon={<Pencil size={16} />}
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveDesignId(work.id)
                            nav('/design')
                          }}
                        >
                          继续编辑
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {/* 已完成作品：点赞/分享按钮（示例） */}
                  {!isFeatured ? (
                    <div className="absolute right-3 top-3 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full bg-white/70 backdrop-blur dark:bg-slate-950/60"
                        onClick={(e) => {
                          e.stopPropagation()
                          toast.push('success', '已点赞（模拟）')
                        }}
                      >
                        <Heart size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full bg-white/70 backdrop-blur dark:bg-slate-950/60"
                        onClick={(e) => {
                          e.stopPropagation()
                          toast.push('info', '已复制分享链接（模拟）')
                        }}
                      >
                        <Share2 size={16} />
                      </Button>
                    </div>
                  ) : null}
              </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* 作品详情模态框 */}
      <Modal
        open={selectedWork !== null}
        onClose={() => setSelectedWork(null)}
        title={selectedWork?.name || ''}
      >
        {selectedWork && (
          <div className="space-y-4">
            <div className="aspect-video overflow-hidden rounded-xl bg-slate-50 dark:bg-slate-900">
              {'likes' in selectedWork ? (
                <img
                  src={selectedWork.thumbnailUrl || '/placeholder.svg'}
                  alt={selectedWork.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <DesignPreview3D design={selectedWork} size={500} />
                </div>
              )}
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {('authorName' in selectedWork ? selectedWork.authorName : '我')} ·{' '}
                {new Date('likes' in selectedWork ? selectedWork.createdAt : selectedWork.updatedAt).toLocaleDateString(
                  'zh-CN',
                )}
              </p>
              {'description' in selectedWork && selectedWork.description && (
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                  {selectedWork.description}
                </p>
              )}
              {'parts' in selectedWork && (
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  使用了 {selectedWork.parts.length} 个零件
                </p>
              )}
            </div>
            <div className="flex gap-3">
              {!('likes' in selectedWork) ? (
                <>
                  <Button
                    leftIcon={<ExternalLink className="h-4 w-4" />}
                    onClick={() => {
                      setActiveDesignId(selectedWork.id)
                      setSelectedWork(null)
                      nav('/design')
                    }}
                  >
                    在设计台中打开
                  </Button>
                  <Button variant="outline" leftIcon={<Download className="h-4 w-4" />} onClick={() => handleDownload(selectedWork)}>
                    下载设计文件
                  </Button>
                </>
              ) : (
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Sparkles className="h-4 w-4" />
                  <span>这是精选作品示例</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </PageContainer>
  )
}
