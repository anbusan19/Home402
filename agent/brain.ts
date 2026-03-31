/**
 * agent/brain.ts
 *
 * Vision reasoning engine for Casa — powered by Groq (llama-3.2-vision).
 * Takes a screenshot of the current browser state and returns a structured action decision.
 *
 * Used by browser/navigator.ts to drive Playwright without hard-coded selectors.
 */

import OpenAI from 'openai'

const client = new OpenAI({
  apiKey:  process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
})

const MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'

export interface BrainDecision {
  action: 'click' | 'type' | 'scroll' | 'wait' | 'done' | 'error'
  /** Natural language description of WHERE to click / WHAT to type / direction to scroll */
  target: string
  /** For 'type' action: the text to enter */
  value?: string
  /** Reasoning for this decision */
  reasoning: string
}

const SYSTEM_PROMPT = `You are the navigation brain of Casa, an autonomous home commerce agent.
You receive a screenshot of a mobile browser (390×844 viewport, Indian e-commerce apps).
Your job: decide the NEXT SINGLE action to take to achieve the given goal.

Respond ONLY with valid JSON matching this schema:
{
  "action": "click" | "type" | "scroll" | "wait" | "done" | "error",
  "target": "<description of element to interact with, or scroll direction (up/down), or error message>",
  "value": "<text to type (only for action=type)>",
  "reasoning": "<one sentence explaining why>"
}

Rules:
- "click": target = visual description of the element (e.g. "ADD button next to Amul Milk 500ml")
- "type": target = description of the input field, value = exact text to type
- "scroll": target = "down" or "up"
- "wait": target = "page to load" (use when page is loading/transitioning)
- "done": target = "goal achieved" (use when the goal is fully completed)
- "error": target = description of what went wrong (use when goal is impossible)
- Be specific about what you see — use product names, button labels, prices visible on screen
- If you see a login screen when not expected, use action="error" with target="session expired"
- Do NOT describe multiple actions — only the single next action`

/**
 * Ask the vision model to decide the next browser action given a screenshot and goal.
 */
export async function reason(
  screenshot: Buffer,
  goal: string,
  context: string = ''
): Promise<BrainDecision> {
  const b64 = screenshot.toString('base64')

  const response = await client.chat.completions.create({
    model:      MODEL,
    max_tokens: 300,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:image/png;base64,${b64}` },
          },
          {
            type: 'text',
            text: `Goal: ${goal}${context ? `\nContext: ${context}` : ''}\n\nWhat is the next single action?`,
          },
        ],
      },
    ],
  })

  const text = response.choices[0]?.message?.content?.trim() ?? ''

  // Extract JSON from response (handle markdown code fences)
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return {
      action:    'error',
      target:    'Model returned non-JSON response',
      reasoning: text.slice(0, 200),
    }
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as BrainDecision
    console.log(`[brain] ${parsed.action.toUpperCase()} → ${parsed.target}${parsed.value ? ` = "${parsed.value}"` : ''} | ${parsed.reasoning}`)
    return parsed
  } catch {
    return {
      action:    'error',
      target:    'Failed to parse model response as JSON',
      reasoning: text.slice(0, 200),
    }
  }
}

// ── Natural language intent parser ───────────────────────────────────

export interface NLIntent {
  /** What the user wants to do */
  intent: 'order' | 'search' | 'budget' | 'cancel' | 'unknown'
  /** Items to order or search for (already cleaned up, e.g. "Hocco ice cream sandwich") */
  items: string[]
  /** Brand or store hint extracted from the message, if any (e.g. "hocco", "amul") */
  brand?: string
  /** Platform hint if user mentions one (zepto / blinkit / swiggy) */
  platform?: string
  /** A short reply to send the user before acting, e.g. "Sure, ordering Hocco ice cream sandwich!" */
  reply: string
}

const NL_SYSTEM = `You are the intent parser for Casa, an autonomous home-shopping agent in India.
The user sends casual messages via Telegram. Extract their intent and the items they want.

Respond ONLY with valid JSON:
{
  "intent": "order" | "search" | "budget" | "cancel" | "unknown",
  "items": ["<cleaned item name including brand if mentioned>"],
  "brand": "<brand name if explicitly mentioned, else omit>",
  "platform": "<zepto|blinkit|swiggy if mentioned, else omit>",
  "reply": "<friendly one-line confirmation you will say before acting>"
}

Rules:
- "order" if the user clearly wants to buy/order something
- "search" if they want to find/check products without ordering
- "budget" if they ask about spending limits or remaining budget
- "cancel" if they want to stop/cancel
- "unknown" if you genuinely cannot tell
- items: always include the brand in the item string (e.g. "Hocco ice cream sandwich", not just "ice cream sandwich")
- reply: be concise and friendly, confirm what you understood`

export async function parseNaturalLanguage(message: string): Promise<NLIntent> {
  const response = await client.chat.completions.create({
    model:      MODEL,
    max_tokens: 300,
    messages: [
      { role: 'system', content: NL_SYSTEM },
      { role: 'user',   content: message },
    ],
  })

  const text      = response.choices[0]?.message?.content?.trim() ?? ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return { intent: 'unknown', items: [], reply: "Sorry, I didn't understand that. Try /order <item> or /search <query>." }
  }

  try {
    return JSON.parse(jsonMatch[0]) as NLIntent
  } catch {
    return { intent: 'unknown', items: [], reply: "Sorry, I couldn't parse that. Try /order <item>." }
  }
}

/**
 * Detect a platform wallet balance from a checkout screenshot.
 * Returns parsed balance in INR.
 */
export async function detectWalletBalance(screenshot: Buffer): Promise<{
  found: boolean
  walletType?: string
  balanceINR?: number
  reasoning: string
}> {
  const b64 = screenshot.toString('base64')

  const response = await client.chat.completions.create({
    model:      MODEL,
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: { url: `data:image/png;base64,${b64}` },
        },
        {
          type: 'text',
          text: `This is a checkout page of an Indian e-commerce app.
Look for a platform wallet option (e.g. "Zepto Cash", "Amazon Pay", "Blinkit Credits") and its balance.
Respond ONLY with JSON:
{ "found": true/false, "walletType": "zepto_cash|amazon_pay|blinkit_credits|other", "balanceINR": <number or null>, "reasoning": "<one sentence>" }`,
        },
      ],
    }],
  })

  const text = response.choices[0]?.message?.content?.trim() ?? ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return { found: false, reasoning: 'No JSON in response' }

  try {
    return JSON.parse(jsonMatch[0])
  } catch {
    return { found: false, reasoning: 'Failed to parse response' }
  }
}
