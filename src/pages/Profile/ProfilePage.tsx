import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Edit2, Save, X, Moon, Sun, Trash2, BookOpen, Palette, Calendar } from 'lucide-react'
import { PageContainer } from '../../components/layout/PageContainer'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import { EmptyState } from '../../components/common/EmptyState'
import { Modal } from '../../components/common/Modal'
import { useProfileStore } from '../../stores/profileStore'
import { useLearningStore } from '../../stores/learningStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { useDesignStore } from '../../stores/designStore'
import { writeStorage } from '../../utils/localStorage'
import { STORAGE_KEYS } from '../../constants/storageKeys'
import { useToast } from '../../components/common/Toast'
import type { Design } from '../../types/design'

export function ProfilePage() {
  const nav = useNavigate()
  const { profile, update } = useProfileStore()
  const { progress } = useLearningStore()
  const { settings, setTheme } = useSettingsStore()
  const setActiveDesignId = useDesignStore((s) => s.setActiveDesignId)
  const designs = useDesignStore((s) => s.designs)
  const deleteDesign = useDesignStore((s) => s.deleteDesign)
  const toast = useToast()

  const [editing, setEditing] = useState(false)
  const [editNickname, setEditNickname] = useState(profile.nickname)
  const [editSchool, setEditSchool] = useState(profile.school || '')
  const [editGrade, setEditGrade] = useState(profile.grade || '')
  const [showClearModal, setShowClearModal] = useState(false)

  const myProjects = useMemo<Design[]>(() => designs, [designs])

  const handleSave = () => {
    update({ nickname: editNickname, school: editSchool || undefined, grade: editGrade || undefined })
    setEditing(false)
    toast.push('success', '保存成功')
  }

  const handleCancel = () => {
    setEditNickname(profile.nickname)
    setEditSchool(profile.school || '')
    setEditGrade(profile.grade || '')
    setEditing(false)
  }

  const handleClearData = () => {
    writeStorage(STORAGE_KEYS.DESIGN_STORE, { state: { designs: [], activeDesignId: null }, version: 0 })
    writeStorage(STORAGE_KEYS.LEARNING_PROGRESS, { completedLessons: [], totalStudyTime: 0, studyDays: [] })
    writeStorage(STORAGE_KEYS.USER_PROFILE, { nickname: '小小设计师' })
    writeStorage(STORAGE_KEYS.APP_SETTINGS, { theme: 'light', language: 'zh-CN' })
    window.location.reload()
  }

  const handleDeleteProject = (id: string) => {
    deleteDesign(id)
    toast.push('success', '删除成功')
  }

  return (
    <PageContainer className="py-8">
      <div className="space-y-6">
        {/* 用户信息卡片 */}
        <Card className="group">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {editing ? (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">昵称</label>
                    <input
                      type="text"
                      value={editNickname}
                      onChange={(e) => setEditNickname(e.target.value)}
                      className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-800 dark:text-white"
                      placeholder="请输入昵称"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">学校</label>
                    <input
                      type="text"
                      value={editSchool}
                      onChange={(e) => setEditSchool(e.target.value)}
                      className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-800 dark:text-white"
                      placeholder="请输入学校（可选）"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">年级</label>
                    <input
                      type="text"
                      value={editGrade}
                      onChange={(e) => setEditGrade(e.target.value)}
                      className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-800 dark:text-white"
                      placeholder="请输入年级（可选）"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" leftIcon={<Save className="h-4 w-4" />} onClick={handleSave}>
                      保存
                    </Button>
                    <Button size="sm" variant="outline" leftIcon={<X className="h-4 w-4" />} onClick={handleCancel}>
                      取消
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-4 flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-tech-400 to-tech-600 text-2xl font-extrabold text-white">
                      {profile.nickname[0] || '设'}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-extrabold text-wood-900 dark:text-white">{profile.nickname}</h2>
                      {profile.school && (
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                          {profile.school} {profile.grade && `· ${profile.grade}`}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<Edit2 className="h-4 w-4" />}
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => setEditing(true)}
                    >
                      编辑
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* 学习统计 */}
        <Card>
          <h3 className="mb-4 text-lg font-extrabold text-wood-900 dark:text-white">学习统计</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-wood-50 p-4 dark:bg-slate-800">
              <div className="mb-2 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-tech-600" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">已完成课程</span>
              </div>
              <div className="text-2xl font-extrabold text-wood-900 dark:text-white">
                {progress.completedLessons.length}
              </div>
            </div>
            <div className="rounded-xl bg-wood-50 p-4 dark:bg-slate-800">
              <div className="mb-2 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-tech-600" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">总学习时长</span>
              </div>
              <div className="text-2xl font-extrabold text-wood-900 dark:text-white">
                {Math.round(progress.totalStudyTime)} 分钟
              </div>
            </div>
            <div className="rounded-xl bg-wood-50 p-4 dark:bg-slate-800">
              <div className="mb-2 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-tech-600" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">学习天数</span>
              </div>
              <div className="text-2xl font-extrabold text-wood-900 dark:text-white">{progress.studyDays.length} 天</div>
            </div>
          </div>
        </Card>

        {/* 我的作品 */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-extrabold text-wood-900 dark:text-white">我的作品</h3>
            <Button
              size="sm"
              variant="primary"
              leftIcon={<Palette className="h-4 w-4" />}
              onClick={() => nav('/design')}
            >
              新建设计
            </Button>
          </div>
          {myProjects.length === 0 ? (
            <EmptyState
              icon={<Palette size={18} />}
              title="你还没有任何作品哦"
              description="从零件库开始拼装，完成你的第一架无人机！"
              action={{ label: '新建设计', onClick: () => nav('/design'), buttonProps: { variant: 'primary' } }}
            />
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-2 md:overflow-visible lg:grid-cols-3">
              {myProjects.map((project) => (
                <Card key={project.id} hoverable className="min-w-[260px] md:min-w-0">
                  <div className="aspect-video overflow-hidden rounded-xl bg-gradient-to-br from-tech-100 to-tech-200 dark:from-tech-900/30 dark:to-tech-800/30">
                    <div className="flex h-full items-center justify-center text-sm font-extrabold text-tech-600 dark:text-tech-400">
                      {project.parts.length} 个零件
                    </div>
                  </div>
                  <div className="mt-3">
                    <h4 className="mb-1 truncate font-extrabold text-wood-900 dark:text-white">{project.name}</h4>
                    <p className="mb-3 text-xs text-slate-600 dark:text-slate-300">
                      {new Date(project.updatedAt).toLocaleDateString('zh-CN')}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setActiveDesignId(project.id)
                          nav('/design')
                        }}
                      >
                        打开
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteProject(project.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>

        {/* 设置区域 */}
        <Card>
          <h3 className="mb-4 text-lg font-extrabold text-wood-900 dark:text-white">设置</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {settings.theme === 'dark' ? (
                  <Moon className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                ) : (
                  <Sun className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                )}
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">主题</div>
                  <div className="text-sm text-slate-600 dark:text-slate-300">
                    {settings.theme === 'dark' ? '深色模式' : '浅色模式'}
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setTheme(settings.theme === 'dark' ? 'light' : 'dark')}
              >
                切换
              </Button>
            </div>
            <div className="border-t border-black/5 pt-4 dark:border-white/10">
              <Button
                variant="outline"
                leftIcon={<Trash2 className="h-4 w-4" />}
                onClick={() => setShowClearModal(true)}
                className="text-error hover:bg-error/10"
              >
                清除所有本地数据
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* 清除数据确认模态框 */}
      <Modal
        open={showClearModal}
        onClose={() => setShowClearModal(false)}
        title="确认清除数据"
      >
        <div className="space-y-4">
          <p className="text-slate-700 dark:text-slate-200">
            此操作将清除所有本地保存的数据，包括：
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
            <li>所有设计作品</li>
            <li>学习进度</li>
            <li>个人设置</li>
          </ul>
          <p className="text-sm text-error">此操作不可恢复，请谨慎操作！</p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowClearModal(false)}>
              取消
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                handleClearData()
                setShowClearModal(false)
              }}
              className="bg-error hover:bg-error/90"
            >
              确认清除
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  )
}
