const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")
const LOGO_URL = "https://www.savemali.online/SaveMali_Logo.png"
const SITE_URL = "https://www.savemali.online"
const SUPPORT_EMAIL = "support@savemali.online"
const FOOTER_COPY = "2026 SaveMali SARL - Developpe par John Mocket"
const FOOTER_ADDRESS = "Quartier Abbatoir, Avenue Cadastre No 321, Kalemie, Tanganyika, RDC"

const ALLOWED_ORIGINS = [
  "https://www.savemali.online",
  "https://savemali.online",
  "https://savemali.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
]

const rateLimitStore = new Map<string, { count: number; resetAt: number }>()
const MAX_CODE_REQUESTS = 4
const BLOCK_MS = 86400000

function checkRateLimit(email: string): { ok: boolean; wait?: number } {
  const k = email.toLowerCase().trim()
  const now = Date.now()
  const r = rateLimitStore.get(k)
  if (!r || now > r.resetAt) { rateLimitStore.delete(k); return { ok: true } }
  if (r.count >= MAX_CODE_REQUESTS) return { ok: false, wait: Math.ceil((r.resetAt - now) / 60000) }
  return { ok: true }
}

function bumpRate(email: string): void {
  const k = email.toLowerCase().trim()
  const now = Date.now()
  const r = rateLimitStore.get(k)
  if (!r || now > r.resetAt) rateLimitStore.set(k, { count: 1, resetAt: now + BLOCK_MS })
  else r.count++
}

function cors(origin: string | null): Record<string, string> {
  const a = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return { "Access-Control-Allow-Origin": a, "Access-Control-Allow-Methods": "POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type,Authorization" }
}

function page(title: string, body: string): string {
  return [
    '<!DOCTYPE html>',
    '<html lang="fr">',
    '<head>',
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<title>' + title + '</title>',
    '<style>',
    'body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}',
    'table,td{mso-table-lspace:0pt;mso-table-rspace:0pt}',
    'img{border:0;height:auto;line-height:100%;outline:none;text-decoration:none}',
    'body{margin:0!important;padding:0!important;width:100%!important}',
    '@media screen and (max-width:600px){',
    '.wrap{width:100%!important;padding:0 12px!important}',
    '.hdr{padding:28px 20px!important}',
    '.bdy{padding:28px 20px!important}',
    '.ftr{padding:20px 20px!important}',
    '.otp-cell{width:38px!important;height:46px!important;font-size:18px!important}',
    '}',
    '</style>',
    '</head>',
    '<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5">',
    '<tr><td align="center" style="padding:40px 16px">',
    '<table role="presentation" class="wrap" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:500px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">',
    '<tr><td class="hdr" style="background:linear-gradient(135deg,#7c3aed 0%,#a855f7 50%,#c8399c 100%);padding:40px 40px 36px;text-align:center">',
    '<img src="' + LOGO_URL + '" alt="SaveMali" width="120" style="display:block;margin:0 auto 16px;max-width:120px;height:auto;border-radius:8px">',
    '<p style="margin:0;color:rgba(255,255,255,.9);font-size:13px;letter-spacing:.5px;font-family:Arial,Helvetica,sans-serif">Gestion intelligente pour votre activite</p>',
    '</td></tr>',
    '<tr><td class="bdy" style="padding:44px 40px 40px">',
    body,
    '</td></tr>',
    '<tr><td style="padding:0 40px"><div style="height:1px;background:linear-gradient(90deg,transparent,#e4e4e7,transparent)"></div></td></tr>',
    '<tr><td class="ftr" style="padding:28px 40px 32px;text-align:center">',
    '<p style="margin:0 0 6px;color:#71717a;font-size:11px;font-weight:500;font-family:Arial,Helvetica,sans-serif">' + FOOTER_COPY + '</p>',
    '<p style="margin:0 0 10px;color:#d4d4d8;font-size:10px;font-family:Arial,Helvetica,sans-serif">' + FOOTER_ADDRESS + '</p>',
    '<p style="margin:0"><a href="' + SITE_URL + '" style="color:#7c3aed;font-size:10px;text-decoration:none;font-weight:500;font-family:Arial,Helvetica,sans-serif">' + SITE_URL + '</a> &nbsp;|&nbsp; <a href="mailto:' + SUPPORT_EMAIL + '" style="color:#7c3aed;font-size:10px;text-decoration:none;font-weight:500;font-family:Arial,Helvetica,sans-serif">' + SUPPORT_EMAIL + '</a></p>',
    '</td></tr>',
    '</table>',
    '</td></tr></table>',
    '</body></html>',
  ].join('\n')
}

