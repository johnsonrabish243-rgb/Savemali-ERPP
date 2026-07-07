import * as React from "react"
import {
  Mail, Lock, Eye, EyeOff, AlertCircle, Building2,
  Check, ChevronRight, ChevronLeft, Loader2,
  FlaskConical, ShoppingCart, BookOpen, BarChart3, ArrowLeft, PartyPopper,
  RefreshCw, Copy, CheckCheck, Wand2, MailCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Logo } from "@/components/Logo"
import { PasswordStrengthMeter } from "@/components/PasswordStrength"
import { validatePasswordStrict } from "@/lib/security"
import { useLanguage } from "@/lib/i18n"
import { insforge, type WorkspaceType } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { ModeToggle } from "@/components/mode-toggle"
import { cn } from "@/lib/utils"
import type { Page } from "@/App"

interface Props {
  onNavigate: (page: Page) => void
}

const workspaceTypeIcons: Record<WorkspaceType, React.ReactNode> = {
  pharmacy: <FlaskConical className="size-5" />,
  commerce: <ShoppingCart className="size-5" />,
  education: <BookOpen className="size-5" />,
  gestion: <BarChart3 className="size-5" />,
}

export function SignUpPage({ onNavigate }: Props) {
  const { t, lang } = useLanguage()
  const { checkAuth } = useAuth()
  const fr = lang === "fr"
  const [step, setStep] = React.useState(1)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [showPw, setShowPw] = React.useState(false)

  // Auto-generated password suggestion
  const [suggestedPw, setSuggestedPw] = React.useState("")
  const [pwCopied, setPwCopied] = React.useState(false)
  const [pwApplied, setPwApplied] = React.useState(false)

  const generatePassword = React.useCallback(() => {
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"
    const lower = "abcdefghjkmnpqrstuvwxyz"
    const digits = "23456789"
    const special = "!@#$%&*?"
    const all = upper + lower + digits + special
    const arr = new Uint8Array(16)
    crypto.getRandomValues(arr)
    // Ensure at least one from each category
    let pw = ""
    pw += upper[arr[0] % upper.length]
    pw += lower[arr[1] % lower.length]
    pw += digits[arr[2] % digits.length]
    pw += special[arr[3] % special.length]
    for (let i = 4; i < 16; i++) {
      pw += all[arr[i] % all.length]
    }
    // Shuffle
    const shuffled = pw.split("").sort(() => Math.random() - 0.5).join("")
    return shuffled
  }, [])

  const handleGeneratePassword = React.useCallback(() => {
    setSuggestedPw(generatePassword())
    setPwCopied(false)
    setPwApplied(false)
  }, [generatePassword])

  // Auto-generate on mount
  React.useEffect(() => {
    setSuggestedPw(generatePassword())
  }, [generatePassword])

  const handleCopyPassword = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(suggestedPw)
      setPwCopied(true)
      setTimeout(() => setPwCopied(false), 2000)
    } catch {}
  }, [suggestedPw])

  const handleUsePassword = React.useCallback(() => {
    setPassword(suggestedPw)
    setConfirmPassword(suggestedPw)
    setShowPw(true)
    setPwApplied(true)
  }, [suggestedPw])

  const [workspaceName, setWorkspaceName] = React.useState("")
  const [workspaceType, setWorkspaceType] = React.useState<WorkspaceType>("pharmacy")

  const [showWelcome, setShowWelcome] = React.useState(false)
  const [createdWsType, setCreatedWsType] = React.useState<WorkspaceType>("pharmacy")
  const [emailVerificationSent, setEmailVerificationSent] = React.useState(false)
  const [verificationEmail, setVerificationEmail] = React.useState("")

  const [inviteToken, setInviteToken] = React.useState<string | null>(null)
  const [inviteData, setInviteData] = React.useState<{ email: string; display_name: string; role: string; workspace_name: string; workspace_type: WorkspaceType } | null>(null)
  const [inviteLoading, setInviteLoading] = React.useState(false)
  const [inviteError, setInviteError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get("invite")
    if (!token) return
    window.history.replaceState({}, "", window.location.pathname)
    setInviteToken(token)
    setInviteLoading(true)
    ;(async () => {
      const { data, error } = await insforge.database
        .from("workspace_members")
        .select("email, display_name, role, workspace_id, workspaces(name, type)")
        .eq("invite_token", token)
        .eq("status", "pending")
        .maybeSingle()
      if (error || !data) {
        setInviteError(fr ? "Lien d'invitation invalide ou expiré." : "Invalid or expired invite link.")
        setInviteLoading(false)
        return
      }
      const ws = (data as any).workspaces
      setInviteData({
        email: (data as any).email,
        display_name: (data as any).display_name,
        role: (data as any).role,
        workspace_name: ws?.name ?? "",
        workspace_type: (ws?.type ?? "pharmacy") as WorkspaceType,
      })
      setEmail((data as any).email)
      setInviteLoading(false)
    })()
  }, [])

  const workspaceTypes: { key: WorkspaceType; label: string }[] = [
    { key: "pharmacy", label: t.auth.workspaceTypes.pharmacy },
    { key: "commerce", label: t.auth.workspaceTypes.commerce },
    { key: "education", label: t.auth.workspaceTypes.education },
    { key: "gestion", label: t.auth.workspaceTypes.gestion },
  ]

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(fr ? "Email invalide" : "Invalid email")
      return
    }
    if (password !== confirmPassword) { setError(fr ? "Les mots de passe ne correspondent pas" : "Passwords don't match"); return }
    const pwError = validatePasswordStrict(password)
    if (pwError) { setError(fr ? pwError : "Password too weak"); return }
    setError(null)
    if (inviteToken) {
      handleInviteFinish()
    } else {
      setStep(2)
    }
  }

  const handleStep2 = (e: React.FormEvent) => {
    e.preventDefault()
    if (!workspaceName.trim()) return
    setError(null)
    handleFinish()
  }

  const handleInviteFinish = async () => {
    setLoading(true); setError(null)
    try {
      const { data: authData, error: signUpError } = await insforge.auth.signUp({ email, password })
      if (signUpError) throw signUpError

      if (authData?.requireEmailVerification) {
        setVerificationEmail(email)
        setEmailVerificationSent(true)
        setLoading(false)
        return
      }

      const uid = authData?.user?.id || (authData as any)?.id || ""
      if (!uid) throw new Error(fr ? "Erreur de création du compte" : "Account creation error")

      // Verify the invite still exists and email matches
      const { data: memberData } = await insforge.database
        .from("workspace_members")
        .select("email")
        .eq("invite_token", inviteToken!)
        .eq("status", "pending")
        .maybeSingle()
      if (!memberData) throw new Error(fr ? "Invitation expirée ou invalide." : "Invite expired or invalid.")
      if ((memberData as any).email.toLowerCase() !== email.toLowerCase()) {
        throw new Error(fr ? "Cet email ne correspond pas à l'invitation." : "This email doesn't match the invitation.")
      }

      // Link the member to this user account
      const { error: linkError } = await insforge.database.from("workspace_members")
        .update({
          user_id: uid,
          status: "active",
          accepted_at: new Date().toISOString(),
        })
        .eq("invite_token", inviteToken!)
        .eq("email", email)

      if (linkError) throw linkError

      await checkAuth()
      onNavigate("dashboard")
    } catch (err: any) {
      setError(err.message || t.auth.error)
    } finally {
      setLoading(false)
    }
  }

  const handleFinish = async () => {
    setLoading(true); setError(null)
    try {
      const { data: authData, error: signUpError } = await insforge.auth.signUp({ email, password, redirectTo: `${window.location.origin}/signin` })
      if (signUpError) {
        const msg = (signUpError.message || "").toLowerCase()
        if (msg.includes("already") || msg.includes("existe") || msg.includes("exist")) {
          setError(fr
            ? "Cet email est déjà utilisé. Création bloquée."
            : "This email is already taken. Registration blocked.")
          try { await insforge.database.from("workspace_members").update({ status: "blocked" }).eq("email", email) } catch {}
        } else {
          setError(signUpError.message || t.auth.error)
        }
        setLoading(false)
        return
      }

      if (authData?.requireEmailVerification) {
        setVerificationEmail(email)
        setEmailVerificationSent(true)
        setLoading(false)
        return
      }

      const uid = authData?.user?.id || (authData as any)?.id || ""
      if (!uid) throw new Error(fr ? "Erreur de création du compte" : "Account creation error")

      const { data: wsData, error: wsError } = await insforge.database.from("workspaces").insert([{ owner_id: uid, name: workspaceName.trim(), type: workspaceType }]).select().single()
      if (wsError) throw wsError

      import("@/lib/stats").then(({ invalidateStatsCache }) => invalidateStatsCache()).catch(() => {})

      setCreatedWsType(workspaceType)
      setShowWelcome(true)
    } catch (err: any) {
      setError(err.message || t.auth.error)
    } finally {
      setLoading(false)
    }
  }

  const steps = [{ num: 1, label: t.auth.step1 }, { num: 2, label: t.auth.step2 }]
  const visibleSteps = inviteToken ? [{ num: 1, label: fr ? "Compte" : "Account" }] : steps

  // Invite loading state
  if (inviteLoading) return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-8">
      <div className="absolute right-4 top-4"><ModeToggle /></div>
      <div className="mb-6"><Logo size="lg" /></div>
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="size-8 animate-spin text-accent" />
        <p className="text-sm text-muted-foreground">{fr ? "Vérification de l'invitation..." : "Verifying invite..."}</p>
      </div>
    </div>
  )

  // Invite error state
  if (inviteToken && inviteError) return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-8">
      <div className="absolute right-4 top-4"><ModeToggle /></div>
      <div className="mb-6"><button onClick={() => onNavigate("home")}><Logo size="lg" /></button></div>
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="size-6 text-destructive" />
          </div>
          <CardTitle className="text-xl font-bold text-foreground">{fr ? "Lien invalide" : "Invalid link"}</CardTitle>
          <CardDescription className="text-muted-foreground">{inviteError}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" variant="outline" onClick={() => onNavigate("home")}><ArrowLeft className="size-4 mr-2" />{fr ? "Retour à l'accueil" : "Back to home"}</Button>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-4">
      <div className="absolute right-4 top-4"><ModeToggle /></div>
      <div className="mb-4"><button onClick={() => onNavigate("home")}><Logo size="lg" /></button></div>

      {/* Stepper */}
      <div className="mb-4 flex items-center gap-2">
        {visibleSteps.map((s, i) => (
          <React.Fragment key={s.num}>
            <div className="flex items-center gap-1.5">
              <div className={cn("flex size-6 items-center justify-center rounded-full text-xs font-bold transition-colors", step >= s.num ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground")}>
                {step > s.num ? <Check className="size-3" /> : s.num}
              </div>
              <span className={cn("hidden text-xs font-medium sm:inline", step >= s.num ? "text-foreground" : "text-muted-foreground")}>{s.label}</span>
            </div>
            {i < visibleSteps.length - 1 && <div className={cn("h-px flex-1 transition-colors min-w-[24px]", step > s.num ? "bg-accent" : "bg-border")} />}
          </React.Fragment>
        ))}
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <Card className="w-full max-w-sm shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-bold text-foreground">
              {inviteToken ? (fr ? "Accepter l'invitation" : "Accept invitation") : t.auth.signUp}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {inviteToken && inviteData ? (
                <span className="block">
                  {fr ? "Vous avez été invité par" : "You were invited by"} <span className="font-semibold text-foreground">{inviteData.workspace_name}</span>
                  <br />
                  {fr ? "en tant que" : "as"} <span className="font-semibold text-foreground capitalize">{inviteData.role}</span>
                </span>
              ) : (
                <>{t.auth.hasAccount}{" "}<button onClick={() => onNavigate("signin")} className="font-medium text-accent hover:underline">{t.auth.signIn}</button></>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStep1} className="space-y-4">
              {error && <Alert variant="destructive"><AlertCircle className="size-4" /><AlertDescription className="text-sm">{error}</AlertDescription></Alert>}
              <div className="space-y-1.5">
                <Label htmlFor="su-email" className="text-foreground">{t.auth.email}</Label>
                <div className="relative"><Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="su-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9 text-foreground" required disabled={!!inviteToken} /></div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="su-pw" className="text-foreground">{t.auth.password}</Label>
                <div className="relative"><Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="su-pw" type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9 pr-9 text-foreground" required /><button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div>
                <PasswordStrengthMeter password={password} />
                {/* Auto-generated password suggestion */}
                {suggestedPw && !password && (
                  <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-accent">
                      <Wand2 className="size-3.5" />
                      <span>{fr ? "Suggestion de mot de passe" : "Password suggestion"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <code className="flex-1 rounded bg-muted px-2 py-1.5 text-xs font-mono text-foreground break-all select-all">
                        {suggestedPw}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyPassword}
                        className="shrink-0 rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title={fr ? "Copier" : "Copy"}
                      >
                        {pwCopied ? <CheckCheck className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
                      </button>
                    </div>
                    <div className="flex gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 flex-1"
                        onClick={handleUsePassword}
                      >
                        <Check className="size-3" />
                        {fr ? "Utiliser" : "Use it"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs gap-1"
                        onClick={handleGeneratePassword}
                      >
                        <RefreshCw className="size-3" />
                        {fr ? "Autre" : "Another"}
                      </Button>
                    </div>
                  </div>
                )}
                {pwApplied && (
                  <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <CheckCheck className="size-3" />
                    {fr ? "Mot de passe appliqué" : "Password applied"}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="su-cpw" className="text-foreground">{t.auth.confirmPassword}</Label>
                <div className="relative"><Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="su-cpw" type={showPw ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-9 text-foreground" required /></div>
              </div>
              {!inviteToken && <div />}
              <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90 gap-2" disabled={loading}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                {inviteToken ? (loading ? t.auth.loading : (fr ? "Rejoindre l'équipe" : "Join team")) : <>{t.auth.next} <ChevronRight className="size-4" /></>}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <Card className="w-full max-w-sm shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-bold text-foreground">{t.auth.step2}</CardTitle>
            <CardDescription className="text-muted-foreground">{t.auth.workspaceName}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStep2} className="space-y-4">
              {error && <Alert variant="destructive"><AlertCircle className="size-4" /><AlertDescription className="text-sm">{error}</AlertDescription></Alert>}
              <div className="space-y-1.5">
                <Label htmlFor="ws-name" className="text-foreground">{t.auth.workspaceName}</Label>
                <div className="relative"><Building2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="ws-name" value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} placeholder={t.auth.workspaceNamePlaceholder} className="pl-9 text-foreground" required /></div>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">{t.auth.workspaceType}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {workspaceTypes.map((wt) => (
                    <button key={wt.key} type="button" onClick={() => setWorkspaceType(wt.key)} className={cn("flex items-center gap-2 rounded-lg border p-3 text-left text-sm transition-all", workspaceType === wt.key ? "border-accent bg-accent/10 text-accent font-medium" : "border-border text-muted-foreground hover:border-border/80 hover:bg-muted")}>
                      {workspaceTypeIcons[wt.key]}<span className="text-xs leading-tight">{wt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1 gap-2" onClick={() => setStep(1)}><ChevronLeft className="size-4" /> {t.auth.back}</Button>
                <Button type="submit" className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 gap-2" disabled={loading}>
                  {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                  {loading ? t.auth.loading : <><span>{t.auth.finish}</span><ChevronRight className="size-4" /></>}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* EMAIL VERIFICATION SENT */}
      {emailVerificationSent && (
        <Card className="w-full max-w-sm shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-full bg-accent/10">
              <MailCheck className="size-8 text-accent" />
            </div>
            <CardTitle className="text-xl font-bold text-foreground">
              {fr ? "Vérifiez votre email" : "Check your email"}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {fr
                ? `Un lien de vérification a été envoyé à ${verificationEmail}. Cliquez sur le lien pour activer votre compte.`
                : `A verification link has been sent to ${verificationEmail}. Click the link to activate your account.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90 gap-2"
              onClick={() => onNavigate("signin")}
            >
              <ArrowLeft className="size-4" />
              {fr ? "Retour à la connexion" : "Back to sign in"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              {fr ? "Vous n'avez pas reçu l'email ? Vérifiez vos spams." : "Didn't receive the email? Check your spam folder."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* WELCOME */}
      {showWelcome && (
        <Card className="w-full max-w-sm shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-full bg-accent/10">
              <PartyPopper className="size-8 text-accent" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              {fr ? "Bienvenue sur SaveMali !" : "Welcome to SaveMali!"}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {fr
                ? "Votre compte a été créé avec succès. Que souhaitez-vous faire ?"
                : "Your account has been created successfully. What would you like to do?"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {createdWsType === "pharmacy" && (
              <Button
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90 gap-2"
                onClick={() => onNavigate("pharmacy")}
              >
                <FlaskConical className="size-4" />
                {fr ? "Ajouter mon stock maintenant" : "Add my stock now"}
              </Button>
            )}
            <Button
              variant={createdWsType === "pharmacy" ? "outline" : "default"}
              className={cn("w-full gap-2", createdWsType !== "pharmacy" && "bg-accent text-accent-foreground hover:bg-accent/90")}
              onClick={async () => { await checkAuth(); onNavigate("dashboard") }}
            >
              {fr ? "Aller au tableau de bord" : "Go to dashboard"}
            </Button>
          </CardContent>
        </Card>
      )}

      <p className="mt-4 text-xs text-muted-foreground text-center">© {new Date().getFullYear()} SaveMali. Développé par John Mocket</p>
    </div>
  )
}
