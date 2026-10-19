import { HashRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from './app/AppLayout'
import { NotFoundPage } from './app/NotFoundPage'
import { PoiListPage } from './features/poi/pages/PoiListPage'

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<PoiListPage />} />
          <Route path="/map" element={<PoiListPage />} />
          <Route path="/saved" element={<PoiListPage />} />
          <Route path="/poi/:poiId" element={<PoiListPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </HashRouter>
  )
}

export default App