function iconCircle(emoji: string, gradient: string): string {
  return '<tr><td style="text-align:center;padding-bottom:28px"><div style="display:inline-block;width:60px;height:60px;border-radius:50%;background:' + gradient + ';line-height:60px;text-align:center;box-shadow:0 6px 20px rgba(0,0,0,.15)"><span style="font-size:26px;color:#fff">' + emoji + '</span></div></td></tr>'
}

function heading(text: string): string {
  return '<tr><td style="text-align:center;padding-bottom:14px"><h1 style="margin:0;color:#18181b;font-size:22px;font-weight:700;font-family:Arial,Helvetica,sans-serif">' + text + '</h1></td></tr>'
}

function paragraph(text: string): string {
  return '<tr><td style="text-align:center;padding-bottom:32px"><p style="margin:0;color:#52525b;font-size:14px;line-height:1.7;font-family:Arial,Helvetica,sans-serif">' + text + '</p></td></tr>'
}

function otpRow(code: string): string {
  var cells = ''
  for (var i = 0; i < code.length; i++) {
    cells += '<td class="otp-cell" style="width:46px;height:54px;padding:0 ' + (i < code.length - 1 ? '5px' : '0') + '">'
      + '<div style="width:46px;height:54px;background:#fafafa;border:2px solid #e4e4e7;border-radius:12px;text-align:center;line-height:54px;font-size:24px;font-weight:700;color:#18181b;font-family:\'Courier New\',monospace">' + code[i] + '</div></td>'
  }
  return '<tr><td style="padding-bottom:32px"><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto"><tr>' + cells + '</tr></table></td></tr>'
}

function primaryBtn(href: string, label: string, grad: string): string {
  return '<tr><td style="text-align:center;padding-bottom:32px"><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto"><tr><td style="background:' + grad + ';border-radius:12px"><a href="' + href + '" target="_blank" style="display:inline-block;padding:15px 40px;color:#fff;font-size:14px;font-weight:600;text-decoration:none;font-family:Arial,Helvetica,sans-serif;letter-spacing:.3px">' + label + '</a></td></tr></table></td></tr>'
}

function notice(text: string): string {
  return '<tr><td style="padding-bottom:4px"><div style="background:#fefce8;border:1px solid #fde68a;border-radius:12px;padding:14px 18px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="width:18px;vertical-align:top;padding-top:2px;font-size:13px;color:#92400e;font-weight:700">!</td><td style="padding-left:10px"><p style="margin:0;color:#92400e;font-size:12px;line-height:1.6;font-family:Arial,Helvetica,sans-serif">' + text + '</p></td></tr></table></div></td></tr>'
}

function expiry(text: string): string {
  return '<tr><td style="text-align:center;padding-bottom:4px"><p style="margin:0;color:#71717a;font-size:13px;font-family:Arial,Helvetica,sans-serif">Ce code expire dans <strong style="color:#18181b">' + text + '</strong>.</p></td></tr>'
}

function tplVerificationCode(code: string) {
  return {
    subject: 'Verification de votre compte',
    html: page('Verification de votre compte', [
      iconCircle('&#9993;', 'linear-gradient(135deg,#7c3aed,#a855f7)'),
      heading('Verification de votre compte'),
      paragraph('Bonjour,'),
      paragraph('Merci de votre inscription. Pour activer votre compte, veuillez utiliser le code suivant :'),
      otpRow(code),
      expiry('1 minute et 30 secondes'),
      notice("Attention : Ce code est valide pour une duree de 1 minute et 30 secondes. Si le delai expire, vous devrez demander un nouveau code via la plateforme."),
      paragraph('Cordialement,<br>L\'equipe technique.'),
    ].join('')),
  }
}

