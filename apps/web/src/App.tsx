import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { EditorLayout } from './components/layout/EditorLayout'
import ProtectedRoute from './components/layout/ProtectedRoute'
import RoleRoute from './components/layout/RoleRoute'

/* ── Public Pages ── */
import { HomePage } from './pages/Home/HomePage'
import { AuthPage } from './pages/Auth/AuthPage'
import { NotFoundPage } from './pages/NotFound/NotFoundPage'

/* ── Dashboard & Projects ── */
import { DashboardPage } from './pages/Dashboard/DashboardPage'
import { ProjectsPage } from './pages/Projects/ProjectsPage'
import { ProjectDetailPage } from './pages/Projects/ProjectDetailPage'

/* ── Editor Pages (inside EditorLayout) ── */
import { DesignPageRouter } from './pages/Design/DesignPageRouter'
import { CodingPage } from './pages/Coding/CodingPage'
import { SimulatorPage } from './pages/Simulator/SimulatorPage'

/* ── Competition Ecosystem ── */
import { CompetitionsPage } from './pages/Competitions/CompetitionsPage'
import { CompetitionDetailPage } from './pages/Competitions/CompetitionDetailPage'
import { CompetitionSubmitPage } from './pages/Competitions/CompetitionSubmitPage'
import { LeaderboardPage } from './pages/Competitions/LeaderboardPage'

/* ── Community & Parts ── */
import { CommunityPage } from './pages/Community/CommunityPage'
import { CommunityPostPage } from './pages/Community/CommunityPostPage'
import { CollectionsPage } from './pages/Collections/CollectionsPage'
import { CollectionDetailPage } from './pages/Collections/CollectionDetailPage'
import { AuthorPage } from './pages/Author/AuthorPage'
import { FollowingFeedPage } from './pages/Feed/FollowingFeedPage'
import { PartsPage } from './pages/Parts/PartsPage'
import { PartDetailPage } from './pages/Parts/PartDetailPage'

/* ── Build / Fly (P2) ── */
// TEMP(RFC-012-B): pages/Build/BuildPage 在所有分支均不存在，此悬空 import 会让整个前端构建失败。
// 仅为本任务截图临时注释；非本任务范围，待 Build 页负责人补齐后还原本行与下方 /build 路由。
// import { BuildPage } from './pages/Build/BuildPage'
import { FlyPage } from './pages/Fly/FlyPage'

/* ── User ── */
import { MePage } from './pages/Me/MePage'
import { GrowthPage } from './pages/Me/Growth/GrowthPage'
import { ProfilePage } from './pages/Profile/ProfilePage'

/* ── Existing ── */
import { LearnPage } from './pages/Learn/LearnPage'
import { GalleryPage } from './pages/Gallery/GalleryPage'
import { ExportPreviewPage } from './pages/ExportPreview/ExportPreviewPage'
import { ARFlightPage } from './pages/ARFlight/ARFlightPage'

/* ── Admin ── */
import { AdminLayout } from './pages/Admin/AdminLayout'
import { AdminOverviewPage } from './pages/Admin/pages/OverviewPage'
import { AdminUsersPage, AdminCoursesPage, AdminPartsPage, AdminAuditPage } from './pages/Admin/pages/ModulePlaceholder'

/* ── Stores / Init ── */
import { partsData } from './data/parts'
import { prefetchAndExtractConnectors } from './hooks/usePartConnectors'
import { useAuthStore } from './stores/authStore'

export default function App() {
  const restoreSession = useAuthStore((s) => s.restoreSession)

  useEffect(() => { restoreSession() }, [restoreSession])

  useEffect(() => {
    const initApp = async () => {
      const prefetchPromises = partsData
        .filter((p) => p.modelUrl)
        .map((p) => prefetchAndExtractConnectors(p.modelUrl))
      await Promise.all(prefetchPromises)
    }
    initApp()
  }, [])

  return (
    <Routes>
      {/* ── Auth (standalone layout) ── */}
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage />} />

      {/* ── Admin (role-gated) ── */}
      <Route element={<RoleRoute roles={['admin']} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminOverviewPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="courses" element={<AdminCoursesPage />} />
          <Route path="parts" element={<AdminPartsPage />} />
          <Route path="audit" element={<AdminAuditPage />} />
        </Route>
      </Route>

      {/* ── Editor Layout (full-screen, step switcher) ── */}
      <Route element={<EditorLayout />}>
        <Route path="/design" element={<DesignPageRouter />} />
        <Route path="/design/:id" element={<DesignPageRouter />} />
        <Route path="/code" element={<CodingPage />} />
        <Route path="/code/:id" element={<CodingPage />} />
        <Route path="/simulator" element={<SimulatorPage />} />
        <Route path="/simulator/:id" element={<SimulatorPage />} />
      </Route>

      {/* ── Main App (Navbar layout) ── */}
      <Route element={<AppLayout />}>
        {/* Public */}
        <Route path="/" element={<HomePage />} />
        <Route path="/competitions" element={<CompetitionsPage />} />
        <Route path="/competitions/:id" element={<CompetitionDetailPage />} />
        <Route path="/competitions/:id/leaderboard" element={<LeaderboardPage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/community/:postId" element={<CommunityPostPage />} />
        <Route path="/u/:userId" element={<AuthorPage />} />
        <Route path="/collections/:id" element={<CollectionDetailPage />} />
        <Route path="/parts" element={<PartsPage />} />
        <Route path="/parts/:id" element={<PartDetailPage />} />
        <Route path="/gallery" element={<GalleryPage />} />

        {/* Protected (guests allowed) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/collections" element={<CollectionsPage />} />
          <Route path="/feed" element={<FollowingFeedPage />} />
          <Route path="/competitions/:id/submit" element={<CompetitionSubmitPage />} />
          {/* TEMP(RFC-012-B): 同上，BuildPage 缺失，临时停用 /build 路由，待负责人补齐后还原 */}
          {/* <Route path="/build/:id" element={<BuildPage />} /> */}
          <Route path="/fly/:id" element={<FlyPage />} />
          <Route path="/me" element={<MePage />} />
          <Route path="/me/growth" element={<GrowthPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/design/export-preview/:designId" element={<ExportPreviewPage />} />
          <Route path="/design/ar-flight/:designId" element={<ARFlightPage />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
