import * as React from "react"
import { gsap } from "gsap"
import { Mail, Lock, Eye, EyeOff, AlertCircle, KeyRound, MailCheck, Loader2, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Logo } from "@/components/Logo"
import { useLanguage } from "@/lib/i18n"
import { insforge } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { trackLoginAttempt, getLoginAttempts, detectInjection, logSecurityEvent } from "@/lib/security"
import { isUserLockedOut } from "@/hooks/use-security"
import { logAudit } from "@/lib/audit"
import { ModeToggle } from "@/components/mode-toggle"
import type { Page } from "@/App"

interface Props {
  onNavigate: (page: Page) => void
}

export function SignInPage({ onNavigate }: Props) {
  const { t, lang } = useLanguage()
  const { checkAuth } = useAuth()
  const fr = lang === "fr"
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [showPw, setShowPw] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [emailNotVerified, setEmailNotVerified] = React.useState(false)
  const [resendLoading, setResendLoading] = React.useState(false)
  const [resendSuccess, setResendSuccess] = React.useState(false)
  const [emailVerified, setEmailVerified] = React.useState(false)

  // Code-based verification states
  const [showVerifyCode, setShowVerifyCode] = React.useState(false)
  const [verifyCode, setVerifyCode] = React.useState(["", "", "", "", "", ""])
  const verifyCodeRefs = React.useRef<(HTMLInputElement | null)[]>([])
  const [verifying, setVerifying] = React.useState(false)
  const [verifyError, setVerifyError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const status = params.get("insforge_status")
    const type = params.get("insforge_type")
    if (status === "success" && type === "verify_email") {
      setEmailVerified(true)
      window.history.replaceState({}, "", window.location.pathname)
    }
  }, [])

  const containerRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo("[data-signin-card]", { opacity: 0, y: 40, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "back.out(1.5)" })
      gsap.fromTo("[data-signin-logo]", { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" })
    }, containerRef)
    return () => ctx.revert()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (detectInjection(email) || detectInjection(password)) {
      logSecurityEvent({ type: "injection_attempt", details: `Suspicious input in login: ${email}`, path: "signin" })
      setError(fr ? "Entr\u00e9e suspecte d\u00e9tect\u00e9e." : "Suspicious input detected.")
      return
    }

    if (isUserLockedOut()) {
      const { remainingTime } = getLoginAttempts()
      setError(fr
        ? `Trop de tentatives. R\u00e9essayez dans ${Math.ceil(remainingTime / 60)} min.`
        : `Too many attempts. Retry in ${Math.ceil(remainingTime / 60)} min.`)
      return
    }

    const { locked, remainingTime } = getLoginAttempts()
    if (locked) {
      setError(fr ? `Trop de tentatives. R\u00e9essayez dans ${remainingTime}s.` : `Too many attempts. Retry in ${remainingTime}s.`)
      return
    }
    setError(null)
    setLoading(true)
    try {
      const { data: signInData, error: signInError } = await insforge.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError
      const uid = signInData?.user?.id
      if (uid) {
        const { data: member } = await insforge.database.from("workspace_members").select("status").eq("user_id", uid).maybeSingle()
        if (member && ((member as any).status === "blocked" || (member as any).status === "suspended")) {
          await insforge.auth.signOut()
          setError(fr ? "Compte suspendu. Contactez l'administrateur du workspace." : "Account suspended. Contact your workspace administrator.")
          setLoading(false)
          return
        }
      }
      trackLoginAttempt(true)
      sessionStorage.setItem("savemali_just_logged_in", "1")
      await logAudit({ action: "login", actor_email: email, metadata: { success: true } })
      await checkAuth()
      onNavigate("dashboard")
    } catch (err: any) {
      if (err?.statusCode === 403 || (err?.message || "").toLowerCase().includes("email not confirmed") || (err?.message || "").toLowerCase().includes("email not verified")) {
        setEmailNotVerified(true)
        setError(fr ? "Email non v\u00e9rifi\u00e9. V\u00e9rifiez votre bo\u00eete de r\u00e9ception." : "Email not verified. Check your inbox.")
      } else {
        const result = trackLoginAttempt(false)
        if (result.blocked) {
          setError(fr ? "Trop de tentatives. R\u00e9essayez dans 15 min." : "Too many attempts. Retry in 15 min.")
        } else {
          const remaining = result.remainingAttempts
          const hint = remaining > 0
            ? (fr ? ` (${remaining} tentative${remaining > 1 ? "s" : ""} restante${remaining > 1 ? "s" : ""})` : ` (${remaining} attempt${remaining > 1 ? "s" : ""} remaining)`)
            : ""
          setError((err.message || t.auth.error) + hint)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    if (!email) return
    setResendLoading(true)
    setResendSuccess(false)
    try {
      // Show code input UI
      setShowVerifyCode(true)
      setVerifyError(null)
      setVerifyCode(["", "", "", "", "", ""])
      // Send verification code via InsForge SDK
      const { error } = await insforge.auth.resendVerificationEmail({
        email,
        redirectTo: `${window.location.origin}/signin`,
      })
      if (error) {
        const msg = (error.message || "").toLowerCase()
        if (msg.includes("too many") || msg.includes("rate") || msg.includes("block")) {
          setError(fr
            ? "Trop de demandes. Vous avez d\u00e9pass\u00e9 la limite de 4 tentatives. Veuillez r\u00e9essayer demain."
            : "Too many requests. You have exceeded the 4 attempt limit. Please try again tomorrow.")
          setShowVerifyCode(false)
        } else {
          setError(fr ? "Erreur lors de l'envoi. R\u00e9essayez." : "Failed to resend. Try again.")
          setShowVerifyCode(false)
        }
      } else {
        setResendSuccess(true)
      }
    } catch (err: any) {
      if (err?.blocked) {
        setError(fr
          ? `Trop de demandes. Votre session est bloqu\u00e9e jusqu'au lendemain. Temps restant: ${err.remainingTime || 1440} min.`
          : `Too many requests. Your session is blocked until tomorrow. Remaining time: ${err.remainingTime || 1440} min.`)
        setShowVerifyCode(false)
      } else {
        setError(fr ? "Erreur lors de l'envoi. R\u00e9essayez." : "Failed to resend. Try again.")
        setShowVerifyCode(false)
      }
    } finally {
      setResendLoading(false)
    }
  }

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const newCode = [...verifyCode]
    newCode[index] = value.slice(-1)
    setVerifyCode(newCode)
    setVerifyError(null)
    if (value && index < 5) {
      verifyCodeRefs.current[index + 1]?.focus()
    }
    if (newCode.every((d) => d !== "") && index === 5) {
      handleVerifyCode(newCode.join(""))
    }
  }

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !verifyCode[index] && index > 0) {
      verifyCodeRefs.current[index - 1]?.focus()
    }
  }

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (pasted.length === 6) {
      const newCode = pasted.split("")
      setVerifyCode(newCode)
      verifyCodeRefs.current[5]?.focus()
      setTimeout(() => handleVerifyCode(pasted), 100)
    }
  }

  const handleVerifyCode = async (codeStr?: string) => {
    const code = codeStr || verifyCode.join("")
    if (code.length !== 6) return
    setVerifying(true)
    setVerifyError(null)
    try {
      const { data, error: verifyError } = await insforge.auth.verifyEmail({ email, otp: code })
      if (verifyError) {
        setVerifyError(verifyError.message || (fr ? "Code invalide ou expir\u00e9" : "Invalid or expired code"))
        setVerifying(false)
        return
      }
      setEmailVerified(true)
      setShowVerifyCode(false)
    } catch (err: any) {
      setVerifyError(err.message || (fr ? "Erreur de v\u00e9rification" : "Verification error"))
    } finally {
      setVerifying(false)
    }
  }

  const handleResendCode = async () => {
    try {
      const { error } = await insforge.auth.resendVerificationEmail({
        email,
        redirectTo: `${window.location.origin}/signin`,
      })
      if (error) {
        const msg = (error.message || "").toLowerCase()
        if (msg.includes("too many") || msg.includes("rate") || msg.includes("block")) {
          setVerifyError(fr
            ? "Trop de demandes. Vous avez d\u00e9pass\u00e9 la limite de 4 tentatives. Veuillez r\u00e9essayer demain."
            : "Too many requests. You have exceeded the 4 attempt limit. Please try again tomorrow.")
        }
      } else {
        setResendSuccess(true)
      }
    } catch (err: any) {
      if (err?.blocked) {
        setVerifyError(fr
          ? `Trop de demandes. Votre session est bloqu\u00e9e jusqu'au lendemain.`
          : `Too many requests. Your session is blocked until tomorrow.`)
      }
    }
  }

  return (
    <div ref={containerRef} className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-4">
      <div className="absolute right-4 top-4">
        <ModeToggle />
      </div>

      <div data-signin-logo className="mb-4">
        <button onClick={() => onNavigate("home")}>
          <Logo size="lg" />
        </button>
      </div>

      <Card data-signin-card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-bold text-foreground">{t.auth.signIn}</CardTitle>
        </CardHeader>
        <CardContent>
          {emailVerified ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <MailCheck className="size-6 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-sm text-foreground">
                {fr ? "Votre email a \u00e9t\u00e9 v\u00e9rifi\u00e9 avec succ\u00e8s ! Vous pouvez maintenant vous connecter." : "Your email has been verified successfully! You can now sign in."}
              </p>
              <Button
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={() => setEmailVerified(false)}
              >
                {fr ? "Se connecter" : "Sign in"}
              </Button>
            </div>
          ) : showVerifyCode ? (
            <div className="space-y-4">
              <div className="text-center">
                <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-accent/10">
                  <ShieldCheck className="size-6 text-accent" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  {fr ? "Code de v\u00e9rification" : "Verification code"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {fr ? `Envoy\u00e9 \u00e0 ${email}` : `Sent to ${email}`}
                </p>
              </div>

              {verifyError && (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertDescription className="text-sm">{verifyError}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-center gap-2">
                {verifyCode.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { verifyCodeRefs.current[i] = el }}
                    type="tel"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(i, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(i, e)}
                    onPaste={i === 0 ? handleCodePaste : undefined}
                    className="size-12 rounded-lg border border-input bg-background text-center text-lg font-bold text-foreground focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              <p className="text-center text-xs text-muted-foreground">
                {fr ? "Le code expire dans 1 minute 30 secondes" : "The code expires in 1 minute 30 seconds"}
              </p>

              <Button
                onClick={() => handleVerifyCode()}
                disabled={verifyCode.join("").length !== 6 || verifying}
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90 gap-2"
              >
                {verifying ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                {fr ? "V\u00e9rifier" : "Verify"}
              </Button>

              <div className="flex flex-col gap-2">
                <Button variant="ghost" onClick={handleResendCode} className="w-full text-accent">
                  {fr ? "Renvoyer le code" : "Resend code"}
                </Button>
                <Button variant="ghost" onClick={() => { setShowVerifyCode(false); setVerifyCode(["", "", "", "", "", ""]); setVerifyError(null) }} className="w-full">
                  {fr ? "Retour" : "Back"}
                </Button>
              </div>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {emailNotVerified && (
              <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-accent">
                  <MailCheck className="size-4" />
                  {fr ? "Email non v\u00e9rifi\u00e9" : "Email not verified"}
                </div>
                {resendSuccess ? (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    {fr ? "Email de v\u00e9rification renvoy\u00e9 ! V\u00e9rifiez votre bo\u00eete." : "Verification email resent! Check your inbox."}
                  </p>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={handleResendVerification}
                    disabled={resendLoading || !email}
                  >
                    {resendLoading ? <Loader2 className="size-3 animate-spin" /> : <MailCheck className="size-3" />}
                    {fr ? "Renvoyer l'email de v\u00e9rification" : "Resend verification email"}
                  </Button>
                )}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-foreground">{t.auth.email}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9 text-foreground" required autoComplete="email" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-foreground">{t.auth.password}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9 pr-9 text-foreground" required autoComplete="current-password" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={loading}>
              {loading ? t.auth.loading : t.auth.signIn}
            </Button>
            <div className="flex items-center justify-between text-sm">
              <button type="button" onClick={() => onNavigate("signup")} className="text-accent hover:underline">
                {t.auth.noAccount} {t.auth.signUp}
              </button>
              <button
                type="button"
                onClick={() => onNavigate("reset-password")}
                className="flex items-center gap-1 text-accent hover:underline"
              >
                <KeyRound className="size-3" />
                {t.auth.forgotPassword}
              </button>
            </div>
          </form>
          )}
        </CardContent>
      </Card>

      <p className="mt-4 text-xs text-muted-foreground text-center">
        \u00a9 {new Date().getFullYear()} SaveMali SARL &mdash; D\u00e9velopp\u00e9 par John Mocket
      </p>
    </div>
  )
}
