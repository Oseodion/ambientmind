# AmbientMind

A verified multi-agent intelligence network built on Ambient Network. Five specialized AI agents coordinate, verify each other, and prove every decision on-chain via Proof of Logits.

## What it does

AmbientMind lets you submit any Solana wallet address or token contract for security analysis. Five specialized agents then coordinate in sequence - each one analyzing the target, building on the previous agent's findings, and generating a cryptographic proof receipt of their decision on Ambient Network.

## Agent Network

- **Orchestrator** - Routes the task, coordinates all agents, synthesizes the final verdict
- **Scout** - Performs initial pattern analysis and flags risk indicators
- **Analyst** - Calculates risk scores and assesses severity based on Scout findings
- **Threat** - Cross-references against known Solana exploit signatures and attack vectors
- **Reporter** - Synthesizes all findings into a final actionable security report

## How it works

1. Connect your Phantom wallet
2. Select a task type - Analyze Wallet, Scan Token, or Investigate Transaction
3. Paste a Solana address
4. Watch all 5 agents coordinate in real time in the live console
5. Every agent decision generates a SHA-256 proof receipt verified on Ambient Network
6. Results are stored in Mission History and Proof Receipts for your session

## Multi-Agent Architecture

Each agent has a specialized role and passes findings to the next agent in sequence. The Orchestrator coordinates the flow. All agent decisions are cryptographically hashed and stored as proof receipts - every analysis is fully auditable.

This is the exact multi-agent pattern requested in Ambient Week 17 Dev Loop:
- Research agent (Scout) - Analysis agent (Analyst) - Decision agent (Reporter)
- Verification agent (Threat) reviewing outputs from other agents
- Orchestrator coordinating all execution agents

## Tech Stack

- React + Vite + Tailwind CSS
- Ambient Network API - model ambient/large
- Solana wallet adapter - Phantom
- SHA-256 proof receipts via Web Crypto API
- localStorage for session persistence

## Built on Ambient Network

Every AI decision in AmbientMind is verified by Ambient's Proof of Logits consensus. The model running all agent inference is ambient/large (zai-org/GLM-5.1-FP8).

## Week 17 Dev Loop Submission

Built for Ambient Network Week 17 Dev Loop - Multi-Agent Systems theme.

Delivers:
- Multiple agents interacting together with shared state via React Context
- Specialized agent roles with distinct system prompts and responsibilities
- Multi-step agent workflow with sequential coordination
- Live demo at https://ambientmind.vercel.app
- Full repository with all source code

## Running locally

Clone the repo, add your Ambient API key to .env as VITE_AMBIENT_API_KEY, then run npm install and npm run dev.
