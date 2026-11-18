import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { casesApi, documentsApi } from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'
import {
  FolderOpen, Plus, Search, FileText, Hash,
  RefreshCw, ChevronRight, X
} from 'lucide-react'
import toast from 'react-hot-toast'

function StatCard({ label, value, sub }) {
  return (
    <div
      className="p-5 rounded border"
      style={{ background: 'var(--color-paper)', borderColor: 'var(--color-rule)' }}
    >
      <p className="text-sm mb-1" style={{ color: 'var(--color-ink-3)' }}>{label}</p>
      <p
        className="font-semibold"
        style={{ fontSize: '28px', letterSpacing: '-0.02em', color: 'var(--color-ink)' }}
      >
        {value ?? '—'}
      </p>
      {sub && <p className="text-xs mt-1" style={{ color: 'var(--color-ink-4)' }}>{sub}</p>}
    </div>
  )
}

function CreateCaseModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ caseNumber: '', title: '', description: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function autogenCaseNumber() {
    const id = 'CASE-' + Math.random().toString(36).substring(2, 6).toUpperCase()
    setForm(f => ({ ...f, caseNumber: id }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.caseNumber || !form.title) { setError('Case number and title are required.'); return }
    setLoading(true)
    try {
      const { data } = await casesApi.create(form)
      toast.success(`Case ${data.caseNumber} created`)
      onCreated(data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create case.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: 'oklch(20% 0.01 60 / 0.5)', zIndex: 'var(--z-modal)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border p-6"
        style={{
          background: 'var(--color-paper)',
          borderColor: 'var(--color-rule)',
          boxShadow: 'var(--shadow-modal)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold" style={{ fontSize: '18px', color: 'var(--color-ink)' }}>
            New case
          </h2>
          <button type="button" onClick={onClose} style={{ color: 'var(--color-ink-4)' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1.5" style={{ color: 'var(--color-ink-2)' }}>
              Case number
            </label>
            <div className="flex gap-2">
              <input
                value={form.caseNumber}
                onChange={e => { setForm(f => ({ ...f, caseNumber: e.target.value })); setError('') }}
                className="flex-1 px-3 py-2.5 rounded border text-sm"
                style={{ background: 'var(--color-paper)', borderColor: 'var(--color-rule)', color: 'var(--color-ink)' }}
                placeholder="CASE-2026-001"
              />
              <button
                type="button"
                onClick={autogenCaseNumber}
                className="px-3 py-2 rounded border text-xs"
                style={{ borderColor: 'var(--color-rule)', color: 'var(--color-ink-3)', background: 'var(--color-paper-2)' }}
              >
                Generate
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1.5" style={{ color: 'var(--color-ink-2)' }}>Title</label>
            <input
              value={form.title}
              onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setError('') }}
              className="w-full px-3 py-2.5 rounded border text-sm"
              style={{ background: 'var(--color-paper)', borderColor: 'var(--color-rule)', color: 'var(--color-ink)' }}
              placeholder="Digital forensics case"
            />
          </div>

          <div>
            <label className="block text-sm mb-1.5" style={{ color: 'var(--color-ink-2)' }}>Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2.5 rounded border text-sm resize-none"
              style={{ background: 'var(--color-paper)', borderColor: 'var(--color-rule)', color: 'var(--color-ink)' }}
              placeholder="Optional case details..."
            />
          </div>

          {error && (
            <div
              className="px-3 py-2 rounded text-sm"
              style={{ background: 'var(--color-tampered-bg)', color: 'var(--color-tampered)', border: '1px solid var(--color-tampered-border)' }}
            >
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded border text-sm"
              style={{ borderColor: 'var(--color-rule)', color: 'var(--color-ink-3)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded text-sm font-medium"
              style={{ background: 'var(--color-ink)', color: 'var(--color-paper)', opacity: loading ? 0.6 : 1 }}
            >
              {loading ? 'Creating...' : 'Create case'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { canWrite } = useAuth()
  const navigate = useNavigate()
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [caseFilter, setCaseFilter] = useState('')

  const loadCases = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await casesApi.getAll()
      setCases(data)
    } catch {
      toast.error('Failed to load cases')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadCases() }, [loadCases])

  async function handleSearch(e) {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const { data } = await documentsApi.search(searchQuery.trim())
      setSearchResults(data)
    } catch {
      toast.error('Search failed')
    } finally {
      setSearching(false)
    }
  }

  const filteredCases = caseFilter
    ? cases.filter(c =>
        c.caseNumber.toLowerCase().includes(caseFilter.toLowerCase()) ||
        c.title.toLowerCase().includes(caseFilter.toLowerCase())
      )
    : cases

  const totalDocs = cases.reduce((sum, c) => sum + (c.documentCount || 0), 0)
  const anchored = cases.reduce((sum, c) => sum + (c.documentCount || 0), 0) // placeholder

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard label="Total cases" value={cases.length} sub="All time" />
        <StatCard label="Evidence files" value={totalDocs} sub="Across all cases" />
        <StatCard label="Blockchain proofs" value={anchored} sub="On-chain anchors" />
        <StatCard
          label="Security status"
          value={<span style={{ color: 'var(--color-verified)', fontSize: '22px' }}>Active</span>}
          sub="All systems operational"
        />
      </div>

      {/* Global search */}
      <div
        className="rounded border p-5 mb-8"
        style={{ background: 'var(--color-paper-2)', borderColor: 'var(--color-rule)' }}
      >
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-ink-4)' }} />
            <input
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); if (!e.target.value) setSearchResults(null) }}
              className="w-full pl-9 pr-4 py-2.5 rounded border text-sm"
              style={{ background: 'var(--color-paper)', borderColor: 'var(--color-rule)', color: 'var(--color-ink)' }}
              placeholder="Search documents by title, filename, or SHA-256 hash..."
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="px-4 py-2.5 rounded text-sm font-medium"
            style={{ background: 'var(--color-ink)', color: 'var(--color-paper)' }}
          >
            {searching ? <RefreshCw size={14} className="animate-spin" /> : 'Search'}
          </button>
        </form>

        {searchResults !== null && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm" style={{ color: 'var(--color-ink-3)' }}>
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
              </p>
              <button
                type="button"
                onClick={() => { setSearchResults(null); setSearchQuery('') }}
                className="text-xs"
                style={{ color: 'var(--color-ink-4)' }}
              >
                Clear
              </button>
            </div>
            {searchResults.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--color-ink-4)' }}>No documents found.</p>
            ) : (
              <div className="space-y-2">
                {searchResults.map(doc => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded border cursor-pointer hover:bg-paper-3 transition-colors duration-micro"
                    style={{ background: 'var(--color-paper)', borderColor: 'var(--color-rule)' }}
                    onClick={() => navigate(`/cases/${doc.case?.caseNumber}`)}
                  >
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{doc.title}</p>
                      <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--color-ink-3)' }}>
                        {doc.sha256Hash?.slice(0, 20)}…
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: 'var(--color-ink-4)' }}>
                        {doc.case?.caseNumber}
                      </span>
                      <ChevronRight size={14} style={{ color: 'var(--color-ink-4)' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cases directory */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold" style={{ fontSize: '20px', color: 'var(--color-ink)', letterSpacing: '-0.01em' }}>
            Cases
          </h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-ink-4)' }} />
              <input
                value={caseFilter}
                onChange={e => setCaseFilter(e.target.value)}
                className="pl-7 pr-3 py-1.5 rounded border text-sm"
                style={{
                  background: 'var(--color-paper-2)',
                  borderColor: 'var(--color-rule)',
                  color: 'var(--color-ink)',
                  width: '180px',
                }}
                placeholder="Filter cases..."
              />
            </div>
            {canWrite && (
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded border text-sm font-medium"
                style={{ background: 'var(--color-ink)', borderColor: 'var(--color-ink)', color: 'var(--color-paper)' }}
              >
                <Plus size={14} />
                New case
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-16 rounded border animate-pulse"
                style={{ background: 'var(--color-paper-2)', borderColor: 'var(--color-rule)' }}
              />
            ))}
          </div>
        ) : filteredCases.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-20 rounded border"
            style={{ borderColor: 'var(--color-rule)', background: 'var(--color-paper-2)' }}
          >
            <FolderOpen size={32} style={{ color: 'var(--color-ink-4)' }} className="mb-3" />
            <p className="text-sm" style={{ color: 'var(--color-ink-3)' }}>
              {caseFilter ? 'No cases match your filter' : 'No cases yet'}
            </p>
            {canWrite && !caseFilter && (
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="mt-3 text-sm"
                style={{ color: 'var(--color-accent)' }}
              >
                Create the first case
              </button>
            )}
          </div>
        ) : (
          <div
            className="rounded border overflow-hidden"
            style={{ borderColor: 'var(--color-rule)' }}
          >
            <table className="w-full">
              <thead>
                <tr style={{ background: 'var(--color-paper-2)', borderBottom: '1px solid var(--color-rule)' }}>
                  {['Case number', 'Title', 'Evidence', 'Created by', 'Date'].map(h => (
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
                {filteredCases.map((c, i) => (
                  <tr
                    key={c.id}
                    className="cursor-pointer transition-colors duration-micro hover:bg-paper-2"
                    style={{
                      borderBottom: i < filteredCases.length - 1 ? '1px solid var(--color-rule)' : 'none',
                      background: 'var(--color-paper)',
                    }}
                    onClick={() => navigate(`/cases/${c.caseNumber}`)}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-medium" style={{ color: 'var(--color-accent-dark)' }}>
                        {c.caseNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{c.title}</p>
                      {c.description && (
                        <p className="text-xs mt-0.5 truncate max-w-xs" style={{ color: 'var(--color-ink-4)' }}>
                          {c.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <FileText size={12} style={{ color: 'var(--color-ink-4)' }} />
                        <span className="text-sm" style={{ color: 'var(--color-ink-2)' }}>{c.documentCount}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-ink-3)' }}>
                      {c.createdBy}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-ink-4)' }}>
                      {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateCaseModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => loadCases()}
        />
      )}
    </div>
  )
}
