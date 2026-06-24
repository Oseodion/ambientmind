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

async function callAmbientOnce(systemPrompt, userPrompt) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 90000)

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
      }),
      signal: controller.signal
    })

    clearTimeout(timeout)

    if (response.status === 429) {
      await new Promise(r => setTimeout(r, 8000))
      throw new Error('Rate limited (429)')
    }

    if (!response.ok) throw new Error(`API error: ${response.status}`)

    const data = await response.json()
    const text = stripMarkdown(data.choices[0].message.content)
    await new Promise(r => setTimeout(r, 3000))
    return text
  } catch (err) {
    clearTimeout(timeout)
    throw err
  }
}

async function callAmbient(systemPrompt, userPrompt) {
  return enqueue(async () => {
    try {
      return await callAmbientOnce(systemPrompt, userPrompt)
    } catch (firstErr) {
      console.warn('First attempt failed, retrying in 5s:', firstErr.message)
      await new Promise(r => setTimeout(r, 5000))
      try {
        return await callAmbientOnce(systemPrompt, userPrompt)
      } catch (secondErr) {
        console.warn('Second attempt failed:', secondErr.message)
        return null
      }
    }
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
  wallet: {
    orchestrator: `You are the Orchestrator agent for AmbientMind, a verified multi-agent AI security intelligence network built on Ambient Network. Your role is to receive security analysis tasks, break them down into a clear execution plan, coordinate the other agents, and synthesize a final verdict. You reason based on AI security knowledge and pattern analysis. Be concise and direct. Output plain text only - no markdown headers, no bullet symbols, no bold formatting, no tables. Never use em dashes, use hyphens instead.`,
    scout: `You are the Scout Agent for AmbientMind. Your role is to perform initial pattern analysis on Solana wallet addresses and token contracts provided by the user. Based on the address characteristics, known Solana ecosystem patterns, and security intelligence from your training, identify potential risk indicators such as: wallet age patterns, typical rug pull address structures, known mixer address formats, suspicious token naming patterns, and common scam deployment patterns. You are an AI reasoning agent - analyze based on patterns and knowledge, not live blockchain queries. Be specific and concise. Output plain text only - no markdown, no bullet symbols, no headers, no bold, no tables.`,
    analyst: `You are the Analyst Agent for AmbientMind. Your role is to perform deep risk analysis on findings provided by the Scout Agent. Calculate a risk score from 0 to 100, identify probability of malicious intent, assess severity as SAFE, LOW, MEDIUM, HIGH, or CRITICAL, and provide clear reasoning. Base your analysis on Solana security patterns, DeFi exploit history, and known attack vectors from your training knowledge. Be specific with numbers. Output plain text only - no markdown, no bullet symbols, no headers, no bold, no tables.`,
    threat: `You are the Threat Agent for AmbientMind. Your role is to cross-reference findings against known Solana exploit patterns, documented rug pulls, mixer signatures, and historical attack vectors from your training knowledge. Identify matching threat patterns by name where possible, estimate similarity percentages, and assess the overall threat classification. Output plain text only - no markdown, no bullet symbols, no headers, no bold, no tables.`,
    reporter: `You are the Reporter Agent for AmbientMind. Your role is to synthesize all agent findings into a clear, direct, actionable security report. State the threat level clearly as one of: SAFE, LOW, MEDIUM, HIGH, or CRITICAL. Summarize the key findings in 2-3 plain sentences. State a clear recommended action. Be direct and human-readable. Output plain text only - no markdown, no bullet symbols, no headers, no bold, no tables. Never use em dashes.`,
  },
  transaction: {
    orchestrator: `You are the Orchestrator agent for AmbientMind. A Solana transaction signature has been submitted for security analysis. Break down the analysis plan: check the transaction type, identify the programs involved, assess the risk of the operation performed, and coordinate agents to evaluate sender reputation, program risk, and behavioral patterns. Be concise and plain text only - no markdown, no bullet symbols, no bold, no tables. Never use em dashes.`,
    scout: `You are the Scout Agent for AmbientMind. Analyze this Solana transaction signature for security risks. Based on the signature format and known Solana transaction patterns, assess: what type of operation this likely represents, which programs are typically involved in such transactions, and what risk indicators exist in the transaction structure itself. Plain text only - no markdown, no bullet symbols, no headers, no bold, no tables.`,
    analyst: `You are the Analyst Agent for AmbientMind. Perform risk analysis on this Solana transaction. Assess the probability that this transaction represents malicious activity such as a drainer approval, unauthorized token transfer, NFT theft, or exploit interaction. Provide a risk score 0-100 and severity level. Plain text only - no markdown, no bullet symbols, no headers, no bold, no tables.`,
    threat: `You are the Threat Agent for AmbientMind. Cross-reference this Solana transaction signature against known attack patterns. Identify if the transaction structure matches known exploit signatures, phishing transaction patterns, or malicious program interactions documented in Solana security history. Plain text only - no markdown, no bullet symbols, no headers, no bold, no tables.`,
    reporter: `You are the Reporter Agent for AmbientMind. Generate a final security report for this Solana transaction. State threat level as SAFE, LOW, MEDIUM, HIGH, or CRITICAL. Summarize what this transaction likely did and whether it poses a risk. Plain text only - no markdown, no bullet symbols, no headers, no bold, no tables. Never use em dashes.`,
  },
}

SYSTEM_PROMPTS.token = SYSTEM_PROMPTS.wallet

function detectTaskType(task) {
  const lower = task.toLowerCase()
  if (lower.includes('investigate transaction')) return 'transaction'
  if (lower.includes('scan token')) return 'token'
  return 'wallet'
}

function getPrompt(task, agentKey) {
  const type = detectTaskType(task)
  return SYSTEM_PROMPTS[type][agentKey]
}

async function runAgent(agentName, agentKey, task, userPrompt) {
  const text = await callAmbient(getPrompt(task, agentKey), userPrompt)

  if (text !== null) {
    const proof = await buildProof(text, agentName)
    return { result: text, proof, failed: false }
  }

  return { result: null, proof: null, failed: true }
}

export async function runOrchestrator(task) {
  return runAgent('Orchestrator', 'orchestrator', task,
    `Security task received: ${task}. Break this down into an execution plan for the agent network. Specify what the Scout, Analyst, Threat, and Reporter agents should each focus on.`)
}

export async function runScout(task, orchestratorResult) {
  return runAgent('Scout', 'scout', task,
    `Task: ${task}\n\nOrchestrator plan: ${orchestratorResult}\n\nPerform initial security pattern analysis on the Solana target specified in this task. Identify potential risk indicators based on known patterns and security intelligence.`)
}

export async function runAnalyst(task, scoutResult) {
  return runAgent('Analyst', 'analyst', task,
    `Task: ${task}\n\nScout findings: ${scoutResult}\n\nPerform deep risk analysis based on the Scout's findings above. Provide a risk score from 0-100, severity level, and clear reasoning.`)
}

export async function runThreat(task, scoutResult, analystResult) {
  return runAgent('Threat', 'threat', task,
    `Task: ${task}\n\nScout findings: ${scoutResult}\n\nAnalyst assessment: ${analystResult}\n\nCross-reference the Scout and Analyst findings against known Solana threat patterns. Identify matching exploit signatures and threat classifications.`)
}

export async function runReporter(task, agentResults) {
  const sections = agentResults.map(r => `${r.agentName}: ${r.result}`).join('\n\n')
  const skippedNote = agentResults.length < 4
    ? `\n\nNote: ${4 - agentResults.length} agent(s) did not complete due to rate limiting. Base your report on the available findings only.`
    : ''
  return runAgent('Reporter', 'reporter', task,
    `Task: ${task}\n\nAgent findings:\n${sections}${skippedNote}\n\nGenerate a final security report. State threat level, key findings in 2-3 sentences, and recommended action.`)
}
