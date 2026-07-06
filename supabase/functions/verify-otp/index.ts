/**
 * TextBee OTP Verify Edge Function (InsForge)
 *
 * Verifies a 6-digit OTP code against the stored record.
 * Enforces expiry, single-use, and max attempts.
 *
 * Request body (JSON):
 *   { "phone": "+243XXXXXXXXX", "code": "123456", "purpose": "login" }
 */

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

const DB_URL = "https://55h7r6yk.us-east.insforge.app/api/database/records";
const API_KEY = Deno.env.get("API_KEY")!;

async function dbQuery(table: string, params: string) {
  const res = await fetch(`${DB_URL}/${table}?${params}`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
  });
  return res.json();
}

async function dbUpdate(table: string, match: string, body: Record<string, unknown>) {
  const res = await fetch(`${DB_URL}/${table}?${match}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`DB update error on ${table}:`, err);
  }
}

async function dbDelete(table: string, match: string) {
  const res = await fetch(`${DB_URL}/${table}?${match}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
    },
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`DB delete error on ${table}:`, err);
  }
}

export default async function (req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { phone, code, purpose = "login" } = await req.json();

    if (!phone || !code) {
      return new Response(
        JSON.stringify({ error: "Phone number and code are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!/^\d{6}$/.test(code)) {
      return new Response(
        JSON.stringify({ error: "Invalid code format. Must be 6 digits." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find most recent unused OTP
    const otpData = await dbQuery(
      "otp_codes",
      `phone_number=eq.${encodeURIComponent(phone)}&purpose=eq.${purpose}&used=eq.false&order=created_at.desc&limit=1&select=*`
    );
    const otpRecord = Array.isArray(otpData) ? otpData[0] : null;

    if (!otpRecord) {
      return new Response(
        JSON.stringify({ error: "No verification code found. Request a new one." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiry
    if (new Date(otpRecord.expires_at) < new Date()) {
      await dbUpdate("otp_codes", `id=eq.${otpRecord.id}`, { used: true });
      return new Response(
        JSON.stringify({ error: "Code expired. Request a new one." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check max attempts
    if (otpRecord.attempts >= otpRecord.max_attempts) {
      await dbUpdate("otp_codes", `id=eq.${otpRecord.id}`, { used: true });
      return new Response(
        JSON.stringify({ error: "Max attempts exceeded. Request a new code." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Increment attempts
    await dbUpdate("otp_codes", `id=eq.${otpRecord.id}`, {
      attempts: otpRecord.attempts + 1,
    });

    // Constant-time comparison
    const expectedBytes = new TextEncoder().encode(otpRecord.code);
    const providedBytes = new TextEncoder().encode(code);

    if (expectedBytes.length !== providedBytes.length) {
      const remaining = otpRecord.max_attempts - (otpRecord.attempts + 1);
      return new Response(
        JSON.stringify({ error: "Invalid code", attemptsRemaining: Math.max(0, remaining) }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let mismatch = 0;
    for (let i = 0; i < expectedBytes.length; i++) {
      mismatch |= expectedBytes[i] ^ providedBytes[i];
    }

    if (mismatch !== 0) {
      const remaining = otpRecord.max_attempts - (otpRecord.attempts + 1);
      return new Response(
        JSON.stringify({ error: "Invalid code", attemptsRemaining: Math.max(0, remaining) }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark as used
    await dbUpdate("otp_codes", `id=eq.${otpRecord.id}`, { used: true });

    // Reset rate limit
    await dbDelete("otp_rate_limits", `phone_number=eq.${encodeURIComponent(phone)}`);

    return new Response(
      JSON.stringify({ success: true, message: "Verification successful", purpose }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Verify OTP error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}
