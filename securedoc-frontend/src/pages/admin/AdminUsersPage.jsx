import { useState, useEffect, useCallback } from 'react'
import { usersApi } from '../../api/client.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { Users, ChevronDown, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

// Fetch all users by peeking at known usernames or use an admin endpoint
// Since there's no GET /api/users endpoint, we'll display users from audit logs
// and allow role updates for known users by username lookup.

const ROLES = ['VIEWER', 'INVESTIGATOR', 'ADMIN']

function RoleBadge({ role }) {
  const styles = {
    ADMIN: { background: 'var(--color-warn-bg)', color: 'var(--color-warn)', border: '1px solid var(--color-warn-border)' },
    INVESTIGATOR: { background: 'var(--color-info-bg)', color: 'var(--color-info)', border: '1px solid var(--color-info-border)' },
    VIEWER: { background: 'var(--color-paper-2)', color: 'var(--color-ink-3)', border: '1px solid var(--color-rule)' },
  }
  return (
    <span
      className="inline-flex items-center text-xs px-2 py-0.5 rounded font-medium"
      style={styles[role] || styles.VIEWER}
    >
      {role}
    </span>
  )
}

function RoleSelector({ currentRole, username, onUpdated }) {
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  async function changeRole(newRole) {
    if (newRole === currentRole) { setOpen(false); return }
    setLoading(true)
    setOpen(false)
    try {
      const { data } = await usersApi.updateRole(username, newRole)
      toast.success(`${username} role updated to ${data.role}`)
      onUpdated(data)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Role update failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded border transition-colors duration-micro"
        style={{
          borderColor: 'var(--color-rule)',
          color: 'var(--color-ink-2)',
          background: 'var(--color-paper-2)',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? <RefreshCw size={11} className="animate-spin" /> : <ChevronDown size={11} />}
        Change role
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 rounded border shadow-lg py-1 z-dropdown"
          style={{
            background: 'var(--color-paper)',
            borderColor: 'var(--color-rule)',
            boxShadow: 'var(--shadow-modal)',
            minWidth: '130px',
            zIndex: 'var(--z-dropdown)',
          }}
        >
          {ROLES.map(role => (
            <button
              key={role}
              type="button"
              onClick={() => changeRole(role)}
              className="w-full text-left px-3 py-2 text-xs transition-colors duration-micro"
              style={{
                color: role === currentRole ? 'var(--color-accent)' : 'var(--color-ink-2)',
                background: role === currentRole ? 'var(--color-accent-light)' : 'transparent',
                fontWeight: role === currentRole ? 500 : 400,
              }}
            >
              {role}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchUsername, setSearchUsername] = useState('')
  const [searchResult, setSearchResult] = useState(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  // Seed with admin user on mount
  useEffect(() => {
    if (currentUser) {
      setUsers([{
        id: currentUser.id,
        username: currentUser.username,
        email: currentUser.email,
        role: currentUser.role,
        fullName: currentUser.fullName,
        createdAt: new Date().toISOString(),
      }])
    }
  }, [currentUser])

  async function handleSearch(e) {
    e.preventDefault()
    if (!searchUsername.trim()) return
    setSearching(true)
    setSearchError('')
    setSearchResult(null)
    try {
      const { data } = await usersApi.getByUsername(searchUsername.trim())
      setSearchResult(data)
      // Add to list if not already there
      setUsers(prev => {
        const exists = prev.find(u => u.username === data.username)
        return exists ? prev.map(u => u.username === data.username ? data : u) : [...prev, data]
      })
    } catch (err) {
      setSearchError(err.response?.data?.message || 'User not found.')
    } finally {
      setSearching(false)
    }
  }

  function handleRoleUpdated(updatedUser) {
    setUsers(prev => prev.map(u => u.username === updatedUser.username ? { ...u, ...updatedUser } : u))
    if (searchResult?.username === updatedUser.username) {
      setSearchResult(r => ({ ...r, ...updatedUser }))
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center gap-2 mb-8">
        <Users size={20} style={{ color: 'var(--color-accent)' }} />
        <h1
          className="font-semibold"
          style={{ fontSize: '22px', letterSpacing: '-0.015em', color: 'var(--color-ink)' }}
        >
          User management
        </h1>
        <span
          className="text-xs px-2 py-0.5 rounded font-medium ml-1"
          style={{ background: 'var(--color-warn-bg)', color: 'var(--color-warn)' }}
        >
          ADMIN
        </span>
      </div>

      {/* Lookup form */}
      <div
        className="rounded border p-5 mb-8"
        style={{ background: 'var(--color-paper-2)', borderColor: 'var(--color-rule)' }}
      >
        <p className="text-sm font-medium mb-3" style={{ color: 'var(--color-ink-2)' }}>
          Look up user by username
        </p>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            value={searchUsername}
            onChange={e => { setSearchUsername(e.target.value); setSearchError('') }}
            className="flex-1 px-3 py-2.5 rounded border text-sm"
            style={{
              background: 'var(--color-paper)',
              borderColor: 'var(--color-rule)',
              color: 'var(--color-ink)',
            }}
            placeholder="Enter username…"
          />
          <button
            type="submit"
            disabled={searching}
            className="px-4 py-2.5 rounded text-sm font-medium"
            style={{ background: 'var(--color-ink)', color: 'var(--color-paper)' }}
          >
            {searching ? <RefreshCw size={14} className="animate-spin" /> : 'Look up'}
          </button>
        </form>
        {searchError && (
          <p className="mt-2 text-sm" style={{ color: 'var(--color-tampered)' }}>{searchError}</p>
        )}
        {searchResult && (
          <div
            className="mt-3 p-3 rounded border"
            style={{ background: 'var(--color-paper)', borderColor: 'var(--color-rule)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{searchResult.username}</span>
                <span className="ml-2"><RoleBadge role={searchResult.role} /></span>
                {searchResult.email && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-ink-4)' }}>{searchResult.email}</p>
                )}
              </div>
              {searchResult.username !== currentUser?.username && (
                <RoleSelector
                  currentRole={searchResult.role}
                  username={searchResult.username}
                  onUpdated={handleRoleUpdated}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Known users table */}
      <div>
        <h2
          className="font-semibold mb-4"
          style={{ fontSize: '16px', color: 'var(--color-ink)', letterSpacing: '-0.01em' }}
        >
          Loaded users
        </h2>
        <div
          className="rounded border overflow-hidden"
          style={{ borderColor: 'var(--color-rule)' }}
        >
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--color-paper-2)', borderBottom: '1px solid var(--color-rule)' }}>
                {['Username', 'Email', 'Role', 'Actions'].map(h => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs"
                    style={{ color: 'var(--color-ink-3)', fontWeight: 500 }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr
                  key={u.username}
                  style={{
                    background: 'var(--color-paper)',
                    borderBottom: i < users.length - 1 ? '1px solid var(--color-rule)' : 'none',
                  }}
                >
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
                    {u.username}
                    {u.username === currentUser?.username && (
                      <span className="ml-2 text-xs" style={{ color: 'var(--color-ink-4)' }}>(you)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-ink-3)' }}>
                    {u.email || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-4 py-3">
                    {u.username !== currentUser?.username && (
                      <RoleSelector
                        currentRole={u.role}
                        username={u.username}
                        onUpdated={handleRoleUpdated}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs mt-3" style={{ color: 'var(--color-ink-4)' }}>
          Use the lookup above to find any user by username and manage their role.
        </p>
      </div>
    </div>
  )
}
