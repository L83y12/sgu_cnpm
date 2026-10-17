import { HashRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from './app/AppLayout'
import { NotFoundPage } from './app/NotFoundPage'
import { PoiDetailPage } from './features/poi/pages/PoiDetailPage'
import { PoiListPage } from './features/poi/pages/PoiListPage'
import './App.css'

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<PoiListPage />} />
          <Route path="poi/:poiId" element={<PoiDetailPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
