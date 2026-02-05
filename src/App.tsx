import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import ProtectedRoute from './components/layout/ProtectedRoute'
import { HomePage } from './pages/Home/HomePage'
import { LearnPage } from './pages/Learn/LearnPage'
import { DesignPage } from './pages/Design/DesignPage'
import { GalleryPage } from './pages/Gallery/GalleryPage'
import { ProfilePage } from './pages/Profile/ProfilePage'
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
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/design" element={<DesignPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
