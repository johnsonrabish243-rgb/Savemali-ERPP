/**
 * TextBee OTP Client Service
 *
 * Client-side service for calling the TextBee OTP edge functions.
 * Never exposes API keys to the frontend.
 *
 * Usage:
 *   import { textbeeService } from "@/lib/textbee"
 *
 *   const result = await textbeeService.sendOTP("+243XXXXXXXXX", "login")
 *   const verify = await textbeeService.verifyOTP("+243XXXXXXXXX", "123456", "login")
 */

const INSFORGE_URL = import.meta.env.VITE_INSFORGE_URL
const ANON_KEY = import.meta.env.VITE_INSFORGE_ANON_KEY

// Derive the functions endpoint URL
function getFunctionsUrl(): string {
  try {
    const { hostname } = new URL(INSFORGE_URL)
    if (!hostname.endsWith(".insforge.app")) return `${INSFORGE_URL}/functions`
    const appKey = hostname.split(".")[0]
    return `https://${appKey}.function2.insforge.app`
  } catch {
    return `${INSFORGE_URL}/functions`
  }
}

const FUNCTIONS_URL = getFunctionsUrl()

export type OTPPurpose = "login" | "register" | "password_reset" | "2fa"

export interface OTPSendResult {
  success: boolean
  message: string
  expiresIn?: number
}

export interface OTPVerifyResult {
  success: boolean
  message: string
  purpose?: OTPPurpose
}

export interface OTPError {
  error: string
  attemptsRemaining?: number
}

/** Validate phone number in E.164 format */
export function isValidPhoneNumber(phone: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(phone)
}

/** Format a local DRC number to E.164 (+243...) */
export function formatDRCPhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-().]/g, "")
  if (cleaned.startsWith("+243")) return cleaned
  if (cleaned.startsWith("243")) return `+${cleaned}`
  if (cleaned.startsWith("0")) return `+243${cleaned.slice(1)}`
  return `+243${cleaned}`
}

class TextBeeService {
  private async callEdgeFunction<T>(
    functionName: string,
    body: Record<string, unknown>
  ): Promise<T> {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ANON_KEY}`,
      apikey: ANON_KEY,
    }

    const res = await fetch(`${FUNCTIONS_URL}/${functionName}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    })

    const text = await res.text()
    let data: any
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error(`Server returned non-JSON response (${res.status})`)
    }

    if (!res.ok) {
      throw new Error(data.error || `Request failed with status ${res.status}`)
    }

    return data as T
  }

  /**
   * Send an OTP code to a phone number.
   *
   * @param phone - Phone number in E.164 format (+243XXXXXXXXX)
   * @param purpose - Purpose of the OTP: login, register, password_reset, 2fa
   * @returns OTPSendResult with success status and expiry info
   * @throws Error with user-friendly message on failure
   */
  async sendOTP(phone: string, purpose: OTPPurpose = "login"): Promise<OTPSendResult> {
    if (!isValidPhoneNumber(phone)) {
      throw new Error("Numéro de téléphone invalide. Utilisez le format international (+243...).")
    }

    return this.callEdgeFunction<OTPSendResult>("send-otp", { phone, purpose })
  }

  /**
   * Verify an OTP code.
   *
   * @param phone - Phone number in E.164 format
   * @param code - 6-digit verification code
   * @param purpose - Purpose of the OTP
   * @returns OTPVerifyResult with success status
   * @throws Error with user-friendly message on failure
   */
  async verifyOTP(
    phone: string,
    code: string,
    purpose: OTPPurpose = "login"
  ): Promise<OTPVerifyResult> {
    if (!isValidPhoneNumber(phone)) {
      throw new Error("Numéro de téléphone invalide.")
    }

    if (!/^\d{6}$/.test(code)) {
      throw new Error("Le code doit contenir exactement 6 chiffres.")
    }

    return this.callEdgeFunction<OTPVerifyResult>("verify-otp", { phone, code, purpose })
  }

  /**
   * Resend an OTP code (same as sendOTP, but rate-limited).
   */
  async resendOTP(phone: string, purpose: OTPPurpose = "login"): Promise<OTPSendResult> {
    return this.sendOTP(phone, purpose)
  }
}

/** Singleton instance */
export const textbeeService = new TextBeeService()
