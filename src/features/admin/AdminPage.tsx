import { useState } from 'react'
import { AdminDashboard } from './AdminDashboard'
import { AdminLogin } from './AdminLogin'
import { clearAdminToken, getAdminToken } from './adminApi'

export function AdminPage() {
  const [signedIn, setSignedIn] = useState(() => Boolean(getAdminToken()))
  if (!signedIn) return <AdminLogin onLogin={() => setSignedIn(true)} />

  return (
    <div className="admin-site">
      <header className="admin-site-header">
        <a className="admin-site-brand" href={`${import.meta.env.BASE_URL}#/`}><span>SGU</span> Go</a>
        <span className="admin-site-context">CỔNG QUẢN TRỊ · QUẢN LÝ ĐỊA ĐIỂM</span>
        <div className="admin-site-actions">
          <button className="admin-site-logout" onClick={() => { clearAdminToken(); setSignedIn(false) }}>Đăng xuất</button>
          <a className="admin-site-back" href={`${import.meta.env.BASE_URL}#/`}>Trang khách</a>
        </div>
      </header>
      <main className="admin-site-main"><AdminDashboard /></main>
      <footer className="admin-site-footer">SGU Go <span>·</span> Hệ thống quản lý nội dung tham quan</footer>
    </div>
  )
}
