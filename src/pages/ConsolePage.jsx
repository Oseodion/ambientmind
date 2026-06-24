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
  const [summary, setSummary] = useState(null)
  const [rateLimited, setRateLimited] = useState(false)
  const [retryCooldown, setRetryCooldown] = useState(0)
  const consoleEndRef = useRef(null)

  useEffect(() => {
    if (!rateLimited) return
    setRetryCooldown(120)
    const interval = setInterval(() => {
      setRetryCooldown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [rateLimited])

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
    setSummary(null)
    setRateLimited(false)

    const allResults = []
    let failedCount = 0

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
        const result = await withTimeout(runFn(...args), 90000)
        if (result.failed) {
          failedCount++
          replaceActiveLine(name, 'Rate limited - skipped', '', true)
          return null
        }
        allResults.push(result)
        const clean = stripMarkdown(result.result)
        const short = clean.length > 120 ? clean.slice(0, 120) + '...' : clean
        replaceActiveLine(name, short, 'sha256:' + result.proof.hash.slice(0, 8) + '...')
        addProof(result.proof)
        setProofCards(prev => [...prev, { ...result, result: clean }])
        return result
      } catch (err) {
        failedCount++
        console.warn(`${name} failed:`, err.message)
        replaceActiveLine(name, 'Rate limited - skipped', '', true)
        return null
      }
    }

    const missionTimeout = setTimeout(() => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

      setLines(prev => {
        const filtered = prev.filter(l => !l.active)
        return filtered
      })

      if (allResults.length > 0) {
        const lastResult = allResults[allResults.length - 1]
        const verdict = getVerdict(lastResult.result)
        setSummary({
          verdict,
          reporterSummary: stripMarkdown(lastResult.result).slice(0, 200),
          proofCount: allResults.length,
          elapsed: elapsed + 's',
        })
      }

      if (failedCount > 0) setRateLimited(true)
      setStatus('complete')
    }, 600000)

    try {
      await runSingleAgent('Orchestrator', runOrchestrator, [task])
      const scout = await runSingleAgent('Scout', runScout, [task])
      const analyst = await runSingleAgent('Analyst', runAnalyst, [scout ? scout.result : task])
      const threat = await runSingleAgent('Threat', runThreat, [(scout ? scout.result : '') + ' ' + (analyst ? analyst.result : '')])
      const allFindings = allResults.map(r => r.result).join('\n')
      const reporter = await runSingleAgent('Reporter', runReporter, [allFindings || task])

      clearTimeout(missionTimeout)

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

      if (allResults.length > 0) {
        const lastSuccessful = reporter || allResults[allResults.length - 1]
        const reporterText = stripMarkdown(lastSuccessful.result)
        const verdict = getVerdict(reporterText)

        setLines(prev => [...prev, {
          agentName: 'Orchestrator',
          message: `VERDICT: ${verdict} - ${reporterText.length > 80 ? reporterText.slice(0, 80) + '...' : reporterText}`,
          hash: 'sha256:' + lastSuccessful.proof.hash.slice(0, 8) + '...',
          active: false,
        }])
        scrollToBottom()

        setSummary({
          verdict,
          reporterSummary: reporterText.length > 200 ? reporterText.slice(0, 200) + '...' : reporterText,
          proofCount: allResults.length,
          elapsed: elapsed + 's',
        })

        addMission({
          task,
          timestamp: new Date().toISOString(),
          agentCount: allResults.length,
          verdict,
          proofCount: allResults.length,
          duration: elapsed + 's',
          results: allResults.map(r => ({ agentName: r.proof.agentName, decision: stripMarkdown(r.result), hash: r.proof.hash })),
          proofs: allResults.map(r => r.proof),
        })
      }

      if (failedCount > 0) setRateLimited(true)
      setStatus('complete')
    } catch (err) {
      clearTimeout(missionTimeout)
      console.error('Mission error:', err)

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

      if (allResults.length > 0) {
        const lastResult = allResults[allResults.length - 1]
        const verdict = getVerdict(lastResult.result)
        setSummary({
          verdict,
          reporterSummary: stripMarkdown(lastResult.result).slice(0, 200),
          proofCount: allResults.length,
          elapsed: elapsed + 's',
        })
        addMission({
          task,
          timestamp: new Date().toISOString(),
          agentCount: allResults.length,
          verdict,
          proofCount: allResults.length,
          duration: elapsed + 's',
          results: allResults.map(r => ({ agentName: r.proof.agentName, decision: stripMarkdown(r.result), hash: r.proof.hash })),
          proofs: allResults.map(r => r.proof),
        })
      }

      setRateLimited(true)
      setStatus('complete')
    }
  }, [canRun, taskString, addProof, addMission, scrollToBottom])

  const resetMission = () => {
    setStatus('idle')
    setAddress('')
    setLines([])
    setProofCards([])
    setSummary(null)
    setRateLimited(false)
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

        <div className="mission-actions-section">
          <div className="mission-actions">
            {status === 'complete' ? (
              <button className="btn-run" onClick={resetMission}>Run New Mission</button>
            ) : (
              <button className="btn-run" onClick={runMission} disabled={status === 'running' || !canRun}>
                {status === 'running' ? 'Running...' : 'Run Mission'}
              </button>
            )}
          </div>
          <div className="mission-rate-notice">Each mission makes 5 sequential API calls to Ambient Network - allow 2-3 minutes between missions to avoid rate limits</div>
        </div>

        {rateLimited && (
          <div className="rate-limit-banner">
            <div className="rate-limit-text">
              Rate limit reached - Ambient Network allows limited sequential API calls per minute. Please wait 2-3 minutes before running another mission
            </div>
            {retryCooldown > 0 ? (
              <div className="rate-limit-countdown">Retry available in {Math.floor(retryCooldown / 60)}:{String(retryCooldown % 60).padStart(2, '0')}</div>
            ) : (
              <button className="btn-retry" onClick={resetMission}>Retry Mission</button>
            )}
          </div>
        )}

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
