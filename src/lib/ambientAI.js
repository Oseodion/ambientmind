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
  orchestrator: `You are the Orchestrator agent for AmbientMind, a verified multi-agent AI security intelligence network built on Ambient Network. Your role is to receive security analysis tasks, break them down into a clear execution plan, coordinate the other agents, and synthesize a final verdict. You reason based on AI security knowledge and pattern analysis. Be concise and direct. Output plain text only - no markdown headers, no bullet symbols, no bold formatting, no tables. Never use em dashes, use hyphens instead.`,

  scout: `You are the Scout Agent for AmbientMind. Your role is to perform initial pattern analysis on Solana wallet addresses and token contracts provided by the user. Based on the address characteristics, known Solana ecosystem patterns, and security intelligence from your training, identify potential risk indicators such as: wallet age patterns, typical rug pull address structures, known mixer address formats, suspicious token naming patterns, and common scam deployment patterns. You are an AI reasoning agent - analyze based on patterns and knowledge, not live blockchain queries. Be specific and concise. Output plain text only - no markdown, no bullet symbols, no headers, no bold, no tables.`,

  analyst: `You are the Analyst Agent for AmbientMind. Your role is to perform deep risk analysis on findings provided by the Scout Agent. Calculate a risk score from 0 to 100, identify probability of malicious intent, assess severity as SAFE, LOW, MEDIUM, HIGH, or CRITICAL, and provide clear reasoning. Base your analysis on Solana security patterns, DeFi exploit history, and known attack vectors from your training knowledge. Be specific with numbers. Output plain text only - no markdown, no bullet symbols, no headers, no bold, no tables.`,

  threat: `You are the Threat Agent for AmbientMind. Your role is to cross-reference findings against known Solana exploit patterns, documented rug pulls, mixer signatures, and historical attack vectors from your training knowledge. Identify matching threat patterns by name where possible, estimate similarity percentages, and assess the overall threat classification. Output plain text only - no markdown, no bullet symbols, no headers, no bold, no tables.`,

  reporter: `You are the Reporter Agent for AmbientMind. Your role is to synthesize all agent findings into a clear, direct, actionable security report. State the threat level clearly as one of: SAFE, LOW, MEDIUM, HIGH, or CRITICAL. Summarize the key findings in 2-3 plain sentences. State a clear recommended action. Be direct and human-readable. Output plain text only - no markdown, no bullet symbols, no headers, no bold, no tables. Never use em dashes.`,
}

async function runAgent(agentName, systemKey, userPrompt) {
  const text = await callAmbient(SYSTEM_PROMPTS[systemKey], userPrompt)

  if (text !== null) {
    const proof = await buildProof(text, agentName)
    return { result: text, proof, failed: false }
  }

  return { result: null, proof: null, failed: true }
}

export async function runOrchestrator(task) {
  return runAgent('Orchestrator', 'orchestrator',
    `Security task received: ${task}. Break this down and coordinate the agent network to analyze it.`)
}

export async function runScout(target) {
  return runAgent('Scout', 'scout',
    `Perform initial security pattern analysis on this Solana target: ${target}. Identify potential risk indicators based on known patterns and security intelligence.`)
}

export async function runAnalyst(scoutResult) {
  return runAgent('Analyst', 'analyst',
    `Perform deep risk analysis based on this Scout report: ${scoutResult}. Provide a risk score, severity level, and clear reasoning.`)
}

export async function runThreat(data) {
  return runAgent('Threat', 'threat',
    `Cross-reference these findings against known Solana threat patterns: ${data}. Identify matching exploit signatures and threat classifications.`)
}

export async function runReporter(findings) {
  return runAgent('Reporter', 'reporter',
    `Generate a final security report based on all agent findings: ${findings}. State threat level, key findings in 2-3 sentences, and recommended action.`)
}
