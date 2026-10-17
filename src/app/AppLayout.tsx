import { NavLink, Outlet } from 'react-router-dom'

export function AppLayout() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="site-header__content">
          <NavLink className="site-brand" to="/">
            Khám phá Quận 4
          </NavLink>
          <nav className="site-nav" aria-label="Điều hướng chính">
            <NavLink to="/">Địa điểm</NavLink>
          </nav>
        </div>
      </header>

      <main className="page-content">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="site-footer__content">
          Cẩm nang khám phá ẩm thực Quận 4
        </div>
      </footer>
    </div>
  )
}
