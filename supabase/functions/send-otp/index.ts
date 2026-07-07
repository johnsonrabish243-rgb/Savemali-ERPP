/**
 * TextBee OTP Send Edge Function (InsForge)
 *
 * Receives a phone number and purpose, generates a 6-digit OTP,
 * stores it in the database, and sends it via TextBee SMS Gateway.
 *
 * Environment secrets (set via npx @insforge/cli secrets add):
 *   TEXTBEE_API_KEY   - Your TextBee API key
 *   TEXTBEE_DEVICE_ID - Your TextBee device ID
 *
 * Request body (JSON):
 *   { "phone": "+243XXXXXXXXX", "purpose": "login" }
 *
 * purposes: "login" | "register" | "password_reset" | "2fa"
 */

const ALLOWED_ORIGINS = [
  "https://savemali.vercel.app",
  "https://savemali.com",
  "http://localhost:5173",
  "http://localhost:3000",
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
    "Access-Control-Allow-Credentials": "true",
  };
}

function generateOTP(): string {
  const array = new Uint8Array(6);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b % 10).join("");
}

function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(phone);
}

const RESEND_WINDOW_MS = 60_000;
const MAX_RESENDS_PER_HOUR = 5;
const OTP_EXPIRY_MS = 1 * 60_000;
const MAX_ATTEMPTS = 5;

// Direct PostgREST helpers using InsForge API key
const DB_URL = "https://55h7r6yk.us-east.insforge.app/api/database/records";
const API_KEY = Deno.env.get("API_KEY")!;

async function dbQuery(table: string, params: string) {
  const res = await fetch(`${DB_URL}/${table}?${params}`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    console.error(`DB query non-JSON response for ${table}:`, text.substring(0, 200));
    return [];
  }
}

async function dbInsert(table: string, row: Record<string, unknown>) {
  const res = await fetch(`${DB_URL}/${table}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DB insert failed: ${err}`);
  }
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

async function dbUpsert(table: string, row: Record<string, unknown>, matchCol: string) {
  // Try update first
  const updateRes = await fetch(`${DB_URL}/${table}?${matchCol}=eq.${encodeURIComponent(String(row[matchCol]))}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(row),
  });
  if (updateRes.ok) {
    const text = await updateRes.text();
    // If 0 rows updated (empty response), insert instead
    if (text && text !== "") return;
  }
  // Insert (ignore duplicate key)
  const insertRes = await fetch(`${DB_URL}/${table}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(row),
  });
  if (!insertRes.ok) {
    const err = await insertRes.text();
    // Ignore duplicate key errors
    if (!err.includes("23505")) {
      console.error(`DB upsert error on ${table}:`, err);
    }
  }
}