function tplVerificationLink(link: string) {
  return {
    subject: 'Verification de votre email - SaveMali',
    html: page('Verification email', [
      iconCircle('&#9993;', 'linear-gradient(135deg,#7c3aed,#a855f7)'),
      heading('Verification de votre email'),
      paragraph('Cliquez sur le bouton ci-dessous pour activer votre compte SaveMali.'),
      primaryBtn(link, 'Verifier mon email', 'linear-gradient(135deg,#7c3aed,#a855f7)'),
      expiry('24 heures'),
      notice("Vous n'avez pas demande cette verification ? Ignorez cet email en toute securite. Votre compte ne sera pas cree."),
    ].join('')),
  }
}

function tplWelcome(name: string) {
  return {
    subject: 'Bienvenue sur SaveMali !',
    html: page('Bienvenue', [
      iconCircle('&#10003;', 'linear-gradient(135deg,#22c55e,#16a34a)'),
      heading('Bienvenue sur SaveMali !'),
      paragraph('Bonjour <strong style="color:#18181b">' + name + '</strong>,'),
      paragraph('Votre compte a ete cree avec succes. Accedez desormais a votre tableau de bord.'),
      primaryBtn(SITE_URL + '/signin', 'Acceder a mon tableau de bord', 'linear-gradient(135deg,#7c3aed,#a855f7)'),
      '<tr><td><div style="background:#f9fafb;border-radius:12px;padding:18px 22px;border:1px solid #f4f4f5"><p style="margin:0 0 6px;color:#18181b;font-size:13px;font-weight:600;font-family:Arial,Helvetica,sans-serif">Besoin d\'aide ?</p><p style="margin:0;color:#52525b;font-size:12px;line-height:1.6;font-family:Arial,Helvetica,sans-serif">Contactez-nous a <a href="mailto:' + SUPPORT_EMAIL + '" style="color:#7c3aed;text-decoration:none">' + SUPPORT_EMAIL + '</a></p></div></td></tr>',
    ].join('')),
  }
}

function tplContact(d: { name: string; email: string; phone?: string; address?: string; message: string }) {
  var rows = ''
  rows += '<tr><td style="padding:14px 18px;border-bottom:1px solid #f4f4f5"><p style="margin:0 0 3px;color:#a1a1aa;font-size:9px;text-transform:uppercase;letter-spacing:1.2px;font-weight:600;font-family:Arial,Helvetica,sans-serif">Nom</p><p style="margin:0;color:#18181b;font-size:14px;font-weight:500;font-family:Arial,Helvetica,sans-serif">' + d.name + '</p></td></tr>'
  rows += '<tr><td style="padding:14px 18px;border-bottom:1px solid #f4f4f5"><p style="margin:0 0 3px;color:#a1a1aa;font-size:9px;text-transform:uppercase;letter-spacing:1.2px;font-weight:600;font-family:Arial,Helvetica,sans-serif">Email</p><p style="margin:0;color:#7c3aed;font-size:14px;font-weight:500;font-family:Arial,Helvetica,sans-serif">' + d.email + '</p></td></tr>'
  if (d.phone) rows += '<tr><td style="padding:14px 18px;border-bottom:1px solid #f4f4f5"><p style="margin:0 0 3px;color:#a1a1aa;font-size:9px;text-transform:uppercase;letter-spacing:1.2px;font-weight:600;font-family:Arial,Helvetica,sans-serif">Telephone</p><p style="margin:0;color:#18181b;font-size:14px;font-weight:500;font-family:Arial,Helvetica,sans-serif">' + d.phone + '</p></td></tr>'
  if (d.address) rows += '<tr><td style="padding:14px 18px"><p style="margin:0 0 3px;color:#a1a1aa;font-size:9px;text-transform:uppercase;letter-spacing:1.2px;font-weight:600;font-family:Arial,Helvetica,sans-serif">Adresse</p><p style="margin:0;color:#18181b;font-size:14px;font-weight:500;font-family:Arial,Helvetica,sans-serif">' + d.address + '</p></td></tr>'
  return {
    subject: 'Nouveau message - ' + d.name,
    html: page('Message de contact', [
      heading('Nouveau message de contact'),
      '<tr><td style="padding-bottom:20px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9fafb;border-radius:12px;overflow:hidden;border:1px solid #f4f4f5">' + rows + '</table></td></tr>',
      '<tr><td><div style="border-left:3px solid #7c3aed;padding:18px 22px;background:#f9fafb;border-radius:0 12px 12px 0"><p style="margin:0 0 5px;color:#a1a1aa;font-size:9px;text-transform:uppercase;letter-spacing:1.2px;font-weight:600;font-family:Arial,Helvetica,sans-serif">Message</p><p style="margin:0;color:#18181b;font-size:14px;line-height:1.7;white-space:pre-wrap;font-family:Arial,Helvetica,sans-serif">' + d.message + '</p></div></td></tr>',
    ].join('')),
  }
}

