export const STORAGE_KEYS = {
  USER_PROFILE: 'drone_app_user_profile',
  LEARNING_PROGRESS: 'drone_app_learning_progress',
  DESIGN_PROJECTS: 'drone_app_design_projects',
  // 3D 设计工作台（V1）新 store
  DESIGN_STORE: 'drone_app_design_store',
  // 积木编程器：本地持久化当前程序（blocklyXml + 编译后 IR）
  PROGRAM_STORE: 'drone_app_program_store',
  APP_SETTINGS: 'drone_app_settings',
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]

