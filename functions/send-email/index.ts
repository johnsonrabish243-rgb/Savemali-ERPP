const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")
const LOGO_URL = "https://www.savemali.online/SaveMali_Logo.png"
const ALLOWED_ORIGINS = [
  "https://www.savemali.online",
  "https://savemali.online",
  "https://savemali.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
]

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
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#7c3aed 0%,#c8399c 100%);padding:32px 40px;text-align:center;">
              <img src="${LOGO_URL}" alt="SaveMali" width="140" style="display:block;margin:0 auto 12px;max-width:140px;height:auto;" />
              <p style="margin:0;color:rgba(255,255,255,0.85);font-size:13px;letter-spacing:0.5px;">ERP de gestion intelligente</p>
            </td>
          </tr>
          <!-- CONTENT -->
          <tr>
            <td style="padding:40px;">
              ${content}
            </td>
          </tr>
          <!-- FOOTER -->
          <tr>
            <td style="background-color:#fafafa;border-top:1px solid #e4e4e7;padding:24px 40px;text-align:center;">
              <p style="margin:0 0 4px;color:#a1a1aa;font-size:11px;">
                &copy; ${new Date().getFullYear()} SaveMali SARL &mdash; Tous droits r&eacute;serv&eacute;s
              </p>
              <p style="margin:0;color:#a1a1aa;font-size:11px;">
                D&eacute;velopp&eacute; par John Mocket
              </p>
              <p style="margin:12px 0 0;color:#a1a1aa;font-size:10px;">
                Quartier Abbatoir, Avenue Cadastre N&deg;321, Kalemie, Tanganyika, RDC
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

function verificationEmail(code: string, appName: string): { subject: string; html: string } {
  return {
    subject: `Vérifiez votre email - ${appName}`,
    html: wrapTemplate("Vérification email", `
      <h1 style="margin:0 0 8px;color:#18181b;font-size:22px;font-weight:700;">Vérifiez votre adresse email</h1>
      <p style="margin:0 0 24px;color:#71717a;font-size:15px;line-height:1.6;">
        Merci de vous &ecirc;tre inscrit sur <strong style="color:#18181b;">${appName}</strong>.
        Veuillez entrer le code ci-dessous pour activer votre compte.
      </p>
      <div style="background-color:#f4f4f5;border-radius:8px;padding:20px;text-align:center;margin-bottom:24px;">
        <p style="margin:0 0 4px;color:#a1a1aa;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Votre code de v&eacute;rification</p>
        <p style="margin:0;color:#7c3aed;font-size:32px;font-weight:700;letter-spacing:6px;font-family:monospace;">${code}</p>
      </div>
      <p style="margin:0 0 8px;color:#71717a;font-size:14px;line-height:1.6;">
        Ce code expire dans <strong>15 minutes</strong>.
      </p>
      <p style="margin:0;color:#a1a1aa;font-size:13px;line-height:1.6;">
        Si vous n'avez pas cr&eacute;&eacute; de compte, vous pouvez ignorer cet email en toute s&eacute;curit&eacute;.
      </p>
    `),
  }
}

function verificationLink(link: string, appName: string): { subject: string; html: string } {
  return {
    subject: `Vérifiez votre email - ${appName}`,
    html: wrapTemplate("Vérification email", `
      <h1 style="margin:0 0 8px;color:#18181b;font-size:22px;font-weight:700;">Vérifiez votre adresse email</h1>
      <p style="margin:0 0 24px;color:#71717a;font-size:15px;line-height:1.6;">
        Merci de vous &ecirc;tre inscrit sur <strong style="color:#18181b;">${appName}</strong>.
        Cliquez sur le bouton ci-dessous pour activer votre compte.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
        <tr>
          <td style="background:linear-gradient(135deg,#7c3aed 0%,#c8399c 100%);border-radius:8px;">
            <a href="${link}" target="_blank" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
              V&eacute;rifier mon email
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 8px;color:#71717a;font-size:14px;line-height:1.6;">
        Ce lien expire dans <strong>24 heures</strong>.
      </p>
      <p style="margin:0;color:#a1a1aa;font-size:13px;line-height:1.6;">
        Si vous n'avez pas cr&eacute;&eacute; de compte, vous pouvez ignorer cet email en toute s&eacute;curit&eacute;.
      </p>
    `),
  }
}

function welcomeEmail(userName: string, appName: string): { subject: string; html: string } {
  return {
    subject: `Bienvenue sur ${appName} !`,
    html: wrapTemplate("Bienvenue", `
      <h1 style="margin:0 0 8px;color:#18181b;font-size:22px;font-weight:700;">Bienvenue sur ${appName} !</h1>
      <p style="margin:0 0 24px;color:#71717a;font-size:15px;line-height:1.6;">
        Bonjour <strong style="color:#18181b;">${userName}</strong>,
      </p>
      <p style="margin:0 0 24px;color:#71717a;font-size:15px;line-height:1.6;">
        Votre compte a &eacute;t&eacute; cr&eacute;&eacute; avec succ&egrave;s. Vous pouvez d&eacute;sormais acc&eacute;der &agrave; toutes les fonctionnalit&eacute;s de votre ERP.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
        <tr>
          <td style="background:linear-gradient(135deg,#7c3aed 0%,#c8399c 100%);border-radius:8px;">
            <a href="https://www.savemali.online/signin" target="_blank" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
              Acc&eacute;der &agrave; mon tableau de bord
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:0;color:#a1a1aa;font-size:13px;line-height:1.6;">
        Besoin d'aide ? Contactez-nous &agrave; support@savemali.com
      </p>
    `),
  }
}

