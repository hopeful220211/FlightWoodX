import { create } from 'zustand'
import { STORAGE_KEYS } from '../constants/storageKeys'
import type { LearningProgress } from '../types/learning'
import { readStorage, writeStorage } from '../utils/localStorage'

const defaultProgress: LearningProgress = {
  completedLessons: [],
  totalStudyTime: 0,
  studyDays: [],
}

const todayISO = () => new Date().toISOString().slice(0, 10)

export interface LearningState {
  progress: LearningProgress
  hydrate: () => void
  setCurrentLesson: (lessonId: string) => void
  markCompleted: (lessonId: string, durationMin?: number) => void
  clear: () => void
}

export const useLearningStore = create<LearningState>((set, get) => ({
  progress: defaultProgress,
  hydrate: () => {
    const p = readStorage<LearningProgress>(STORAGE_KEYS.LEARNING_PROGRESS, defaultProgress)
    set({ progress: p })
  },
  setCurrentLesson: (lessonId) => {
    const next = { ...get().progress, currentLessonId: lessonId }
    set({ progress: next })
    writeStorage(STORAGE_KEYS.LEARNING_PROGRESS, next)
  },
  markCompleted: (lessonId, durationMin = 0) => {
    const p = get().progress
    const completed = p.completedLessons.includes(lessonId)
      ? p.completedLessons
      : [...p.completedLessons, lessonId]
    const day = todayISO()
    const days = p.studyDays.includes(day) ? p.studyDays : [...p.studyDays, day]
    const next: LearningProgress = {
      ...p,
      completedLessons: completed,
      totalStudyTime: p.totalStudyTime + Math.max(0, durationMin),
      studyDays: days,
    }
    set({ progress: next })
    writeStorage(STORAGE_KEYS.LEARNING_PROGRESS, next)
  },
  clear: () => {
    set({ progress: defaultProgress })
    writeStorage(STORAGE_KEYS.LEARNING_PROGRESS, defaultProgress)
  },
}))