function tplPasswordResetCode(code: string) {
  return {
    subject: 'Code de reinitialisation - SaveMali',
    html: page('Reinitialisation de mot de passe', [
      iconCircle('&#128274;', 'linear-gradient(135deg,#f59e0b,#f97316)'),
      heading('Reinitialisation de mot de passe'),
      paragraph('Vous avez demande la reinitialisation de votre mot de passe. Entrez le code a 6 chiffres ci-dessous.'),
      otpRow(code),
      expiry('1 min 30 s'),
      notice("Si vous n'avez pas demande cette reinitialisation, ignorez cet email. Votre mot de passe actuel restera inchange."),
    ].join('')),
  }
}

function tplPasswordResetLink(link: string) {
  return {
    subject: 'Reinitialisation de mot de passe - SaveMali',
    html: page('Reinitialisation de mot de passe', [
      iconCircle('&#128274;', 'linear-gradient(135deg,#f59e0b,#f97316)'),
      heading('Reinitialisation de mot de passe'),
      paragraph('Cliquez sur le bouton ci-dessous pour creer un nouveau mot de passe.'),
      primaryBtn(link, 'Reinitialiser mon mot de passe', 'linear-gradient(135deg,#f59e0b,#f97316)'),
      expiry('1 heure'),
      notice("Si vous n'avez pas demande cette reinitialisation, ignorez cet email. Votre mot de passe actuel restera inchange."),
    ].join('')),
  }
}

function tplInvite(d: { inviterName: string; workspaceName: string; role: string; inviteLink: string }) {
  return {
    subject: 'Invitation - Rejoignez ' + d.workspaceName + ' sur SaveMali',
    html: page('Invitation', [
      iconCircle('&#128101;', 'linear-gradient(135deg,#7c3aed,#a855f7)'),
      heading('Vous etes invite !'),
      paragraph('<strong style="color:#18181b">' + d.inviterName + '</strong> vous invite a rejoindre l\'equipe sur SaveMali.'),
      '<tr><td style="text-align:center;padding-bottom:32px"><div style="display:inline-block;background:#f9fafb;border:1px solid #f4f4f5;border-radius:12px;padding:16px 28px"><p style="margin:0 0 4px;color:#a1a1aa;font-size:9px;text-transform:uppercase;letter-spacing:1.2px;font-weight:600;font-family:Arial,Helvetica,sans-serif">Workspace</p><p style="margin:0;color:#18181b;font-size:16px;font-weight:600;font-family:Arial,Helvetica,sans-serif">' + d.workspaceName + '</p><p style="margin:5px 0 0;color:#7c3aed;font-size:13px;font-weight:500;text-transform:capitalize;font-family:Arial,Helvetica,sans-serif">' + d.role + '</p></div></td></tr>',
      primaryBtn(d.inviteLink, 'Rejoindre l\'equipe', 'linear-gradient(135deg,#7c3aed,#a855f7)'),
      expiry('7 jours'),
      notice("Vous n'avez pas demande cette invitation ? Ignorez cet email en toute securite."),
    ].join('')),
  }
}

