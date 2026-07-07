import * as React from "react"
import { gsap } from "gsap"
import { Mail, Lock, Eye, EyeOff, AlertCircle, KeyRound } from "lucide-react"
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
import { SavemaliCaptcha } from "@/components/SavemaliCaptcha"
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

  const containerRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo("[data-signin-card]", { opacity: 0, y: 40, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "back.out(1.5)" })
      gsap.fromTo("[data-signin-logo]", { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" })
    }, containerRef)
    return () => ctx.revert()
  }, [])

  const [captchaOk, setCaptchaOk] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Injection detection
    if (detectInjection(email) || detectInjection(password)) {
      logSecurityEvent({ type: "injection_attempt", details: `Suspicious input in login: ${email}`, path: "signin" })
      setError(fr ? "Entrée suspecte détectée." : "Suspicious input detected.")
      return
    }

    // Check lockout
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
      setCaptchaOk(false)
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
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
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
            <SavemaliCaptcha onVerify={() => setCaptchaOk(true)} />
            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={loading || !captchaOk}>
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
        </CardContent>
      </Card>

      <p className="mt-4 text-xs text-muted-foreground text-center">
        © {new Date().getFullYear()} SaveMali. Développé par John Mocket
      </p>
    </div>
  )
}
