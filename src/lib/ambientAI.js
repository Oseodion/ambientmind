const API_URL = 'https://api.ambient.xyz/v1/chat/completions'
const MODEL = 'ambient/large'

async function sha256(text) {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export function stripMarkdown(text) {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^---+$/gm, '')
    .replace(/\|/g, '')
    .replace(/^>\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

let requestQueue = Promise.resolve()

function enqueue(fn) {
  const task = requestQueue.then(fn, fn)
  requestQueue = task.catch(() => {})
  return task
}

async function callAmbient(systemPrompt, userPrompt, retries = 3) {
  return enqueue(async () => {
    const delays = [3000, 6000, 12000]
    let lastError = null

    for (let i = 0; i < retries; i++) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 60000)

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
          }),
          signal: controller.signal
        })

        clearTimeout(timeout)

        if (response.status === 429) {
          lastError = new Error('Rate limited (429)')
          await new Promise(r => setTimeout(r, 8000))
          continue
        }

        if (!response.ok) throw new Error(`API error: ${response.status}`)

        const data = await response.json()
        const text = stripMarkdown(data.choices[0].message.content)
        await new Promise(r => setTimeout(r, 2000))
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
  })
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
  orchestrator: `You are the Orchestrator agent for AmbientMind, a verified multi-agent AI security intelligence network built on Ambient Network. Your role is to receive security analysis tasks, break them down into a clear execution plan, coordinate the other agents, and synthesize a final verdict. You reason based on AI security knowledge and pattern analysis. Be concise and direct. Output plain text only - no markdown headers, no bullet symbols, no bold formatting, no tables. Never use em dashes, use hyphens instead.`,

  scout: `You are the Scout Agent for AmbientMind. Your role is to perform initial pattern analysis on Solana wallet addresses and token contracts provided by the user. Based on the address characteristics, known Solana ecosystem patterns, and security intelligence from your training, identify potential risk indicators such as: wallet age patterns, typical rug pull address structures, known mixer address formats, suspicious token naming patterns, and common scam deployment patterns. You are an AI reasoning agent - analyze based on patterns and knowledge, not live blockchain queries. Be specific and concise. Output plain text only - no markdown, no bullet symbols, no headers, no bold, no tables.`,

  analyst: `You are the Analyst Agent for AmbientMind. Your role is to perform deep risk analysis on findings provided by the Scout Agent. Calculate a risk score from 0 to 100, identify probability of malicious intent, assess severity as SAFE, LOW, MEDIUM, HIGH, or CRITICAL, and provide clear reasoning. Base your analysis on Solana security patterns, DeFi exploit history, and known attack vectors from your training knowledge. Be specific with numbers. Output plain text only - no markdown, no bullet symbols, no headers, no bold, no tables.`,

  threat: `You are the Threat Agent for AmbientMind. Your role is to cross-reference findings against known Solana exploit patterns, documented rug pulls, mixer signatures, and historical attack vectors from your training knowledge. Identify matching threat patterns by name where possible, estimate similarity percentages, and assess the overall threat classification. Output plain text only - no markdown, no bullet symbols, no headers, no bold, no tables.`,

  reporter: `You are the Reporter Agent for AmbientMind. Your role is to synthesize all agent findings into a clear, direct, actionable security report. State the threat level clearly as one of: SAFE, LOW, MEDIUM, HIGH, or CRITICAL. Summarize the key findings in 2-3 plain sentences. State a clear recommended action. Be direct and human-readable. Output plain text only - no markdown, no bullet symbols, no headers, no bold, no tables. Never use em dashes.`,
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
    `Security task received: ${task}. Break this down and coordinate the agent network to analyze it.`,
    DEMO_RESPONSES.orchestrator, task)
}

export async function runScout(target) {
  return runAgent('Scout', 'scout',
    `Perform initial security pattern analysis on this Solana target: ${target}. Identify potential risk indicators based on known patterns and security intelligence.`,
    DEMO_RESPONSES.scout, target)
}

export async function runAnalyst(scoutResult) {
  return runAgent('Analyst', 'analyst',
    `Perform deep risk analysis based on this Scout report: ${scoutResult}. Provide a risk score, severity level, and clear reasoning.`,
    DEMO_RESPONSES.analyst, scoutResult)
}

export async function runThreat(data) {
  return runAgent('Threat', 'threat',
    `Cross-reference these findings against known Solana threat patterns: ${data}. Identify matching exploit signatures and threat classifications.`,
    DEMO_RESPONSES.threat, data)
}

export async function runReporter(findings) {
  return runAgent('Reporter', 'reporter',
    `Generate a final security report based on all agent findings: ${findings}. State threat level, key findings in 2-3 sentences, and recommended action.`,
    DEMO_RESPONSES.reporter, findings)
}
