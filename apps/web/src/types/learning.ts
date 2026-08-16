export interface Lesson {
  id: string
  title: string
  chapterId: string
  order: number
  videoUrl?: string
  /** Markdown */
  content: string
  /** 分钟 */
  duration: number
  isCompleted?: boolean
}

export interface Chapter {
  id: string
  title: string
  order: number
  lessons: Lesson[]
}

export interface LearningProgress {
  completedLessons: string[]
  currentLessonId?: string
  totalStudyTime: number
  studyDays: string[]
}

