/**
 * OTP Verification Component
 *
 * A complete OTP input UI with phone number entry, 6-digit code input,
 * countdown timer, and resend functionality.
 *
 * Usage:
 *   <OTPVerification purpose="login" onSuccess={(phone) => handleSuccess(phone)} />
 */

import * as React from "react"
import { useOTP } from "@/hooks/use-otp"
import { formatDRCPhone, isValidPhoneNumber, type OTPPurpose } from "@/lib/textbee"
import { useLanguage } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Smartphone, ShieldCheck, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from "lucide-react"

interface OTPVerificationProps {
  purpose?: OTPPurpose
  onSuccess: (phone: string) => void
  onBack?: () => void
  title?: string
  description?: string
}

export function OTPVerification({
  purpose = "login",
  onSuccess,
  onBack,
  title,
  description,
}: OTPVerificationProps) {
  const { lang } = useLanguage()
  const fr = lang === "fr"
  const { sendCode, verifyCode, resendCode, loading, error, success, secondsLeft, codeSent, clearError, reset } = useOTP()

  const [step, setStep] = React.useState<"phone" | "code">("phone")
  const [phone, setPhone] = React.useState("")
  const [code, setCode] = React.useState(["", "", "", "", "", ""])
  const codeRefs = React.useRef<(HTMLInputElement | null)[]>([])

  const fullPhone = React.useMemo(() => formatDRCPhone(phone), [phone])
  const isPhoneValid = React.useMemo(() => isValidPhoneNumber(fullPhone), [fullPhone])
  const fullCode = code.join("")

  const handleSendCode = async () => {
    if (!isPhoneValid) return
    const ok = await sendCode(fullPhone, purpose)
    if (ok) setStep("code")
  }

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const newCode = [...code]
    newCode[index] = value.slice(-1)
    setCode(newCode)
    clearError()

    // Auto-advance to next input
    if (value && index < 5) {
      codeRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all 6 digits entered
    if (newCode.every((d) => d !== "") && index === 5) {
      handleVerify(newCode.join(""))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (pasted.length === 6) {
      const newCode = pasted.split("")
      setCode(newCode)
      codeRefs.current[5]?.focus()
      // Auto-submit on paste
      setTimeout(() => handleVerify(pasted), 100)
    }
  }

  const handleVerify = async (codeStr?: string) => {
    const verifyCodeStr = codeStr || fullCode
    if (verifyCodeStr.length !== 6) return
    const ok = await verifyCode(fullPhone, verifyCodeStr, purpose)
    if (ok) {
      setTimeout(() => onSuccess(fullPhone), 1000)
    }
  }

  const handleResend = async () => {
    setCode(["", "", "", "", "", ""])
    await resendCode(fullPhone, purpose)
    codeRefs.current[0]?.focus()
  }

  const handleBack = () => {
    if (step === "code") {
      setStep("phone")
      setCode(["", "", "", "", "", ""])
      reset()
    } else if (onBack) {
      onBack()
    }
  }

  const purposeLabels: Record<string, string> = {
    login: fr ? "connexion" : "login",
    register: fr ? "inscription" : "registration",
    password_reset: fr ? "réinitialisation du mot de passe" : "password reset",
    "2fa": fr ? "authentification à deux facteurs" : "two-factor authentication",
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-brand/10">
          {step === "phone" ? (
            <Smartphone className="size-6 text-brand" />
          ) : (
            <ShieldCheck className="size-6 text-brand" />
          )}
        </div>
        <CardTitle className="text-lg">
          {title || (step === "phone"
            ? (fr ? "Vérification par SMS" : "SMS Verification")
            : (fr ? "Entrez le code" : "Enter the code"))}
        </CardTitle>
        <CardDescription>
          {description || (step === "phone"
            ? (fr ? `Code de vérification pour la ${purposeLabels[purpose]}` : `Verification code for ${purposeLabels[purpose]}`)
            : (fr ? `Un code a été envoyé au ${fullPhone}. Veuillez saisir les 6 chiffres reçus.` : `A code has been sent to ${fullPhone}. Please enter the 6 digits received.`))}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {success && step === "code" && (
          <Alert className="border-success bg-success/10">
            <CheckCircle2 className="size-4 text-success" />
            <AlertDescription className="text-success">
              {fr ? "Code vérifié avec succès !" : "Code verified successfully!"}
            </AlertDescription>
          </Alert>
        )}

        {/* Step 1: Phone Number */}
        {step === "phone" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">{fr ? "Numéro de téléphone" : "Phone number"}</Label>
              <div className="flex gap-2">
                <div className="flex items-center rounded-lg border border-input bg-muted px-3 text-sm font-medium text-muted-foreground">
                  +243
                </div>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="XXXXXXXXX"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "")); clearError() }}
                  className="flex-1"
                  maxLength={10}
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {fr ? "Format international. Ex: 812345678" : "International format. Ex: 812345678"}
              </p>
            </div>

            <Button
              onClick={handleSendCode}
              disabled={!isPhoneValid || loading}
              className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
            >
              {loading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Smartphone className="mr-2 size-4" />
              )}
              {fr ? "Envoyer le code" : "Send code"}
            </Button>
          </div>
        )}

        {/* Step 2: Code Input */}
        {step === "code" && (
          <div className="space-y-4">
            {/* 6-Digit Code Input */}
            <div className="flex justify-center gap-2">
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { codeRefs.current[i] = el }}
                  type="tel"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onPaste={i === 0 ? handlePaste : undefined}
                  className="size-12 rounded-lg border border-input bg-background text-center text-lg font-bold text-foreground focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all"
                  autoFocus={i === 0}
                />
              ))}
            </div>

            {/* Countdown Timer */}
            {secondsLeft > 0 && (
              <p className="text-center text-sm text-muted-foreground">
                {fr ? "Vous pourrez renvoyer un nouveau code dans" : "You can resend a new code in"}{" "}
                <span className="font-mono font-medium text-foreground">
                  {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
                </span>
              </p>
            )}

            {/* Resend Button */}
            {secondsLeft === 0 && (
              <div className="text-center">
                <Button
                  variant="link"
                  onClick={handleResend}
                  disabled={loading}
                  className="text-brand p-0 h-auto"
                >
                  {fr ? "Renvoyer un nouveau code" : "Resend a new code"}
                </Button>
              </div>
            )}

            {/* Verify Button */}
            <Button
              onClick={() => handleVerify()}
              disabled={fullCode.length !== 6 || loading || success}
              className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
            >
              {loading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <ShieldCheck className="mr-2 size-4" />
              )}
              {fr ? "Vérifier" : "Verify"}
            </Button>

            {/* Back Button */}
            <Button variant="ghost" onClick={handleBack} className="w-full">
              <ArrowLeft className="mr-2 size-4" />
              {fr ? "Changer de numéro" : "Change number"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
