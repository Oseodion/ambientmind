import { useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import '../styles/landing.css'

export default function LandingPage() {
  const navigate = useNavigate()
  const { walletAddress, connect } = useWallet()

  const heroCanvasRef = useRef(null)
  const globeCanvasRef = useRef(null)
  const globeStarCanvasRef = useRef(null)
  const globeSpacerRef = useRef(null)
  const globeLabelRef = useRef(null)
  const globeBigRef = useRef(null)
  const globeRotRef = useRef(0)

  const handleConnect = useCallback(async () => {
    const addr = await connect()
    if (addr) navigate('/console')
  }, [connect, navigate])

  const handleLaunchConsole = useCallback(() => {
    if (walletAddress) {
      navigate('/console')
    } else {
      handleConnect()
    }
  }, [walletAddress, navigate, handleConnect])

  useEffect(() => {
    const canvas = heroCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const hero = canvas.parentElement

    let W, H, dpr
    let mouseX = 0, mouseY = 0
    let animId

    function resize() {
      dpr = window.devicePixelRatio || 1
      W = hero.offsetWidth
      H = hero.offsetHeight
      canvas.width = W * dpr
      canvas.height = H * dpr
      canvas.style.width = W + 'px'
      canvas.style.height = H + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const handleMouse = (e) => {
      const rect = hero.getBoundingClientRect()
      mouseX = (e.clientX - rect.left) / W - 0.5
      mouseY = (e.clientY - rect.top) / H - 0.5
    }
    hero.addEventListener('mousemove', handleMouse)

    const HERO_STARS = 120
    const stars = Array.from({ length: HERO_STARS }, () => {
      const isPurple = Math.random() > 0.78
      return {
        x: Math.random(), y: Math.random(),
        size: Math.random() * 1.4 + 0.3,
        vx: (Math.random() - 0.5) * 0.00008,
        vy: (Math.random() - 0.5) * 0.00006,
        phase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.003 + Math.random() * 0.005,
        baseOpacity: 0.06 + Math.random() * 0.19,
        isPurple,
      }
    })

    let frame = 0
    function draw() {
      ctx.clearRect(0, 0, W, H)
      frame++
      const parallaxStrength = 12
      stars.forEach(s => {
        s.x += s.vx
        s.y += s.vy
        if (s.x < 0) s.x = 1
        if (s.x > 1) s.x = 0
        if (s.y < 0) s.y = 1
        if (s.y > 1) s.y = 0
        const parallaxFactor = s.size / 1.7
        const px = s.x * W + mouseX * parallaxStrength * parallaxFactor
        const py = s.y * H + mouseY * parallaxStrength * parallaxFactor
        const twinkle = 0.5 + 0.5 * Math.sin(frame * s.twinkleSpeed + s.phase)
        const opacity = s.baseOpacity * (0.55 + 0.45 * twinkle)
        ctx.beginPath()
        ctx.arc(px, py, s.size, 0, Math.PI * 2)
        ctx.fillStyle = s.isPurple
          ? `rgba(200,180,255,${Math.min(opacity, 0.10)})`
          : `rgba(255,255,255,${Math.min(opacity, 0.25)})`
        ctx.fill()
      })
      animId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
      hero.removeEventListener('mousemove', handleMouse)
    }
  }, [])

  useEffect(() => {
    const starCanvas = globeStarCanvasRef.current
    if (!starCanvas) return
    const sCtx = starCanvas.getContext('2d')

    function drawGlobeStars() {
      const dpr = window.devicePixelRatio || 1
      const w = starCanvas.offsetWidth
      const h = starCanvas.offsetHeight
      starCanvas.width = w * dpr
      starCanvas.height = h * dpr
      sCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
      for (let i = 0; i < 150; i++) {
        const x = Math.random() * w
        const y = Math.random() * h
        const r = Math.random() * 1.2 + 0.2
        const isPurple = Math.random() > 0.82
        const opacity = 0.04 + Math.random() * 0.08
        sCtx.beginPath()
        sCtx.arc(x, y, r, 0, Math.PI * 2)
        sCtx.fillStyle = isPurple
          ? `rgba(200,180,255,${Math.min(opacity, 0.08)})`
          : `rgba(255,255,255,${Math.min(opacity, 0.12)})`
        sCtx.fill()
      }
    }
    drawGlobeStars()
    window.addEventListener('resize', drawGlobeStars)
    return () => window.removeEventListener('resize', drawGlobeStars)
  }, [])

  useEffect(() => {
    const globeCanvas = globeCanvasRef.current
    const spacer = globeSpacerRef.current
    if (!globeCanvas || !spacer) return
    const gCtx = globeCanvas.getContext('2d')
    let animId

    function resizeGlobe() {
      const dpr = window.devicePixelRatio || 1
      globeCanvas.width = globeCanvas.offsetWidth * dpr
      globeCanvas.height = globeCanvas.offsetHeight * dpr
      gCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resizeGlobe()
    window.addEventListener('resize', resizeGlobe)

    const GLOBE_COUNT = 1800
    const golden = Math.PI * (3 - Math.sqrt(5))
    const gParticles = Array.from({ length: GLOBE_COUNT }, (_, i) => {
      const y = 1 - (i / (GLOBE_COUNT - 1)) * 2
      const r = Math.sqrt(Math.max(0, 1 - y * y))
      const theta = golden * i
      const isSpecial = Math.random() > 0.85
      const color = isSpecial
        ? 'rgba(167,139,250,'
        : Math.random() > 0.65
        ? 'rgba(200,185,255,'
        : 'rgba(255,255,255,'
      return {
        startX: Math.random(), startY: Math.random(),
        globeNX: r * Math.cos(theta), globeNY: y, globeNZ: r * Math.sin(theta),
        scatterAngle: Math.random() * Math.PI * 2,
        scatterDist: 0.8 + Math.random() * 1.2,
        color, size: Math.random() * 1.2 + 0.2,
        speed: 0.6 + Math.random() * 0.4,
      }
    })

    function drawGlobe(progress) {
      const w = globeCanvas.offsetWidth
      const h = globeCanvas.offsetHeight
      gCtx.clearRect(0, 0, w, h)
      globeRotRef.current += 0.005
      const rot = globeRotRef.current
      const radius = Math.min(w, h) * 0.30
      const cx = w / 2
      const cy = h / 2

      gParticles.forEach(p => {
        let x, y, opacity, size
        if (progress <= 0.5) {
          const t = Math.min(1, (progress / 0.5) * p.speed)
          const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t
          const gx = cx + (p.globeNX * Math.cos(rot) - p.globeNZ * Math.sin(rot)) * radius
          const gy = cy + p.globeNY * radius
          x = p.startX * w + (gx - p.startX * w) * ease
          y = p.startY * h + (gy - p.startY * h) * ease
          opacity = 0.06 + ease * 0.55
          size = p.size * (0.4 + ease * 0.6)
        } else if (progress <= 0.72) {
          const gx = cx + (p.globeNX * Math.cos(rot) - p.globeNZ * Math.sin(rot)) * radius
          const gy = cy + p.globeNY * radius
          x = gx; y = gy
          opacity = 0.65
          size = p.size
        } else {
          const t = (progress - 0.72) / 0.28
          const ease = t * t
          const gx = cx + (p.globeNX * Math.cos(rot) - p.globeNZ * Math.sin(rot)) * radius
          const gy = cy + p.globeNY * radius
          const tx = cx + Math.cos(p.scatterAngle) * p.scatterDist * w * 0.6
          const ty = cy + Math.sin(p.scatterAngle) * p.scatterDist * h * 0.6
          x = gx + (tx - gx) * ease
          y = gy + (ty - gy) * ease
          opacity = 0.85 * (1 - ease * ease)
          size = p.size * (1 + ease * 3)
        }
        gCtx.beginPath()
        gCtx.arc(x, y, Math.max(0.1, size), 0, Math.PI * 2)
        gCtx.fillStyle = p.color + Math.max(0, Math.min(1, opacity)) + ')'
        gCtx.fill()
      })
    }

    function onScroll() {
      const rect = spacer.getBoundingClientRect()
      const total = spacer.offsetHeight - window.innerHeight
      const scrolled = -rect.top
      const progress = Math.max(0, Math.min(1, scrolled / total))
      const label = globeLabelRef.current
      const big = globeBigRef.current
      if (!label || !big) return
      if (progress < 0.45) {
        label.textContent = 'Agents assembling'
        big.innerHTML = 'The network<br>comes together'
        label.style.opacity = 1
        big.style.opacity = 1
      } else if (progress < 0.72) {
        label.textContent = 'Network formed'
        big.innerHTML = 'One unified<br><em>intelligence</em>'
        label.style.opacity = 1
        big.style.opacity = 1
      } else {
        const fade = 1 - (progress - 0.72) / 0.28
        label.textContent = 'Every decision verified'
        big.innerHTML = 'Proof of Logits<br><em>on-chain forever</em>'
        label.style.opacity = fade
        big.style.opacity = fade
      }
    }

    drawGlobe(0)
    window.addEventListener('scroll', onScroll, { passive: true })

    function globeLoop() {
      animId = requestAnimationFrame(globeLoop)
      const rect = spacer.getBoundingClientRect()
      const total = spacer.offsetHeight - window.innerHeight
      const scrolled = -rect.top
      const progress = Math.max(0, Math.min(1, scrolled / total))
      if (scrolled > -window.innerHeight && scrolled < spacer.offsetHeight) {
        drawGlobe(progress)
      }
    }
    globeLoop()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resizeGlobe)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('visible')
      })
    }, { threshold: 0.1 })

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <>
      {/* NAV */}
      <nav className="landing-nav">
        <div className="logo">Ambient<span>Mind</span></div>
        <div className="nav-links">
          <span onClick={() => walletAddress ? navigate('/agents') : document.querySelector('.agents-section')?.scrollIntoView({ behavior: 'smooth' })}>Agents</span>
          <span onClick={() => walletAddress ? navigate('/console') : document.querySelector('.console-section')?.scrollIntoView({ behavior: 'smooth' })}>Console</span>
          <span onClick={() => walletAddress ? navigate('/proofs') : document.querySelector('.light-section')?.scrollIntoView({ behavior: 'smooth' })}>Proofs</span>
          <span onClick={() => window.open('https://docs.ambient.xyz', '_blank')}>Docs</span>
        </div>
        <div className="nav-right">
          <div className="nav-badge"><span className="nav-pulse" />5 agents live</div>
          <button className="btn-nav" onClick={handleConnect}>
            {walletAddress ? 'Launch Console' : 'Connect Wallet'}
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <canvas ref={heroCanvasRef} className="hero-particle-canvas" />
        <div className="grain" />
        <div className="hero-glow" />
        <div className="hero-grid" />

        <div className="hero-inner">
          <div className="hero-left">
            <div className="hero-tag"><span className="nav-pulse" />Multi-Agent Intelligence - Ambient Network</div>
            <h1 className="hero-h1">
              AI agents that<br />
              <span className="purple">verify</span> <span className="dim">each</span><br />
              other
            </h1>
            <p className="hero-sub">A network of specialized AI agents that coordinate, audit each other, and prove every decision on Ambient Network - no black boxes, no trust required</p>
            <div className="hero-actions">
              <button className="btn-primary" onClick={handleLaunchConsole}>Launch Console</button>
              <button className="btn-secondary" onClick={() => {
                document.querySelector('.agents-section')?.scrollIntoView({ behavior: 'smooth' })
              }}>View Agents →</button>
            </div>
            <div className="agent-status">
              <div className="agent-chip"><span className="chip-dot chip-active" />ORCHESTRATOR</div>
              <span className="agent-sep">·</span>
              <div className="agent-chip"><span className="chip-dot chip-active" />SCOUT</div>
              <span className="agent-sep">·</span>
              <div className="agent-chip"><span className="chip-dot chip-busy" />ANALYST</div>
              <span className="agent-sep">·</span>
              <div className="agent-chip"><span className="chip-dot chip-idle" />REPORTER</div>
            </div>
          </div>
        </div>

        <div className="hero-bottom-fade" />
      </section>

      {/* GLOBE SPACER */}
      <div className="globe-spacer" ref={globeSpacerRef}>
        <div className="globe-sticky">
          <canvas ref={globeStarCanvasRef} className="globe-star-canvas" />
          <canvas ref={globeCanvasRef} className="globe-canvas" />
          <div className="globe-text">
            <div className="globe-label" ref={globeLabelRef}>Agents assembling</div>
            <div className="globe-big" ref={globeBigRef}>The network<br />comes together</div>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="section-divider">
        <div className="stats-row">
          <div className="stat-block reveal">
            <div className="stat-num">2,847</div>
            <div className="stat-label">Tasks completed today</div>
          </div>
          <div className="stat-block reveal stagger-1">
            <div className="stat-num">12,493</div>
            <div className="stat-label">Proof receipts generated</div>
          </div>
          <div className="stat-block reveal stagger-2">
            <div className="stat-num">99<span style={{ fontSize: 24, color: 'rgba(255,255,255,0.4)' }}>%</span></div>
            <div className="stat-label">Agent consensus rate</div>
          </div>
          <div className="stat-block reveal stagger-3">
            <div className="stat-num">5</div>
            <div className="stat-label">Specialized AI agents</div>
          </div>
        </div>
      </div>

      {/* FEATURES - LIGHT */}
      <section className="light-section">
        <div className="light-inner">
          <div className="section-eyebrow reveal">How it works</div>
          <div className="section-title reveal">Intelligence that proves itself</div>
          <p className="section-sub reveal">Every agent decision is cryptographically verified by Ambient's Proof of Logits - no agent can lie to another because every claim has an on-chain proof</p>
          <div className="feature-grid">
            <div className="feature-card reveal">
              <div className="fc-icon fc-icon-green"><svg viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg></div>
              <div className="fc-title">Verified Agent Decisions</div>
              <div className="fc-desc">Every AI decision generates a SHA-256 proof receipt stored permanently on Ambient Network</div>
            </div>
            <div className="feature-card reveal stagger-1">
              <div className="fc-icon fc-icon-blue"><svg viewBox="0 0 24 24"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg></div>
              <div className="fc-title">Multi-Agent Consensus</div>
              <div className="fc-desc">Multiple specialized agents analyze each task independently - consensus required before any verdict</div>
            </div>
            <div className="feature-card reveal stagger-2">
              <div className="fc-icon fc-icon-purple"><svg viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg></div>
              <div className="fc-title">Real-Time Orchestration</div>
              <div className="fc-desc">Watch agents coordinate live - each step visible, each decision auditable, nothing hidden</div>
            </div>
            <div className="feature-card reveal stagger-3">
              <div className="fc-icon fc-icon-yellow"><svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg></div>
              <div className="fc-title">Solana Native</div>
              <div className="fc-desc">Built on Ambient's SVM-compatible network - wallet connection, on-chain proofs, token integration</div>
            </div>
            <div className="feature-card reveal stagger-4">
              <div className="fc-icon fc-icon-red"><svg viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg></div>
              <div className="fc-title">Threat Intelligence</div>
              <div className="fc-desc">Agents monitor Solana wallets, tokens, and contracts for malicious patterns in real time</div>
            </div>
            <div className="feature-card reveal stagger-5">
              <div className="fc-icon fc-icon-blue"><svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg></div>
              <div className="fc-title">Proof Receipt Gallery</div>
              <div className="fc-desc">Every verified AI decision stored and viewable - complete audit trail of the network's activity</div>
            </div>
          </div>
        </div>
      </section>

      {/* CONSOLE - DARK */}
      <section className="console-section">
        <div className="console-inner">
          <div className="console-window reveal">
            <div className="console-topbar">
              <div className="win-dot wd-r" />
              <div className="win-dot wd-y" />
              <div className="win-dot wd-g" />
              <span className="win-title">ambientmind - live console</span>
            </div>
            <div className="console-body">
              <div className="cl"><span className="cl-agent cl-orch">ORCHESTRATOR</span><span className="cl-msg">Task received - analyze wallet 8NtD...Ahe9</span><span className="cl-hash">sha256:4f2a...</span></div>
              <div className="cl"><span className="cl-agent cl-scout">SCOUT</span><span className="cl-msg">Scanning 847 transactions - 3 flagged</span><span className="cl-hash">sha256:9b1c...</span></div>
              <div className="cl"><span className="cl-agent cl-analyst">ANALYST</span><span className="cl-msg">Risk analysis complete - score 87/100</span><span className="cl-hash">sha256:2d8f...</span></div>
              <div className="cl"><span className="cl-agent cl-threat">THREAT</span><span className="cl-msg">Known rug pattern detected - flagging</span><span className="cl-hash">sha256:7c3e...</span></div>
              <div className="cl"><span className="cl-agent cl-reporter">REPORTER</span><span className="cl-msg">Alert generated - notifying user</span><span className="cl-hash">sha256:1a9f...</span></div>
              <div className="cl"><span className="cl-agent cl-orch">ORCHESTRATOR</span><span className="cl-msg">VERDICT: CRITICAL - DO NOT INTERACT<span className="cursor-blink" /></span><span className="cl-hash">sha256:ecf7...</span></div>
            </div>
          </div>

          <div className="console-right">
            <div className="section-eyebrow reveal">Live proof receipts</div>
            <div className="section-title reveal" style={{ color: '#fff' }}>Every decision, on-chain forever</div>
            <p className="section-sub reveal" style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 32 }}>When AmbientMind flags a threat, you get a cryptographic proof of what the AI decided - model, timestamp, consensus hash - permanently stored on Ambient Network</p>
            <div className="proof-card reveal">
              <div className="pc-header">
                <div className="pc-verified-badge">✓</div>
                <span className="pc-title">Verified AI Decision</span>
              </div>
              <div className="pc-rows">
                <div className="pc-row"><span className="pc-key">Verdict</span><span className="pc-val">CRITICAL - Rug Pattern Detected</span></div>
                <div className="pc-row"><span className="pc-key">Model</span><span className="pc-val-green">ambient/large - Ambient Network</span></div>
                <div className="pc-row"><span className="pc-key">Agents</span><span className="pc-val">4 of 5 consensus</span></div>
                <div className="pc-row"><span className="pc-key">Timestamp</span><span className="pc-val">2026-06-16 09:14:22 UTC</span></div>
                <div className="pc-row"><span className="pc-key">Hash</span><span className="pc-val-hash">sha256:ecf785a63c50ada5ba21eaf318c2bc747b0fb841...</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AGENTS - LIGHT */}
      <section className="agents-section">
        <div className="agents-inner">
          <div className="section-eyebrow reveal">The network</div>
          <div className="section-title reveal">Five agents, one intelligence</div>
          <p className="section-sub reveal">Each agent specializes in one task - together they form a verified intelligence network where no single point of failure exists</p>
          <div className="agents-grid">
            <div className="agent-card reveal">
              <div className="agent-status-dot asd-active" />
              <div className="agent-icon-wrap ai-orch">
                <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, stroke: '#10b981', fill: 'none', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M4 6h16M4 12h16M4 18h7"/><circle cx="18" cy="18" r="3"/><path d="M21 18h-1.5M15 18h-1.5M18 15v-1.5M18 21v-1.5"/></svg>
              </div>
              <div className="agent-card-name">Orchestrator</div>
              <div className="agent-card-desc">Routes tasks, manages agent coordination, synthesizes final verdict</div>
            </div>
            <div className="agent-card reveal stagger-1">
              <div className="agent-status-dot asd-active" />
              <div className="agent-icon-wrap ai-scout">
                <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, stroke: '#60a5fa', fill: 'none', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              </div>
              <div className="agent-card-name">Scout Agent</div>
              <div className="agent-card-desc">Monitors wallets and tokens, flags suspicious patterns for analysis</div>
            </div>
            <div className="agent-card reveal stagger-2">
              <div className="agent-status-dot asd-active" />
              <div className="agent-icon-wrap ai-analyst">
                <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, stroke: '#a855f7', fill: 'none', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
              </div>
              <div className="agent-card-name">Analyst Agent</div>
              <div className="agent-card-desc">Deep risk analysis on flagged items using Ambient verified inference</div>
            </div>
            <div className="agent-card reveal stagger-3">
              <div className="agent-status-dot asd-active" />
              <div className="agent-icon-wrap ai-threat">
                <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, stroke: '#f87171', fill: 'none', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              </div>
              <div className="agent-card-name">Threat Agent</div>
              <div className="agent-card-desc">Cross-references known bad actors and exploit patterns across Solana</div>
            </div>
            <div className="agent-card reveal stagger-4">
              <div className="agent-status-dot asd-idle" />
              <div className="agent-icon-wrap ai-reporter">
                <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, stroke: '#fbbf24', fill: 'none', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
              </div>
              <div className="agent-card-name">Reporter Agent</div>
              <div className="agent-card-desc">Summarizes findings and generates verified alert reports for users</div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="footer-grid-bg" />
        <div className="footer-inner">
          <div className="footer-brand reveal">
            <div className="footer-logo">Ambient<span>Mind</span></div>
            <div className="footer-tagline">A verified multi-agent intelligence network built on Ambient Network - where AI agents prove every decision on-chain</div>
            <a href="https://ambient.xyz" target="_blank" rel="noopener noreferrer" className="ambient-link">Built on Ambient Network</a>
          </div>
          <div className="footer-cols reveal stagger-1">
            <div className="footer-col">
              <div className="footer-col-title">Product</div>
              <div className="footer-links">
                <a href="#">Console</a>
                <a href="#">Agent Network</a>
                <a href="#">Proof Receipts</a>
                <a href="#">Docs</a>
              </div>
            </div>
            <div className="footer-col">
              <div className="footer-col-title">Ambient Network</div>
              <div className="footer-links">
                <a href="https://ambient.xyz" target="_blank" rel="noopener noreferrer">ambient.xyz</a>
                <a href="https://x.com/ambient_xyz" target="_blank" rel="noopener noreferrer">Twitter</a>
                <a href="https://discord.gg/3Seasf7DcB" target="_blank" rel="noopener noreferrer">Discord</a>
                <a href="https://docs.ambient.xyz" target="_blank" rel="noopener noreferrer">Developer Docs</a>
              </div>
            </div>
            <div className="footer-col">
              <div className="footer-col-title">Builder</div>
              <div className="footer-links">
                <a href="https://x.com/web3_tech_" target="_blank" rel="noopener noreferrer">Jeff</a>
                <a href="https://discord.gg/3Seasf7DcB" target="_blank" rel="noopener noreferrer">Ambient Discord</a>
              </div>
            </div>
          </div>
          <div className="footer-agents reveal stagger-2">
            <span className="footer-agent-chip">ORCHESTRATOR</span>
            <span className="footer-agent-chip">SCOUT</span>
            <span className="footer-agent-chip">ANALYST</span>
            <span className="footer-agent-chip">THREAT</span>
            <span className="footer-agent-chip">REPORTER</span>
          </div>
          <div className="footer-bottom reveal stagger-3">
            <div className="footer-copy">AmbientMind 2026 - Built on Ambient Network testnet</div>
            <div className="footer-powered">Verified by <span>Proof of Logits</span> · ambient/large</div>
          </div>
        </div>
      </footer>
    </>
  )
}
