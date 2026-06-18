import { useState, useMemo } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { useProofs } from '../context/ProofContext'
import '../styles/proofs.css'

const AGENT_FILTERS = ['All', 'Orchestrator', 'Scout', 'Analyst', 'Threat', 'Reporter']
const VERIFIED_FILTERS = ['All', 'Verified', 'Unverified']

const AGENT_COLORS = {
  Orchestrator: '#10b981',
  Scout: '#60a5fa',
  Analyst: '#a855f7',
  Threat: '#f87171',
  Reporter: '#fbbf24',
}

export default function ProofReceiptsPage() {
  const { proofs, clearProofs } = useProofs()
  const [agentFilter, setAgentFilter] = useState('All')
  const [verifiedFilter, setVerifiedFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [expandedHash, setExpandedHash] = useState(null)

  const filtered = useMemo(() => {
    return proofs.filter(p => {
      if (agentFilter !== 'All' && p.agentName !== agentFilter) return false
      if (verifiedFilter === 'Verified' && !p.verified) return false
      if (verifiedFilter === 'Unverified' && p.verified) return false
      if (search) {
        const q = search.toLowerCase()
        return p.hash.toLowerCase().includes(q) || p.decision.toLowerCase().includes(q)
      }
      return true
    })
  }, [proofs, agentFilter, verifiedFilter, search])

  return (
    <DashboardLayout>
      <div className="proofs-page">
        <div className="proofs-header">
          <h1 className="proofs-title">Proof Receipts</h1>
          <div className="proofs-count-badge">{proofs.length} total</div>
          {proofs.length > 0 && (
            <button className="proofs-clear-btn" onClick={clearProofs}>Clear All</button>
          )}
        </div>

        <div className="proofs-filter-bar">
          <div className="proofs-filter-group">
            {AGENT_FILTERS.map(f => (
              <button
                key={f}
                className={`proofs-filter-btn ${agentFilter === f ? 'active' : ''}`}
                onClick={() => setAgentFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
          <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
          <div className="proofs-filter-group">
            {VERIFIED_FILTERS.map(f => (
              <button
                key={f}
                className={`proofs-filter-btn ${verifiedFilter === f ? 'active' : ''}`}
                onClick={() => setVerifiedFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
          <input
            type="text"
            className="proofs-search"
            placeholder="Search by hash or decision..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="proofs-empty">
            <div className="proofs-empty-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
            </div>
            {proofs.length === 0
              ? 'No proof receipts yet - run a mission to generate your first verified proof'
              : 'No proofs match your filters'}
          </div>
        ) : (
          <div className="proofs-list">
            {filtered.map(p => (
              <div className="proof-list-card" key={p.id}>
                <div className="proof-list-top">
                  {p.verified
                    ? <div className="proof-list-verified">✓</div>
                    : <div className="proof-list-unverified">x</div>
                  }
                  <span className="proof-list-agent" style={{ color: AGENT_COLORS[p.agentName] || '#fff' }}>
                    {p.agentName}
                  </span>
                  <span className="proof-list-time">
                    {new Date(p.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="proof-list-decision">{p.decision}</div>
                <div className="proof-list-footer">
                  <span className="proof-list-model">{p.model}</span>
                  <span
                    className={`proof-list-hash ${expandedHash === p.id ? 'expanded' : ''}`}
                    onClick={() => setExpandedHash(expandedHash === p.id ? null : p.id)}
                  >
                    sha256:{expandedHash === p.id ? p.hash : p.hash.slice(0, 16) + '...'}
                  </span>
                  <a
                    href="https://explorer.ambient.xyz"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="proof-list-chain"
                  >
                    View on Chain
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
