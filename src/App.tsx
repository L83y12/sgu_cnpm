import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './app/AppLayout'
import { NotFoundPage } from './app/NotFoundPage'
import { GuidePage } from './features/guide/GuidePage'
import { MapPage } from './features/map/MapPage'
import { AdminPage } from './features/admin/AdminPage'

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<GuidePage />} />
          <Route path="/explore" element={<MapPage />} />
          <Route path="/map" element={<Navigate to="/explore" replace />} />
          <Route path="/saved" element={<Navigate to="/" replace />} />
        </Route>
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </HashRouter>
  )
}

export default App
