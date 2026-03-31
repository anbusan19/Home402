/**
 * browser/navigator.ts
 *
 * Vision-driven page navigation for Casa.
 * Uses Claude (brain.ts) to decide actions from screenshots, then executes them with Playwright.
 *
 * Replaces hard-coded selector chains with a flexible vision loop.
 */

import { Page } from 'playwright'
import { reason, BrainDecision } from '../agent/brain.js'

export interface StepResult {
  action:  BrainDecision['action']
  target:  string
  value?:  string
  success: boolean
  error?:  string
}

export interface GoalResult {
  success:    boolean
  steps:      StepResult[]
  screenshot: Buffer
  error?:     string
}

// ── Low-level page actions ───────────────────────────────────────

export async function takeScreenshot(page: Page): Promise<Buffer> {
  return page.screenshot({ type: 'png', fullPage: false }) as Promise<Buffer>
}

/**
 * Click the most visible element matching the visual description.
 * Uses a combination of Playwright locators and JS evaluation.
 */
export async function click(page: Page, description: string): Promise<boolean> {
  // Ask Claude which selector to use based on the description
  // First try aria/text-based locators, then fall back to JS click
  const attempts = [
    () => page.locator(`text=${description}`).first().click({ timeout: 3000 }),
    () => page.getByRole('button', { name: new RegExp(description, 'i') }).first().click({ timeout: 3000 }),
    () => page.getByText(new RegExp(description, 'i')).first().click({ timeout: 3000 }),
  ]

  for (const attempt of attempts) {
    try {
      await attempt()
      await page.waitForTimeout(500)
      return true
    } catch {
      // try next
    }
  }

  // JS fallback: find visible element containing the description text
  const clicked = await page.evaluate((desc: string) => {
    const lower = desc.toLowerCase()
    const all   = Array.from(document.querySelectorAll('button, a, div, span, label')) as HTMLElement[]
    const match = all.find(el =>
      (el.textContent?.toLowerCase().includes(lower) ?? false) &&
      el.offsetParent !== null &&
      el.getBoundingClientRect().width > 0
    )
    if (match) { match.click(); return true }
    return false
  }, description)

  await page.waitForTimeout(500)
  return clicked
}

/** Type text into a visible input described naturally */
export async function typeText(page: Page, fieldDescription: string, text: string): Promise<boolean> {
  const attempts = [
    () => page.getByPlaceholder(new RegExp(fieldDescription, 'i')).first().fill(text),
    () => page.getByLabel(new RegExp(fieldDescription, 'i')).first().fill(text),
    () => page.locator('input:visible').first().fill(text),
  ]

  for (const attempt of attempts) {
    try {
      await attempt()
      await page.waitForTimeout(300)
      return true
    } catch {
      // try next
    }
  }
  return false
}

/** Scroll the page */
export async function scrollPage(page: Page, direction: 'up' | 'down') {
  await page.evaluate((dir: string) => {
    window.scrollBy(0, dir === 'down' ? 400 : -400)
  }, direction)
  await page.waitForTimeout(500)
}

// ── Vision loop ──────────────────────────────────────────────────

/**
 * Execute one vision step: screenshot → brain decision → action
 */
export async function visionStep(
  page:    Page,
  goal:    string,
  context: string = ''
): Promise<StepResult> {
  const screenshot = await takeScreenshot(page)
  const decision   = await reason(screenshot, goal, context)

  switch (decision.action) {
    case 'click': {
      const ok = await click(page, decision.target)
      await page.waitForTimeout(1500) // allow DOM to settle
      return { action: 'click', target: decision.target, success: ok }
    }
    case 'type': {
      const ok = await typeText(page, decision.target, decision.value ?? '')
      return { action: 'type', target: decision.target, value: decision.value, success: ok }
    }
    case 'scroll': {
      await scrollPage(page, decision.target.toLowerCase().includes('up') ? 'up' : 'down')
      return { action: 'scroll', target: decision.target, success: true }
    }
    case 'wait': {
      await page.waitForTimeout(2000)
      return { action: 'wait', target: decision.target, success: true }
    }
    case 'done': {
      return { action: 'done', target: decision.target, success: true }
    }
    case 'error': {
      return { action: 'error', target: decision.target, success: false, error: decision.target }
    }
    default:
      return { action: 'error', target: 'unknown action', success: false, error: 'Unknown action from brain' }
  }
}

/**
 * Run a vision-driven goal loop.
 * Loops until: brain says "done", brain says "error", or maxSteps reached.
 */
export async function runGoal(
  page:     Page,
  goal:     string,
  maxSteps: number = 20,
  context:  string = ''
): Promise<GoalResult> {
  const steps: StepResult[] = []

  for (let i = 0; i < maxSteps; i++) {
    console.log(`[navigator] Step ${i + 1}/${maxSteps} — ${goal}`)
    const result = await visionStep(page, goal, context)
    steps.push(result)

    if (result.action === 'done') {
      const screenshot = await takeScreenshot(page)
      return { success: true, steps, screenshot }
    }

    if (result.action === 'error') {
      const screenshot = await takeScreenshot(page)
      return { success: false, steps, screenshot, error: result.error }
    }

    // After each step wait for any navigation/animation
    await page.waitForTimeout(800)
  }

  const screenshot = await takeScreenshot(page)
  return {
    success:    false,
    steps,
    screenshot,
    error:      `Max steps (${maxSteps}) reached without completing goal`,
  }
}
