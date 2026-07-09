import * as React from "react"
import { gsap } from "gsap"
import { Mail, Lock, Eye, EyeOff, AlertCircle, KeyRound, MailCheck, Loader2, ShieldCheck, ChevronRight } from "lucide-react"
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
  const [resendCooldown, setResendCooldown] = React.useState(0)

  // Code-based verification states
  const [showVerifyCode, setShowVerifyCode] = React.useState(false)
  const [verifyCode, setVerifyCode] = React.useState(["", "", "", "", "", ""])
  const verifyCodeRefs = React.useRef<(HTMLInputElement | null)[]>([])
  const [verifying, setVerifying] = React.useState(false)
  const [verifyError, setVerifyError] = React.useState<string | null>(null)

  // Resend cooldown timer
  React.useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown > 0])

  // Redirect after email verification (for link-based fallback)
  const [showTransition, setShowTransition] = React.useState(false)
  const [redirectCountdown, setRedirectCountdown] = React.useState(4)
  const [redirectTarget, setRedirectTarget] = React.useState<string>("dashboard")

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const status = params.get("insforge_status")
    const type = params.get("insforge_type")
    if (status === "success" && type === "verify_email") {
      window.history.replaceState({}, "", window.location.pathname)
      setEmailVerified(true)
    }
  }, [])

  // Auto-redirect countdown
  React.useEffect(() => {
    if (!showTransition) return
    const timeout = setTimeout(() => {
      onNavigate(redirectTarget as Page)
    }, 3500)
    return () => clearTimeout(timeout)
  }, [showTransition, redirectTarget, onNavigate])

  // Countdown timer for transition card
  React.useEffect(() => {
    if (!showTransition || redirectCountdown <= 0) return
    const timer = setTimeout(() => setRedirectCountdown((p) => p - 1), 1000)
    return () => clearTimeout(timer)
  }, [showTransition, redirectCountdown])

  const containerRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo("[data-signin-card]", { opacity: 0, y: 40, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "back.out(1.5)" })
      gsap.fromTo("[data-signin-logo]", { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" })
    }, containerRef)
    return () => ctx.revert()
  }, [])

  // Handle verify_email query parameter (from email link)
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const verifyEmail = params.get("verify_email")
    if (verifyEmail) {
      window.history.replaceState({}, "", window.location.pathname)
      setEmail(verifyEmail)
      setEmailNotVerified(true)
      setShowVerifyCode(true)
      setVerifyCode(["", "", "", "", "", ""])
      setError(fr ? "Email non verifie. Entrez le code recu par email." : "Email not verified. Enter the code sent to your email.")
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (detectInjection(email) || detectInjection(password)) {
      logSecurityEvent({ type: "injection_attempt", details: `Suspicious input in login: ${email}`, path: "signin" })
      setError(fr ? "Entrée suspecte détectée." : "Suspicious input detected.")
      return
    }

    if (isUserLockedOut()) {
      const { remainingTime } = getLoginAttempts()
      setError(fr
        ? `Trop de tentatives. Réessayez dans ${Math.ceil(remainingTime / 60)} min.`
        : `Too many attempts. Retry in ${Math.ceil(remainingTime / 60)} min.`)
      return
    }

    const { locked, remainingTime } = getLoginAttempts()
    if (locked) {
      setError(fr ? `Trop de tentatives. Réessayez dans ${remainingTime}s.` : `Too many attempts. Retry in ${remainingTime}s.`)
      return
    }
    setError(null)
    setLoading(true)
    try {
      const { data: signInData, error: signInError } = await insforge.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError
      if (signInData?.refreshToken) {
        localStorage.setItem("savemali_refresh_token", signInData.refreshToken)
      }
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
      const msg = (err?.message || "").toLowerCase()
      if (msg.includes("email") && (msg.includes("verified") || msg.includes("confirm"))) {
        setEmailNotVerified(true)
      }
      const result = trackLoginAttempt(false)
      if (result.blocked) {
        setError(fr ? "Trop de tentatives. Réessayez dans 15 min." : "Too many attempts. Retry in 15 min.")
      } else {
        const remaining = result.remainingAttempts
        const hint = remaining > 0
          ? (fr ? ` (${remaining} tentative${remaining > 1 ? "s" : ""} restante${remaining > 1 ? "s" : ""})` : ` (${remaining} attempt${remaining > 1 ? "s" : ""} remaining)`)
          : ""
        setError((err.message || t.auth.error) + hint)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    if (!email || resendCooldown > 0) return
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
            ? "Trop de demandes. Vous avez dépassé la limite de 4 tentatives. Veuillez réessayer demain."
            : "Too many requests. You have exceeded the 4 attempt limit. Please try again tomorrow.")
          setShowVerifyCode(false)
        } else {
          setError(error.message || (fr ? "Erreur lors de l'envoi. Réessayez." : "Failed to resend. Try again."))
          setShowVerifyCode(false)
        }
        setResendCooldown(60)
      } else {
        setResendSuccess(true)
        setResendCooldown(60)
        setTimeout(() => setResendSuccess(false), 5000)
      }
    } catch (err: any) {
      if (err?.blocked) {
        setError(fr
          ? `Trop de demandes. Votre session est bloquée jusqu'au lendemain. Temps restant: ${err.remainingTime || 1440} min.`
          : `Too many requests. Your session is blocked until tomorrow. Remaining time: ${err.remainingTime || 1440} min.`)
        setShowVerifyCode(false)
      } else {
        setError(err?.message || (fr ? "Erreur lors de l'envoi. Réessayez." : "Failed to resend. Try again."))
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
      const { error: verifyError } = await insforge.auth.verifyEmail({ email, otp: code })
      if (verifyError) {
        setVerifyError(verifyError.message || (fr ? "Code invalide ou expiré" : "Invalid or expired code"))
        setVerifying(false)
        return
      }

      // Try to establish session and get user ID
      let uid = ""
      if (password) {
        try {
          const { data: signInData } = await insforge.auth.signInWithPassword({ email, password })
          if (signInData?.refreshToken) {
            localStorage.setItem("savemali_refresh_token", signInData.refreshToken)
          }
          uid = signInData?.user?.id || ""
        } catch {
          // signInWithPassword may fail if verifyEmail already established a session
        }
      }
      if (!uid) {
        try {
          const { data: userData } = await insforge.auth.getCurrentUser()
          uid = userData?.user?.id || ""
        } catch {}
      }

      try {
        const raw = localStorage.getItem("savemali_pending_ws")
        if (raw) {
          const pending = JSON.parse(raw)
          if (uid) {
            const { data: existing } = await insforge.database.from("workspaces").select("id").eq("owner_id", uid).maybeSingle()
            if (!existing) {
              await insforge.database.from("workspaces").insert([{ owner_id: uid, name: pending.name, type: pending.type }])
            }
          }
          localStorage.removeItem("savemali_pending_ws")
          await checkAuth()
          const target = pending.type === "pharmacy" ? "pharmacy" : "dashboard"
          setRedirectTarget(target)
          setShowTransition(true)
          return
        }
      } catch {}
      await checkAuth()
      setRedirectTarget("dashboard")
      setShowTransition(true)
    } catch (err: any) {
      setVerifyError(err.message || (fr ? "Erreur de vérification" : "Verification error"))
    } finally {
      setVerifying(false)
    }
  }

  const handleResendCode = async () => {
    if (resendCooldown > 0) return
    setVerifyCode(["", "", "", "", "", ""])
    setVerifyError(null)
    setResendSuccess(false)
    try {
      const { error } = await insforge.auth.resendVerificationEmail({
        email,
        redirectTo: `${window.location.origin}/signin`,
      })
      if (error) {
        const msg = (error.message || "").toLowerCase()
        if (msg.includes("too many") || msg.includes("rate") || msg.includes("block")) {
          setVerifyError(fr
            ? "Trop de demandes. Vous avez dépassé la limite de 4 tentatives. Veuillez réessayer demain."
            : "Too many requests. You have exceeded the 4 attempt limit. Please try again tomorrow.")
        } else {
          setVerifyError(error.message || (fr ? "Erreur lors de l'envoi du code" : "Error sending code"))
        }
        setResendCooldown(60)
      } else {
        setResendSuccess(true)
        setResendCooldown(60)
        setTimeout(() => setResendSuccess(false), 5000)
      }
    } catch (err: any) {
      if (err?.blocked) {
        setVerifyError(fr
          ? `Trop de demandes. Votre session est bloquée jusqu'au lendemain.`
          : `Too many requests. Your session is blocked until tomorrow.`)
      } else {
        setVerifyError(err?.message || (fr ? "Erreur lors de l'envoi du code" : "Error sending code"))
      }
      setResendCooldown(60)
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
          {showTransition ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <MailCheck className="size-8 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-sm font-medium text-foreground">
                {fr ? "Merci pour votre inscription !" : "Thank you for signing up!"}
              </p>
              <p className="text-xs text-muted-foreground">
                {fr
                  ? "Votre compte a été créé avec succès. Vous allez être redirigé vers votre espace personnel dans quelques secondes..."
                  : "Your account has been created successfully. You will be redirected to your workspace in a few seconds..."}
              </p>
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin text-accent" />
                <p className="text-xs text-muted-foreground">
                  {fr ? "Redirection dans" : "Redirecting in"} <span className="font-bold text-foreground">{redirectCountdown}</span> {fr ? "secondes..." : "seconds..."}
                </p>
              </div>
              <Button
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90 gap-2"
                onClick={async () => { await checkAuth(); onNavigate(redirectTarget as Page) }}
              >
                {fr ? "Aller maintenant" : "Go now"} <ChevronRight className="size-4" />
              </Button>
            </div>
          ) : showVerifyCode ? (
            <div className="space-y-4">
              <div className="text-center">
                <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-accent/10">
                  <ShieldCheck className="size-6 text-accent" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  {fr ? "Code de vérification" : "Verification code"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {fr ? `Envoyé à ${email}` : `Sent to ${email}`}
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
                {fr ? "Vérifier" : "Verify"}
              </Button>

              <div className="flex flex-col gap-2">
                {resendSuccess && (
                  <p className="text-center text-xs text-green-600 dark:text-green-400">
                    {fr ? "Code renvoyé avec succès !" : "Code resent successfully!"}
                  </p>
                )}
                <Button
                  variant="ghost"
                  onClick={handleResendCode}
                  disabled={resendCooldown > 0}
                  className="w-full text-accent"
                >
                  {resendCooldown > 0
                    ? `${fr ? "Renvoyer dans" : "Resend in"} ${resendCooldown}s`
                    : (fr ? "Renvoyer le code" : "Resend code")}
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
                  {fr ? "Email non vérifié" : "Email not verified"}
                </div>
                {resendSuccess ? (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    {fr ? "Email de vérification renvoyé ! Vérifiez votre boîte." : "Verification email resent! Check your inbox."}
                  </p>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={handleResendVerification}
                    disabled={resendLoading || !email || resendCooldown > 0}
                  >
                    {resendLoading ? <Loader2 className="size-3 animate-spin" /> : <MailCheck className="size-3" />}
                    {resendCooldown > 0
                      ? `${fr ? "Renvoyer dans" : "Resend in"} ${resendCooldown}s`
                      : (fr ? "Renvoyer l'email de vérification" : "Resend verification email")}
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
        © {new Date().getFullYear()} SaveMali SARL &mdash; Développé par John Mocket
      </p>
    </div>
  )
}
