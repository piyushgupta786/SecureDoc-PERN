import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { casesApi, documentsApi, auditApi } from '../../api/client.js'
import { useAuth } from '../../context/AuthContext.jsx'
import {
  ArrowLeft, Upload, Shield, Hash, CheckCircle, XCircle,
  Link, Clock, Download, Copy, FileText, AlertTriangle,
  ChevronRight, X, RefreshCw, Eye
} from 'lucide-react'
import toast from 'react-hot-toast'

// ── Utility helpers ──────────────────────────────────────────────────────
function truncHash(hash, n = 20) {
  if (!hash) return '—'
  return hash.length > n * 2 + 3 ? hash.slice(0, n) + '…' + hash.slice(-n) : hash
}

function copyText(text, label = 'Copied') {
  navigator.clipboard.writeText(text).then(() => toast.success(label))
}

function formatBytes(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

function BlockchainBadge({ registered, txHash }) {
  if (registered) {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded"
        style={{ background: 'var(--color-verified-bg)', color: 'var(--color-verified)' }}
      >
        <Link size={10} />
        Anchored on-chain
        {txHash && (
          <button
            type="button"
            onClick={() => copyText(txHash, 'Tx hash copied')}
            className="ml-1 opacity-60 hover:opacity-100"
          >
            <Copy size={9} />
          </button>
        )}
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded"
      style={{ background: 'var(--color-warn-bg)', color: 'var(--color-warn)' }}
    >
      <AlertTriangle size={10} />
      Off-chain
    </span>
  )
}

// ── Upload Modal ─────────────────────────────────────────────────────────
function UploadModal({ caseRecord, onClose, onUploaded }) {
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const fileRef = useRef()

  function handleDrop(e) {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) { setFile(f); setTitle(f.name.replace(/\.[^.]+$/, '')) }
  }

  async function handleUpload(e) {
    e.preventDefault()
    if (!file || !title) { setError('File and title are required.'); return }
    setLoading(true)
    setError('')
    try {
      setProgress('Uploading and hashing…')
      const fd = new FormData()
      fd.append('file', file)
      fd.append('title', title)
      fd.append('caseNumber', caseRecord.caseNumber)

      const { data } = await documentsApi.upload(fd)
      setProgress(data.blockchainRegistered ? 'Anchored on blockchain!' : 'Saved (blockchain pending)')
      toast.success(`"${title}" uploaded${data.blockchainRegistered ? ' and anchored on-chain' : ''}`)
      onUploaded(data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed.')
      setProgress('')
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
          <h2 className="font-semibold" style={{ fontSize: '17px', color: 'var(--color-ink)' }}>
            Upload evidence
          </h2>
          <button type="button" onClick={onClose} style={{ color: 'var(--color-ink-4)' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleUpload} className="space-y-4">
          {/* Drop zone */}
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-micro"
            style={{
              borderColor: file ? 'var(--color-accent)' : 'var(--color-rule)',
              background: file ? 'var(--color-accent-light)' : 'var(--color-paper-2)',
            }}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={24} className="mx-auto mb-2" style={{ color: file ? 'var(--color-accent)' : 'var(--color-ink-4)' }} />
            {file ? (
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{file.name}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-ink-3)' }}>{formatBytes(file.size)}</p>
              </div>
            ) : (
              <div>
                <p className="text-sm" style={{ color: 'var(--color-ink-3)' }}>Drop a file or click to browse</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-ink-4)' }}>Up to 10 MB</p>
              </div>
            )}
            <input ref={fileRef} type="file" className="hidden" onChange={e => {
              const f = e.target.files[0]
              if (f) { setFile(f); setTitle(f.name.replace(/\.[^.]+$/, '')) }
            }} />
          </div>

          <div>
            <label className="block text-sm mb-1.5" style={{ color: 'var(--color-ink-2)' }}>Title</label>
            <input
              value={title}
              onChange={e => { setTitle(e.target.value); setError('') }}
              className="w-full px-3 py-2.5 rounded border text-sm"
              style={{ background: 'var(--color-paper)', borderColor: 'var(--color-rule)', color: 'var(--color-ink)' }}
              placeholder="Evidence document title"
            />
          </div>

          {progress && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded text-sm"
              style={{ background: 'var(--color-verified-bg)', color: 'var(--color-verified)' }}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              {progress}
            </div>
          )}

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
              disabled={loading || !file}
              className="flex-1 py-2.5 rounded text-sm font-medium"
              style={{
                background: 'var(--color-ink)',
                color: 'var(--color-paper)',
                opacity: loading || !file ? 0.6 : 1,
              }}
            >
              {loading ? 'Uploading…' : 'Upload & anchor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Verify Hash Modal ────────────────────────────────────────────────────
function VerifyHashModal({ doc, onClose }) {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    documentsApi.verify(doc.id)
      .then(({ data }) => setResult(data))
      .catch(() => setResult({ error: true }))
      .finally(() => setLoading(false))
  }, [doc.id])

  return (
    <ModalShell title="SHA-256 integrity check" onClose={onClose}>
      {loading ? (
        <div className="flex items-center gap-2 py-6" style={{ color: 'var(--color-ink-3)' }}>
          <RefreshCw size={16} className="animate-spin" /> Hashing file…
        </div>
      ) : result?.error ? (
        <p className="text-sm" style={{ color: 'var(--color-tampered)' }}>Verification failed.</p>
      ) : (
        <div className="space-y-4">
          <div
            className="flex items-center gap-3 p-4 rounded"
            style={{
              background: result.match ? 'var(--color-verified-bg)' : 'var(--color-tampered-bg)',
              color: result.match ? 'var(--color-verified)' : 'var(--color-tampered)',
            }}
          >
            {result.match ? <CheckCircle size={20} /> : <XCircle size={20} />}
            <div>
              <p className="font-semibold">
                {result.match ? 'Integrity intact — hash match' : 'Corrupted — hash mismatch'}
              </p>
              <p className="text-xs mt-0.5 opacity-80">
                Verified at {new Date(result.verifiedAt).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <HashRow label="Stored hash" value={result.storedHash} />
            <HashRow label="Current hash" value={result.currentHash} highlight={!result.match} />
          </div>
        </div>
      )}
    </ModalShell>
  )
}

// ── Blockchain Verify Modal ──────────────────────────────────────────────
function BlockchainVerifyModal({ doc, onClose }) {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    documentsApi.blockchainVerify(doc.id)
      .then(({ data }) => setResult(data))
      .catch(() => setResult({ error: true }))
      .finally(() => setLoading(false))
  }, [doc.id])

  return (
    <ModalShell title="Blockchain verification" onClose={onClose}>
      {loading ? (
        <div className="flex items-center gap-2 py-6" style={{ color: 'var(--color-ink-3)' }}>
          <RefreshCw size={16} className="animate-spin" /> Querying blockchain…
        </div>
      ) : result?.error ? (
        <p className="text-sm" style={{ color: 'var(--color-tampered)' }}>Blockchain query failed.</p>
      ) : (
        <div className="space-y-4">
          <div
            className="flex items-center gap-3 p-4 rounded"
            style={{
              background: result.match ? 'var(--color-verified-bg)' : 'var(--color-tampered-bg)',
              color: result.match ? 'var(--color-verified)' : 'var(--color-tampered)',
            }}
          >
            {result.match ? <Shield size={20} /> : <XCircle size={20} />}
            <div>
              <p className="font-semibold">
                {result.match ? 'Cryptographic match — file authentic' : 'Mismatch — possible tampering'}
              </p>
              <p className="text-xs mt-0.5 opacity-80">
                Registered: {result.registered ? 'Yes' : 'No'}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <HashRow label="Local hash" value={result.localHash} />
            <HashRow label="On-chain hash" value={result.onChainHash} />
          </div>
          {result.transactionHash && (
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--color-ink-3)' }}>Transaction</p>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs" style={{ color: 'var(--color-ink-2)', wordBreak: 'break-all' }}>
                  {result.transactionHash}
                </span>
                <button type="button" onClick={() => copyText(result.transactionHash, 'Tx hash copied')}>
                  <Copy size={12} style={{ color: 'var(--color-ink-4)' }} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </ModalShell>
  )
}

// ── Candidate Verify Modal ───────────────────────────────────────────────
function CandidateVerifyModal({ doc, onClose }) {
  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef()

  async function handleVerify(e) {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await documentsApi.blockchainVerifyUpload(doc.id, fd)
      setResult(data)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const isVerified = result?.verificationStatus === 'VERIFIED'

  return (
    <ModalShell title="Tamper check — suspect file" onClose={onClose} wide>
      {!result ? (
        <form onSubmit={handleVerify} className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--color-ink-3)' }}>
            Upload a suspect file to compare its cryptographic hash against the original evidence record.
          </p>
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer"
            style={{
              borderColor: file ? 'var(--color-accent)' : 'var(--color-rule)',
              background: file ? 'var(--color-accent-light)' : 'var(--color-paper-2)',
            }}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f) }}
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={22} className="mx-auto mb-2" style={{ color: file ? 'var(--color-accent)' : 'var(--color-ink-4)' }} />
            {file ? (
              <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{file.name}</p>
            ) : (
              <p className="text-sm" style={{ color: 'var(--color-ink-3)' }}>Drop suspect file here</p>
            )}
            <input ref={fileRef} type="file" className="hidden" onChange={e => { const f = e.target.files[0]; if (f) setFile(f) }} />
          </div>
          <button
            type="submit"
            disabled={loading || !file}
            className="w-full py-2.5 rounded text-sm font-medium"
            style={{ background: 'var(--color-ink)', color: 'var(--color-paper)', opacity: loading || !file ? 0.6 : 1 }}
          >
            {loading ? 'Analyzing…' : 'Run tamper check'}
          </button>
        </form>
      ) : (
        <div className="space-y-5">
          {/* Verdict banner */}
          <div
            className="p-5 rounded text-center"
            style={{
              background: isVerified ? 'var(--color-verified-bg)' : 'var(--color-tampered-bg)',
              border: `1px solid ${isVerified ? 'var(--color-verified-border)' : 'var(--color-tampered-border)'}`,
            }}
          >
            <div className="flex justify-center mb-2">
              {isVerified
                ? <CheckCircle size={32} style={{ color: 'var(--color-verified)' }} />
                : <XCircle size={32} style={{ color: 'var(--color-tampered)' }} />
              }
            </div>
            <p
              className="font-bold"
              style={{
                fontSize: '15px',
                color: isVerified ? 'var(--color-verified)' : 'var(--color-tampered)',
                letterSpacing: '0.02em',
              }}
            >
              {isVerified
                ? 'VERIFIED — 100% AUTHENTIC MATCH'
                : 'TAMPERED — CRYPTOGRAPHIC MISMATCH DETECTED'
              }
            </p>
          </div>

          {/* Hash comparison */}
          <div className="grid grid-cols-1 gap-3">
            <HashRow label="Original hash (on-chain)" value={result.onChainHash} />
            <HashRow
              label="Candidate hash"
              value={result.candidateHash}
              highlight={!isVerified}
            />
          </div>

          <button
            type="button"
            onClick={() => setResult(null)}
            className="w-full py-2.5 rounded border text-sm"
            style={{ borderColor: 'var(--color-rule)', color: 'var(--color-ink-3)' }}
          >
            Check another file
          </button>
        </div>
      )}
    </ModalShell>
  )
}

