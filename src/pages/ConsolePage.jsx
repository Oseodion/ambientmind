import { useState, useRef, useCallback } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { useWallet } from '../context/WalletContext'
import { useProofs } from '../context/ProofContext'
import { useMissions } from '../context/MissionContext'
import { runFullMission } from '../lib/ambientAI'
import '../styles/console.css'

const AGENT_COLORS = {
  Orchestrator: 'color-orch',
  Scout: 'color-scout',
  Analyst: 'color-analyst',
  Threat: 'color-threat',
  Reporter: 'color-reporter',
}

const AGENT_LABELS = ['ORCHESTRATOR', 'SCOUT', 'ANALYST', 'THREAT', 'REPORTER']

const EXAMPLE_TASKS = [
  'Analyze wallet 8NtD...Ahe9 for threats',
  'Scan token EPjF...Dt1v for risks',
  'Monitor this address for suspicious activity',
]

export default function ConsolePage() {
  const { shortAddress } = useWallet()
  const { addProof } = useProofs()
  const { addMission } = useMissions()

  const [task, setTask] = useState('')
  const [status, setStatus] = useState('idle')
  const [lines, setLines] = useState([])
  const [proofCards, setProofCards] = useState([])
  const [isDemo, setIsDemo] = useState(false)
  const [missionStart, setMissionStart] = useState(null)
  const consoleRef = useRef(null)

  const addLine = useCallback((agentName, message, hash) => {
    return new Promise(resolve => {
      setLines(prev => [...prev, { agentName, message, hash }])
      setTimeout(resolve, 800)
    })
  }, [])

  const runMission = useCallback(async () => {
    if (!task.trim()) return
    const startTime = Date.now()
    setStatus('running')
    setLines([])
    setProofCards([])
    setIsDemo(false)
    setMissionStart(startTime)

    const messages = [
      { agent: 'Orchestrator', msg: `Task received - ${task.trim()}` },
      { agent: 'Scout', msg: 'Scanning target - analyzing transaction history' },
      { agent: 'Analyst', msg: 'Running deep risk analysis on flagged patterns' },
      { agent: 'Threat', msg: 'Cross-referencing known exploit databases' },
      { agent: 'Reporter', msg: 'Compiling verified alert report' },
    ]

    for (const m of messages) {
      await addLine(m.agent, m.msg, 'computing...')
    }

    try {
      const result = await runFullMission(task.trim())
      setIsDemo(result.isDemo)

      setLines([])
      const finalLines = []

      for (let i = 0; i < result.results.length; i++) {
        const r = result.results[i]
        const shortDecision = r.result.length > 80 ? r.result.slice(0, 80) + '...' : r.result
        const shortHash = 'sha256:' + r.proof.hash.slice(0, 8) + '...'
        finalLines.push({ agentName: r.proof.agentName, message: shortDecision, hash: shortHash })
        setLines([...finalLines])
        addProof(r.proof)
        setProofCards(prev => [...prev, r])
        await new Promise(r => setTimeout(r, 800))
      }

      const verdictMsg = `VERDICT: ${result.verdict} - ${result.results[4]?.result.slice(0, 60) || 'Analysis complete'}...`
      const verdictHash = 'sha256:' + (result.results[4]?.proof.hash.slice(0, 8) || 'ecf7') + '...'
      finalLines.push({ agentName: 'Orchestrator', message: verdictMsg, hash: verdictHash, isVerdict: true })
      setLines([...finalLines])

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
      addMission({
        task: task.trim(),
        timestamp: new Date().toISOString(),
        agentCount: 5,
        verdict: result.verdict,
        proofCount: result.results.length,
        duration: elapsed + 's',
        isDemo: result.isDemo,
        results: result.results.map(r => ({
          agentName: r.proof.agentName,
          decision: r.result,
          hash: r.proof.hash,
        })),
        proofs: result.results.map(r => r.proof),
      })

      setStatus('complete')
    } catch (err) {
      console.error('Mission failed:', err)
      setStatus('error')
    }
  }, [task, addLine, addProof, addMission])

  return (
    <DashboardLayout>
      <div className="console-page">
        <div className="console-header">
          <div className="console-header-left">
            <h1 className="console-title">Mission Console</h1>
          </div>
          <div className="console-wallet-badge">
            <span className="dot" />
            <span>{shortAddress}</span>
          </div>
        </div>

        {isDemo && (
          <div className="demo-banner">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            API unavailable - showing demo data with verified proof hashes
          </div>
        )}

        <div className="mission-input-area">
          <textarea
            className="mission-textarea"
            placeholder="Describe a task for the agent network..."
            value={task}
            onChange={e => setTask(e.target.value)}
            disabled={status === 'running'}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runMission() } }}
          />
        </div>

        <div className="mission-chips">
          {EXAMPLE_TASKS.map(t => (
            <button
              key={t}
              className="mission-chip"
              onClick={() => setTask(t)}
              disabled={status === 'running'}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mission-actions">
          {status === 'complete' ? (
            <button className="btn-run" onClick={() => { setStatus('idle'); setTask(''); setLines([]); setProofCards([]); setIsDemo(false) }}>
              Run New Mission
            </button>
          ) : (
            <button className="btn-run" onClick={runMission} disabled={status === 'running' || !task.trim()}>
              {status === 'running' ? 'Running...' : 'Run Mission'}
            </button>
          )}
        </div>

        {lines.length > 0 && (
          <div className="live-console" ref={consoleRef}>
            <div className="live-console-topbar">
              <div className="win-dot wd-r" />
              <div className="win-dot wd-y" />
              <div className="win-dot wd-g" />
              <span className="win-title">ambientmind - live console</span>
            </div>
            <div className="live-console-body">
              {lines.map((line, i) => (
                <div className="live-line" key={i}>
                  <span className={`live-agent ${AGENT_COLORS[line.agentName] || 'color-orch'}`}>
                    {line.agentName?.toUpperCase()}
                  </span>
                  <span className="live-msg">
                    {line.message}
                    {i === lines.length - 1 && status === 'running' && <span className="cursor-blink" />}
                  </span>
                  <span className="live-hash">{line.hash}</span>
                </div>
              ))}
            </div>
            {status === 'complete' && (
              <div style={{ padding: '0 20px 16px' }}>
                <div className="mission-complete-badge">Mission Complete</div>
              </div>
            )}
          </div>
        )}

        {proofCards.length > 0 && (
          <div className="proof-receipts-section">
            <div className="proof-receipts-title">Proof Receipts ({proofCards.length})</div>
            {proofCards.map((r, i) => (
              <div className="proof-receipt-card" key={i}>
                <div className="proof-receipt-header">
                  <div className="proof-verified-dot">✓</div>
                  <span className={`proof-agent-name ${AGENT_COLORS[r.proof.agentName] || ''}`}>
                    {r.proof.agentName}
                  </span>
                  <span className="proof-verified-badge">VERIFIED</span>
                </div>
                <div className="proof-decision">{r.result}</div>
                <div className="proof-meta">
                  <div className="proof-meta-item">
                    <span className="proof-meta-key">Model</span>
                    <span className="proof-meta-val">{r.proof.model}</span>
                  </div>
                  <div className="proof-meta-item">
                    <span className="proof-meta-key">Time</span>
                    <span className="proof-meta-val">{new Date(r.proof.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="proof-meta-item">
                    <span className="proof-meta-key">Hash</span>
                    <span className="proof-meta-hash">sha256:{r.proof.hash.slice(0, 16)}...</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
