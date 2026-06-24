import { useState, useRef, useCallback, useEffect } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { useWallet } from '../context/WalletContext'
import { useProofs } from '../context/ProofContext'
import { useMissions } from '../context/MissionContext'
import { runOrchestrator, runScout, runAnalyst, runThreat, runReporter, stripMarkdown } from '../lib/ambientAI'
import '../styles/console.css'

const AGENT_COLORS = {
  Orchestrator: 'color-orch',
  Scout: 'color-scout',
  Analyst: 'color-analyst',
  Threat: 'color-threat',
  Reporter: 'color-reporter',
}

const TASK_TYPES = [
  { id: 'wallet', label: 'Analyze Wallet', placeholder: 'Paste Solana wallet address...', buildTask: (addr) => `Analyze wallet ${addr} for threats and suspicious activity` },
  { id: 'token', label: 'Scan Token', placeholder: 'Paste token contract address...', buildTask: (addr) => `Scan token ${addr} for rug pull risks and security vulnerabilities` },
  { id: 'transaction', label: 'Investigate Transaction', placeholder: 'Paste transaction signature...', buildTask: (addr) => `Investigate transaction ${addr} for malicious patterns` },
]

const EXAMPLES = [
  { type: 'wallet', address: '8NtDWpGCZBD6bjbuoKJfWuzg2Ux8hKij6naHov7hAhe9' },
  { type: 'token', address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
]

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Agent timeout')), ms))
  ])
}

function getVerdict(text) {
  const upper = (text || '').toUpperCase()
  if (upper.includes('CRITICAL')) return 'CRITICAL'
  if (upper.includes('HIGH')) return 'HIGH'
  if (upper.includes('MEDIUM')) return 'MEDIUM'
  if (upper.includes('LOW')) return 'LOW'
  return 'SAFE'
}

const VERDICT_STYLES = {
  SAFE: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', color: '#10b981' },
  LOW: { bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.3)', color: '#60a5fa' },
  MEDIUM: { bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)', color: '#fbbf24' },
  HIGH: { bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)', color: '#f87171' },
  CRITICAL: { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.35)', color: '#ef4444' },
}

