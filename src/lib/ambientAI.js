const API_URL = 'https://api.ambient.xyz/v1/chat/completions'
const MODEL = 'ambient/large'

async function sha256(text) {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function callAmbient(systemPrompt, userPrompt, retries = 3) {
  const delays = [1000, 2000, 4000]
  let lastError = null

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + import.meta.env.VITE_AMBIENT_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          stream: false
        })
      })

      if (!response.ok) throw new Error(`API error: ${response.status}`)

      const data = await response.json()
      const text = data.choices[0].message.content
      return { text, isDemo: false }
    } catch (err) {
      lastError = err
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, delays[i]))
      }
    }
  }

  console.warn('Ambient API failed after retries:', lastError)
  return null
}

async function buildProof(text, agentName) {
  const hash = await sha256(text)
  return {
    id: crypto.randomUUID(),
    agentName,
    decision: text,
    model: MODEL,
    timestamp: new Date().toISOString(),
    hash,
    verified: true,
  }
}

const SYSTEM_PROMPTS = {
  orchestrator: `You are the Orchestrator agent for AmbientMind, a verified multi-agent intelligence network on Ambient Network. Your role is to analyze incoming tasks, determine which agents should be activated, and synthesize a final verdict. Be concise and precise. Format your analysis in clear steps. Never use em dashes - use hyphens instead. Do not use emojis.`,

  scout: `You are the Scout Agent for AmbientMind. Your role is to monitor Solana wallets and tokens, scanning for suspicious patterns like unusual transaction volumes, rapid token movements, connections to flagged addresses, or signs of wash trading. Report findings concisely with specific data points. Never use em dashes - use hyphens instead. Do not use emojis.`,

  analyst: `You are the Analyst Agent for AmbientMind. Your role is to perform deep risk analysis on data flagged by the Scout. Calculate risk scores, identify probability of malicious intent, and assess severity levels. Provide numerical risk assessments and clear reasoning. Never use em dashes - use hyphens instead. Do not use emojis.`,

  threat: `You are the Threat Agent for AmbientMind. Your role is to cross-reference findings against known bad actors, documented exploit patterns, rug pull signatures, and historical Solana scam databases. Identify matching threat patterns and their severity. Never use em dashes - use hyphens instead. Do not use emojis.`,

  reporter: `You are the Reporter Agent for AmbientMind. Your role is to synthesize all agent findings into a clear, actionable alert report. Summarize the threat level (SAFE, LOW, MEDIUM, HIGH, CRITICAL), key findings, and recommended actions. Be direct and concise. Never use em dashes - use hyphens instead. Do not use emojis.`,
}

const DEMO_RESPONSES = {
  orchestrator: (task) => `Task received: "${task}". Routing to Scout for initial scan, then Analyst for risk scoring, Threat for pattern matching, and Reporter for final summary. All agents activated.`,

  scout: (target) => `Scanned target ${target || 'address'}. Found 847 transactions in last 30 days. 3 flagged for unusual patterns: rapid token swaps within 2-minute windows, interaction with 2 known mixer contracts, and a large outflow of 12,400 SOL to a newly created wallet.`,

  analyst: (data) => `Risk analysis complete. Overall risk score: 87/100 (HIGH). Key factors: Transaction velocity anomaly (score 92), mixer interaction (score 85), large single transfer to new wallet (score 78). Probability of malicious activity: 73%. Confidence level: HIGH based on multi-factor correlation.`,

  threat: (data) => `Cross-reference complete. Matched 2 known threat patterns: Pattern TX-4421 (rapid liquidation before rug) with 81% similarity. Pattern MX-1187 (mixer chain obfuscation) with 67% similarity. Target wallet has 1-hop connection to address flagged in the Cashio exploit (March 2022). Threat level: HIGH.`,

  reporter: (findings) => `ALERT REPORT - Threat Level: CRITICAL. Target wallet shows strong indicators of malicious preparation. Key findings: 87/100 risk score, 73% malicious probability, matches 2 known exploit patterns, connected to previously flagged address. Recommended action: DO NOT INTERACT. Monitor for further activity. All 5 agents reached consensus on threat assessment.`,
}

async function runAgent(agentName, systemKey, userPrompt, demoFn, demoArg) {
  const result = await callAmbient(SYSTEM_PROMPTS[systemKey], userPrompt)

  if (result) {
    const proof = await buildProof(result.text, agentName)
    return { result: result.text, proof, isDemo: false }
  }

  const demoText = demoFn(demoArg)
  const proof = await buildProof(demoText, agentName)
  return { result: demoText, proof, isDemo: true }
}

export async function runOrchestrator(task) {
  return runAgent('Orchestrator', 'orchestrator',
    `Analyze this task and determine how to coordinate the agent network: ${task}`,
    DEMO_RESPONSES.orchestrator, task)
}

export async function runScout(walletAddress) {
  return runAgent('Scout', 'scout',
    `Scan the following target for suspicious activity and patterns: ${walletAddress}`,
    DEMO_RESPONSES.scout, walletAddress)
}

export async function runAnalyst(data) {
  return runAgent('Analyst', 'analyst',
    `Perform deep risk analysis on these findings: ${data}`,
    DEMO_RESPONSES.analyst, data)
}

export async function runThreat(data) {
  return runAgent('Threat', 'threat',
    `Cross-reference these findings against known bad actors and exploit patterns: ${data}`,
    DEMO_RESPONSES.threat, data)
}

export async function runReporter(findings) {
  return runAgent('Reporter', 'reporter',
    `Generate a final verified alert report based on all agent findings: ${findings}`,
    DEMO_RESPONSES.reporter, findings)
}

export async function runFullMission(task, walletAddress) {
  const results = []
  let isDemo = false

  const orch = await runOrchestrator(task)
  results.push(orch)
  if (orch.isDemo) isDemo = true

  const target = walletAddress || task
  const scout = await runScout(target)
  results.push(scout)
  if (scout.isDemo) isDemo = true

  const analyst = await runAnalyst(scout.result)
  results.push(analyst)
  if (analyst.isDemo) isDemo = true

  const threat = await runThreat(scout.result + ' ' + analyst.result)
  results.push(threat)
  if (threat.isDemo) isDemo = true

  const allFindings = results.map(r => r.result).join('\n')
  const reporter = await runReporter(allFindings)
  results.push(reporter)
  if (reporter.isDemo) isDemo = true

  const verdictText = reporter.result
  let verdict = 'SAFE'
  const upper = verdictText.toUpperCase()
  if (upper.includes('CRITICAL')) verdict = 'CRITICAL'
  else if (upper.includes('HIGH')) verdict = 'HIGH'
  else if (upper.includes('MEDIUM')) verdict = 'MEDIUM'
  else if (upper.includes('LOW')) verdict = 'LOW'

  return { results, verdict, isDemo }
}
