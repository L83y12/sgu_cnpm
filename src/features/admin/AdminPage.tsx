import { useState } from 'react'
import { AdminDashboard, type AdminView } from './AdminDashboard'
import { AdminLogin } from './AdminLogin'
import { clearAdminToken, getAdminToken } from './adminApi'

export function AdminPage() {
  const [signedIn, setSignedIn] = useState(() => Boolean(getAdminToken()))
  const [view, setView] = useState<AdminView>('overview')
  if (!signedIn) return <AdminLogin onLogin={() => setSignedIn(true)} />

  return (
    <div className="admin-site">
      <header className="admin-site-header">
        <a className="admin-site-brand" href={`${import.meta.env.BASE_URL}#/`}><span>SGU</span> Go</a>
        <span className="admin-site-context">CỔNG QUẢN TRỊ</span>
        <div className="admin-site-actions">
          <button className="admin-site-logout" onClick={() => { clearAdminToken(); setSignedIn(false) }}>Đăng xuất</button>
          <a className="admin-site-back" href={`${import.meta.env.BASE_URL}#/`}>Trang khách</a>
        </div>
      </header>
      <div className="admin-site-body">
        <nav className="admin-sidebar" aria-label="Điều hướng quản trị">
          <button className={view === 'overview' ? 'is-active' : ''} aria-current={view === 'overview' ? 'page' : undefined} onClick={() => setView('overview')}><span>▦</span>Tổng quan</button>
          <button className={view === 'places' ? 'is-active' : ''} aria-current={view === 'places' ? 'page' : undefined} onClick={() => setView('places')}><span>⌖</span>Địa điểm</button>
        </nav>
        <main className="admin-site-main"><AdminDashboard view={view} /></main>
      </div>
      <footer className="admin-site-footer">SGU Go <span>·</span> Hệ thống quản lý nội dung tham quan</footer>
    </div>
  )
}
