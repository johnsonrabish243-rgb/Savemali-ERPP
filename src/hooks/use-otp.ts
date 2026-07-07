/**
 * useOTP Hook
 *
 * React hook for managing the OTP verification flow.
 * Handles sending, verifying, resending, and countdown timer.
 *
 * Usage:
 *   const { sendCode, verifyCode, resendCode, loading, error, secondsLeft } = useOTP()
 *
 *   await sendCode("+243XXXXXXXXX", "login")
 *   const result = await verifyCode("+243XXXXXXXXX", "123456", "login")
 */

import * as React from "react"
import { textbeeService, type OTPPurpose } from "@/lib/textbee"

interface UseOTPReturn {
  sendCode: (phone: string, purpose?: OTPPurpose) => Promise<boolean>
  verifyCode: (phone: string, code: string, purpose?: OTPPurpose) => Promise<boolean>
  resendCode: (phone: string, purpose?: OTPPurpose) => Promise<boolean>
  loading: boolean
  error: string | null
  success: boolean
  secondsLeft: number
  codeSent: boolean
  clearError: () => void
  reset: () => void
}

export function useOTP(): UseOTPReturn {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)
  const [secondsLeft, setSecondsLeft] = React.useState(0)
  const [codeSent, setCodeSent] = React.useState(false)
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null)

  // Countdown timer
  React.useEffect(() => {
    if (secondsLeft <= 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      return
    }

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [secondsLeft])

  const clearError = React.useCallback(() => setError(null), [])

  const reset = React.useCallback(() => {
    setLoading(false)
    setError(null)
    setSuccess(false)
    setSecondsLeft(0)
    setCodeSent(false)
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  const sendCode = React.useCallback(
    async (phone: string, purpose: OTPPurpose = "login"): Promise<boolean> => {
      setLoading(true)
      setError(null)
      setSuccess(false)

      try {
        const result = await textbeeService.sendOTP(phone, purpose)
        setCodeSent(true)
        setSecondsLeft(result.expiresIn ?? 60)
        setSuccess(true)
        return true
      } catch (err: any) {
        setError(err.message || "Erreur lors de l'envoi du code")
        return false
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const verifyCode = React.useCallback(
    async (phone: string, code: string, purpose: OTPPurpose = "login"): Promise<boolean> => {
      setLoading(true)
      setError(null)

      try {
        const result = await textbeeService.verifyOTP(phone, code, purpose)
        setSuccess(true)
        return true
      } catch (err: any) {
        setError(err.message || "Code de vérification invalide")
        return false
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const resendCode = React.useCallback(
    async (phone: string, purpose: OTPPurpose = "login"): Promise<boolean> => {
      if (secondsLeft > 0) {
        setError(`Veuillez patienter ${secondsLeft} secondes avant de pouvoir renvoyer un nouveau code.`)
        return false
      }

      setLoading(true)
      setError(null)
      setSuccess(false)

      try {
        const result = await textbeeService.resendOTP(phone, purpose)
        setCodeSent(true)
        setSecondsLeft(result.expiresIn ?? 60)
        setSuccess(true)
        return true
      } catch (err: any) {
        setError(err.message || "Erreur lors du renvoi du code")
        return false
      } finally {
        setLoading(false)
      }
    },
    [secondsLeft]
  )

  return {
    sendCode,
    verifyCode,
    resendCode,
    loading,
    error,
    success,
    secondsLeft,
    codeSent,
    clearError,
    reset,
  }
}
