const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")
const LOGO_URL = "https://www.savemali.online/SaveMali_Logo.png"
const ALLOWED_ORIGINS = [
  "https://www.savemali.online",
  "https://savemali.online",
  "https://savemali.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
]

// Rate limiting: in-memory store (per function instance)
// Key: email, Value: { count, resetAt }
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()
const MAX_CODE_REQUESTS = 4
const BLOCK_DURATION_MS = 24 * 60 * 60 * 1000 // 24 hours

function getRateLimitKey(email: string): string {
  return email.toLowerCase().trim()
}

function checkRateLimit(email: string): { allowed: boolean; remainingTime?: number } {
  const key = getRateLimitKey(email)
  const now = Date.now()
  const record = rateLimitStore.get(key)

  if (!record) return { allowed: true }

  // If block period has expired, reset
  if (now > record.resetAt) {
    rateLimitStore.delete(key)
    return { allowed: true }
  }

  if (record.count >= MAX_CODE_REQUESTS) {
    const remainingTime = Math.ceil((record.resetAt - now) / 1000 / 60)
    return { allowed: false, remainingTime }
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

function wrapTemplate(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,date=no,address=no,email=no">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif,-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:48px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px 0 rgba(0,0,0,0.06),0 1px 2px -1px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:linear-gradient(135deg,#7c3aed 0%,#a855f7 40%,#c8399c 70%,#e11d48 100%);padding:40px 48px 36px;text-align:center;">
              <img src="${LOGO_URL}" alt="SaveMali" width="140" style="display:block;margin:0 auto 20px;max-width:140px;height:auto;border-radius:8px;" />
              <p style="margin:0;color:rgba(255,255,255,0.85);font-size:13px;font-weight:400;letter-spacing:0.5px;">Gestion intelligente pour votre activit\u00e9</p>
            </td>
          </tr>
          <tr>
            <td style="padding:48px 44px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:0 44px;">
              <div style="height:1px;background:linear-gradient(90deg,transparent 0%,#e4e4e7 50%,transparent 100%);"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 44px 36px;text-align:center;">
              <p style="margin:0 0 4px;color:#71717a;font-size:12px;font-weight:500;">
                \u00a9 2026 SaveMali SARL \u2014 Tous droits r\u00e9serv\u00e9s
              </p>
              <p style="margin:0 0 12px;color:#a1a1aa;font-size:11px;">
                D\u00e9velopp\u00e9 par John Mocket
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                <tr>
                  <td style="padding:0 8px;border-right:1px solid #e4e4e7;">
                    <a href="https://www.savemali.online" style="color:#7c3aed;font-size:11px;text-decoration:none;font-weight:500;">savemali.online</a>
                  </td>
                  <td style="padding:0 8px;">
                    <a href="mailto:support@savemali.online" style="color:#7c3aed;font-size:11px;text-decoration:none;font-weight:500;">support@savemali.online</a>
                  </td>
                </tr>
              </table>
              <p style="margin:12px 0 0;color:#d4d4d8;font-size:10px;line-height:1.4;">
                Quartier Abbatoir, Avenue Cadastre N\u00b0321<br/>Kalemie, Province du Tanganyika, RDC
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function codeBoxes(code: string): string {
  const chars = code.split("")
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
    <tr>
      ${chars.map((c, i) => `<td style="width:48px;height:56px;padding:0 ${i < chars.length - 1 ? "4px" : "0"};">
        <div style="width:48px;height:56px;background-color:#f9fafb;border:2px solid ${i === 0 ? "#7c3aed" : "#e4e4e7"};border-radius:12px;text-align:center;line-height:56px;font-size:24px;font-weight:700;color:#18181b;font-family:'SF Mono',SFMono-Regular,Menlo,Consolas,monospace;">${c}</div>
      </td>`).join("")}
    </tr>
  </table>`
}

function securityNotice(text: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;">
    <tr>
      <td style="background-color:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="width:20px;vertical-align:top;padding-top:1px;">
              <span style="font-size:14px;line-height:1;">\u26a0\ufe0f</span>
            </td>
            <td style="padding-left:8px;">
              <p style="margin:0;color:#92400e;font-size:12px;line-height:1.5;font-weight:500;">${text}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`
}

function verificationCode(code: string): { subject: string; html: string } {
  return {
    subject: "Code de v\u00e9rification \u2014 SaveMali",
    html: wrapTemplate("V\u00e9rification email", `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="text-align:center;padding-bottom:32px;">
            <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#a855f7);line-height:64px;text-align:center;box-shadow:0 4px 14px rgba(124,58,237,0.3);">
              <span style="font-size:28px;color:#ffffff;">\u2709</span>
            </div>
          </td>
        </tr>
        <tr>
          <td style="text-align:center;padding-bottom:16px;">
            <h1 style="margin:0;color:#18181b;font-size:24px;font-weight:700;">V\u00e9rifiez votre email</h1>
          </td>
        </tr>
        <tr>
          <td style="text-align:center;padding-bottom:36px;">
            <p style="margin:0;color:#52525b;font-size:15px;line-height:1.6;">
              Entrez le code \u00e0 6 chiffres ci-dessous pour activer votre compte SaveMali.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding-bottom:36px;">
            ${codeBoxes(code)}
          </td>
        </tr>
        <tr>
          <td style="text-align:center;padding-bottom:8px;">
            <p style="margin:0;color:#71717a;font-size:13px;">
              Ce code expire dans <strong style="color:#18181b;font-weight:600;">1 minute 30 secondes</strong>.
            </p>
          </td>
        </tr>
        ${securityNotice("Vous n'avez pas demand\u00e9 ce code ? Ignorez cet email en toute s\u00e9curit\u00e9. Votre compte ne sera pas cr\u00e9\u00e9.")}
      </table>
    `),
  }
}

function verificationLink(link: string): { subject: string; html: string } {
  return {
    subject: "V\u00e9rifiez votre email \u2014 SaveMali",
    html: wrapTemplate("V\u00e9rification email", `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="text-align:center;padding-bottom:32px;">
            <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#a855f7);line-height:64px;text-align:center;box-shadow:0 4px 14px rgba(124,58,237,0.3);">
              <span style="font-size:28px;color:#ffffff;">\u2709</span>
            </div>
          </td>
        </tr>
        <tr>
          <td style="text-align:center;padding-bottom:16px;">
            <h1 style="margin:0;color:#18181b;font-size:24px;font-weight:700;">V\u00e9rifiez votre email</h1>
          </td>
        </tr>
        <tr>
          <td style="text-align:center;padding-bottom:36px;">
            <p style="margin:0;color:#52525b;font-size:15px;line-height:1.6;">
              Cliquez sur le bouton ci-dessous pour activer votre compte SaveMali.
            </p>
          </td>
        </tr>
        <tr>
          <td style="text-align:center;padding-bottom:36px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
              <tr>
                <td style="background:linear-gradient(135deg,#7c3aed 0%,#a855f7 100%);border-radius:12px;box-shadow:0 4px 14px rgba(124,58,237,0.3);">
                  <a href="${link}" target="_blank" style="display:inline-block;padding:18px 40px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                    V\u00e9rifier mon email
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="text-align:center;padding-bottom:8px;">
            <p style="margin:0;color:#71717a;font-size:13px;">
              Ce lien expire dans <strong style="color:#18181b;font-weight:600;">24 heures</strong>.
            </p>
          </td>
        </tr>
        ${securityNotice("Vous n'avez pas demand\u00e9 cette v\u00e9rification ? Ignorez cet email en toute s\u00e9curit\u00e9. Votre compte ne sera pas cr\u00e9\u00e9.")}
      </table>
    `),
  }
}

function welcomeEmail(userName: string): { subject: string; html: string } {
  return {
    subject: "Bienvenue sur SaveMali !",
    html: wrapTemplate("Bienvenue", `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="text-align:center;padding-bottom:32px;">
            <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#22c55e,#16a34a);line-height:64px;text-align:center;box-shadow:0 4px 14px rgba(34,197,94,0.3);">
              <span style="font-size:28px;color:#ffffff;">\u2713</span>
            </div>
          </td>
        </tr>
        <tr>
          <td style="text-align:center;padding-bottom:16px;">
            <h1 style="margin:0;color:#18181b;font-size:24px;font-weight:700;">Bienvenue sur SaveMali !</h1>
          </td>
        </tr>
        <tr>
          <td style="text-align:center;padding-bottom:12px;">
            <p style="margin:0;color:#52525b;font-size:15px;line-height:1.6;">
              Bonjour <strong style="color:#18181b;font-weight:600;">${userName}</strong>,
            </p>
          </td>
        </tr>
        <tr>
          <td style="text-align:center;padding-bottom:36px;">
            <p style="margin:0;color:#52525b;font-size:15px;line-height:1.6;">
              Votre compte a \u00e9t\u00e9 cr\u00e9\u00e9 avec succ\u00e8s. Acc\u00e9dez d\u00e9sormais \u00e0 votre tableau de bord et commencez \u00e0 g\u00e9rer votre activit\u00e9.
            </p>
          </td>
        </tr>
        <tr>
          <td style="text-align:center;padding-bottom:36px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
              <tr>
                <td style="background:linear-gradient(135deg,#7c3aed 0%,#a855f7 100%);border-radius:12px;box-shadow:0 4px 14px rgba(124,58,237,0.3);">
                  <a href="https://www.savemali.online/signin" target="_blank" style="display:inline-block;padding:18px 40px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                    Acc\u00e9der \u00e0 mon tableau de bord
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td>
            <div style="background-color:#f9fafb;border-radius:12px;padding:20px 24px;">
              <p style="margin:0 0 8px;color:#18181b;font-size:13px;font-weight:600;">Besoin d'aide ?</p>
              <p style="margin:0;color:#52525b;font-size:13px;line-height:1.6;">
                Contactez-nous \u00e0 <a href="mailto:support@savemali.online" style="color:#7c3aed;text-decoration:none;font-weight:500;">support@savemali.online</a>
              </p>
            </div>
          </td>
        </tr>
      </table>
    `),
  }
}

function contactEmail(data: { name: string; email: string; phone?: string; address?: string; message: string }): { subject: string; html: string } {
  return {
    subject: `Nouveau message \u2014 ${data.name}`,
    html: wrapTemplate("Message de contact", `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding-bottom:28px;">
            <h1 style="margin:0;color:#18181b;font-size:22px;font-weight:700;">Nouveau message de contact</h1>
          </td>
        </tr>
        <tr>
          <td style="padding-bottom:20px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f9fafb;border-radius:12px;overflow:hidden;border:1px solid #f4f4f5;">
              <tr>
                <td style="padding:16px 20px;border-bottom:1px solid #f4f4f5;">
                  <p style="margin:0 0 3px;color:#a1a1aa;font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Nom</p>
                  <p style="margin:0;color:#18181b;font-size:14px;font-weight:500;">${data.name}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 20px;border-bottom:1px solid #f4f4f5;">
                  <p style="margin:0 0 3px;color:#a1a1aa;font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Email</p>
                  <p style="margin:0;color:#7c3aed;font-size:14px;font-weight:500;">${data.email}</p>
                </td>
              </tr>
              ${data.phone ? `<tr>
                <td style="padding:16px 20px;border-bottom:1px solid #f4f4f5;">
                  <p style="margin:0 0 3px;color:#a1a1aa;font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">T\u00e9l\u00e9phone</p>
                  <p style="margin:0;color:#18181b;font-size:14px;font-weight:500;">${data.phone}</p>
                </td>
              </tr>` : ""}
              ${data.address ? `<tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0 0 3px;color:#a1a1aa;font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Adresse</p>
                  <p style="margin:0;color:#18181b;font-size:14px;font-weight:500;">${data.address}</p>
                </td>
              </tr>` : ""}
            </table>
          </td>
        </tr>
        <tr>
          <td>
            <div style="border-left:3px solid #7c3aed;padding:20px 24px;background-color:#f9fafb;border-radius:0 12px 12px 0;">
              <p style="margin:0 0 6px;color:#a1a1aa;font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Message</p>
              <p style="margin:0;color:#18181b;font-size:14px;line-height:1.7;white-space:pre-wrap;">${data.message}</p>
            </div>
          </td>
        </tr>
      </table>
    `),
  }
}

function passwordResetCode(code: string): { subject: string; html: string } {
  return {
    subject: "Code de r\u00e9initialisation \u2014 SaveMali",
    html: wrapTemplate("R\u00e9initialisation de mot de passe", `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="text-align:center;padding-bottom:32px;">
            <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#f97316);line-height:64px;text-align:center;box-shadow:0 4px 14px rgba(245,158,11,0.3);">
              <span style="font-size:28px;color:#ffffff;">\ud83d\udd12</span>
            </div>
          </td>
        </tr>
        <tr>
          <td style="text-align:center;padding-bottom:16px;">
            <h1 style="margin:0;color:#18181b;font-size:24px;font-weight:700;">R\u00e9initialisation de mot de passe</h1>
          </td>
        </tr>
        <tr>
          <td style="text-align:center;padding-bottom:36px;">
            <p style="margin:0;color:#52525b;font-size:15px;line-height:1.6;">
              Vous avez demand\u00e9 la r\u00e9initialisation de votre mot de passe. Entrez le code \u00e0 6 chiffres ci-dessous.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding-bottom:36px;">
            ${codeBoxes(code)}
          </td>
        </tr>
        <tr>
          <td style="text-align:center;padding-bottom:8px;">
            <p style="margin:0;color:#71717a;font-size:13px;">
              Ce code expire dans <strong style="color:#18181b;font-weight:600;">1 minute 30 secondes</strong>.
            </p>
          </td>
        </tr>
        ${securityNotice("Si vous n'avez pas demand\u00e9 cette r\u00e9initialisation, ignorez cet email. Votre mot de passe actuel restera inchang\u00e9.")}
      </table>
    `),
  }
}

function passwordResetLink(link: string): { subject: string; html: string } {
  return {
    subject: "R\u00e9initialisation de mot de passe \u2014 SaveMali",
    html: wrapTemplate("R\u00e9initialisation de mot de passe", `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="text-align:center;padding-bottom:32px;">
            <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#f97316);line-height:64px;text-align:center;box-shadow:0 4px 14px rgba(245,158,11,0.3);">
              <span style="font-size:28px;color:#ffffff;">\ud83d\udd12</span>
            </div>
          </td>
        </tr>
        <tr>
          <td style="text-align:center;padding-bottom:16px;">
            <h1 style="margin:0;color:#18181b;font-size:24px;font-weight:700;">R\u00e9initialisation de mot de passe</h1>
          </td>
        </tr>
        <tr>
          <td style="text-align:center;padding-bottom:36px;">
            <p style="margin:0;color:#52525b;font-size:15px;line-height:1.6;">
              Cliquez sur le bouton ci-dessous pour cr\u00e9er un nouveau mot de passe.
            </p>
          </td>
        </tr>
        <tr>
          <td style="text-align:center;padding-bottom:36px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
              <tr>
                <td style="background:linear-gradient(135deg,#f59e0b 0%,#f97316 100%);border-radius:12px;box-shadow:0 4px 14px rgba(245,158,11,0.3);">
                  <a href="${link}" target="_blank" style="display:inline-block;padding:18px 40px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                    R\u00e9initialiser mon mot de passe
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="text-align:center;padding-bottom:8px;">
            <p style="margin:0;color:#71717a;font-size:13px;">
              Ce lien expire dans <strong style="color:#18181b;font-weight:600;">1 heure</strong>.
            </p>
          </td>
        </tr>
        ${securityNotice("Si vous n'avez pas demand\u00e9 cette r\u00e9initialisation, ignorez cet email. Votre mot de passe actuel restera inchang\u00e9.")}
      </table>
    `),
  }
}

function inviteEmail(data: { inviterName: string; workspaceName: string; role: string; inviteLink: string }): { subject: string; html: string } {
  return {
    subject: `Invitation \u2014 Rejoignez ${data.workspaceName} sur SaveMali`,
    html: wrapTemplate("Invitation \u00e0 rejoindre un workspace", `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="text-align:center;padding-bottom:32px;">
            <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#a855f7);line-height:64px;text-align:center;box-shadow:0 4px 14px rgba(124,58,237,0.3);">
              <span style="font-size:28px;color:#ffffff;">\ud83d\udc65</span>
            </div>
          </td>
        </tr>
        <tr>
          <td style="text-align:center;padding-bottom:16px;">
            <h1 style="margin:0;color:#18181b;font-size:24px;font-weight:700;">Vous \u00eates invit\u00e9 !</h1>
          </td>
        </tr>
        <tr>
          <td style="text-align:center;padding-bottom:12px;">
            <p style="margin:0;color:#52525b;font-size:15px;line-height:1.6;">
              <strong style="color:#18181b;font-weight:600;">${data.inviterName}</strong> vous invite \u00e0 rejoindre l'\u00e9quipe sur SaveMali.
            </p>
          </td>
        </tr>
        <tr>
          <td style="text-align:center;padding-bottom:36px;">
            <div style="display:inline-block;background-color:#f9fafb;border:1px solid #f4f4f5;border-radius:12px;padding:16px 28px;">
              <p style="margin:0 0 4px;color:#a1a1aa;font-size:10px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Workspace</p>
              <p style="margin:0;color:#18181b;font-size:16px;font-weight:600;">${data.workspaceName}</p>
              <p style="margin:6px 0 0;color:#7c3aed;font-size:13px;font-weight:500;text-transform:capitalize;">${data.role}</p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="text-align:center;padding-bottom:36px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
              <tr>
                <td style="background:linear-gradient(135deg,#7c3aed 0%,#a855f7 100%);border-radius:12px;box-shadow:0 4px 14px rgba(124,58,237,0.3);">
                  <a href="${data.inviteLink}" target="_blank" style="display:inline-block;padding:18px 40px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                    Rejoindre l'\u00e9quipe
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="text-align:center;padding-bottom:8px;">
            <p style="margin:0;color:#71717a;font-size:13px;">
              Ce lien expire dans <strong style="color:#18181b;font-weight:600;">7 jours</strong>.
            </p>
          </td>
        </tr>
        ${securityNotice("Vous n'avez pas demand\u00e9 cette invitation ? Ignorez cet email en toute s\u00e9curit\u00e9.")}
      </table>
    `),
  }
}

function memberJoinedEmail(data: { memberName: string; workspaceName: string; role: string }): { subject: string; html: string } {
  return {
    subject: `${data.memberName} a rejoint ${data.workspaceName}`,
    html: wrapTemplate("Nouveau membre", `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="text-align:center;padding-bottom:32px;">
            <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#22c55e,#16a34a);line-height:64px;text-align:center;box-shadow:0 4px 14px rgba(34,197,94,0.3);">
              <span style="font-size:28px;color:#ffffff;">\u2713</span>
            </div>
          </td>
        </tr>
        <tr>
          <td style="text-align:center;padding-bottom:16px;">
            <h1 style="margin:0;color:#18181b;font-size:24px;font-weight:700;">Nouveau membre dans l'\u00e9quipe</h1>
          </td>
        </tr>
        <tr>
          <td style="text-align:center;padding-bottom:36px;">
            <p style="margin:0;color:#52525b;font-size:15px;line-height:1.6;">
              <strong style="color:#18181b;font-weight:600;">${data.memberName}</strong> a rejoint le workspace <strong style="color:#18181b;font-weight:600;">${data.workspaceName}</strong> en tant que <strong style="color:#7c3aed;font-weight:600;">${data.role}</strong>.
            </p>
          </td>
        </tr>
        <tr>
          <td>
            <div style="background-color:#f9fafb;border-radius:12px;padding:20px 24px;">
              <p style="margin:0;color:#52525b;font-size:13px;line-height:1.6;">
                Vous pouvez g\u00e9rer les permissions de ce membre depuis le panneau d'administration.
              </p>
            </div>
          </td>
        </tr>
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

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  try {
    const body = await req.json()
    const { to, subject, html, from, replyTo, template, templateData } = body

    // Rate limiting for code-based templates
    const codeTemplates = ["verification-code", "password-reset-code"]
    if (template && codeTemplates.includes(template) && templateData?.email) {
      const rateCheck = checkRateLimit(templateData.email)
      if (!rateCheck.allowed) {
        return new Response(JSON.stringify({
          error: "Trop de demandes. Veuillez r\u00e9essayer demain.",
          error_en: "Too many requests. Please try again tomorrow.",
          remainingTime: rateCheck.remainingTime,
          blocked: true,
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
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
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const recipients = Array.isArray(to) ? to : [to]

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
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
      return new Response(JSON.stringify({ error: data.message || "Email send failed" }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify({ id: data.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("[send-email] Error:", err)
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
}
