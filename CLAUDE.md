# CLAUDE.md

## Project
AmbientMind - A verified multi-agent intelligence network built on Ambient Network. Five specialized AI agents coordinate, verify each other, and prove every decision on-chain via Ambient's Proof of Logits consensus.

## Design Reference
The file ambientmind-v6.html in this folder is the exact design reference for the landing page. Match it pixel perfectly - same fonts, colors, spacing, animations, particles.

## Rules - follow always
- Never use em dashes anywhere - use single hyphen when needed
- Never use emojis in UI
- Never push to GitHub - Jeff pushes manually himself
- No placeholder lorem ipsum text
- No full stops or dots at end of UI copy
- No AI sounding filler phrases

## Tech Stack
- React + Vite + Tailwind CSS
- Anthropic SDK pointed at Ambient API: baseURL https://api.ambient.xyz
- Model: ambient/large
- API key from environment variable VITE_AMBIENT_API_KEY
- Solana wallet adapter for Phantom connection
- @solana/web3.js connected to https://rpc.ambient.xyz with fallback to https://api.mainnet-beta.solana.com
- React Router for navigation between screens

## Design System
- Fonts: Inter (all weights), IBM Plex Mono (labels, monospace, tags)
- Background dark: #08050f (very dark near-black purple)
- Background light/cream: #faf8f4
- Accent: #a78bfa (soft lavender purple - used sparingly on verify italic, logo Mind, Connect Wallet button, agent dots)
- Text on dark: #ffffff full, rgba(255,255,255,0.45) secondary
- Text on light: #0a0a0a full, #6b7280 secondary
- Border dark: rgba(255,255,255,0.08)
- Border light: rgba(0,0,0,0.08)
- No em dashes ever - single hyphen only

## Environment Variables
VITE_AMBIENT_API_KEY= (never expose in code)

## Ambient API Integration
All AI calls use direct fetch to https://api.ambient.xyz/v1/chat/completions

const response = await fetch('https://api.ambient.xyz/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + import.meta.env.VITE_AMBIENT_API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'ambient/large',
    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
    stream: false
  })
})
const data = await response.json()
const text = data.choices[0].message.content

Add exponential backoff retry: 3 retries with 1000ms, 2000ms, 4000ms delays before falling back to demo data.

## The Five Agents
1. Orchestrator - routes tasks, manages coordination, synthesizes final verdict
2. Scout Agent - monitors wallets and tokens, flags suspicious patterns
3. Analyst Agent - deep risk analysis using Ambient verified inference
4. Threat Agent - cross-references known bad actors and exploit patterns
5. Reporter Agent - summarizes findings, generates verified alert reports

## Screens to Build
1. Landing page - matches ambientmind-v6.html exactly including particle animations and globe
2. Console - main interactive screen, user types task, watches 5 agents work live with real-time proof receipts
3. Agent Network - visual status of all 5 agents, their recent activity, health
4. Proof Receipts - all verified AI decisions stored, filterable
5. Mission History - every task ever run with outcomes

## Navigation Flow
Landing -> Connect Wallet (Phantom popup) -> Console (main screen) -> Agent Network / Proof Receipts / History via sidebar

## Proof Receipt System
Every Ambient API call generates a proof receipt stored in React context and localStorage:
- Decision text
- Model: ambient/large
- Timestamp
- SHA-256 hash of the response
- Agent that made the decision
- Verified: true/false

## Wallet Connection
- Check window.solana and window.solana.isPhantom
- If not found: show modal "Install Phantom from phantom.app"
- Call await window.solana.connect()
- Store real wallet address in context and localStorage
- Disconnect: window.solana.disconnect() then clear storage

## Commit Strategy
Commit after each major milestone. Jeff pushes manually - never auto push.
