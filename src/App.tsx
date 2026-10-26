import { HashRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from './app/AppLayout'
import { NotFoundPage } from './app/NotFoundPage'
import { PoiListPage } from './features/poi/pages/PoiListPage'
import { MapPage } from './features/map/MapPage'
import { AdminPage } from './features/admin/AdminPage'

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<PoiListPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/saved" element={<PoiListPage />} />
          <Route path="/poi/:poiId" element={<PoiListPage />} />
        </Route>
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </HashRouter>
  )
}

export default App
