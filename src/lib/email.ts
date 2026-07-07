function getFunctionsUrl(): string {
  try {
    const { hostname } = new URL(import.meta.env.VITE_INSFORGE_URL)
    if (!hostname.endsWith(".insforge.app")) return `${import.meta.env.VITE_INSFORGE_URL}/functions`
    const appKey = hostname.split(".")[0]
    return `https://${appKey}.function2.insforge.app`
  } catch {
    return `${import.meta.env.VITE_INSFORGE_URL}/functions`
  }
}

const FUNCTIONS_URL = getFunctionsUrl()

interface SendEmailOptions {
  to: string | string[]
  subject?: string
  html?: string
  from?: string
  replyTo?: string
  template?: string
  templateData?: Record<string, any>
}

export interface SendEmailResult {
  id?: string
  error?: string
  blocked?: boolean
  remainingTime?: number
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  try {
    const res = await fetch(`${FUNCTIONS_URL}/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options),
    })

    const data = await res.json()

    if (!res.ok) {
      return {
        error: data.error || `HTTP ${res.status}`,
        blocked: data.blocked || false,
        remainingTime: data.remainingTime,
      }
    }

    return { id: data.id }
  } catch (err: any) {
    return { error: err.message || "Failed to send email" }
  }
}

export async function sendVerificationEmail(to: string, code: string): Promise<SendEmailResult> {
  return sendEmail({
    to,
    template: "verification-code",
    templateData: { code, email: to },
  })
}

export async function sendVerificationLink(to: string, link: string): Promise<SendEmailResult> {
  return sendEmail({
    to,
    template: "verification-link",
    templateData: { link },
  })
}

export async function sendWelcomeEmail(to: string, name: string): Promise<SendEmailResult> {
  return sendEmail({
    to,
    template: "welcome",
    templateData: { name },
  })
}

export async function sendContactEmail(data: {
  name: string
  email: string
  phone?: string
  address?: string
  message: string
}): Promise<SendEmailResult> {
  return sendEmail({
    to: "savemali243@gmail.com",
    template: "contact",
    templateData: data,
  })
}

export async function sendPasswordResetEmail(to: string, code: string): Promise<SendEmailResult> {
  return sendEmail({
    to,
    template: "password-reset-code",
    templateData: { code, email: to },
  })
}

export async function sendPasswordResetLink(to: string, link: string): Promise<SendEmailResult> {
  return sendEmail({
    to,
    template: "password-reset-link",
    templateData: { link },
  })
}