export default function ConsolePage() {
  const { shortAddress } = useWallet()
  const { addProof } = useProofs()
  const { addMission } = useMissions()

  const [taskType, setTaskType] = useState('wallet')
  const [address, setAddress] = useState('')
  const [status, setStatus] = useState('idle')
  const [lines, setLines] = useState([])
  const [proofCards, setProofCards] = useState([])
  const [isDemo, setIsDemo] = useState(false)
  const [summary, setSummary] = useState(null)
  const [cooldown, setCooldown] = useState(0)
  const consoleEndRef = useRef(null)

  useEffect(() => {
    if (status !== 'complete') return
    setCooldown(60)
    const interval = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [status])

  const currentType = TASK_TYPES.find(t => t.id === taskType)
  const taskString = currentType.buildTask(address.trim())
  const canRun = address.trim().length >= 32

  const scrollToBottom = useCallback(() => {
    setTimeout(() => consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [])

  const runMission = useCallback(async () => {
    if (!canRun) return
    const task = taskString
    const startTime = Date.now()
    setStatus('running')
    setLines([])
    setProofCards([])
    setIsDemo(false)
    setSummary(null)

    const allResults = []
    let anyDemo = false

    const addActiveLine = (agentName) => {
      setLines(prev => [...prev, { agentName, message: '', hash: '', active: true }])
      scrollToBottom()
    }

    const replaceActiveLine = (agentName, message, hash, failed) => {
      setLines(prev => {
        const idx = prev.findLastIndex(l => l.agentName === agentName && l.active)
        if (idx === -1) return [...prev, { agentName, message, hash, active: false, failed }]
        const copy = [...prev]
        copy[idx] = { agentName, message, hash, active: false, failed }
        return copy
      })
      scrollToBottom()
    }

    const runSingleAgent = async (name, runFn, args) => {
      addActiveLine(name)
      try {
        const result = await withTimeout(runFn(...args), 60000)
        allResults.push(result)
        if (result.isDemo) anyDemo = true
        const clean = stripMarkdown(result.result)
        const short = clean.length > 120 ? clean.slice(0, 120) + '...' : clean
        replaceActiveLine(name, short, 'sha256:' + result.proof.hash.slice(0, 8) + '...')
        addProof(result.proof)
        setProofCards(prev => [...prev, { ...result, result: clean }])
        return result
      } catch (err) {
        console.warn(`${name} failed:`, err.message)
        replaceActiveLine(name, 'Agent timed out or failed', '', true)
        return null
      }
    }

    const missionTimeout = setTimeout(() => {
      setLines(prev => [...prev, {
        agentName: 'Orchestrator',
        message: 'VERDICT: Mission timed out - partial results shown',
        hash: '',
        active: false,
        isVerdict: true,
      }])

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
      const lastResult = allResults[allResults.length - 1]
      const verdict = lastResult ? getVerdict(lastResult.result) : 'MEDIUM'

      setSummary({
        verdict,
        reporterSummary: 'Mission timed out - showing partial results from completed agents',
        proofCount: allResults.length,
        elapsed: elapsed + 's',
      })

      setIsDemo(anyDemo)
      addMission({
        task: task.trim(),
        timestamp: new Date().toISOString(),
        agentCount: allResults.length,
        verdict,
        proofCount: allResults.length,
        duration: elapsed + 's',
        isDemo: anyDemo,
        results: allResults.map(r => ({ agentName: r.proof.agentName, decision: stripMarkdown(r.result), hash: r.proof.hash })),
        proofs: allResults.map(r => r.proof),
      })

      setStatus('complete')
    }, 90000)

    try {
      const orch = await runSingleAgent('Orchestrator', runOrchestrator, [task.trim()])

      const scout = await runSingleAgent('Scout', runScout, [task.trim()])

      const scoutResult = scout ? scout.result : task.trim()
      const analyst = await runSingleAgent('Analyst', runAnalyst, [scoutResult])

      const analystResult = analyst ? analyst.result : ''
      const threat = await runSingleAgent('Threat', runThreat, [scoutResult + ' ' + analystResult])

      const allFindings = allResults.map(r => r.result).join('\n')
      const reporter = await runSingleAgent('Reporter', runReporter, [allFindings])

      clearTimeout(missionTimeout)

      const reporterText = reporter ? stripMarkdown(reporter.result) : (allResults.length > 0 ? stripMarkdown(allResults[allResults.length - 1].result) : 'Analysis complete')
      const verdict = getVerdict(reporterText)

      const verdictShort = reporterText.length > 60 ? reporterText.slice(0, 60) + '...' : reporterText
      setLines(prev => [...prev, {
        agentName: 'Orchestrator',
        message: `VERDICT: ${verdict} - ${verdictShort}`,
        hash: reporter ? 'sha256:' + reporter.proof.hash.slice(0, 8) + '...' : '',
        active: false,
        isVerdict: true,
      }])
      scrollToBottom()

      setIsDemo(anyDemo)

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

      setSummary({
        verdict,
        reporterSummary: reporterText.length > 200 ? reporterText.slice(0, 200) + '...' : reporterText,
        proofCount: allResults.length,
        elapsed: elapsed + 's',
      })

      addMission({
        task: task.trim(),
        timestamp: new Date().toISOString(),
        agentCount: 5,
        verdict,
        proofCount: allResults.length,
        duration: elapsed + 's',
        isDemo: anyDemo,
        results: allResults.map(r => ({ agentName: r.proof.agentName, decision: stripMarkdown(r.result), hash: r.proof.hash })),
        proofs: allResults.map(r => r.proof),
      })

      setStatus('complete')
    } catch (err) {
      clearTimeout(missionTimeout)
      console.error('Mission failed:', err)

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
      const lastResult = allResults[allResults.length - 1]
      const verdict = lastResult ? getVerdict(lastResult.result) : 'MEDIUM'

      setSummary({
        verdict,
        reporterSummary: 'Mission encountered an error - showing partial results',
        proofCount: allResults.length,
        elapsed: elapsed + 's',
      })

      if (allResults.length > 0) {
        addMission({
          task: task.trim(),
          timestamp: new Date().toISOString(),
          agentCount: allResults.length,
          verdict,
          proofCount: allResults.length,
          duration: elapsed + 's',
          isDemo: anyDemo,
          results: allResults.map(r => ({ agentName: r.proof.agentName, decision: stripMarkdown(r.result), hash: r.proof.hash })),
          proofs: allResults.map(r => r.proof),
        })
      }

      setStatus('complete')
    }
  }, [canRun, taskString, addProof, addMission, scrollToBottom])

  const resetMission = () => {
    setStatus('idle')
    setAddress('')
    setLines([])
    setProofCards([])
    setIsDemo(false)
    setSummary(null)
  }

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

        <div className="mission-type-selector">
          {TASK_TYPES.map(t => (
            <button
              key={t.id}
              className={`mission-type-btn ${taskType === t.id ? 'active' : ''}`}
              onClick={() => setTaskType(t.id)}
              disabled={status === 'running'}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mission-input-area">
          <input
            type="text"
            className="mission-address-input"
            placeholder={currentType.placeholder}
            value={address}
            onChange={e => setAddress(e.target.value)}
            disabled={status === 'running'}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); runMission() } }}
          />
        </div>

        <div className="mission-examples">
          <div className="mission-examples-label">Try an example:</div>
          <div className="mission-examples-row">
            {EXAMPLES.map(ex => (
              <button
                key={ex.address}
                className="mission-example-chip"
                onClick={() => { setTaskType(ex.type); setAddress(ex.address) }}
                disabled={status === 'running'}
              >
                {ex.address}
              </button>
            ))}
          </div>
        </div>

        <div className="mission-actions">
          {status === 'complete' ? (
            <div className="mission-actions-wrap">
              <button className="btn-run" onClick={resetMission}>Run New Mission</button>
              {cooldown > 0 && (
                <span className="cooldown-text">Cooldown - ready in {cooldown}s</span>
              )}
              {cooldown === 0 && (
                <span className="cooldown-ready">Ready for next mission</span>
              )}
            </div>
          ) : (
            <button className="btn-run" onClick={runMission} disabled={status === 'running' || !canRun}>
              {status === 'running' ? 'Running...' : 'Run Mission'}
            </button>
          )}
        </div>

        {lines.length > 0 && (
          <div className="live-console">
            <div className="live-console-topbar">
              <div className="win-dot wd-r" />
              <div className="win-dot wd-y" />
              <div className="win-dot wd-g" />
              <span className="win-title">ambientmind - live console</span>
            </div>
            <div className="live-console-body">
              {lines.map((line, i) => (
                <div className="live-line" key={i}>
                  <span className={`live-agent ${line.failed ? 'color-failed' : (AGENT_COLORS[line.agentName] || 'color-orch')}`}>
                    {line.agentName?.toUpperCase()}
                  </span>
                  <span className={`live-msg ${line.failed ? 'live-msg-failed' : ''}`}>
                    {line.active ? (
                      <>{line.agentName} working<span className="cursor-blink" /></>
                    ) : (
                      line.message
                    )}
                  </span>
                  <span className="live-hash">{line.hash}</span>
                </div>
              ))}
              <div ref={consoleEndRef} />
            </div>
          </div>
        )}

        {status === 'complete' && summary && (
          <div className="mission-summary">
            <div
              className="mission-verdict-badge"
              style={{
                background: VERDICT_STYLES[summary.verdict]?.bg,
                borderColor: VERDICT_STYLES[summary.verdict]?.border,
                color: VERDICT_STYLES[summary.verdict]?.color,
              }}
            >
              {summary.verdict}
            </div>
            <div className="mission-summary-text">{summary.reporterSummary}</div>
            <div className="mission-summary-meta">
              <span>{summary.proofCount} proofs generated</span>
              <span>{summary.elapsed}</span>
            </div>
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
