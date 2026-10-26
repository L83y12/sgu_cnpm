import { useState, type FormEvent } from 'react'
import { adminApi, saveAdminToken } from './adminApi'
import './AdminLogin.css'

type Props = { onLogin: () => void }

const DEMO_EMAIL = 'admin@sgu.edu.vn'
const DEMO_PASSWORD = 'sguadmin2026'

export function AdminLogin({ onLogin }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()
    setBusy(true)
    setError('')
    try {
      const result = await adminApi.login(normalizedEmail, password)
      saveAdminToken(result.token)
      onLogin()
    } catch (reason) {
      setError(reason instanceof Error ? `${reason.message} Kiểm tra API đang chạy và thông tin đăng nhập.` : 'Không thể đăng nhập.')
    } finally { setBusy(false) }
  }

  return <main className="admin-login-page">
    <a className="admin-login-back" href={`${import.meta.env.BASE_URL}#home`}>← Quay lại trang khách</a>
    <section className="admin-login-card" aria-labelledby="admin-login-title">
      <div className="admin-login-brand"><span className="admin-login-mark">S</span><span>SGU <i>Go</i></span></div>
      <div className="admin-login-kicker">CỔNG QUẢN TRỊ</div>
      <h1 id="admin-login-title">Đăng nhập quản trị</h1>
      <p className="admin-login-intro">Đăng nhập bằng tài khoản được cấp để quản lý địa điểm và nội dung tham quan.</p>
      <form className="admin-login-form" onSubmit={submit}>
        <label>Email quản trị<input type="email" autoComplete="username" required value={email} onChange={(event) => { setEmail(event.target.value); setError('') }} placeholder="admin@sgu.edu.vn" /></label>
        <label>Mật khẩu<span className="admin-password-wrap"><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(event) => { setPassword(event.target.value); setError('') }} placeholder="Nhập mật khẩu" /><button type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? 'Ẩn' : 'Hiện'}</button></span></label>
        {error && <p className="admin-login-error" role="alert">{error}</p>}
        <button className="admin-login-submit" type="submit" disabled={busy}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập'} <span>→</span></button>
      </form>
      <div className="admin-demo-account"><strong>Tài khoản dùng thử</strong><div><span>Email</span><code>{DEMO_EMAIL}</code></div><div><span>Mật khẩu</span><code>{DEMO_PASSWORD}</code></div></div>
      <p className="admin-login-footnote">Không có tài khoản? Liên hệ quản trị viên để được cấp quyền truy cập.</p>
    </section>
    <footer className="admin-login-footer">SGU Go <span>·</span> Cổng quản trị nội dung</footer>
  </main>
}
