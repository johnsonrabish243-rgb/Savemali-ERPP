const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")
const LOGO_URL = "https://www.savemali.online/SaveMali_Logo.png"
const ALLOWED_ORIGINS = [
  "https://www.savemali.online",
  "https://savemali.online",
  "https://savemali.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
]

const rateLimitStore = new Map<string, { count: number; resetAt: number }>()
const MAX_CODE_REQUESTS = 4
const BLOCK_DURATION_MS = 24 * 60 * 60 * 1000

function getRateLimitKey(email: string): string {
  return email.toLowerCase().trim()
}

function checkRateLimit(email: string): { allowed: boolean; remainingTime?: number } {
  const key = getRateLimitKey(email)
  const now = Date.now()
  const record = rateLimitStore.get(key)
  if (!record) return { allowed: true }
  if (now > record.resetAt) { rateLimitStore.delete(key); return { allowed: true } }
  if (record.count >= MAX_CODE_REQUESTS) {
    return { allowed: false, remainingTime: Math.ceil((record.resetAt - now) / 1000 / 60) }
  }
  return { allowed: true }
}

function incrementRateLimit(email: string): void {
  const key = getRateLimitKey(email)
  const now = Date.now()
  const record = rateLimitStore.get(key)
  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + BLOCK_DURATION_MS })
  } else {
    record.count++
  }
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  }
}

