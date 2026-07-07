import nodemailer from "npm:nodemailer@6.9.16";

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
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
  };
}

// ── Input Validation & Sanitization ──

const MAX_NAME = 100;
const MAX_EMAIL = 254;
const MAX_PHONE = 20;
const MAX_ADDRESS = 200;
const MAX_MESSAGE = 2000;

function sanitize(input: string, max: number): string {
  return input
    .trim()
    .slice(0, max)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "");
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= MAX_EMAIL;
}

function isValidPhone(phone: string): boolean {
  if (!phone) return true; // optional
  return /^\+?[0-9\s\-()]{7,20}$/.test(phone);
}

const INJECTION_PATTERNS = [
  /(?:union\s+select|insert\s+into|drop\s+table|delete\s+from)/i,
  /<script[\s>]/i,
  /javascript\s*:/i,
  /on\w+\s*=\s*['"]/i,
  /(\b)(or|and)(\b)\s+[\d'"]/i,
];

function hasInjection(input: string): boolean {
  return INJECTION_PATTERNS.some((p) => p.test(input));
}

// ── Rate Limiting (in-memory per cold start) ──

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - record.count };
}

// ── Email Generation (randomized text) ──

function getGreeting(): string {
  const greetings = [
    "Bonjour",
    "Bien reçu",
    "Nouvelle demande",
    "Demande reçue",
    "Nouveau message",
  ];
  return greetings[Math.floor(Math.random() * greetings.length)];
}

function getIntro(): string {
  const intros = [
    "Une nouvelle demande de rendez-vous a été soumise via le formulaire de contact de l'application SaveMali.",
    "Un utilisateur a soumis une demande via le formulaire de contact de SaveMali. Voici les détails :",
    "Le formulaire de contact de SaveMali a reçu une nouvelle soumission. Les informations du demandeur sont les suivantes :",
    "Ci-dessous les informations d'un utilisateur ayant pris contact via le formulaire de SaveMali.",
  ];
  return intros[Math.floor(Math.random() * intros.length)];
}

function getClosing(): string {
  const closings = [
    "Merci de traiter cette demande dans les meilleurs délais.",
    "Nous vous invitons à répondre dans les plus brefs délais.",
    "Merci de prendre en charge cette demande.",
    "N'hésitez pas à revenir vers l'utilisateur rapidement.",
  ];
  return closings[Math.floor(Math.random() * closings.length)];
}

