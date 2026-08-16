import { Navigate } from 'react-router'

/**
 * /projects —— 已退休（RFC-024 §4.2 作品库合一）。
 *
 * 「我的作品」现在只有一处：工作台 /dashboard（服务器 drone-designs 为真相源）。
 * 旧的项目列表是第二套空壳库，这里直接重定向到工作台，避免两处对不上。
 * 路由本身归整合负责人（App.tsx），故用组件级重定向，不改路由表。
 */
export function ProjectsPage() {
  return <Navigate to="/dashboard" replace />
}
