const AGENT_URL = process.env.AGENT_URL ?? 'http://localhost:3001'

export async function GET() {
  try {
    const res = await fetch(`${AGENT_URL}/api/health`, { signal: AbortSignal.timeout(3000) })
    const data = await res.json()
    return Response.json(data, { status: res.status })
  } catch {
    return Response.json({ ok: false }, { status: 503 })
  }
}
