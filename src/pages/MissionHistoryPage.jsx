import { useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { useMissions } from '../context/MissionContext'
import '../styles/history.css'

const AGENT_COLORS = {
  Orchestrator: '#10b981',
  Scout: '#60a5fa',
  Analyst: '#a855f7',
  Threat: '#f87171',
  Reporter: '#fbbf24',
}

function getVerdictClass(verdict) {
  const v = (verdict || '').toLowerCase()
  if (v === 'critical') return 'verdict-critical'
  if (v === 'high') return 'verdict-high'
  if (v === 'medium') return 'verdict-medium'
  if (v === 'low') return 'verdict-low'
  return 'verdict-safe'
}

export default function MissionHistoryPage() {
  const { missions } = useMissions()
  const [expanded, setExpanded] = useState(null)

  return (
    <DashboardLayout>
      <div className="history-page">
        <div className="history-header">
          <h1 className="history-title">Mission History</h1>
        </div>

        {missions.length === 0 ? (
          <div className="history-empty">
            <div className="history-empty-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            No missions yet - run your first mission from the Console
          </div>
        ) : (
          <div className="history-list">
            {missions.map(m => (
              <div className="history-card" key={m.id}>
                <div
                  className="history-card-top"
                  onClick={() => setExpanded(expanded === m.id ? null : m.id)}
                >
                  <span className="history-task">{m.task}</span>
                  <span className="history-time">{new Date(m.timestamp).toLocaleString()}</span>
                  <span className="history-agents-count">{m.agentCount} agents</span>
                  <span className={`verdict-badge ${getVerdictClass(m.verdict)}`}>{m.verdict}</span>
                  <span className="history-proofs-count">{m.proofCount} proofs</span>
                  <svg
                    className={`history-expand-icon ${expanded === m.id ? 'open' : ''}`}
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>

                {expanded === m.id && (
                  <div className="history-expanded">
                    {m.results && m.results.length > 0 && (
                      <div className="history-console-replay">
                        {m.results.map((r, i) => (
                          <div className="history-console-line" key={i}>
                            <span style={{ color: AGENT_COLORS[r.agentName] || '#fff', fontWeight: 500, fontSize: 10, letterSpacing: 0.5 }}>
                              {r.agentName?.toUpperCase()}
                            </span>
                            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>
                              {r.decision.length > 120 ? r.decision.slice(0, 120) + '...' : r.decision}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {m.proofs && m.proofs.length > 0 && (
                      <div className="history-proofs-list">
                        {m.proofs.map((p, i) => (
                          <div className="history-proof-mini" key={i}>
                            <span className="agent" style={{ color: AGENT_COLORS[p.agentName] || '#fff' }}>
                              {p.agentName}
                            </span>
                            <span className="decision">{p.decision.slice(0, 80)}...</span>
                            <span className="hash">sha256:{p.hash.slice(0, 8)}...</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