function generateContactEmailHtml(data: {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  message: string;
  date: string;
  time: string;
}): string {
  const { name, email, phone, address, message, date, time } = data;

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f0f2f5;">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;">
  <!-- Logo -->
  <tr><td align="center" style="padding-bottom:24px;">
    <img src="https://55h7r6yk.us-east.insforge.app/api/storage/buckets/avatars/objects/avatars%2Fsave-mali-logo%2Flogo.png?v=3a37ba1efd147a36099514335c3f374a" alt="SaveMali" width="56" height="56" style="border-radius:12px;box-shadow:0 4px 12px rgba(200,57,156,0.12);">
  </td></tr>
  <!-- Card -->
  <tr><td style="background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
    <div style="height:4px;background:linear-gradient(90deg,#c8399c,#d94fb0,#e87bc4);"></div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <!-- Header -->
    <tr><td style="padding:40px 40px 8px;">
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">&#128233; ${getGreeting()}</h1>
      <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.6;">${getIntro()}</p>
    </td></tr>
    <!-- Info Table -->
    <tr><td style="padding:24px 40px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #f3f4f6;border-radius:12px;overflow:hidden;">
        <tr style="background:#f9fafb;">
          <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#374151;width:140px;">Nom complet</td>
          <td style="padding:12px 16px;font-size:13px;color:#111827;">${name}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#374151;border-top:1px solid #f3f4f6;">Email</td>
          <td style="padding:12px 16px;font-size:13px;color:#111827;border-top:1px solid #f3f4f6;"><a href="mailto:${email}" style="color:#c8399c;text-decoration:none;">${email}</a></td>
        </tr>
        ${phone ? `<tr style="background:#f9fafb;">
          <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#374151;border-top:1px solid #f3f4f6;">WhatsApp</td>
          <td style="padding:12px 16px;font-size:13px;color:#111827;border-top:1px solid #f3f4f6;"><a href="tel:${phone}" style="color:#c8399c;text-decoration:none;">${phone}</a></td>
        </tr>` : ""}
        ${address ? `<tr${phone ? "" : ' style="background:#f9fafb;"'}>
          <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#374151;border-top:1px solid #f3f4f6;">Adresse</td>
          <td style="padding:12px 16px;font-size:13px;color:#111827;border-top:1px solid #f3f4f6;">${address}</td>
        </tr>` : ""}
      </table>
    </td></tr>
    <!-- Message -->
    <tr><td style="padding:0 40px 24px;">
      <div style="background:#fdf2f8;border-radius:12px;padding:20px;border:1px solid #fce7f3;">
        <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#9d174d;text-transform:uppercase;letter-spacing:0.5px;">Message</p>
        <p style="margin:0;font-size:14px;color:#111827;line-height:1.7;white-space:pre-wrap;">${message}</p>
      </div>
    </td></tr>
    <!-- Date/Time -->
    <tr><td style="padding:0 40px 24px;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">&#128197; Reçue le ${date} à ${time} (heure de Kalemie)</p>
    </td></tr>
    <!-- Closing -->
    <tr><td style="padding:0 40px 32px;">
      <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">${getClosing()}</p>
    </td></tr>
    </table>
  </td></tr>
  <!-- Footer -->
  <tr><td style="padding:24px 40px 0;text-align:center;">
    <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;">&#169; ${new Date().getFullYear()} SaveMali SARL — Kalemie, Tanganyika, RDC</p>
    <p style="margin:0;font-size:10px;color:#d1d5db;">Email automatique — ne pas répondre directement</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

// ── SMTP ──

async function sendEmail(to: string, subject: string, html: string): Promise<{ success: boolean; error?: string }> {
  const smtpHost = Deno.env.get("SMTP_HOST") || "smtp.zoho.com";
  const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "587");
  const smtpUser = Deno.env.get("SMTP_USER") || "";
  const smtpPass = Deno.env.get("SMTP_PASSWORD") || "";
  const senderName = Deno.env.get("SMTP_SENDER_NAME") || "SaveMali";

  if (!smtpUser || !smtpPass) {
    return { success: false, error: "SMTP credentials not configured" };
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });

  await transporter.sendMail({
    from: `"${senderName}" <${smtpUser}>`,
    to,
    subject,
    html,
  });

  return { success: true };
}

// ── Main Handler ──

export default async function (req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }

  const cors = getCorsHeaders(req);

  try {
    const body = await req.json();
    const { name, email, phone, address, message } = body;

    // ── Validate required fields ──
    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: "Missing required fields: name, email, message" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ── Sanitize all inputs ──
    const cleanName = sanitize(String(name), MAX_NAME);
    const cleanEmail = sanitize(String(email), MAX_EMAIL).toLowerCase();
    const cleanPhone = phone ? sanitize(String(phone), MAX_PHONE) : "";
    const cleanAddress = address ? sanitize(String(address), MAX_ADDRESS) : "";
    const cleanMessage = sanitize(String(message), MAX_MESSAGE);

    // ── Validate formats ──
    if (!cleanName || cleanName.length < 2) {
      return new Response(JSON.stringify({ error: "Name must be at least 2 characters" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (!isValidEmail(cleanEmail)) {
      return new Response(JSON.stringify({ error: "Invalid email address" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (cleanPhone && !isValidPhone(cleanPhone)) {
      return new Response(JSON.stringify({ error: "Invalid phone number" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (!cleanMessage || cleanMessage.length < 10) {
      return new Response(JSON.stringify({ error: "Message must be at least 10 characters" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ── Injection check ──
    const allInput = `${cleanName} ${cleanEmail} ${cleanPhone} ${cleanAddress} ${cleanMessage}`;
    if (hasInjection(allInput)) {
      return new Response(JSON.stringify({ error: "Invalid input detected" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ── Rate limit by IP ──
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = checkRateLimit(clientIp);
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ── Generate and send email ──
    const now = new Date();
    const dateStr = now.toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const timeStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    const subject = `Nouvelle demande de rendez-vous — ${cleanName}`;
    const html = generateContactEmailHtml({
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone || undefined,
      address: cleanAddress || undefined,
      message: cleanMessage,
      date: dateStr,
      time: timeStr,
    });

    const result = await sendEmail("savemali243@gmail.com", subject, html);

    if (!result.success) {
      console.error("Contact email send failed:", result.error);
      return new Response(JSON.stringify({ error: "Failed to send message. Please try again." }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Message sent successfully",
      remaining: rl.remaining,
    }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Contact form error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
}
