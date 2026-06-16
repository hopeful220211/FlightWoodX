/**
 * /projects/:id —— 项目详情页路由入口。
 * 实体是 C1「引力枢纽」，UI 与逻辑在 components/features/project/ProjectHub。
 */
import { ProjectHub } from '../../components/features/project/ProjectHub'

export function ProjectDetailPage() {
  return <ProjectHub />
}
