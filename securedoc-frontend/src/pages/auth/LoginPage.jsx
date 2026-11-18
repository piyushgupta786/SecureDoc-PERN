import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { Shield, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({ username: '', password: '', email: '', fullName: '' })
  const [error, setError] = useState('')

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
  }

  function autofillAdmin() {
    setForm(f => ({ ...f, username: 'admin', password: 'admin123' }))
    setMode('login')
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.username || !form.password) {
      setError('Username and password are required.')
      return
    }
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(form.username, form.password)
        toast.success(`Welcome back, ${form.username}`)
        navigate('/')
      } else {
        await register({ username: form.username, password: form.password, email: form.email, fullName: form.fullName })
        toast.success('Account created. Sign in to continue.')
        setMode('login')
        setForm(f => ({ ...f, password: '', email: '', fullName: '' }))
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Something went wrong. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ background: 'var(--color-paper)' }}
    >
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex flex-col justify-between w-96 flex-shrink-0 p-12 border-r"
        style={{ background: 'var(--color-ink)', borderColor: 'var(--color-ink-2)' }}
      >
        <div>
          <div className="flex items-center gap-2 mb-16">
            <Shield size={20} style={{ color: 'var(--color-accent)' }} />
            <span className="font-semibold text-sm" style={{ color: 'var(--color-paper)' }}>SecureDoc</span>
          </div>
          <h1
            className="font-semibold leading-tight mb-4"
            style={{
              color: 'var(--color-paper)',
              fontSize: '32px',
              letterSpacing: '-0.02em',
              lineHeight: '1.15',
            }}
          >
            Cryptographic Evidence Vault
          </h1>
          <p style={{ color: 'var(--color-ink-3)', fontSize: '15px', lineHeight: '1.6' }}>
            Forensic document security with Ethereum blockchain verification. Every file sealed with SHA-256 and anchored on-chain.
          </p>
        </div>

        <div className="space-y-3">
          {[
            { label: 'SHA-256 integrity verification' },
            { label: 'Ethereum blockchain anchoring' },
            { label: 'Role-based access control' },
            { label: 'Immutable forensic audit trail' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <div
                className="w-1 h-1 rounded-full flex-shrink-0"
                style={{ background: 'var(--color-accent)' }}
              />
              <span style={{ color: 'var(--color-ink-3)', fontSize: '13px' }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <Shield size={18} style={{ color: 'var(--color-accent)' }} />
            <span className="font-semibold text-sm" style={{ color: 'var(--color-ink)' }}>SecureDoc</span>
          </div>

          {/* Mode switcher */}
          <div
            className="flex rounded mb-8 p-0.5"
            style={{ background: 'var(--color-paper-2)', border: '1px solid var(--color-rule)' }}
          >
            {['login', 'register'].map(m => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError('') }}
                className="flex-1 py-2 text-sm rounded transition-colors duration-short"
                style={
                  mode === m
                    ? { background: 'var(--color-paper)', color: 'var(--color-ink)', boxShadow: 'var(--shadow-card)', fontWeight: 500 }
                    : { color: 'var(--color-ink-3)' }
                }
              >
                {m === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Demo autofill */}
            {mode === 'login' && (
              <button
                type="button"
                onClick={autofillAdmin}
                className="w-full py-2.5 text-sm rounded border transition-colors duration-short flex items-center justify-center gap-2 whitespace-nowrap"
                style={{
                  background: 'var(--color-accent-light)',
                  borderColor: 'var(--color-accent-border)',
                  color: 'var(--color-accent-dark)',
                  whiteSpace: 'nowrap',
                }}
              >
                <Shield size={13} />
                Auto-fill admin demo
              </button>
            )}

            {mode === 'register' && (
              <div>
                <label className="block text-sm mb-1.5" style={{ color: 'var(--color-ink-2)' }} htmlFor="fullName">
                  Full name
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  value={form.fullName}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 rounded border text-sm transition-colors duration-micro"
                  style={{
                    background: 'var(--color-paper)',
                    borderColor: 'var(--color-rule)',
                    color: 'var(--color-ink)',
                  }}
                  placeholder="Jane Smith"
                />
              </div>
            )}

            <div>
              <label className="block text-sm mb-1.5" style={{ color: 'var(--color-ink-2)' }} htmlFor="username">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                value={form.username}
                onChange={handleChange}
                required
                className="w-full px-3 py-2.5 rounded border text-sm transition-colors duration-micro"
                style={{
                  background: 'var(--color-paper)',
                  borderColor: 'var(--color-rule)',
                  color: 'var(--color-ink)',
                }}
                placeholder="admin"
              />
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-sm mb-1.5" style={{ color: 'var(--color-ink-2)' }} htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 rounded border text-sm transition-colors duration-micro"
                  style={{
                    background: 'var(--color-paper)',
                    borderColor: 'var(--color-rule)',
                    color: 'var(--color-ink)',
                  }}
                  placeholder="jane@example.com"
                />
              </div>
            )}

            <div>
              <label className="block text-sm mb-1.5" style={{ color: 'var(--color-ink-2)' }} htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={form.password}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2.5 pr-10 rounded border text-sm transition-colors duration-micro"
                  style={{
                    background: 'var(--color-paper)',
                    borderColor: 'var(--color-rule)',
                    color: 'var(--color-ink)',
                  }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--color-ink-4)' }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div
                className="px-3 py-2 rounded text-sm"
                style={{
                  background: 'var(--color-tampered-bg)',
                  color: 'var(--color-tampered)',
                  border: '1px solid var(--color-tampered-border)',
                }}
                role="alert"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded text-sm font-medium transition-opacity duration-short"
              style={{
                background: loading ? 'var(--color-ink-3)' : 'var(--color-ink)',
                color: 'var(--color-paper)',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading
                ? (mode === 'login' ? 'Signing in...' : 'Creating account...')
                : (mode === 'login' ? 'Sign in' : 'Create account')
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