function wrap(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,date=no,address=no,email=no">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${title}</title>
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
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; min-width: 100% !important; }
    @media screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 0 16px !important; }
      .header { padding: 32px 24px !important; }
      .content { padding: 32px 24px !important; }
      .footer { padding: 24px 24px !important; }
      .code-cell { width: 40px !important; height: 48px !important; font-size: 20px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f0f0f3;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f0f3;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="500" align="center"><tr><td><![endif]-->
        <table role="presentation" class="container" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:500px;background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06),0 1px 2px rgba(0,0,0,0.04);">
          <!-- HEADER -->
          <tr>
            <td class="header" style="background:linear-gradient(135deg,#7c3aed 0%,#a855f7 35%,#c8399c 65%,#e11d48 100%);padding:40px 40px 36px;text-align:center;">
              <img src="${LOGO_URL}" alt="SaveMali" width="130" style="display:block;margin:0 auto 18px;max-width:130px;height:auto;border-radius:8px;" />
              <p style="margin:0;color:rgba(255,255,255,0.88);font-size:13px;font-weight:400;letter-spacing:0.4px;">Gestion intelligente pour votre activit&eacute;</p>
            </td>
          </tr>
          <!-- BODY -->
          <tr>
            <td class="content" style="padding:44px 40px;">
              ${body}
            </td>
          </tr>
          <!-- DIVIDER -->
          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;background:linear-gradient(90deg,transparent,#e4e4e7,transparent);"></div>
            </td>
          </tr>
          <!-- FOOTER -->
          <tr>
            <td class="footer" style="padding:28px 40px 32px;text-align:center;">
              <p style="margin:0 0 6px;color:#71717a;font-size:12px;font-weight:500;">
                &copy; 2026 SaveMali SARL &mdash; Tous droits r&eacute;serv&eacute;s.
              </p>
              <p style="margin:0 0 4px;color:#a1a1aa;font-size:11px;">
                D&eacute;velopp&eacute; par <strong style="color:#7c3aed;">John Mocket</strong> (The Eye Masters).
              </p>
              <p style="margin:0;color:#d4d4d8;font-size:10px;line-height:1.5;">
                Quartier Abbatoir, Avenue Cadastre N&deg;321<br/>Kalemie, Province du Tanganyika, RDC
              </p>
            </td>
          </tr>
        </table>
        <!--[if mso]></td></tr></table><![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`
}

function codeBlock(code: string): string {
  const chars = code.split("")
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
  <tr>
    ${chars.map((c, i) => `<td class="code-cell" style="width:48px;height:56px;padding:0 ${i < chars.length - 1 ? "5px" : "0"};">
      <div style="width:48px;height:56px;background:#f9fafb;border:2px solid ${i === 0 ? "#7c3aed" : "#e4e4e7"};border-radius:12px;text-align:center;line-height:56px;font-size:24px;font-weight:700;color:#18181b;font-family:'SF Mono',SFMono-Regular,Menlo,Consolas,monospace;">${c}</div>
    </td>`).join("")}
  </tr>
</table>`
}

function alertBox(text: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;">
  <tr>
    <td style="background-color:#fefce8;border:1px solid #fde68a;border-radius:12px;padding:14px 18px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="width:18px;vertical-align:top;padding-top:2px;font-size:13px;">&#9888;</td>
          <td style="padding-left:10px;">
            <p style="margin:0;color:#92400e;font-size:12px;line-height:1.6;">${text}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`
}

function btn(href: string, label: string, gradient: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
  <tr>
    <td style="background:${gradient};border-radius:12px;box-shadow:0 4px 14px rgba(124,58,237,0.25);">
      <a href="${href}" target="_blank" style="display:inline-block;padding:16px 40px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.2px;">${label}</a>
    </td>
  </tr>
</table>`
}

// ─── TEMPLATES ──────────────────────────────────────────

function verificationCode(code: string): { subject: string; html: string } {
  return {
    subject: "Code de v\u00e9rification \u2014 SaveMali",
    html: wrap("V\u00e9rification email", `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="text-align:center;padding-bottom:28px;">
          <div style="display:inline-block;width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#a855f7);line-height:60px;text-align:center;box-shadow:0 4px 14px rgba(124,58,237,0.3);">
            <span style="font-size:26px;color:#ffffff;">&#9993;</span>
          </div>
        </td></tr>
        <tr><td style="text-align:center;padding-bottom:12px;">
          <h1 style="margin:0;color:#18181b;font-size:22px;font-weight:700;">V&eacute;rifiez votre email</h1>
        </td></tr>
        <tr><td style="text-align:center;padding-bottom:32px;">
          <p style="margin:0;color:#52525b;font-size:15px;line-height:1.6;">
            Entrez le code &agrave; 6 chiffres ci-dessous pour activer votre compte SaveMali.
          </p>
        </td></tr>
        <tr><td style="padding-bottom:32px;">
          ${codeBlock(code)}
        </td></tr>
        <tr><td style="text-align:center;padding-bottom:6px;">
          <p style="margin:0;color:#71717a;font-size:13px;">
            Ce code expire dans <strong style="color:#18181b;">1 minute 30 secondes</strong>.
          </p>
        </td></tr>
        ${alertBox("Vous n'avez pas demand&eacute; ce code ? Ignorez cet email en toute s&eacute;curit&eacute;. Votre compte ne sera pas cr&eacute;&eacute;.")}
      </table>
    `),
  }
}

function verificationLink(link: string): { subject: string; html: string } {
  return {
    subject: "V\u00e9rifiez votre email \u2014 SaveMali",
    html: wrap("V\u00e9rification email", `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="text-align:center;padding-bottom:28px;">
          <div style="display:inline-block;width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#a855f7);line-height:60px;text-align:center;box-shadow:0 4px 14px rgba(124,58,237,0.3);">
            <span style="font-size:26px;color:#ffffff;">&#9993;</span>
          </div>
        </td></tr>
        <tr><td style="text-align:center;padding-bottom:12px;">
          <h1 style="margin:0;color:#18181b;font-size:22px;font-weight:700;">V&eacute;rifiez votre email</h1>
        </td></tr>
        <tr><td style="text-align:center;padding-bottom:32px;">
          <p style="margin:0;color:#52525b;font-size:15px;line-height:1.6;">
            Cliquez sur le bouton ci-dessous pour activer votre compte SaveMali.
          </p>
        </td></tr>
        <tr><td style="text-align:center;padding-bottom:32px;">
          ${btn(link, "V&eacute;rifier mon email", "linear-gradient(135deg,#7c3aed 0%,#a855f7 100%)")}
        </td></tr>
        <tr><td style="text-align:center;padding-bottom:6px;">
          <p style="margin:0;color:#71717a;font-size:13px;">
            Ce lien expire dans <strong style="color:#18181b;">24 heures</strong>.
          </p>
        </td></tr>
        ${alertBox("Vous n'avez pas demand&eacute; cette v&eacute;rification ? Ignorez cet email en toute s&eacute;curit&eacute;. Votre compte ne sera pas cr&eacute;&eacute;.")}
      </table>
    `),
  }
}

function welcomeEmail(userName: string): { subject: string; html: string } {
  return {
    subject: "Bienvenue sur SaveMali !",
    html: wrap("Bienvenue", `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="text-align:center;padding-bottom:28px;">
          <div style="display:inline-block;width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#22c55e,#16a34a);line-height:60px;text-align:center;box-shadow:0 4px 14px rgba(34,197,94,0.3);">
            <span style="font-size:26px;color:#ffffff;">&#10003;</span>
          </div>
        </td></tr>
        <tr><td style="text-align:center;padding-bottom:12px;">
          <h1 style="margin:0;color:#18181b;font-size:22px;font-weight:700;">Bienvenue sur SaveMali !</h1>
        </td></tr>
        <tr><td style="text-align:center;padding-bottom:10px;">
          <p style="margin:0;color:#52525b;font-size:15px;line-height:1.6;">
            Bonjour <strong style="color:#18181b;">${userName}</strong>,
          </p>
        </td></tr>
        <tr><td style="text-align:center;padding-bottom:32px;">
          <p style="margin:0;color:#52525b;font-size:15px;line-height:1.6;">
            Votre compte a &eacute;t&eacute; cr&eacute;&eacute; avec succ&egrave;s. Acc&eacute;dez d&eacute;sormais &agrave; votre tableau de bord.
          </p>
        </td></tr>
        <tr><td style="text-align:center;padding-bottom:32px;">
          ${btn("https://www.savemali.online/signin", "Acc&eacute;der &agrave; mon tableau de bord", "linear-gradient(135deg,#7c3aed 0%,#a855f7 100%)")}
        </td></tr>
        <tr><td>
          <div style="background:#f9fafb;border-radius:12px;padding:20px 24px;">
            <p style="margin:0 0 6px;color:#18181b;font-size:13px;font-weight:600;">Besoin d'aide ?</p>
            <p style="margin:0;color:#52525b;font-size:13px;line-height:1.6;">
              Contactez-nous &agrave; <a href="mailto:support@savemali.online" style="color:#7c3aed;text-decoration:none;font-weight:500;">support@savemali.online</a>
            </p>
          </div>
        </td></tr>
      </table>
    `),
  }
}

function contactEmail(data: { name: string; email: string; phone?: string; address?: string; message: string }): { subject: string; html: string } {
  const rows = [
    `<tr><td style="padding:14px 18px;border-bottom:1px solid #f4f4f5;"><p style="margin:0 0 3px;color:#a1a1aa;font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Nom</p><p style="margin:0;color:#18181b;font-size:14px;font-weight:500;">${data.name}</p></td></tr>`,
    `<tr><td style="padding:14px 18px;border-bottom:1px solid #f4f4f5;"><p style="margin:0 0 3px;color:#a1a1aa;font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Email</p><p style="margin:0;color:#7c3aed;font-size:14px;font-weight:500;">${data.email}</p></td></tr>`,
  ]
  if (data.phone) rows.push(`<tr><td style="padding:14px 18px;border-bottom:1px solid #f4f4f5;"><p style="margin:0 0 3px;color:#a1a1aa;font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">T&eacute;l&eacute;phone</p><p style="margin:0;color:#18181b;font-size:14px;font-weight:500;">${data.phone}</p></td></tr>`)
  if (data.address) rows.push(`<tr><td style="padding:14px 18px;"><p style="margin:0 0 3px;color:#a1a1aa;font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Adresse</p><p style="margin:0;color:#18181b;font-size:14px;font-weight:500;">${data.address}</p></td></tr>`)
  return {
    subject: `Nouveau message \u2014 ${data.name}`,
    html: wrap("Message de contact", `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="padding-bottom:24px;">
          <h1 style="margin:0;color:#18181b;font-size:20px;font-weight:700;">Nouveau message de contact</h1>
        </td></tr>
        <tr><td style="padding-bottom:16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9fafb;border-radius:12px;overflow:hidden;border:1px solid #f4f4f5;">
            ${rows.join("")}
          </table>
        </td></tr>
        <tr><td>
          <div style="border-left:3px solid #7c3aed;padding:18px 22px;background:#f9fafb;border-radius:0 12px 12px 0;">
            <p style="margin:0 0 6px;color:#a1a1aa;font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Message</p>
            <p style="margin:0;color:#18181b;font-size:14px;line-height:1.7;white-space:pre-wrap;">${data.message}</p>
          </div>
        </td></tr>
      </table>
    `),
  }
}

function passwordResetCode(code: string): { subject: string; html: string } {
  return {
    subject: "Code de r\u00e9initialisation \u2014 SaveMali",
    html: wrap("R\u00e9initialisation de mot de passe", `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="text-align:center;padding-bottom:28px;">
          <div style="display:inline-block;width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#f97316);line-height:60px;text-align:center;box-shadow:0 4px 14px rgba(245,158,11,0.3);">
            <span style="font-size:26px;color:#ffffff;">&#128274;</span>
          </div>
        </td></tr>
        <tr><td style="text-align:center;padding-bottom:12px;">
          <h1 style="margin:0;color:#18181b;font-size:22px;font-weight:700;">R&eacute;initialisation de mot de passe</h1>
        </td></tr>
        <tr><td style="text-align:center;padding-bottom:32px;">
          <p style="margin:0;color:#52525b;font-size:15px;line-height:1.6;">
            Vous avez demand&eacute; la r&eacute;initialisation de votre mot de passe. Entrez le code &agrave; 6 chiffres ci-dessous.
          </p>
        </td></tr>
        <tr><td style="padding-bottom:32px;">
          ${codeBlock(code)}
        </td></tr>
        <tr><td style="text-align:center;padding-bottom:6px;">
          <p style="margin:0;color:#71717a;font-size:13px;">
            Ce code expire dans <strong style="color:#18181b;">1 minute 30 secondes</strong>.
          </p>
        </td></tr>
        ${alertBox("Si vous n'avez pas demand&eacute; cette r&eacute;initialisation, ignorez cet email. Votre mot de passe actuel restera inchang&eacute;.")}
      </table>
    `),
  }
}

function passwordResetLink(link: string): { subject: string; html: string } {
  return {
    subject: "R\u00e9initialisation de mot de passe \u2014 SaveMali",
    html: wrap("R\u00e9initialisation de mot de passe", `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="text-align:center;padding-bottom:28px;">
          <div style="display:inline-block;width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#f97316);line-height:60px;text-align:center;box-shadow:0 4px 14px rgba(245,158,11,0.3);">
            <span style="font-size:26px;color:#ffffff;">&#128274;</span>
          </div>
        </td></tr>
        <tr><td style="text-align:center;padding-bottom:12px;">
          <h1 style="margin:0;color:#18181b;font-size:22px;font-weight:700;">R&eacute;initialisation de mot de passe</h1>
        </td></tr>
        <tr><td style="text-align:center;padding-bottom:32px;">
          <p style="margin:0;color:#52525b;font-size:15px;line-height:1.6;">
            Cliquez sur le bouton ci-dessous pour cr&eacute;er un nouveau mot de passe.
          </p>
        </td></tr>
        <tr><td style="text-align:center;padding-bottom:32px;">
          ${btn(link, "R&eacute;initialiser mon mot de passe", "linear-gradient(135deg,#f59e0b 0%,#f97316 100%)")}
        </td></tr>
        <tr><td style="text-align:center;padding-bottom:6px;">
          <p style="margin:0;color:#71717a;font-size:13px;">
            Ce lien expire dans <strong style="color:#18181b;">1 heure</strong>.
          </p>
        </td></tr>
        ${alertBox("Si vous n'avez pas demand&eacute; cette r&eacute;initialisation, ignorez cet email. Votre mot de passe actuel restera inchang&eacute;.")}
      </table>
    `),
  }
}

function inviteEmail(data: { inviterName: string; workspaceName: string; role: string; inviteLink: string }): { subject: string; html: string } {
  return {
    subject: `Invitation \u2014 Rejoignez ${data.workspaceName} sur SaveMali`,
    html: wrap("Invitation", `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="text-align:center;padding-bottom:28px;">
          <div style="display:inline-block;width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#a855f7);line-height:60px;text-align:center;box-shadow:0 4px 14px rgba(124,58,237,0.3);">
            <span style="font-size:26px;color:#ffffff;">&#128101;</span>
          </div>
        </td></tr>
        <tr><td style="text-align:center;padding-bottom:12px;">
          <h1 style="margin:0;color:#18181b;font-size:22px;font-weight:700;">Vous &ecirc;tes invit&eacute; !</h1>
        </td></tr>
        <tr><td style="text-align:center;padding-bottom:10px;">
          <p style="margin:0;color:#52525b;font-size:15px;line-height:1.6;">
            <strong style="color:#18181b;">${data.inviterName}</strong> vous invite &agrave; rejoindre l'&eacute;quipe sur SaveMali.
          </p>
        </td></tr>
        <tr><td style="text-align:center;padding-bottom:32px;">
          <div style="display:inline-block;background:#f9fafb;border:1px solid #f4f4f5;border-radius:12px;padding:16px 28px;">
            <p style="margin:0 0 4px;color:#a1a1aa;font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Workspace</p>
            <p style="margin:0;color:#18181b;font-size:16px;font-weight:600;">${data.workspaceName}</p>
            <p style="margin:6px 0 0;color:#7c3aed;font-size:13px;font-weight:500;text-transform:capitalize;">${data.role}</p>
          </div>
        </td></tr>
        <tr><td style="text-align:center;padding-bottom:32px;">
          ${btn(data.inviteLink, "Rejoindre l'&eacute;quipe", "linear-gradient(135deg,#7c3aed 0%,#a855f7 100%)")}
        </td></tr>
        <tr><td style="text-align:center;padding-bottom:6px;">
          <p style="margin:0;color:#71717a;font-size:13px;">
            Ce lien expire dans <strong style="color:#18181b;">7 jours</strong>.
          </p>
        </td></tr>
        ${alertBox("Vous n'avez pas demand&eacute; cette invitation ? Ignorez cet email en toute s&eacute;curit&eacute;.")}
      </table>
    `),
  }
}

function memberJoinedEmail(data: { memberName: string; workspaceName: string; role: string }): { subject: string; html: string } {
  return {
    subject: `${data.memberName} a rejoint ${data.workspaceName}`,
    html: wrap("Nouveau membre", `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="text-align:center;padding-bottom:28px;">
          <div style="display:inline-block;width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#22c55e,#16a34a);line-height:60px;text-align:center;box-shadow:0 4px 14px rgba(34,197,94,0.3);">
            <span style="font-size:26px;color:#ffffff;">&#10003;</span>
          </div>
        </td></tr>
        <tr><td style="text-align:center;padding-bottom:12px;">
          <h1 style="margin:0;color:#18181b;font-size:22px;font-weight:700;">Nouveau membre dans l'&eacute;quipe</h1>
        </td></tr>
        <tr><td style="text-align:center;padding-bottom:32px;">
          <p style="margin:0;color:#52525b;font-size:15px;line-height:1.6;">
            <strong style="color:#18181b;">${data.memberName}</strong> a rejoint le workspace <strong style="color:#18181b;">${data.workspaceName}</strong> en tant que <strong style="color:#7c3aed;">${data.role}</strong>.
          </p>
        </td></tr>
        <tr><td>
          <div style="background:#f9fafb;border-radius:12px;padding:20px 24px;">
            <p style="margin:0;color:#52525b;font-size:13px;line-height:1.6;">
              Vous pouvez g&eacute;rer les permissions de ce membre depuis le panneau d'administration.
            </p>
          </div>
        </td></tr>
      </table>
    `),
  }
}

const TEMPLATES: Record<string, (data: any) => { subject: string; html: string }> = {
  "verification-code": (d) => verificationCode(d.code),
  "verification-link": (d) => verificationLink(d.link),
  "welcome": (d) => welcomeEmail(d.name),
  "contact": (d) => contactEmail(d),
  "password-reset-code": (d) => passwordResetCode(d.code),
  "password-reset-link": (d) => passwordResetLink(d.link),
  "invite": (d) => inviteEmail(d),
  "member-joined": (d) => memberJoinedEmail(d),
}

export default async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get("origin")
  const corsHeaders = getCorsHeaders(origin)

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders })
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  if (!RESEND_API_KEY) return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })

  try {
    const body = await req.json()
    const { to, subject, html, from, replyTo, template, templateData } = body

    const codeTemplates = ["verification-code", "password-reset-code"]
    if (template && codeTemplates.includes(template) && templateData?.email) {
      const rateCheck = checkRateLimit(templateData.email)
      if (!rateCheck.allowed) {
        return new Response(JSON.stringify({
          error: "Trop de demandes. Veuillez r\u00e9essayer demain.",
          error_en: "Too many requests. Please try again tomorrow.",
          remainingTime: rateCheck.remainingTime,
          blocked: true,
        }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }
      incrementRateLimit(templateData.email)
    }

    let finalSubject = subject
    let finalHtml = html
    if (template && TEMPLATES[template]) {
      const result = TEMPLATES[template](templateData || {})
      finalSubject = result.subject
      finalHtml = result.html
    }

    if (!to || !finalSubject || !finalHtml) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const recipients = Array.isArray(to) ? to : [to]
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: from || "SaveMali <noreply@savemali.online>",
        to: recipients,
        subject: finalSubject,
        html: finalHtml,
        reply_to: replyTo || "support@savemali.online",
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      console.error("[send-email] Resend error:", data)
      return new Response(JSON.stringify({ error: data.message || "Email send failed" }), { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    return new Response(JSON.stringify({ id: data.id }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  } catch (err) {
    console.error("[send-email] Error:", err)
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }
}
