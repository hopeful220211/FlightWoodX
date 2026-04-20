import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import ProtectedRoute from './components/layout/ProtectedRoute'
import RoleRoute from './components/layout/RoleRoute'
import { HomePage } from './pages/Home/HomePage'
import { LearnPage } from './pages/Learn/LearnPage'
import { DesignPageRouter } from './pages/Design/DesignPageRouter'
import { GalleryPage } from './pages/Gallery/GalleryPage'
import { ProfilePage } from './pages/Profile/ProfilePage'
import { AuthPage } from './pages/Auth/AuthPage'
import { AdminPage } from './pages/Admin/AdminPage'
import { partsData } from './data/parts'
import { prefetchAndExtractConnectors } from './hooks/usePartConnectors'

export default function App() {
  useEffect(() => {
    const initApp = async () => {
      console.log('--- [App Init] Starting model prefetch... ---')
      const prefetchPromises = partsData
        .filter((p) => p.modelUrl)
        .map((p) => prefetchAndExtractConnectors(p.modelUrl))
      await Promise.all(prefetchPromises)
      console.log('--- [App Init] All models pre-processed. App is ready! ---')
    }
    initApp()
  }, [])

  return (
    <Routes>
      {/* Auth Route - 独立布局 */}
      <Route path="/auth" element={<AuthPage />} />

      {/* Admin Route - 需要 admin 角色 */}
      <Route element={<RoleRoute roles={['admin']} />}>
        <Route path="/admin" element={<AdminPage />} />
      </Route>

      {/* Main App Routes */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/design" element={<DesignPageRouter />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