function tplMemberJoined(d: { memberName: string; workspaceName: string; role: string }) {
  return {
    subject: d.memberName + ' a rejoint ' + d.workspaceName,
    html: page('Nouveau membre', [
      iconCircle('&#10003;', 'linear-gradient(135deg,#22c55e,#16a34a)'),
      heading('Nouveau membre dans l\'equipe'),
      paragraph('<strong style="color:#18181b">' + d.memberName + '</strong> a rejoint le workspace <strong style="color:#18181b">' + d.workspaceName + '</strong> en tant que <strong style="color:#7c3aed">' + d.role + '</strong>.'),
      '<tr><td><div style="background:#f9fafb;border-radius:12px;padding:18px 22px;border:1px solid #f4f4f5"><p style="margin:0;color:#52525b;font-size:13px;line-height:1.6;font-family:Arial,Helvetica,sans-serif">Vous pouvez gerer les permissions de ce membre depuis le panneau d\'administration.</p></div></td></tr>',
    ].join('')),
  }
}

const TEMPLATES: Record<string, (d: any) => { subject: string; html: string }> = {
  'verification-code': (d) => tplVerificationCode(d.code),
  'verification-link': (d) => tplVerificationLink(d.link),
  'welcome': (d) => tplWelcome(d.name),
  'contact': (d) => tplContact(d),
  'password-reset-code': (d) => tplPasswordResetCode(d.code),
  'password-reset-link': (d) => tplPasswordResetLink(d.link),
  'invite': (d) => tplInvite(d),
  'member-joined': (d) => tplMemberJoined(d),
}

export default async function handler(req: Request): Promise<Response> {
  const h = cors(req.headers.get('origin'))
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h })
  if (req.method !== 'POST') return new Response('{"error":"Method not allowed"}', { status: 405, headers: { ...h, 'Content-Type': 'application/json' } })
  if (!RESEND_API_KEY) return new Response('{"error":"RESEND_API_KEY not configured"}', { status: 500, headers: { ...h, 'Content-Type': 'application/json' } })

  try {
    const body = await req.json()
    const { to, subject, html, from, replyTo, template, templateData } = body

    const codeTpls = ['verification-code', 'password-reset-code']
    if (template && codeTpls.includes(template) && templateData?.email) {
      const rc = checkRateLimit(templateData.email)
      if (!rc.ok) return new Response(JSON.stringify({ error: 'Trop de demandes. Reessayez demain.', blocked: true, remainingTime: rc.wait }), { status: 429, headers: { ...h, 'Content-Type': 'application/json' } })
      bumpRate(templateData.email)
    }

    let subj = subject, content = html
    if (template && TEMPLATES[template]) { const r = TEMPLATES[template](templateData || {}); subj = r.subject; content = r.html }
    if (!to || !subj || !content) return new Response('{"error":"Missing required fields"}', { status: 400, headers: { ...h, 'Content-Type': 'application/json' } })

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: from || 'SaveMali <noreply@savemali.online>',
        to: Array.isArray(to) ? to : [to],
        subject: subj,
        html: content,
        reply_to: replyTo || SUPPORT_EMAIL,
      }),
    })
    const data = await res.json()
    if (!res.ok) { console.error('[send-email]', data); return new Response(JSON.stringify({ error: data.message || 'Send failed' }), { status: res.status, headers: { ...h, 'Content-Type': 'application/json' } }) }
    return new Response(JSON.stringify({ id: data.id }), { status: 200, headers: { ...h, 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error('[send-email]', e)
    return new Response('{"error":"Internal server error"}', { status: 500, headers: { ...h, 'Content-Type': 'application/json' } })
  }
}
