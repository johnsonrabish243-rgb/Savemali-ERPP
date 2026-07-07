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

// ── Logo cache (loaded once at cold start) ──

const LOGO_URL = "https://55h7r6yk.us-east.insforge.app/api/storage/buckets/avatars/objects/avatars%2Fsave-mali-logo%2Flogo.png?v=3a37ba1efd147a36099514335c3f374a";
let logoBuffer: Buffer | null = null;
let logoLoaded = false;

async function loadLogo(): Promise<Buffer | null> {
  if (logoLoaded) return logoBuffer;
  logoLoaded = true;
  try {
    const res = await fetch(LOGO_URL);
    if (!res.ok) return null;
    const arrayBuf = await res.arrayBuffer();
    logoBuffer = Buffer.from(arrayBuf);
    return logoBuffer;
  } catch {
    return null;
  }
}

// ── Input Validation ──

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
    .replace(/<script[\s>]/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/on\w+\s*=\s*['"]/gi, "");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function nl2br(str: string): string {
  return escapeHtml(str).replace(/\n/g, "<br>").replace(/\r\n/g, "<br>").replace(/\r/g, "<br>");
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= MAX_EMAIL;
}

function isValidPhone(phone: string): boolean {
  if (!phone) return true;
  return /^\+?[0-9\s\-()]{7,20}$/.test(phone);
}

// ── Rate Limiting (in-memory per cold start) ──

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

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

// ── Email HTML (professional template, email-client compatible) ──

function generateContactEmailHtml(data: {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  message: string;
  date: string;
  time: string;
  hasLogo: boolean;
}): string {
  const { name, email, phone, address, message, date, time, hasLogo } = data;
  const messageHtml = nl2br(message);
  const year = new Date().getFullYear();

  const logoImg = hasLogo
    ? `<img src="cid:save-mali-logo" alt="SaveMali" width="56" height="56" style="display:block;border-radius:12px;border:0;outline:none;text-decoration:none;">`
    : `<img src="${LOGO_URL}" alt="SaveMali" width="56" height="56" style="display:block;border-radius:12px;border:0;outline:none;text-decoration:none;">`;

  return `<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>SaveMali — Nouvelle demande de rendez-vous</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; -ms-interpolation-mode: bicubic; outline: none; text-decoration: none; }
    a { color: #c8399c; text-decoration: none; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .fluid { max-width: 100% !important; height: auto !important; }
      .stack-column { display: block !important; width: 100% !important; }
      .center-on-narrow { text-align: center !important; display: block !important; margin-left: auto !important; margin-right: auto !important; float: none !important; }
      .padding-mobile { padding-left: 20px !important; padding-right: 20px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;width:100% !important;">

<!-- Preheader (hidden text for inbox preview) -->
<div style="display:none;font-size:1px;color:#f0f2f5;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
  Nouvelle demande de rendez-vous de ${escapeHtml(name)} — SaveMali
</div>

<!-- Background -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f0f2f5;">
  <tr>
    <td align="center" style="padding:40px 10px;">

      <!-- Container 600px -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="email-container" style="max-width:600px;margin:0 auto;">

        <!-- LOGO -->
        <tr>
          <td align="center" style="padding:0 0 24px 0;">
            ${logoImg}
          </td>
        </tr>

        <!-- CARD -->
        <tr>
          <td style="background-color:#ffffff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.04);">

            <!-- Brand bar -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td style="height:4px;background:linear-gradient(90deg,#c8399c,#d94fb0,#e87bc4);font-size:0;line-height:0;">&nbsp;</td>
              </tr>
            </table>

            <!-- Header -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td style="padding:40px 40px 8px 40px;" class="padding-mobile">
                  <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;line-height:1.3;">
                    &#128233; Nouvelle demande de rendez-vous
                  </h1>
                  <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.6;">
                    Un utilisateur a soumis une demande via le formulaire de contact de SaveMali.
                  </p>
                </td>
              </tr>
            </table>

            <!-- Info table -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="padding:24px 40px;" class="padding-mobile">
              <tr>
                <td style="padding:0 0 0 40px;" class="padding-mobile">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border:1px solid #f3f4f6;border-radius:12px;overflow:hidden;">
                    <tr style="background-color:#f9fafb;">
                      <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#374151;width:140px;border:0;">Nom complet</td>
                      <td style="padding:12px 16px;font-size:13px;color:#111827;border:0;">${escapeHtml(name)}</td>
                    </tr>
                    <tr>
                      <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#374151;border-top:1px solid #f3f4f6;border:0;border-top:1px solid #f3f4f6;">Email</td>
                      <td style="padding:12px 16px;font-size:13px;color:#111827;border:0;border-top:1px solid #f3f4f6;">
                        <a href="mailto:${escapeHtml(email)}" style="color:#c8399c;text-decoration:none;">${escapeHtml(email)}</a>
                      </td>
                    </tr>
                    ${phone ? `<tr style="background-color:#f9fafb;">
                      <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#374151;border:0;border-top:1px solid #f3f4f6;">WhatsApp</td>
                      <td style="padding:12px 16px;font-size:13px;color:#111827;border:0;border-top:1px solid #f3f4f6;">
                        <a href="tel:${escapeHtml(phone)}" style="color:#c8399c;text-decoration:none;">${escapeHtml(phone)}</a>
                      </td>
                    </tr>` : ""}
                    ${address ? `<tr${phone ? "" : ' style="background-color:#f9fafb;"'}>
                      <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#374151;border:0;border-top:1px solid #f3f4f6;">Adresse</td>
                      <td style="padding:12px 16px;font-size:13px;color:#111827;border:0;border-top:1px solid #f3f4f6;">${escapeHtml(address)}</td>
                    </tr>` : ""}
                  </table>
                </td>
              </tr>
            </table>

            <!-- Message -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td style="padding:0 40px 24px 40px;" class="padding-mobile">
                  <div style="background-color:#fdf2f8;border-radius:12px;padding:20px;border:1px solid #fce7f3;">
                    <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#9d174d;text-transform:uppercase;letter-spacing:0.5px;">Message</p>
                    <div style="margin:0;font-size:14px;color:#111827;line-height:1.7;">${messageHtml}</div>
                  </div>
                </td>
              </tr>
            </table>

            <!-- Date/Time -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td style="padding:0 40px 16px 40px;" class="padding-mobile">
                  <p style="margin:0;font-size:12px;color:#9ca3af;">
                    &#128197; Reçue le ${escapeHtml(date)} à ${escapeHtml(time)} (heure de Kalemie)
                  </p>
                </td>
              </tr>
            </table>

            <!-- Closing -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td style="padding:0 40px 32px 40px;" class="padding-mobile">
                  <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">
                    Merci de traiter cette demande dans les meilleurs délais.
                  </p>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px 0 40px;text-align:center;" class="padding-mobile">
            <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;">
              &#169; ${year} SaveMali SARL — Kalemie, Tanganyika, RDC
            </p>
            <p style="margin:0 0 4px;font-size:10px;color:#d1d5db;">
              D&eacute;velopp&eacute; par John Mocket
            </p>
            <p style="margin:0;font-size:10px;color:#d1d5db;">
              Email automatique — ne pas r&eacute;pondre directement
            </p>
          </td>
        </tr>

      </table>
      <!-- /Container -->

    </td>
  </tr>
</table>

</body>
</html>`;
}

// ── Plain text fallback ──

function generatePlainText(data: {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  message: string;
  date: string;
  time: string;
}): string {
  const { name, email, phone, address, message, date, time } = data;
  const lines = [
    `NOUVELLE DEMANDE DE RENDEZ-VOUS`,
    `${"=".repeat(40)}`,
    ``,
    `Nom complet : ${name}`,
    `Email : ${email}`,
  ];
  if (phone) lines.push(`WhatsApp : ${phone}`);
  if (address) lines.push(`Adresse : ${address}`);
  lines.push(
    ``,
    `Message :`,
    `${message}`,
    ``,
    `${"─".repeat(40)}`,
    `Reçue le ${date} à ${time} (heure de Kalemie)`,
    ``,
    `SaveMali SARL — Kalemie, Tanganyika, RDC`,
    `Développé par John Mocket`,
    `Email automatique — ne pas répondre directement`,
  );
  return lines.join("\n");
}

// ── SMTP (optimized for deliverability) ──

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text: string,
  logo: Buffer | null,
): Promise<{ success: boolean; error?: string }> {
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
    tls: { rejectUnauthorized: true },
  });

  const attachments = logo
    ? [{
        filename: "save-mali-logo.png",
        content: logo,
        contentType: "image/png",
        cid: "save-mali-logo",
      }]
    : [];

  const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@contact.savemali.com>`;

  await transporter.sendMail({
    from: `"${senderName}" <${smtpUser}>`,
    to,
    replyTo: `"${senderName} Support" <${smtpUser}>`,
    sender: smtpUser,
    subject,
    html,
    text,
    attachments,
    messageId,
    headers: {
      "X-Mailer": "SaveMali-ContactForm/2.0",
      "X-Priority": "3",
      "X-MSMail-Priority": "Normal",
      "Precedence": "bulk",
      "List-Unsubscribe": `<mailto:${smtpUser}?subject=unsubscribe&body=Pour%20vous%20d%C3%A9sabonner%2C%20merci%20de%20contacter%20l%27%C3%A9quipe%20SaveMali>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      "X-Auto-Response-Suppress": "All",
      "Auto-Submitted": "auto-generated",
      "Feedback-ID": `contact-form:${Date.now()}:savemali`,
    },
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

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: "Missing required fields: name, email, message" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const cleanName = sanitize(String(name), MAX_NAME);
    const cleanEmail = sanitize(String(email), MAX_EMAIL).toLowerCase();
    const cleanPhone = phone ? sanitize(String(phone), MAX_PHONE) : "";
    const cleanAddress = address ? sanitize(String(address), MAX_ADDRESS) : "";
    const cleanMessage = sanitize(String(message), MAX_MESSAGE);

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

    const allInput = `${cleanName} ${cleanEmail} ${cleanPhone} ${cleanAddress} ${cleanMessage}`;
    if (/(?:union\s+select|insert\s+into|drop\s+table|delete\s+from)/i.test(allInput)) {
      return new Response(JSON.stringify({ error: "Invalid input detected" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = checkRateLimit(clientIp);
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: "Trop de demandes. Réessayez plus tard." }), {
        status: 429,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const logo = await loadLogo();

    const now = new Date();
    const dateStr = now.toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const timeStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    const emailData = {
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone || undefined,
      address: cleanAddress || undefined,
      message: cleanMessage,
      date: dateStr,
      time: timeStr,
    };

    const subject = `Nouvelle demande de rendez-vous — ${cleanName}`;
    const html = generateContactEmailHtml({ ...emailData, hasLogo: !!logo });
    const text = generatePlainText(emailData);

    const result = await sendEmail("savemali243@gmail.com", subject, html, text, logo);

    if (!result.success) {
      console.error("Contact email send failed:", result.error);
      return new Response(JSON.stringify({ error: "Échec de l'envoi. Réessayez." }), {
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
    return new Response(JSON.stringify({ error: "Erreur interne du serveur" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
}