// ── Audit Trail Modal ────────────────────────────────────────────────────
function AuditModal({ doc, onClose }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    auditApi.getForDocument(doc.id)
      .then(({ data }) => setLogs(data))
      .catch(() => toast.error('Could not load audit trail'))
      .finally(() => setLoading(false))
  }, [doc.id])

  const actionColors = {
    DOCUMENT_UPLOADED: 'var(--color-verified)',
    HASH_VERIFIED: 'var(--color-accent)',
    BLOCKCHAIN_VERIFIED: '#1a4a8b',
    CANDIDATE_VERIFIED: '#5a1a8b',
    DOCUMENT_DOWNLOADED: 'var(--color-ink-3)',
  }

  return (
    <ModalShell title="Forensic audit trail" onClose={onClose} wide>
      {loading ? (
        <div className="flex items-center gap-2 py-6" style={{ color: 'var(--color-ink-3)' }}>
          <RefreshCw size={16} className="animate-spin" /> Loading audit log…
        </div>
      ) : logs.length === 0 ? (
        <p className="text-sm py-6 text-center" style={{ color: 'var(--color-ink-4)' }}>No audit events yet.</p>
      ) : (
        <div className="space-y-0">
          {logs.map((log, i) => (
            <div
              key={log.id}
              className="flex gap-3 py-3"
              style={{ borderBottom: i < logs.length - 1 ? '1px solid var(--color-rule)' : 'none' }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2"
                style={{ background: actionColors[log.action] || 'var(--color-ink-4)' }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="font-mono text-xs font-medium"
                    style={{ color: actionColors[log.action] || 'var(--color-ink-3)' }}
                  >
                    {log.action}
                  </span>
                  {log.user && (
                    <span className="text-xs" style={{ color: 'var(--color-ink-4)' }}>
                      by {log.user.username}
                    </span>
                  )}
                </div>
                {log.details && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-ink-3)' }}>{log.details}</p>
                )}
                <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--color-ink-4)' }}>
                  {new Date(log.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </ModalShell>
  )
}

// ── Shared modal shell ───────────────────────────────────────────────────
function ModalShell({ title, onClose, children, wide }) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: 'oklch(20% 0.01 60 / 0.5)', zIndex: 'var(--z-modal)' }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-lg border p-6"
        style={{
          maxWidth: wide ? '560px' : '460px',
          background: 'var(--color-paper)',
          borderColor: 'var(--color-rule)',
          boxShadow: 'var(--shadow-modal)',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold" style={{ fontSize: '17px', color: 'var(--color-ink)' }}>{title}</h2>
          <button type="button" onClick={onClose} style={{ color: 'var(--color-ink-4)' }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Hash row component ───────────────────────────────────────────────────
function HashRow({ label, value, highlight }) {
  return (
    <div
      className="p-3 rounded"
      style={{
        background: highlight ? 'var(--color-tampered-bg)' : 'var(--color-paper-2)',
        border: `1px solid ${highlight ? 'var(--color-tampered-border)' : 'var(--color-rule)'}`,
      }}
    >
      <p className="text-xs mb-1" style={{ color: 'var(--color-ink-3)' }}>{label}</p>
      <div className="flex items-center gap-2">
        <span
          className="font-mono text-xs flex-1"
          style={{ color: highlight ? 'var(--color-tampered)' : 'var(--color-ink-2)', wordBreak: 'break-all' }}
        >
          {value || '—'}
        </span>
        {value && (
          <button
            type="button"
            onClick={() => copyText(value, 'Hash copied')}
            className="flex-shrink-0"
            style={{ color: 'var(--color-ink-4)' }}
          >
            <Copy size={11} />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Document card ────────────────────────────────────────────────────────
function DocumentCard({ doc, onAction }) {
  const [expanded, setExpanded] = useState(false)

  async function handleDownload() {
    try {
      const { data, headers } = await documentsApi.download(doc.id)
      const url = URL.createObjectURL(new Blob([data]))
      const a = document.createElement('a')
      a.href = url
      a.download = doc.fileName
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Download started')
    } catch {
      toast.error('Download failed')
    }
  }

  return (
    <div
      className="rounded border"
      style={{ background: 'var(--color-paper)', borderColor: 'var(--color-rule)', boxShadow: 'var(--shadow-card)' }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className="flex-shrink-0 w-9 h-9 rounded flex items-center justify-center"
              style={{ background: 'var(--color-paper-2)', border: '1px solid var(--color-rule)' }}
            >
              <FileText size={16} style={{ color: 'var(--color-accent)' }} />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm" style={{ color: 'var(--color-ink)' }}>{doc.title}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-ink-3)' }}>
                {doc.fileName} · {formatBytes(doc.fileSize)} · {doc.mimeType}
              </p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <BlockchainBadge registered={doc.blockchainRegistered} txHash={doc.blockchainTxHash} />
                {doc.uploadedBy && (
                  <span className="text-xs" style={{ color: 'var(--color-ink-4)' }}>
                    by {doc.uploadedBy.username}
                  </span>
                )}
                <span className="text-xs" style={{ color: 'var(--color-ink-4)' }}>
                  {new Date(doc.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setExpanded(e => !e)}
            className="flex-shrink-0 text-xs px-2 py-1 rounded"
            style={{ color: 'var(--color-ink-4)', background: 'var(--color-paper-2)' }}
          >
            <ChevronRight
              size={14}
              style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 220ms' }}
            />
          </button>
        </div>

        {/* SHA-256 display */}
        {doc.sha256Hash && (
          <div
            className="mt-3 p-2.5 rounded flex items-center gap-2"
            style={{ background: 'var(--color-paper-2)', border: '1px solid var(--color-rule)' }}
          >
            <Hash size={12} style={{ color: 'var(--color-ink-4)', flexShrink: 0 }} />
            <span
              className="font-mono text-xs flex-1 truncate"
              style={{ color: 'var(--color-ink-3)' }}
              title={doc.sha256Hash}
            >
              {doc.sha256Hash}
            </span>
            <button
              type="button"
              onClick={() => copyText(doc.sha256Hash, 'SHA-256 copied')}
              className="flex-shrink-0"
              style={{ color: 'var(--color-ink-4)' }}
            >
              <Copy size={11} />
            </button>
          </div>
        )}

        {/* Actions */}
        {expanded && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ActionBtn icon={<Hash size={13} />} label="Verify hash" onClick={() => onAction('verify', doc)} />
            <ActionBtn icon={<Shield size={13} />} label="Blockchain verify" onClick={() => onAction('blockchain', doc)} />
            <ActionBtn icon={<Eye size={13} />} label="Tamper check" onClick={() => onAction('candidate', doc)} />
            <ActionBtn icon={<Clock size={13} />} label="Audit trail" onClick={() => onAction('audit', doc)} />
            <ActionBtn icon={<Download size={13} />} label="Download" onClick={handleDownload} />
          </div>
        )}
      </div>
    </div>
  )
}

function ActionBtn({ icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-2 rounded border text-sm transition-colors duration-micro"
      style={{
        borderColor: 'var(--color-rule)',
        color: 'var(--color-ink-2)',
        background: 'var(--color-paper-2)',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-ink-3)'; e.currentTarget.style.background = 'var(--color-paper-3)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-rule)'; e.currentTarget.style.background = 'var(--color-paper-2)' }}
    >
      {icon}
      {label}
    </button>
  )
}

// ── Main page ────────────────────────────────────────────────────────────
export default function CaseWorkspacePage() {
  const { caseNumber } = useParams()
  const navigate = useNavigate()
  const { canWrite } = useAuth()
  const [caseData, setCaseData] = useState(null)
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // { type, doc }
  const [showUpload, setShowUpload] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [caseRes, docsRes] = await Promise.all([
        casesApi.getByNumber(caseNumber),
        documentsApi.getByCase(caseNumber),
      ])
      setCaseData(caseRes.data)
      setDocuments(docsRes.data)
    } catch {
      toast.error('Could not load case')
    } finally {
      setLoading(false)
    }
  }, [caseNumber])

  useEffect(() => { load() }, [load])

  function handleAction(type, doc) {
    setModal({ type, doc })
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 rounded border animate-pulse" style={{ background: 'var(--color-paper-2)', borderColor: 'var(--color-rule)' }} />
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate('/')}
        className="flex items-center gap-1.5 text-sm mb-6 transition-opacity hover:opacity-70"
        style={{ color: 'var(--color-ink-3)' }}
      >
        <ArrowLeft size={14} /> All cases
      </button>

      {/* Case header */}
      {caseData && (
        <div
          className="rounded border p-5 mb-6"
          style={{ background: 'var(--color-paper)', borderColor: 'var(--color-rule)', boxShadow: 'var(--shadow-card)' }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="font-mono text-sm" style={{ color: 'var(--color-accent-dark)' }}>
                {caseData.caseNumber}
              </span>
              <h1
                className="font-semibold mt-1"
                style={{ fontSize: '22px', letterSpacing: '-0.015em', color: 'var(--color-ink)' }}
              >
                {caseData.title}
              </h1>
              {caseData.description && (
                <p className="mt-2 text-sm" style={{ color: 'var(--color-ink-3)' }}>{caseData.description}</p>
              )}
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <span className="text-xs" style={{ color: 'var(--color-ink-4)' }}>
                  Created by {caseData.createdBy?.username}
                </span>
                <span className="text-xs" style={{ color: 'var(--color-ink-4)' }}>
                  {new Date(caseData.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded"
                  style={{
                    background: 'var(--color-verified-bg)',
                    color: 'var(--color-verified)',
                    border: '1px solid var(--color-verified-border)',
                  }}
                >
                  {caseData.status}
                </span>
              </div>
            </div>
            {canWrite && (
              <button
                type="button"
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium flex-shrink-0"
                style={{ background: 'var(--color-ink)', color: 'var(--color-paper)' }}
              >
                <Upload size={14} />
                Upload evidence
              </button>
            )}
          </div>
        </div>
      )}

      {/* Evidence vault */}
      <div>
        <h2
          className="font-semibold mb-4"
          style={{ fontSize: '16px', color: 'var(--color-ink)', letterSpacing: '-0.01em' }}
        >
          Evidence vault
          <span className="ml-2 text-sm" style={{ color: 'var(--color-ink-4)', fontWeight: 400 }}>
            {documents.length} file{documents.length !== 1 ? 's' : ''}
          </span>
        </h2>

        {documents.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-20 rounded border"
            style={{ borderColor: 'var(--color-rule)', background: 'var(--color-paper-2)' }}
          >
            <FileText size={32} style={{ color: 'var(--color-ink-4)' }} className="mb-3" />
            <p className="text-sm" style={{ color: 'var(--color-ink-3)' }}>No evidence uploaded yet</p>
            {canWrite && (
              <button
                type="button"
                onClick={() => setShowUpload(true)}
                className="mt-3 text-sm"
                style={{ color: 'var(--color-accent)' }}
              >
                Upload first document
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map(doc => (
              <DocumentCard key={doc.id} doc={doc} onAction={handleAction} />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showUpload && caseData && (
        <UploadModal
          caseRecord={caseData}
          onClose={() => setShowUpload(false)}
          onUploaded={() => load()}
        />
      )}
      {modal?.type === 'verify' && (
        <VerifyHashModal doc={modal.doc} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'blockchain' && (
        <BlockchainVerifyModal doc={modal.doc} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'candidate' && (
        <CandidateVerifyModal doc={modal.doc} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'audit' && (
        <AuditModal doc={modal.doc} onClose={() => setModal(null)} />
      )}
    </div>
  )
}
