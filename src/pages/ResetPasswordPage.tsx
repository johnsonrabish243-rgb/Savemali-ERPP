import * as React from "react"
import { gsap } from "gsap"
import { Mail, KeyRound, Lock, Eye, EyeOff, ArrowLeft, CheckCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Logo } from "@/components/Logo"
import { useLanguage } from "@/lib/i18n"
import { insforge } from "@/lib/supabase"
import { detectInjection, logSecurityEvent } from "@/lib/security"
import { getPasswordStrength } from "@/lib/security"
import { cn } from "@/lib/utils"
import type { Page } from "@/App"

interface Props {
  onNavigate: (page: Page) => void
}

type Step = "email" | "code" | "new-password" | "success"

export function ResetPasswordPage({ onNavigate }: Props) {
  const { lang } = useLanguage()
  const fr = lang === "fr"
  const [step, setStep] = React.useState<Step>("email")
  const [email, setEmail] = React.useState("")
  const [code, setCode] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [showPw, setShowPw] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  const containerRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo("[data-reset-card]", { opacity: 0, y: 40, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "back.out(1.5)" })
      gsap.fromTo("[data-reset-logo]", { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" })
    }, containerRef)
    return () => ctx.revert()
  }, [])

  const pwStrength = getPasswordStrength(newPassword)

  const handleSendCode = async () => {
    if (!email) {
      setError(fr ? "Entrez votre email" : "Enter your email")
      return
    }
    if (detectInjection(email)) {
      logSecurityEvent({ type: "injection_attempt", details: `Suspicious input in reset password email: ${email}`, path: "reset-password" })
      setError(fr ? "Entrée suspecte détectée." : "Suspicious input detected.")
      return
    }
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const { error: fnError } = await insforge.auth.sendResetPasswordEmail({ email })
      if (fnError) {
        setError(fnError.message || (fr ? "Erreur lors de l'envoi" : "Error sending reset email"))
        setLoading(false)
        return
      }
      setSuccess(fr ? "Code de réinitialisation envoyé ! Vérifiez votre boîte de réception." : "Reset code sent! Check your inbox.")
      setStep("code")
    } catch {
      setError(fr ? "Erreur lors de l'envoi" : "Error sending reset email")
    } finally {
      setLoading(false)
    }
  }

  const handleExchangeCode = async () => {
    if (!code || code.length < 4) {
      setError(fr ? "Entrez le code reçu par email" : "Enter the code received by email")
      return
    }
    if (detectInjection(code)) {
      logSecurityEvent({ type: "injection_attempt", details: `Suspicious input in reset code`, path: "reset-password" })
      setError(fr ? "Entrée suspecte détectée." : "Suspicious input detected.")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { data, error: fnError } = await insforge.auth.exchangeResetPasswordToken({ email, code })
      if (fnError || !data?.token) {
        setError(fnError?.message || (fr ? "Code invalide ou expiré" : "Invalid or expired code"))
        setLoading(false)
        return
      }
      sessionStorage.setItem("savemali_reset_token", data.token)
      setStep("new-password")
    } catch {
      setError(fr ? "Erreur lors de la vérification" : "Error verifying code")
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setError(fr ? "Le mot de passe doit contenir au moins 6 caractères" : "Password must be at least 6 characters")
      return
    }
    if (detectInjection(newPassword)) {
      logSecurityEvent({ type: "injection_attempt", details: `Suspicious input in new password`, path: "reset-password" })
      setError(fr ? "Entrée suspecte détectée." : "Suspicious input detected.")
      return
    }
    const token = sessionStorage.getItem("savemali_reset_token")
    if (!token) {
      setError(fr ? "Session expirée. Recommencez." : "Session expired. Please start over.")
      setStep("email")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { error: fnError } = await insforge.auth.resetPassword({ newPassword, otp: token })
      if (fnError) {
        setError(fnError.message || (fr ? "Erreur lors de la réinitialisation" : "Error resetting password"))
        setLoading(false)
        return
      }
      sessionStorage.removeItem("savemali_reset_token")
      setSuccess(fr ? "Mot de passe réinitialisé avec succès !" : "Password reset successfully!")
      setStep("success")
    } catch {
      setError(fr ? "Erreur lors de la réinitialisation" : "Error resetting password")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div ref={containerRef} className="flex min-h-svh flex-col items-center justify-center bg-background px-4">
      <div data-reset-logo className="mb-6">
        <Logo size="lg" />
      </div>

      <Card data-reset-card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            {step === "email" && (fr ? "Réinitialisation du mot de passe" : "Reset Password")}
            {step === "code" && (fr ? "Vérification du code" : "Verify Code")}
            {step === "new-password" && (fr ? "Nouveau mot de passe" : "New Password")}
            {step === "success" && (fr ? "Succès" : "Success")}
          </CardTitle>
          <CardDescription>
            {step === "email" && (fr ? "Entrez votre email pour recevoir un code de réinitialisation" : "Enter your email to receive a reset code")}
            {step === "code" && (fr ? `Code envoyé à ${email}` : `Code sent to ${email}`)}
            {step === "new-password" && (fr ? "Choisissez un nouveau mot de passe sécurisé" : "Choose a new secure password")}
            {step === "success" && (fr ? "Votre mot de passe a été réinitialisé" : "Your password has been reset")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && step !== "success" && (
            <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
              <CheckCircle className="size-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {step === "email" && (
            <form onSubmit={(e) => { e.preventDefault(); handleSendCode() }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{fr ? "Email" : "Email"}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nom@exemple.com"
                    className="pl-10"
                    autoFocus
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={loading}>
                {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : <KeyRound className="size-4 mr-2" />}
                {fr ? "Envoyer le code" : "Send Code"}
              </Button>
            </form>
          )}

          {step === "code" && (
            <form onSubmit={(e) => { e.preventDefault(); handleExchangeCode() }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">{fr ? "Code de vérification" : "Verification Code"}</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    className="pl-10 text-center text-lg tracking-[0.3em]"
                    autoFocus
                    maxLength={6}
                    inputMode="numeric"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {fr ? "Vérifiez votre boîte de réception" : "Check your inbox"}
                </p>
              </div>
              <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={loading}>
                {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : <CheckCircle className="size-4 mr-2" />}
                {fr ? "Vérifier le code" : "Verify Code"}
              </Button>
              <button
                type="button"
                onClick={() => { setStep("email"); setError(null); setSuccess(null); setCode("") }}
                className="flex items-center gap-1 text-sm text-accent hover:underline mx-auto"
              >
                <ArrowLeft className="size-3" />
                {fr ? "Changer d'email" : "Change email"}
              </button>
            </form>
          )}

          {step === "new-password" && (
            <form onSubmit={(e) => { e.preventDefault(); handleResetPassword() }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">{fr ? "Nouveau mot de passe" : "New Password"}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    type={showPw ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={fr ? "Minimum 6 caractères" : "At least 6 characters"}
                    className="pl-10 pr-10"
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {newPassword.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={cn(
                            "h-1 flex-1 rounded-full transition-colors",
                            i <= pwStrength.score
                              ? pwStrength.score <= 2
                                ? "bg-red-500"
                                : pwStrength.score <= 3
                                ? "bg-yellow-500"
                                : "bg-green-500"
                              : "bg-muted"
                          )}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">{pwStrength.label}</p>
                  </div>
                )}
              </div>
              <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={loading}>
                {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : <Lock className="size-4 mr-2" />}
                {fr ? "Réinitialiser le mot de passe" : "Reset Password"}
              </Button>
            </form>
          )}

          {step === "success" && (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <CheckCircle className="size-8 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {fr
                  ? "Vous pouvez maintenant vous connecter avec votre nouveau mot de passe."
                  : "You can now sign in with your new password."}
              </p>
              <Button
                type="button"
                onClick={() => onNavigate("signin")}
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {fr ? "Se connecter" : "Sign In"}
              </Button>
            </div>
          )}

          {step !== "success" && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => onNavigate("signin")}
                className="flex items-center gap-1 text-sm text-accent hover:underline mx-auto"
              >
                <ArrowLeft className="size-3" />
                {fr ? "Retour à la connexion" : "Back to sign in"}
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="mt-4 text-xs text-muted-foreground text-center">
        © {new Date().getFullYear()} SaveMali. Développé par John Mocket
      </p>
    </div>
  )
}
