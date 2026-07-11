const INSFORGE_URL = Deno.env.get("INSFORGE_URL")
const INSFORGE_API_KEY = Deno.env.get("INSFORGE_API_KEY")

const ALLOWED_ORIGINS = [
  "https://www.savemali.online",
  "https://savemali.online",
  "https://savemali.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
]

function cors(origin: string | null): Record<string, string> {
  const a = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return { "Access-Control-Allow-Origin": a, "Access-Control-Allow-Methods": "POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type,Authorization" }
}

export default async function handler(req: Request): Promise<Response> {
  const h = cors(req.headers.get("origin"))
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h })
  if (req.method !== "POST") return new Response('{"error":"Method not allowed"}', { status: 405, headers: { ...h, "Content-Type": "application/json" } })
  if (!INSFORGE_URL || !INSFORGE_API_KEY) return new Response('{"error":"Server configuration error"}', { status: 500, headers: { ...h, "Content-Type": "application/json" } })

  try {
    const body = await req.json()
    const { email, password, name } = body

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email and password are required" }), { status: 400, headers: { ...h, "Content-Type": "application/json" } })
    }

    const res = await fetch(`${INSFORGE_URL}/api/auth/users`, {
      method: "POST",
      headers: {
        apikey: INSFORGE_API_KEY,
        Authorization: `Bearer ${INSFORGE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, name, email_confirm: true }),
    })

    const data = await res.json()

    if (!res.ok) {
      const msg = data?.msg || data?.message || data?.error_description || data?.error || `HTTP ${res.status}`
      return new Response(JSON.stringify({ error: msg }), { status: res.status, headers: { ...h, "Content-Type": "application/json" } })
    }

    const userId = data?.user?.id ?? data?.id ?? null
    if (!userId) {
      return new Response(JSON.stringify({ error: "Invalid response from auth server" }), { status: 502, headers: { ...h, "Content-Type": "application/json" } })
    }

    return new Response(JSON.stringify({ userId }), { status: 200, headers: { ...h, "Content-Type": "application/json" } })
  } catch (e) {
    console.error("[create-auth-user]", e)
    return new Response('{"error":"Internal server error"}', { status: 500, headers: { ...h, "Content-Type": "application/json" } })
  }
}
