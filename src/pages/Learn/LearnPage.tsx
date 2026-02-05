import { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ChevronDown, ChevronRight, CheckCircle2, Play, BookOpen } from 'lucide-react'
import { PageContainer } from '../../components/layout/PageContainer'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import { ProgressBar } from '../../components/common/ProgressBar'
import { EmptyState } from '../../components/common/EmptyState'
import { Modal } from '../../components/common/Modal'
import { Tabs } from '../../components/common/Tabs'
import { useToast } from '../../components/common/Toast'
import { courses } from '../../data/courses'
import { useLearningStore } from '../../stores/learningStore'
import { cn } from '../../utils/cn'

export function LearnPage() {
  const toast = useToast()
  const progress = useLearningStore((s) => s.progress)
  const setCurrentLesson = useLearningStore((s) => s.setCurrentLesson)
  const markCompleted = useLearningStore((s) => s.markCompleted)

  const allLessons = useMemo(() => courses.flatMap((c) => c.lessons).sort((a, b) => a.order - b.order), [])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(courses.map((c) => [c.id, true])),
  )
  const [rightTab, setRightTab] = useState<'stats' | 'links'>('stats')
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const currentLesson = useMemo(() => {
    const fromProgress = progress.currentLessonId
      ? allLessons.find((l) => l.id === progress.currentLessonId)
      : undefined
    return fromProgress ?? allLessons[0] ?? null
  }, [allLessons, progress.currentLessonId])

  useEffect(() => {
    if (currentLesson?.id && progress.currentLessonId !== currentLesson.id) setCurrentLesson(currentLesson.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLesson?.id])

  const completedSet = useMemo(() => new Set(progress.completedLessons), [progress.completedLessons])

  const completedCount = progress.completedLessons.length
  const totalCount = allLessons.length
  const percent = totalCount ? Math.round((completedCount / totalCount) * 100) : 0

  const currentIndex = currentLesson ? allLessons.findIndex((l) => l.id === currentLesson.id) : -1
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null
  const nextLesson = currentIndex >= 0 && currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null

  const goLesson = (lessonId: string) => {
    setCurrentLesson(lessonId)
    toast.push('info', '已切换课时')
  }

  const finishAndNext = () => {
    if (!currentLesson) return
    markCompleted(currentLesson.id, currentLesson.duration)
    toast.push('success', '已标记完成')
    if (nextLesson) setCurrentLesson(nextLesson.id)
  }

  return (
    <PageContainer className="py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight md:text-2xl">学习中心</h1>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            已完成 <span className="font-extrabold">{completedCount}</span> / {totalCount} 课时 · 总学习时长{' '}
            <span className="font-extrabold">{progress.totalStudyTime}</span> 分钟
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setSidebarOpen((v) => !v)}>
          {sidebarOpen ? '收起目录' : '展开目录'}
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[320px_1fr_280px] md:grid-cols-[320px_1fr] grid-cols-1">
        {/* 左侧：章节目录 */}
        <aside
          className={cn(
            'rounded-2xl border border-black/5 bg-white shadow-soft dark:border-white/10 dark:bg-slate-900',
            sidebarOpen ? 'block' : 'hidden md:block',
          )}
        >
          <div className="border-b border-black/5 p-3 text-sm font-extrabold dark:border-white/10">课程章节</div>
          <div className="p-2">
            {courses.map((ch) => {
              const open = openChapters[ch.id] ?? false
              return (
                <div key={ch.id} className="mb-2 rounded-2xl border border-black/5 dark:border-white/10">
                  <button
                    type="button"
                    className="touch-target flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
                    onClick={() => setOpenChapters((s) => ({ ...s, [ch.id]: !open }))}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-extrabold">{ch.title}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-300">
                        {ch.lessons.filter((l) => completedSet.has(l.id)).length}/{ch.lessons.length} 已完成
                      </div>
                    </div>
                    {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>

                  {open ? (
                    <div className="border-t border-black/5 p-2 dark:border-white/10">
                      {ch.lessons
                        .slice()
                        .sort((a, b) => a.order - b.order)
                        .map((l) => {
                          const active = currentLesson?.id === l.id
                          const done = completedSet.has(l.id)
                          return (
                            <button
                              key={l.id}
                              type="button"
                              className={cn(
                                'flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left transition',
                                active
                                  ? 'bg-wood-200 text-wood-900 dark:bg-slate-800 dark:text-white'
                                  : 'hover:bg-wood-50 dark:hover:bg-slate-950',
                              )}
                              onClick={() => goLesson(l.id)}
                            >
                              <div className="min-w-0">
                                <div className="truncate text-sm font-bold">{l.title}</div>
                                <div className="text-xs text-slate-600 dark:text-slate-300">{l.duration} 分钟</div>
                              </div>
                              {done ? <CheckCircle2 size={18} className="text-success" /> : null}
                            </button>
                          )
                        })}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </aside>

        {/* 中间：内容区 */}
        <main className="space-y-3">
          <Card
            hoverable={false}
            header={
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-base font-extrabold">{currentLesson?.title ?? '未选择课时'}</div>
                  <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    预计学习时长：{currentLesson?.duration ?? 0} 分钟
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!prevLesson}
                    onClick={() => prevLesson && goLesson(prevLesson.id)}
                  >
                    上一课
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!nextLesson}
                    onClick={() => nextLesson && goLesson(nextLesson.id)}
                  >
                    下一课
                  </Button>
                </div>
              </div>
            }
            footer={
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm text-slate-600 dark:text-slate-300">
                  进度：{completedCount}/{totalCount}
                </div>
                <Button variant="primary" size="sm" onClick={finishAndNext} leftIcon={<CheckCircle2 size={16} />}>
                  标记完成 & 下一课
                </Button>
              </div>
            }
          >
            <ProgressBar value={percent} />
          </Card>

          <Card hoverable={false} header={<div className="text-sm font-extrabold">视频区域（占位）</div>}>
            <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-black/15 bg-slate-50 dark:border-white/15 dark:bg-slate-950">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <Play size={18} /> 视频加载中…
              </div>
            </div>
          </Card>

          <Card hoverable={false} header={<div className="text-sm font-extrabold">图文内容</div>}>
            {currentLesson ? (
              <article className="prose prose-slate max-w-none dark:prose-invert">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    img: (props) => {
                      const src = typeof props.src === 'string' ? props.src : ''
                      return (
                        <img
                          {...props}
                          alt={typeof props.alt === 'string' && props.alt.trim() ? props.alt : '课程图片'}
                          className={cn('cursor-zoom-in rounded-xl ring-1 ring-black/5 dark:ring-white/10', props.className)}
                          onClick={() => src && setImagePreview(src)}
                        />
                      )
                    },
                  }}
                >
                  {currentLesson.content}
                </ReactMarkdown>
              </article>
            ) : (
              <EmptyState icon={<BookOpen size={18} />} title="请选择一个课时" />
            )}
          </Card>
        </main>

        {/* 右侧：学习统计（lg 可见） */}
        <aside className="hidden lg:block">
          <Card
            hoverable={false}
            header={
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-extrabold">侧边栏</div>
                <Tabs
                  items={[
                    { value: 'stats', label: '统计' },
                    { value: 'links', label: '知识点' },
                  ]}
                  value={rightTab}
                  onChange={setRightTab}
                />
              </div>
            }
          >
            {rightTab === 'stats' ? (
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300">完成课时</span>
                  <span className="font-extrabold">{completedCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300">总学习时长</span>
                  <span className="font-extrabold">{progress.totalStudyTime} 分钟</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300">学习天数</span>
                  <span className="font-extrabold">{progress.studyDays.length} 天</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
                <div className="rounded-xl bg-wood-50 px-3 py-2 dark:bg-slate-950">榫头/卯眼：连接点概念</div>
                <div className="rounded-xl bg-wood-50 px-3 py-2 dark:bg-slate-950">推重比：起飞能力</div>
                <div className="rounded-xl bg-wood-50 px-3 py-2 dark:bg-slate-950">重心：稳定性</div>
              </div>
            )}
          </Card>
        </aside>
      </div>

      {/* 底部浮动：上一课/下一课（便于操作） */}
      <div className="fixed bottom-6 right-6 z-40 hidden md:flex gap-2">
        <Button variant="outline" size="sm" disabled={!prevLesson} onClick={() => prevLesson && goLesson(prevLesson.id)}>
          上一课
        </Button>
        <Button variant="primary" size="sm" disabled={!nextLesson} onClick={() => nextLesson && goLesson(nextLesson.id)}>
          下一课
        </Button>
      </div>

      <Modal open={imagePreview !== null} onClose={() => setImagePreview(null)} title="图片预览">
        {imagePreview ? (
          <img src={imagePreview} alt="预览" className="max-h-[70vh] w-full rounded-2xl object-contain" />
        ) : null}
      </Modal>
    </PageContainer>
  )
}

