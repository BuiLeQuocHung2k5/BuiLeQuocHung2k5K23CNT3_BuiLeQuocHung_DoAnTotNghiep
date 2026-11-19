import { Route, Routes } from 'react-router'
import { lazy, Suspense } from 'react'
import FoundationPage from '../../features/foundation/FoundationPage.jsx'
import NotFoundPage from '../../pages/NotFoundPage.jsx'
import Spinner from '../../components/ui/Spinner.jsx'

const DesignSystemPage = lazy(() => import('../../features/design-system/DesignSystemPage.jsx'))

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<FoundationPage />} />
      <Route path="/design-system" element={<Suspense fallback={<div className="p-8"><Spinner label="Đang tải Design System" /></div>}><DesignSystemPage /></Suspense>} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