export default async function (req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: getCorsHeaders(req) });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const { phone, purpose = "login" } = await req.json();

    if (!phone) {
      return new Response(
        JSON.stringify({ error: "Phone number is required" }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    if (!isValidE164(phone)) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number format. Use E.164: +243XXXXXXXXX" }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const validPurposes = ["login", "register", "password_reset", "2fa"];
    if (!validPurposes.includes(purpose)) {
      return new Response(
        JSON.stringify({ error: `Invalid purpose. Must be: ${validPurposes.join(", ")}` }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const textbeeApiKey = Deno.env.get("TEXTBEE_API_KEY");
    const deviceId = Deno.env.get("TEXTBEE_DEVICE_ID");

    if (!textbeeApiKey || !deviceId) {
      console.error("TEXTBEE_API_KEY or TEXTBEE_DEVICE_ID not set");
      return new Response(
        JSON.stringify({ error: "SMS service not configured" }),
        { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // --- Rate Limiting ---
    const rateLimitData = await dbQuery(
      "otp_rate_limits",
      `phone_number=eq.${encodeURIComponent(phone)}&select=*`
    );
    const rateLimit = Array.isArray(rateLimitData) ? rateLimitData[0] : null;

    const now = new Date();

    if (rateLimit?.blocked_until && new Date(rateLimit.blocked_until) > now) {
      const remainingMin = Math.ceil(
        (new Date(rateLimit.blocked_until).getTime() - now.getTime()) / 60_000
      );
      return new Response(
        JSON.stringify({ error: `Too many attempts. Try again in ${remainingMin} min.` }),
        { status: 429, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    if (rateLimit?.last_sent_at) {
      const elapsed = now.getTime() - new Date(rateLimit.last_sent_at).getTime();
      if (elapsed < RESEND_WINDOW_MS) {
        const wait = Math.ceil((RESEND_WINDOW_MS - elapsed) / 1000);
        return new Response(
          JSON.stringify({ error: `Wait ${wait}s before requesting a new code.` }),
          { status: 429, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
        );
      }
    }

    if (rateLimit?.resend_count >= MAX_RESENDS_PER_HOUR) {
      const blockedUntil = new Date(now.getTime() + 3600_000).toISOString();
      await dbUpdate(
        "otp_rate_limits",
        `phone_number=eq.${encodeURIComponent(phone)}`,
        { blocked_until: blockedUntil }
      );
      return new Response(
        JSON.stringify({ error: "Max resend limit reached. Blocked for 1 hour." }),
        { status: 429, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // Invalidate existing OTPs for this phone + purpose
    await dbUpdate(
      "otp_codes",
      `phone_number=eq.${encodeURIComponent(phone)}&purpose=eq.${purpose}&used=eq.false`,
      { used: true }
    );

    // Generate and store OTP
    const otpCode = generateOTP();
    const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MS).toISOString();

    await dbInsert("otp_codes", {
      phone_number: phone,
      code: otpCode,
      purpose,
      attempts: 0,
      max_attempts: MAX_ATTEMPTS,
      used: false,
      expires_at: expiresAt,
    });

    // Update rate limit
    const newCount =
      rateLimit?.last_sent_at && now.getTime() - new Date(rateLimit.last_sent_at).getTime() > 3600_000
        ? 1
        : (rateLimit?.resend_count ?? 0) + 1;

    await dbUpsert(
      "otp_rate_limits",
      {
        phone_number: phone,
        resend_count: newCount,
        last_sent_at: now.toISOString(),
        blocked_until: null,
      },
      "phone_number"
    );

    // Send SMS via TextBee
    const purposeLabels: Record<string, string> = {
      login: "connexion",
      register: "inscription",
      password_reset: "r\u00e9initialisation du mot de passe",
      "2fa": "authentification \u00e0 deux facteurs",
    };

    const smsBody = `Cher client,\n\nSavemali vous remercie pour votre confiance.\n\nVoici votre code de vérification pour la ${purposeLabels[purpose] ?? purpose} :\n\n${otpCode}\n\nCe code est valable pendant 1 minute. Veuillez ne le communiquer à personne.\n\nSi vous n'avez pas effectué cette demande, veuillez ignorer ce message.\n\nCordialement,\nL'équipe Savemali`;

    const textbeeRes = await fetch(
      `https://api.textbee.dev/api/v1/gateway/devices/${deviceId}/send-sms`,
      {
        method: "POST",
        headers: {
          "x-api-key": textbeeApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recipients: [phone], message: smsBody }),
      }
    );

    const textbeeResult = await textbeeRes.json();

    if (!textbeeRes.ok || textbeeResult.success === false) {
      console.error("TextBee error:", textbeeResult);
      const errMsg = textbeeResult.error || "Failed to send SMS";
      if (errMsg.toLowerCase().includes("invalid recipients")) {
        return new Response(
          JSON.stringify({ error: "Numéro de téléphone invalide ou appareil hors ligne. Vérifiez le numéro et réessayez." }),
          { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
        );
      }
      if (textbeeRes.status === 401) {
        return new Response(
          JSON.stringify({ error: "SMS service authentication failed" }),
          { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
        );
      }
      if (textbeeRes.status === 404) {
        return new Response(
          JSON.stringify({ error: "SMS device not found or offline" }),
          { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "Failed to send SMS. Try again." }),
        { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Verification code sent",
        expiresIn: OTP_EXPIRY_MS / 1000,
      }),
      { status: 200, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Send OTP error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
}
