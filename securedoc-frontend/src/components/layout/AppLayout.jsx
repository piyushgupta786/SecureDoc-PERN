import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useWeb3 } from '../../context/Web3Context.jsx'
import {
  Shield, FileText, Users, LogOut, Wallet,
  Copy, CheckCircle, Circle, ChevronDown
} from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'

function RoleBadge({ role }) {
  const styles = {
    ADMIN: 'bg-amber-50 text-amber-800 border border-amber-200',
    INVESTIGATOR: 'bg-blue-50 text-blue-800 border border-blue-200',
    VIEWER: 'bg-gray-100 text-gray-700 border border-gray-200',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium font-mono ${styles[role] || styles.VIEWER}`}>
      {role}
    </span>
  )
}

function truncateAddress(addr) {
  if (!addr) return ''
  return addr.slice(0, 6) + '...' + addr.slice(-4)
}

export default function AppLayout() {
  const { user, logout, isAdmin } = useAuth()
  const { walletAddress, networkStatus, contractAddress, isConnected, connectWallet } = useWeb3()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  function copyContract() {
    if (contractAddress) {
      navigator.clipboard.writeText(contractAddress)
      setCopied(true)
      toast.success('Contract address copied')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-paper)' }}>
      {/* ── Top Nav ───────────────────────────────────────── */}
      <header
        className="sticky top-0 z-nav border-b"
        style={{
          background: 'var(--color-paper)',
          borderColor: 'var(--color-rule)',
          height: 'var(--nav-height)',
          zIndex: 'var(--z-nav)',
        }}
      >
        <div className="flex items-center justify-between h-full px-6">
          {/* Wordmark */}
          <NavLink
            to="/"
            aria-label="SecureDoc home"
            className="flex items-center gap-2 no-underline"
          >
            <Shield size={18} style={{ color: 'var(--color-accent)' }} />
            <span className="font-semibold tracking-tight text-sm" style={{ color: 'var(--color-ink)' }}>
              SecureDoc
            </span>
          </NavLink>

          {/* Center nav */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors duration-micro ${
                  isActive
                    ? 'text-amber-700 bg-amber-50'
                    : 'text-ink-3 hover:text-ink hover:bg-paper-2'
                }`
              }
              style={({ isActive }) => ({
                color: isActive ? 'var(--color-accent-dark)' : 'var(--color-ink-3)',
              })}
            >
              <FileText size={14} />
              Cases
            </NavLink>
            {isAdmin && (
              <NavLink
                to="/admin/users"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors duration-micro`
                }
                style={({ isActive }) => ({
                  color: isActive ? 'var(--color-accent-dark)' : 'var(--color-ink-3)',
                  background: isActive ? 'var(--color-accent-light)' : 'transparent',
                })}
              >
                <Users size={14} />
                Users
              </NavLink>
            )}
          </nav>

          {/* Right: Web3 + user */}
          <div className="flex items-center gap-3">
            {/* Blockchain status */}
            <div
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded border text-xs"
              style={{
                background: 'var(--color-paper-2)',
                borderColor: 'var(--color-rule)',
                color: 'var(--color-ink-3)',
              }}
            >
              {isConnected ? (
                <CheckCircle size={12} style={{ color: 'var(--color-verified)' }} />
              ) : (
                <Circle size={12} style={{ color: 'var(--color-ink-4)' }} />
              )}
              <span className="font-mono">{networkStatus}</span>
              {contractAddress && (
                <>
                  <span style={{ color: 'var(--color-rule)' }}>·</span>
                  <button
                    onClick={copyContract}
                    className="font-mono hover:text-ink transition-colors duration-micro"
                    title={contractAddress}
                    type="button"
                  >
                    {truncateAddress(contractAddress)}
                  </button>
                  {copied ? (
                    <CheckCircle size={10} style={{ color: 'var(--color-verified)' }} />
                  ) : (
                    <Copy size={10} className="cursor-pointer hover:text-ink" onClick={copyContract} />
                  )}
                </>
              )}
            </div>

            {/* Wallet connect */}
            {walletAddress ? (
              <span
                className="hidden lg:inline text-xs font-mono px-2 py-1 rounded border"
                style={{
                  background: 'var(--color-verified-bg)',
                  borderColor: 'var(--color-verified-border)',
                  color: 'var(--color-verified)',
                }}
              >
                {truncateAddress(walletAddress)}
              </span>
            ) : (
              <button
                onClick={connectWallet}
                className="hidden lg:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border transition-colors duration-short"
                style={{
                  background: 'var(--color-paper)',
                  borderColor: 'var(--color-rule)',
                  color: 'var(--color-ink-2)',
                }}
                type="button"
              >
                <Wallet size={12} />
                Connect Wallet
              </button>
            )}

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(o => !o)}
                className="flex items-center gap-2 text-sm transition-opacity hover:opacity-70"
                type="button"
              >
                <div
                  className="w-7 h-7 rounded flex items-center justify-center text-xs font-semibold"
                  style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent-dark)' }}
                >
                  {user?.username?.[0]?.toUpperCase()}
                </div>
                <span className="hidden md:block text-sm" style={{ color: 'var(--color-ink-2)' }}>
                  {user?.username}
                </span>
                <ChevronDown size={12} style={{ color: 'var(--color-ink-4)' }} />
              </button>

              {userMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-1 w-48 rounded border shadow-lg py-1"
                  style={{
                    background: 'var(--color-paper)',
                    borderColor: 'var(--color-rule)',
                    boxShadow: 'var(--shadow-modal)',
                    zIndex: 'var(--z-dropdown)',
                  }}
                >
                  <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--color-rule)' }}>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{user?.username}</p>
                    <RoleBadge role={user?.role} />
                  </div>
                  <button
                    onClick={() => { setUserMenuOpen(false); handleLogout() }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors hover:bg-paper-2"
                    style={{ color: 'var(--color-ink-2)' }}
                    type="button"
                  >
                    <LogOut size={14} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────── */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
