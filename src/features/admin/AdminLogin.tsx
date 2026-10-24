import { useState, type FormEvent } from 'react'
import './AdminLogin.css'

type Props = { onLogin: () => void }

const DEMO_EMAIL = 'admin@sgu.edu.vn'
const DEMO_PASSWORD = 'sguadmin2026'

export function AdminLogin({ onLogin }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()
    const accounts: { name: string; email: string; password: string }[] = JSON.parse(localStorage.getItem('sgu-go-admin-accounts') || '[]')

    if (mode === 'register') {
      const form = new FormData(event.currentTarget)
      const confirmPassword = String(form.get('confirmPassword') ?? '')
      if (password.length < 8) {
        setError('Mật khẩu cần có ít nhất 8 ký tự.')
        return
      }
      if (password !== confirmPassword) {
        setError('Mật khẩu xác nhận chưa khớp.')
        return
      }
      if (normalizedEmail === DEMO_EMAIL || accounts.some((account) => account.email === normalizedEmail)) {
        setError('Email này đã được đăng ký.')
        return
      }
      localStorage.setItem('sgu-go-admin-accounts', JSON.stringify([...accounts, { name: name.trim(), email: normalizedEmail, password }]))
    } else if (normalizedEmail !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
      const account = accounts.find((item) => item.email === normalizedEmail && item.password === password)
      if (!account) {
        setError('Email hoặc mật khẩu chưa chính xác. Hãy thử tài khoản demo bên dưới.')
        return
      }
    }
    sessionStorage.setItem('sgu-go-admin-session', 'signed-in')
    onLogin()
  }

  function switchMode(nextMode: 'login' | 'register') {
    setMode(nextMode)
    setError('')
    setName('')
    setEmail('')
    setPassword('')
  }

  return <main className="admin-login-page">
    <a className="admin-login-back" href={`${import.meta.env.BASE_URL}#home`}>← Quay lại trang khách</a>
    <section className="admin-login-card" aria-labelledby="admin-login-title">
      <div className="admin-login-brand"><span className="admin-login-mark">S</span><span>SGU <i>Go</i></span></div>
      <div className="admin-login-kicker">CỔNG QUẢN TRỊ</div>
      <h1 id="admin-login-title">{mode === 'login' ? 'Chào mừng trở lại' : 'Tạo tài khoản admin'}</h1>
      <p className="admin-login-intro">{mode === 'login' ? 'Đăng nhập để quản lý địa điểm và nội dung tham quan.' : 'Tạo tài khoản thử nghiệm để truy cập trang quản trị.'}</p>
      <form className="admin-login-form" onSubmit={submit}>
        {mode === 'register' && <label>Họ và tên<input name="name" autoComplete="name" required value={name} onChange={(event) => { setName(event.target.value); setError('') }} placeholder="Tên quản trị viên" /></label>}
        <label>Email quản trị<input type="email" autoComplete="username" required value={email} onChange={(event) => { setEmail(event.target.value); setError('') }} placeholder="admin@sgu.edu.vn" /></label>
        <label>Mật khẩu<span className="admin-password-wrap"><input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required value={password} onChange={(event) => { setPassword(event.target.value); setError('') }} placeholder={mode === 'register' ? 'Ít nhất 8 ký tự' : 'Nhập mật khẩu'} minLength={mode === 'register' ? 8 : undefined} /><button type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? 'Ẩn' : 'Hiện'}</button></span></label>
        {mode === 'register' && <label>Xác nhận mật khẩu<input name="confirmPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required placeholder="Nhập lại mật khẩu" /></label>}
        {error && <p className="admin-login-error" role="alert">{error}</p>}
        <button className="admin-login-submit" type="submit">{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'} <span>→</span></button>
      </form>
      {mode === 'login' ? <><div className="admin-demo-account"><strong>Tài khoản dùng thử</strong><div><span>Email</span><code>{DEMO_EMAIL}</code></div><div><span>Mật khẩu</span><code>{DEMO_PASSWORD}</code></div></div><button type="button" className="admin-login-switch" onClick={() => switchMode('register')}>Chưa có tài khoản? <strong>Đăng ký</strong></button></> : <button type="button" className="admin-login-switch" onClick={() => switchMode('login')}>Đã có tài khoản? <strong>Đăng nhập</strong></button>}
      <p className="admin-login-footnote">Tài khoản đăng ký chỉ lưu trên trình duyệt này trong bản demo.</p>
    </section>
    <footer className="admin-login-footer">SGU Go <span>·</span> Cổng quản trị nội dung</footer>
  </main>
}
