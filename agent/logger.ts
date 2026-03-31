/**
 * agent/logger.ts
 *
 * Structured execution logger for Casa.
 * Writes agent_log.json in the format required by the Ethereum Foundation bounty.
 * Each run produces a complete trace of every decision and tool call.
 */

import fs   from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LOG_FILE  = path.join(__dirname, '../agent_log.json')

// ── Types ────────────────────────────────────────────────────────

export type Trigger = 'telegram_message' | 'scheduler' | 'manual'
export type Outcome = 'success' | 'failed' | 'partial'

export interface LogStep {
  step:        number
  action:      string
  tool:        string
  status:      'success' | 'failed' | 'skipped'
  ts:          string
  // Optional fields depending on action
  decision?:   string
  item?:       string
  wallet?:     string
  amountINR?:  number
  pieceCID?:   string
  network?:    string
  signal?:     string
  txHash?:     string
  message?:    string
  fallback?:   string
  budgetRemainingINR?: number
  orderTotalINR?:      number
  error?:      string
  [key: string]: unknown
}

export interface AgentLog {
  runId:          string
  agentId:        string | null
  trigger:        Trigger
  input:          string
  steps:          LogStep[]
  outcome:        Outcome
  totalDurationMs: number
  computeBudgetUsed: {
    llmCalls:        number
    browserActions:  number
    blockchainTxs:   number
  }
}

// ── RunLogger ────────────────────────────────────────────────────

export class RunLogger {
  private startMs:  number
  private steps:    LogStep[] = []
  private stepN:    number    = 0
  private llmCalls: number    = 0
  private browserActions: number = 0
  private blockchainTxs: number  = 0
  private runId:    string
  private agentId:  string | null
  private trigger:  Trigger
  private input:    string

  constructor(trigger: Trigger, input: string, agentId: string | null = null) {
    this.startMs  = Date.now()
    this.runId    = `run_${new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 15)}`
    this.agentId  = agentId
    this.trigger  = trigger
    this.input    = input
  }

  step(action: string, tool: string, details: Omit<LogStep, 'step' | 'action' | 'tool' | 'ts'>): void {
    this.stepN++

    // Track compute budget
    if (tool.includes('claude') || tool.includes('llm') || tool.includes('brain')) this.llmCalls++
    if (tool.includes('playwright') || tool.includes('browser')) this.browserActions++
    if (tool.includes('erc8004') || tool.includes('near') || tool.includes('blockchain') || tool.includes('x402')) this.blockchainTxs++

    this.steps.push({
      step:   this.stepN,
      action,
      tool,
      ts:     new Date().toISOString(),
      ...details,
    })
  }

  /** Finalize log, write to agent_log.json, return the log object */
  async finish(outcome: Outcome): Promise<AgentLog> {
    const log: AgentLog = {
      runId:          this.runId,
      agentId:        this.agentId,
      trigger:        this.trigger,
      input:          this.input,
      steps:          this.steps,
      outcome,
      totalDurationMs: Date.now() - this.startMs,
      computeBudgetUsed: {
        llmCalls:       this.llmCalls,
        browserActions: this.browserActions,
        blockchainTxs:  this.blockchainTxs,
      },
    }

    try {
      await fs.writeFile(LOG_FILE, JSON.stringify(log, null, 2))
      console.log(`[logger] agent_log.json written (${this.steps.length} steps, ${log.totalDurationMs}ms)`)
    } catch (err) {
      console.error('[logger] Failed to write agent_log.json:', err)
    }

    return log
  }

  getRunId(): string { return this.runId }
}

/** Factory: create a new RunLogger instance */
export function createRun(trigger: Trigger, input: string, agentId?: string | null): RunLogger {
  let aid = agentId ?? null
  if (!aid) {
    // Try to read agentId from identity/agent.json
    try {
      const raw = require('fs').readFileSync(
        path.join(__dirname, '../identity/agent.json'), 'utf-8'
      )
      aid = JSON.parse(raw)?.registrations?.[0]?.agentId ?? null
    } catch { /* no agent.json yet */ }
  }
  return new RunLogger(trigger, input, aid)
}
