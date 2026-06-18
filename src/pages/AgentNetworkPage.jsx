import { useMemo } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { useProofs } from '../context/ProofContext'
import { useMissions } from '../context/MissionContext'
import '../styles/agents.css'

const AGENTS = [
  { name: 'Orchestrator', role: 'Routes tasks, manages coordination, synthesizes final verdict', color: '#10b981' },
  { name: 'Scout', role: 'Monitors wallets and tokens, flags suspicious patterns', color: '#60a5fa' },
  { name: 'Analyst', role: 'Deep risk analysis using Ambient verified inference', color: '#a855f7' },
  { name: 'Threat', role: 'Cross-references known bad actors and exploit patterns', color: '#f87171' },
  { name: 'Reporter', role: 'Summarizes findings, generates verified alert reports', color: '#fbbf24' },
]

export default function AgentNetworkPage() {
  const { proofs } = useProofs()
  const { missions } = useMissions()

  const agentStats = useMemo(() => {
    const stats = {}
    AGENTS.forEach(a => { stats[a.name] = { proofCount: 0, lastAction: null } })
    proofs.forEach(p => {
      if (stats[p.agentName]) {
        stats[p.agentName].proofCount++
        if (!stats[p.agentName].lastAction || new Date(p.timestamp) > new Date(stats[p.agentName].lastAction)) {
          stats[p.agentName].lastAction = p.timestamp
        }
      }
    })
    return stats
  }, [proofs])

  const totalProofs = proofs.length
  const totalMissions = missions.length
  const orchestrator = AGENTS[0]
  const gridAgents = AGENTS.slice(1)

  return (
    <DashboardLayout>
      <div className="an-page">
        <div className="an-header">
          <h1 className="an-title">AGENT NETWORK</h1>
          <p className="an-subtitle">Five specialized agents coordinating on Ambient Network - every decision verified on-chain</p>
        </div>

        <div className="an-stats">
          <div className="an-stat">
            <div className="an-stat-num">{totalMissions}</div>
            <div className="an-stat-label">Total Missions</div>
          </div>
          <div className="an-stat">
            <div className="an-stat-num">{totalProofs}</div>
            <div className="an-stat-label">Total Proofs Generated</div>
          </div>
          <div className="an-stat">
            <div className="an-stat-num">5</div>
            <div className="an-stat-label">Agents Active</div>
          </div>
        </div>

        <div className="an-bento">
          <div className="an-card an-card-orch" style={{ borderLeftColor: orchestrator.color }}>
            <div className="an-card-orch-left">
              <div className="an-card-name-lg">{orchestrator.name}</div>
              <div className="an-card-role">{orchestrator.role}</div>
              <div className="an-status-badge">
                <span className="an-status-dot" style={{ background: orchestrator.color, boxShadow: `0 0 6px ${orchestrator.color}` }} />
                <span className="an-status-text" style={{ color: orchestrator.color }}>ACTIVE</span>
              </div>
            </div>
            <div className="an-card-orch-right">
              <div className="an-proof-count">{agentStats[orchestrator.name].proofCount}</div>
              <div className="an-proof-label">verified decisions</div>
            </div>
          </div>

          <div className="an-grid-4">
            {gridAgents.map(agent => {
              const stats = agentStats[agent.name]
              const hasActivity = stats.proofCount > 0
              return (
                <div className="an-card an-card-sm" key={agent.name} style={{ borderLeftColor: agent.color }}>
                  <div className="an-card-sm-top">
                    <div className="an-card-name">{agent.name}</div>
                    <div className="an-status-badge">
                      <span className="an-status-dot" style={{ background: hasActivity ? agent.color : '#6b7280', boxShadow: hasActivity ? `0 0 6px ${agent.color}` : 'none' }} />
                      <span className="an-status-text" style={{ color: hasActivity ? agent.color : '#6b7280' }}>{hasActivity ? 'ACTIVE' : 'IDLE'}</span>
                    </div>
                  </div>
                  <div className="an-proof-count-sm">{stats.proofCount}</div>
                  <div className="an-card-role-sm">{agent.role}</div>
                  <div className="an-last-action">
                    {stats.lastAction ? new Date(stats.lastAction).toLocaleString() : 'No activity yet'}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="an-dots-row">
          <div className="an-dots-line" />
          {AGENTS.map(agent => (
            <div className="an-dot-wrap" key={agent.name}>
              <div className="an-dot" style={{ background: agent.color, boxShadow: `0 0 8px ${agent.color}` }} />
              <div className="an-dot-label">{agent.name}</div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
