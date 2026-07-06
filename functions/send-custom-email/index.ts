import { createAdminClient, createClient } from "npm:@insforge/sdk";
import nodemailer from "npm:nodemailer@6.9.16";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getResetPasswordHtml(code: string, lang: string): string {
  const isFr = lang === "fr";
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f4f6f9;">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;">
  <tr><td align="center" style="padding-bottom:24px;">
    <img src="https://55h7r6yk.us-east.insforge.app/api/storage/buckets/avatars/objects/avatars%2Fsave-mali-logo%2Flogo.png?v=3a37ba1efd147a36099514335c3f374a" alt="SaveMali" width="72" height="72" style="border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,0.1);">
  </td></tr>
  <tr><td style="background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;">
    <div style="height:4px;background:linear-gradient(90deg,#c8399c,#d94fb0,#e87bc4);"></div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr><td style="padding:40px 40px 24px;text-align:center;">
      <div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#c8399c,#d94fb0);margin:0 auto 20px;">
        <span style="font-size:28px;line-height:56px;color:#ffffff;text-align:center;display:block;">&#128274;</span>
      </div>
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">${isFr ? "Réinitialisation du mot de passe" : "Password Reset"}</h1>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.5;">${isFr ? "Vous avez demandé à réinitialiser votre mot de passe. Utilisez le code ci-dessous :" : "You requested to reset your password. Use the code below:"}</p>
      <div style="background:#fdf2f8;border:2px solid #c8399c;border-radius:12px;padding:20px 40px;display:inline-block;margin-bottom:24px;">
        <span style="font-size:36px;font-weight:700;letter-spacing:10px;color:#c8399c;font-family:'Courier New',monospace;">${code}</span>
      </div>
      <p style="margin:0;color:#9ca3af;font-size:13px;">${isFr ? "Ce code expire dans 15 minutes." : "This code expires in 15 minutes."}</p>
    </td></tr>
    <tr><td style="padding:0 40px;"><div style="border-top:1px solid #f3f4f6;"></div></td></tr>
    <tr><td style="padding:24px 40px;">
      <div style="background:#fef3c7;border-radius:8px;padding:16px;border:1px solid #fcd34d;">
        <p style="margin:0;font-size:13px;color:#92400e;line-height:1.5;">
          <strong>&#9888;&#65039; ${isFr ? "Attention" : "Warning"}:</strong> ${isFr ? "Si vous n'avez pas demandé cette réinitialisation, ignorez cet email. Votre mot de passe actuel restera inchangé." : "If you did not request this reset, ignore this email. Your current password will remain unchanged."}
        </p>
      </div>
    </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:24px 40px 0;text-align:center;">
    <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">&#169; 2025 SaveMali. ${isFr ? "Tous droits réservés." : "All rights reserved."}</p>
    <p style="margin:0;font-size:11px;color:#d1d5db;">${isFr ? "Développé par" : "Developed by"} John Mocket &amp; JVisionLab</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

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

function getAdminClient() {
  return createAdminClient({
    baseUrl: Deno.env.get("INSFORGE_BASE_URL") || "https://55h7r6yk.us-east.insforge.app",
    apiKey: Deno.env.get("API_KEY") || "",
  });
}

function getAnonClient() {
  return createClient({
    baseUrl: Deno.env.get("INSFORGE_BASE_URL") || "https://55h7r6yk.us-east.insforge.app",
    anonKey: Deno.env.get("ANON_KEY") || "",
  });
}

async function handleSendCode(email: string, lang: string): Promise<Response> {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const admin = getAdminClient();

  try {
    const { error } = await admin.database
      .from("password_reset_codes")
      .insert([{
        email,
        code,
        purpose: "reset_password",
        expires_at: expiresAt,
        used: false,
      }]);

    if (error) {
      console.error("Failed to store reset code:", JSON.stringify(error));
      return new Response(JSON.stringify({ error: "Failed to store reset code", details: error }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    console.error("DB insert error:", err);
    return new Response(JSON.stringify({ error: "Failed to store reset code", details: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const subject = lang === "fr" ? "Réinitialisation du mot de passe - SaveMali" : "Password Reset - SaveMali";
  const html = getResetPasswordHtml(code, lang || "fr");
  const emailResult = await sendEmail(email, subject, html);

  if (!emailResult.success) {
    return new Response(JSON.stringify({ error: emailResult.error }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true, message: "Reset code sent" }), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

async function handleVerifyAndReset(email: string, code: string, newPassword: string): Promise<Response> {
  const admin = getAdminClient();
  const anonClient = getAnonClient();

  try {
    const { data: codes, error: queryError } = await admin.database
      .from("password_reset_codes")
      .select("*")
      .eq("email", email)
      .eq("code", code)
      .eq("purpose", "reset_password")
      .eq("used", false)
      .order("created_at", { ascending: false })
      .limit(1);

    if (queryError) {
      console.error("Query error:", JSON.stringify(queryError));
      return new Response(JSON.stringify({ error: "Erreur lors de la vérification", details: queryError }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    if (!codes || codes.length === 0) {
      return new Response(JSON.stringify({ error: "Code invalide" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const record = codes[0];

    if (new Date(record.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Code expiré. Demandez un nouveau code." }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const { error: updateError } = await admin.database
      .from("password_reset_codes")
      .update({ used: true })
      .eq("id", record.id);

    if (updateError) {
      console.error("Failed to mark code as used:", JSON.stringify(updateError));
    }

    const { error: sendError } = await anonClient.auth.sendResetPasswordEmail({
      email,
    });

    if (sendError) {
      console.error("Failed to send InsForge reset email:", JSON.stringify(sendError));
      return new Response(JSON.stringify({ error: "Échec de l'envoi du code de réinitialisation", details: sendError }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Un code de vérification a été envoyé à votre email. Utilisez ce code pour confirmer la réinitialisation.",
      requires_insforge_verification: true,
    }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("verify-and-reset error:", err);
    return new Response(JSON.stringify({ error: "Erreur lors de la réinitialisation", details: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
}

export default async function (req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { action, email, code, newPassword, lang } = body;

    if (!action) {
      return new Response(JSON.stringify({ error: "Missing 'action' field" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    if (action === "send-code") {
      if (!email) {
        return new Response(JSON.stringify({ error: "Missing 'email' field" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      return await handleSendCode(email, lang || "fr");
    }

    if (action === "verify-and-reset") {
      if (!email || !code || !newPassword) {
        return new Response(JSON.stringify({ error: "Missing required fields: email, code, newPassword" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      return await handleVerifyAndReset(email, code, newPassword);
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("custom-reset-password error:", err);
    return new Response(JSON.stringify({ error: "Internal server error", details: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
}