function contactEmail(data: { name: string; email: string; phone?: string; address?: string; message: string }): { subject: string; html: string } {
  return {
    subject: `Nouveau message de contact - ${data.name}`,
    html: wrapTemplate("Message de contact", `
      <h1 style="margin:0 0 16px;color:#18181b;font-size:22px;font-weight:700;">Nouveau message de contact</h1>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        <tr>
          <td style="padding:12px 16px;background-color:#f4f4f5;border-radius:8px;">
            <p style="margin:0 0 4px;color:#a1a1aa;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Nom</p>
            <p style="margin:0;color:#18181b;font-size:15px;font-weight:500;">${data.name}</p>
          </td>
        </tr>
        <tr><td style="height:8px;"></td></tr>
        <tr>
          <td style="padding:12px 16px;background-color:#f4f4f5;border-radius:8px;">
            <p style="margin:0 0 4px;color:#a1a1aa;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Email</p>
            <p style="margin:0;color:#18181b;font-size:15px;font-weight:500;"><a href="mailto:${data.email}" style="color:#7c3aed;text-decoration:none;">${data.email}</a></p>
          </td>
        </tr>
        ${data.phone ? `
        <tr><td style="height:8px;"></td></tr>
        <tr>
          <td style="padding:12px 16px;background-color:#f4f4f5;border-radius:8px;">
            <p style="margin:0 0 4px;color:#a1a1aa;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">T&eacute;l&eacute;phone</p>
            <p style="margin:0;color:#18181b;font-size:15px;font-weight:500;">${data.phone}</p>
          </td>
        </tr>` : ""}
        ${data.address ? `
        <tr><td style="height:8px;"></td></tr>
        <tr>
          <td style="padding:12px 16px;background-color:#f4f4f5;border-radius:8px;">
            <p style="margin:0 0 4px;color:#a1a1aa;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Adresse</p>
            <p style="margin:0;color:#18181b;font-size:15px;font-weight:500;">${data.address}</p>
          </td>
        </tr>` : ""}
      </table>
      <div style="border-left:3px solid #7c3aed;padding:16px;background-color:#fafafa;border-radius:0 8px 8px 0;">
        <p style="margin:0 0 4px;color:#a1a1aa;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Message</p>
        <p style="margin:0;color:#18181b;font-size:15px;line-height:1.6;white-space:pre-wrap;">${data.message}</p>
      </div>
    `),
  }
}

function passwordResetEmail(link: string, appName: string): { subject: string; html: string } {
  return {
    subject: `Réinitialisation de mot de passe - ${appName}`,
    html: wrapTemplate("Réinitialisation", `
      <h1 style="margin:0 0 8px;color:#18181b;font-size:22px;font-weight:700;">Réinitialisation de mot de passe</h1>
      <p style="margin:0 0 24px;color:#71717a;font-size:15px;line-height:1.6;">
        Vous avez demand&eacute; la r&eacute;initialisation de votre mot de passe sur <strong style="color:#18181b;">${appName}</strong>.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
        <tr>
          <td style="background:linear-gradient(135deg,#7c3aed 0%,#c8399c 100%);border-radius:8px;">
            <a href="${link}" target="_blank" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
              R&eacute;initialiser mon mot de passe
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 8px;color:#71717a;font-size:14px;line-height:1.6;">
        Ce lien expire dans <strong>1 heure</strong>.
      </p>
      <p style="margin:0;color:#a1a1aa;font-size:13px;line-height:1.6;">
        Si vous n'avez pas demand&eacute; cette r&eacute;initialisation, vous pouvez ignorer cet email en toute s&eacute;curit&eacute;.
      </p>
    `),
  }
}

function customEmail(title: string, content: string): { subject: string; html: string } {
  return {
    subject: title,
    html: wrapTemplate(title, content),
  }
}

const TEMPLATES: Record<string, (data: any, appName: string) => { subject: string; html: string }> = {
  "verification-code": (d, app) => verificationEmail(d.code, app),
  "verification-link": (d, app) => verificationLink(d.link, app),
  "welcome": (d, app) => welcomeEmail(d.name, app),
  "contact": (d) => contactEmail(d),
  "password-reset": (d, app) => passwordResetEmail(d.link, app),
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

    let finalSubject = subject
    let finalHtml = html
    const appName = "SaveMali"

    if (template && TEMPLATES[template]) {
      const result = TEMPLATES[template](templateData || {}, appName)
      finalSubject = result.subject
      finalHtml = result.html
    }

    if (!to || !finalSubject || !finalHtml) {
      return new Response(JSON.stringify({ error: "Missing required fields: to, and either (subject + html) or (template + templateData)" }), {
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
        reply_to: replyTo || "support@savemali.com",
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
