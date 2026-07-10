import * as React from "react"
import {
  Settings, Monitor, Sun, Moon, Trash2, Lock, Database, Bell,
  ChevronLeft, Check, RefreshCw, Palette, Mail, Phone, Shield,
  Smartphone, TextSearch, Loader2, User, Camera
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/lib/i18n"
import { useAuth } from "@/hooks/use-auth"
import { useRole } from "@/hooks/use-role"
import { useTheme } from "@/components/theme-provider"
import { UserAvatar } from "@/components/UserAvatar"
import { AvatarUpload } from "@/components/AvatarUpload"
import { cn } from "@/lib/utils"
import { insforge } from "@/lib/supabase"
import type { Page } from "@/App"
import { toast } from "sonner"
import { PageFooter } from "@/components/PageFooter"
// CSRF protection is handled by InsForge SDK (JWT tokens, CORS headers)

interface Props { onNavigate: (p: Page) => void }

const FONT_SIZES = ["small", "medium", "large"] as const
type FontSize = typeof FONT_SIZES[number]

const NOTIF_KEYS = [
  "email_notifications",
  "whatsapp_notifications",
  "product_updates",
  "security_alerts",
] as const

type NotifKey = typeof NOTIF_KEYS[number]

function getStoredFontSize(): FontSize {
  const stored = document.documentElement.getAttribute("data-font-size")
  if (stored && FONT_SIZES.includes(stored as FontSize)) return stored as FontSize
  return "medium"
}

function getStoredNotif(key: NotifKey): boolean {
  return localStorage.getItem(`savemali_notif_${key}`) !== "false"
}

function getLastBackup(): string | null {
  return localStorage.getItem("savemali_last_backup")
}

export function SettingsPage({ onNavigate }: Props) {
  const { lang, t } = useLanguage()
  const { user, workspace, signOut } = useAuth()
  const { role } = useRole()
  const { theme, setTheme } = useTheme()
  const fr = lang === "fr"

  const [fontSize, setFontSize] = React.useState<FontSize>(getStoredFontSize)
  const [avatarOpen, setAvatarOpen] = React.useState(false)
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null)
  const [notifs, setNotifs] = React.useState<Record<NotifKey, boolean>>(() => {
    const obj: Record<string, boolean> = {}
    for (const k of NOTIF_KEYS) obj[k] = getStoredNotif(k)
    return obj as Record<NotifKey, boolean>
  })
  const [clearing, setClearing] = React.useState(false)
  const [sendingPwd, setSendingPwd] = React.useState(false)
  const [backingUp, setBackingUp] = React.useState(false)
  const [lastBackupDate, setLastBackupDate] = React.useState<string | null>(getLastBackup())

  const lastBackup = lastBackupDate

  // Fetch avatar
  React.useEffect(() => {
    if (!user || !workspace) return
    insforge.database
      .from("workspace_members")
      .select("avatar_url")
      .eq("workspace_id", workspace.id)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setAvatarUrl((data as any)?.avatar_url ?? null))
      .catch(() => {})
  }, [user, workspace])

  const applyFontSize = (size: FontSize) => {
    setFontSize(size)
    document.documentElement.setAttribute("data-font-size", size)
    localStorage.setItem("savemali_font_size", size)
  }

  const toggleNotif = (key: NotifKey, val: boolean) => {
    setNotifs((prev) => ({ ...prev, [key]: val }))
    localStorage.setItem(`savemali_notif_${key}`, String(val))
  }

  const handleClearCache = async () => {
    setClearing(true)
    const keep = new Set([
      "vite-ui-theme", "savemali-lang", "savemali_font_size",
      "savemali_access_violations", "savemali_lockout_until",
      "savemali-currency", "savemali_captcha_media", "savemali_context_events",
    ])
    for (const key of Object.keys(localStorage)) {
      if (!keep.has(key) && !key.startsWith("savemali_notif_") && key !== "savemali_last_backup") {
        localStorage.removeItem(key)
      }
    }
    try { await caches?.keys().then((names) => names.forEach((n) => caches.delete(n))) } catch {}
    setClearing(false)
    toast.success(fr ? "Cache vidé avec succès" : "Cache cleared successfully")
  }

  const handleChangePassword = async () => {
    if (!user?.email) return
    setSendingPwd(true)
    const { error } = await insforge.auth.sendResetPasswordEmail({ email: user.email })
    setSendingPwd(false)
    if (error) {
      toast.error(fr ? "Erreur d'envoi" : "Send error")
    } else {
      toast.success(fr ? "Email de réinitialisation envoyé" : "Reset email sent")
    }
  }

  const handleBackup = async () => {
    setBackingUp(true)
    if (!workspace) { setBackingUp(false); return }
    try {
      const wid = workspace.id
      const tables = [
        "pharmacies", "pharmacy_products", "pharmacy_sales", "pharmacy_alerts",
        "commerce_clients", "commerce_invoices", "commerce_invoice_items", "commerce_payments", "commerce_products",
        "edu_students", "edu_teachers", "edu_classes", "edu_grades", "edu_fees", "edu_fee_payments", "edu_accounting",
        "staff_employees", "staff_leave_requests", "staff_payroll", "staff_contracts", "staff_recruitments",
        "hr_employees", "hr_departments", "hr_contracts", "hr_leave_requests", "hr_recruitments",
        "hr_evaluations", "hr_trainings", "hr_attendance", "hr_absences", "hr_skills",
        "hr_promotions", "hr_discipline", "hr_health_safety", "hr_documents", "hr_communication",
        "gestion_suppliers", "gestion_purchase_orders", "gestion_purchase_items", "gestion_products", "gestion_alerts", "gestion_accounting",
        "pharmacy_accounting",
      ]
      const backup: Record<string, any[]> = {}
      await Promise.all(tables.map(async (tbl) => {
        try {
          const { data } = await insforge.database.from(tbl).select("*").eq("workspace_id", wid)
          backup[tbl] = (data as any[]) || []
        } catch { backup[tbl] = [] }
      }))
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `savemali-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      const now = new Date().toISOString()
      localStorage.setItem("savemali_last_backup", now)
      setLastBackupDate(now)
      toast.success(fr ? "Sauvegarde téléchargée" : "Backup downloaded")
    } catch (err) {
      toast.error(fr ? "Erreur de sauvegarde" : "Backup failed")
    }
    setBackingUp(false)
  }

  const userInitials = user?.email ? user.email.slice(0, 2).toUpperCase() : "U"

  const typeLabel: Record<string, { fr: string; en: string }> = {
    pharmacy: { fr: "Pharmacie", en: "Pharmacy" },
    commerce: { fr: "Commerce", en: "Commerce" },
    education: { fr: "Éducation", en: "Education" },
    gestion: { fr: "Gestion", en: "Management" },
  }

  const fontSizeLabels: Record<FontSize, { fr: string; en: string }> = {
    small: { fr: "Petite", en: "Small" },
    medium: { fr: "Moyenne", en: "Medium" },
    large: { fr: "Grande", en: "Large" },
  }

  const notifConfig: { key: NotifKey; label: string; desc: string; icon: typeof Bell }[] = [
    { key: "email_notifications", label: t.settings.emailNotif, desc: t.settings.emailNotifDesc, icon: Mail },
    { key: "whatsapp_notifications", label: t.settings.whatsappNotif, desc: t.settings.whatsappNotifDesc, icon: Phone },
    { key: "product_updates", label: t.settings.productUpdates, desc: t.settings.productUpdatesDesc, icon: RefreshCw },
    { key: "security_alerts", label: t.settings.securityAlerts, desc: t.settings.securityAlertsDesc, icon: Shield },
  ]

  if (role !== "admin") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <Settings className="size-12 text-muted-foreground" />
        <p className="text-muted-foreground">{fr ? "Réservé à l'administrateur." : "Admin access only."}</p>
        <Button variant="outline" onClick={() => onNavigate("dashboard")}>{fr ? "Retour" : "Back"}</Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="size-9 shrink-0" onClick={() => onNavigate("dashboard")}>
          <ChevronLeft className="size-5" />
        </Button>
        <div className="flex size-10 items-center justify-center rounded-xl bg-accent/10">
          <Settings className="size-5 text-accent" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">{t.settings.title}</h1>
          <p className="text-sm text-muted-foreground">{fr ? "Gérez vos préférences et votre compte" : "Manage your preferences and account"}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="display" className="w-full">
        <TabsList variant="line" className="mb-4 w-full justify-start gap-0 border-b border-border rounded-none bg-transparent h-auto p-0">
          {[
            { value: "profile", label: fr ? "Profil" : "Profile", icon: User },
            { value: "display", label: t.settings.display, icon: Monitor },
            { value: "security", label: t.settings.security, icon: Lock },
            { value: "backups", label: t.settings.backups, icon: Database },
            { value: "notifications", label: t.settings.notifications, icon: Bell },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="relative flex items-center gap-1.5 rounded-none border-b-2 border-transparent px-4 py-3 text-xs font-medium text-muted-foreground data-[state=active]:border-accent data-[state=active]:text-accent data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-foreground transition-colors after:hidden"
            >
              <tab.icon className="size-3.5" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Profile */}
        <TabsContent value="profile" className="mt-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Camera className="size-4 text-accent" />
                {fr ? "Photo de profil" : "Profile photo"}
              </CardTitle>
              <CardDescription className="text-xs">
                {fr ? "Gérez votre photo de profil visible par votre équipe." : "Manage your profile photo visible to your team."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <UserAvatar
                  avatarUrl={avatarUrl}
                  name={user?.email?.split("@")[0] ?? ""}
                  email={user?.email ?? ""}
                  size="lg"
                  className="size-16"
                />
                <div>
                  <p className="text-sm font-medium text-foreground">{user?.email}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {avatarUrl ? (fr ? "Photo définie" : "Photo set") : (fr ? "Pas de photo" : "No photo")}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 gap-1.5"
                    onClick={() => setAvatarOpen(true)}
                  >
                    <Camera className="size-3.5" />
                    {avatarUrl ? (fr ? "Modifier" : "Change") : (fr ? "Ajouter" : "Add")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="size-4 text-accent" />
                {fr ? "Informations du compte" : "Account information"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{fr ? "Email" : "Email"}</span>
                <span className="text-sm font-medium text-foreground">{user?.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{fr ? "Workspace" : "Workspace"}</span>
                <span className="text-sm font-medium text-foreground">{workspace?.name}</span>
              </div>
            </CardContent>
          </Card>

          <AvatarUpload
            userId={user?.id ?? ""}
            workspaceId={workspace?.id ?? ""}
            name={user?.email?.split("@")[0] ?? ""}
            email={user?.email ?? ""}
            currentAvatarUrl={avatarUrl}
            open={avatarOpen}
            onOpenChange={setAvatarOpen}
            onAvatarChange={setAvatarUrl}
          />
        </TabsContent>

        {/* Display */}
        <TabsContent value="display" className="mt-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TextSearch className="size-4 text-accent" />
                {t.settings.fontSize}
              </CardTitle>
              <CardDescription className="text-xs">{t.settings.displayDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {FONT_SIZES.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => applyFontSize(size)}
                    className={cn(
                      "flex flex-1 flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 transition-all",
                      fontSize === size
                        ? "border-accent bg-accent/5"
                        : "border-border/60 hover:border-muted-foreground/30 hover:bg-muted/20"
                    )}
                  >
                    <span className={cn(
                      "font-bold text-foreground transition-all",
                      size === "small" && "text-sm",
                      size === "medium" && "text-base",
                      size === "large" && "text-lg",
                    )}>A</span>
                    <span className="text-xs text-muted-foreground">{fontSizeLabels[size][lang]}</span>
                    {fontSize === size && <Check className="size-3.5 text-accent" />}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="size-4 text-accent" />
                {t.settings.theme}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {[
                  { value: "light" as const, label: t.settings.themeLight, icon: Sun },
                  { value: "dark" as const, label: t.settings.themeDark, icon: Moon },
                  { value: "system" as const, label: t.settings.themeSystem, icon: Monitor },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTheme(opt.value)}
                    className={cn(
                      "flex flex-1 flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 transition-all",
                      theme === opt.value
                        ? "border-accent bg-accent/5"
                        : "border-border/60 hover:border-muted-foreground/30 hover:bg-muted/20"
                    )}
                  >
                    <opt.icon className={cn(
                      "size-5 transition-colors",
                      theme === opt.value ? "text-accent" : "text-muted-foreground"
                    )} />
                    <span className="text-xs text-muted-foreground">{opt.label}</span>
                    {theme === opt.value && <Check className="size-3.5 text-accent" />}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Trash2 className="size-4 text-accent" />
                {t.settings.clearCache}
              </CardTitle>
              <CardDescription className="text-xs">{t.settings.clearCacheDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearCache}
                disabled={clearing}
                className="gap-2"
              >
                {clearing ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                {clearing ? (fr ? "Nettoyage..." : "Clearing...") : (fr ? "Vider le cache" : "Clear cache")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="mt-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="size-4 text-accent" />
                {t.settings.security}
              </CardTitle>
              <CardDescription className="text-xs">{t.settings.securityDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-full bg-accent/10">
                    <Mail className="size-4 text-accent" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">{t.settings.email}</p>
                    <p className="text-sm font-medium text-foreground truncate">{user?.email ?? "—"}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {fr ? "Connecté" : "Connected"}
                  </Badge>
                </div>
              </div>

              {workspace && (
                <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-full bg-accent/10">
                      <Database className="size-4 text-accent" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">{t.settings.workspace}</p>
                      <p className="text-sm font-medium text-foreground truncate">{workspace.name}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0 capitalize">
                      {typeLabel[workspace.type]?.[lang] ?? workspace.type}
                    </Badge>
                  </div>
                </div>
              )}

              <Separator />

              <div>
                <p className="text-sm font-medium text-foreground mb-1">{t.settings.changePassword}</p>
                <p className="text-xs text-muted-foreground mb-3">{t.settings.changePasswordDesc}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleChangePassword}
                  disabled={sendingPwd}
                  className="gap-2"
                >
                  {sendingPwd ? <Loader2 className="size-3.5 animate-spin" /> : <Lock className="size-3.5" />}
                  {sendingPwd ? (fr ? "Envoi..." : "Sending...") : (fr ? "Changer le mot de passe" : "Change password")}
                </Button>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium text-foreground mb-1">{fr ? "Tableau de bord sécurité" : "Security Dashboard"}</p>
                <p className="text-xs text-muted-foreground mb-3">{fr ? "Surveillance complète de la sécurité" : "Full security monitoring"}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate("security")}
                  className="gap-2"
                >
                  <Shield className="size-3.5" />
                  {fr ? "Ouvrir le tableau de bord" : "Open dashboard"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backups */}
        <TabsContent value="backups" className="mt-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="size-4 text-accent" />
                {t.settings.backups}
              </CardTitle>
              <CardDescription className="text-xs">{t.settings.backupsDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{t.settings.lastBackup}</p>
                    <p className="text-sm font-medium text-foreground mt-0.5">
                      {lastBackup
                        ? new Date(lastBackup).toLocaleString(lang === "fr" ? "fr-FR" : "en-US", {
                            dateStyle: "medium", timeStyle: "short",
                          })
                        : (fr ? "Jamais" : "Never")}
                    </p>
                  </div>
                  {lastBackup && (
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      <Check className="size-3 mr-1 text-success" />
                      {fr ? "Complété" : "Done"}
                    </Badge>
                  )}
                </div>
              </div>

              <Button
                onClick={handleBackup}
                disabled={backingUp}
                className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {backingUp ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5" />
                )}
                {backingUp ? t.settings.backupInProgress : t.settings.triggerBackup}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="mt-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="size-4 text-accent" />
                {t.settings.notifications}
              </CardTitle>
              <CardDescription className="text-xs">{t.settings.notificationsDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {notifConfig.map((n) => {
                  const Icon = n.icon
                  return (
                    <div
                      key={n.key}
                      className="flex items-center justify-between rounded-lg px-3 py-3 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex size-8 items-center justify-center rounded-full bg-accent/10 shrink-0">
                          <Icon className="size-3.5 text-accent" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{n.label}</p>
                          <p className="text-xs text-muted-foreground">{n.desc}</p>
                        </div>
                      </div>
                      <Switch
                        checked={notifs[n.key]}
                        onCheckedChange={(v) => toggleNotif(n.key, v)}
                        className="shrink-0"
                      />
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <PageFooter onNavigate={onNavigate} />
    </div>
  )
}
