import * as React from "react"
import { useAuth } from "@/hooks/use-auth"
import { useRole } from "@/hooks/use-role"
import { useLanguage } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageFooter } from "@/components/PageFooter"
import { UserAvatar } from "@/components/UserAvatar"
import { getSecurityStats, getAuditLogs } from "@/lib/audit"
import { getDeviceInfo, getLoginAttempts, getSession } from "@/lib/security"
import { insforge } from "@/lib/supabase"
import {
  Shield, AlertTriangle, Users, Activity, Monitor, Lock, ChevronLeft,
  Smartphone, Tablet, Globe, Clock, User, ArrowLeft
} from "lucide-react"
import type { Page } from "@/App"

interface Props {
  onNavigate: (p: Page) => void
}

interface ActivityLog {
  id: string
  actor_user_id: string
  actor_email: string
  actor_name: string
  action_type: string
  module: string
  description: string
  amount_usd: number | null
  device_info: { platform?: string; isMobile?: boolean }
  performed_at: string
}

const ACTION_LABELS: Record<string, { fr: string; en: string }> = {
  login: { fr: "Connexion", en: "Login" },
  logout: { fr: "Déconnexion", en: "Logout" },
  login_failed: { fr: "Échec connexion", en: "Login failed" },
  sale: { fr: "Vente", en: "Sale" },
  stock_add: { fr: "Ajout stock", en: "Stock added" },
  stock_edit: { fr: "Modif. stock", en: "Stock edit" },
  student_add: { fr: "Élève ajouté", en: "Student added" },
  fee_payment: { fr: "Paiement scol.", en: "Fee payment" },
  product_add: { fr: "Produit ajouté", en: "Product added" },
  accounting_entry: { fr: "Entrée compta", en: "Accounting" },
  employee_add: { fr: "Employé ajouté", en: "Employee added" },
  order: { fr: "Commande", en: "Order" },
  invoice: { fr: "Facture", en: "Invoice" },
  payment: { fr: "Paiement", en: "Payment" },
  grade: { fr: "Note", en: "Grade" },
  attendance: { fr: "Présence", en: "Attendance" },
}

function parseUserAgent(ua: string | null): { browser: string; os: string; device: string } {
  if (!ua) return { browser: "Inconnu", os: "Inconnu", device: "Inconnu" }
  let browser = "Autre"
  if (ua.includes("Firefox")) browser = "Firefox"
  else if (ua.includes("Edg")) browser = "Edge"
  else if (ua.includes("Chrome")) browser = "Chrome"
  else if (ua.includes("Safari")) browser = "Safari"

  let os = "Autre"
  if (ua.includes("Windows")) os = "Windows"
  else if (ua.includes("Mac OS")) os = "macOS"
  else if (ua.includes("Linux")) os = "Linux"
  else if (ua.includes("Android")) os = "Android"
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS"

  const device = /Mobile|Android|iPhone|iPad/i.test(ua) ? "Mobile" : "Desktop"
  return { browser, os, device }
}

export function SecurityDashboardPage({ onNavigate }: Props) {
  const { user, workspace, loading: authLoading } = useAuth()
  const { role } = useRole()
  const { lang } = useLanguage()
  const fr = lang === "fr"

  const [stats, setStats] = React.useState<{ failedLogins24h: number; newUsers24h: number; totalActions24h: number } | null>(null)
  const [activityLogs, setActivityLogs] = React.useState<ActivityLog[]>([])
  const [auditLogs, setAuditLogs] = React.useState<Array<{ id: string; action: string; actor_email: string | null; user_agent: string | null; created_at: string; metadata: Record<string, unknown> | null }>>([])
  const [members, setMembers] = React.useState<Array<{ user_id: string | null; display_name: string; email: string; role: string }>>([])
  const [loading, setLoading] = React.useState(true)

  const session = getSession()
  const deviceInfo = getDeviceInfo()
  const loginAttempts = getLoginAttempts()

  React.useEffect(() => {
    if (!workspace || !user) return
    let cancelled = false

    async function load() {
      try {
        const [secStats, aLogs, auLogs, membersData] = await Promise.all([
          getSecurityStats(workspace!.id),
          insforge.database
            .from("activity_logs")
            .select("*")
            .eq("workspace_id", workspace!.id)
            .order("performed_at", { ascending: false })
            .limit(100),
          getAuditLogs({ workspace_id: workspace!.id, days: 1, limit: 100 }),
          insforge.database
            .from("workspace_members")
            .select("user_id, display_name, email, role")
            .eq("workspace_id", workspace!.id)
            .eq("status", "active"),
        ])

        if (cancelled) return
        setStats(secStats)
        setActivityLogs((aLogs.data as ActivityLog[]) ?? [])
        setAuditLogs((auLogs as any[]) ?? [])
        setMembers((membersData.data as any[]) ?? [])
      } catch (err) {
        console.error("Security dashboard load error:", err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [workspace, user])

  if (authLoading || loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="size-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
          <p className="text-sm text-muted-foreground font-medium">{fr ? "Chargement..." : "Loading..."}</p>
        </div>
      </div>
    )
  }

  if (role !== "admin") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <Shield className="size-12 text-muted-foreground" />
        <p className="text-muted-foreground">{fr ? "Réservé à l'administrateur." : "Admin access only."}</p>
        <Button variant="outline" onClick={() => onNavigate("dashboard")}>{fr ? "Retour" : "Back"}</Button>
      </div>
    )
  }

  const currentSession = session ? {
    device: session.device,
    browser: session.browser,
    startedAt: new Date(session.startedAt).toLocaleString(fr ? "fr-FR" : "en-US"),
    duration: Math.floor((Date.now() - session.startedAt) / 60000),
  } : null

  const myLogs = activityLogs.filter((l) => l.actor_user_id === user?.id)
  const employeeLogs = activityLogs.filter((l) => l.actor_user_id !== user?.id)
  const myAuditLogs = auditLogs.filter((l) => l.actor_email?.toLowerCase() === user?.email?.toLowerCase())

  const moduleStats = [workspace!.type].map((mod) => ({
    module: mod,
    count: activityLogs.filter((l) => l.module === mod).length,
    myCount: myLogs.filter((l) => l.module === mod).length,
  }))

  return (
    <div className="flex min-h-svh flex-col">
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-4 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="size-9 shrink-0" onClick={() => onNavigate("dashboard")}>
            <ChevronLeft className="size-5" />
          </Button>
          <div className="flex size-10 items-center justify-center rounded-xl bg-destructive/10">
            <Shield className="size-5 text-destructive" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">{fr ? "Sécurité" : "Security Dashboard"}</h1>
            <p className="text-sm text-muted-foreground">{fr ? "Surveillance et activité de la sécurité" : "Security monitoring and activity"}</p>
          </div>
        </div>

        {/* Current Session Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Monitor className="size-4 text-accent" />
              {fr ? "Session actuelle" : "Current Session"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{fr ? "Appareil" : "Device"}</p>
                <p className="text-sm font-medium flex items-center gap-1.5">
                  {deviceInfo.device === "Mobile" ? <Smartphone className="size-3.5" /> : <Monitor className="size-3.5" />}
                  {deviceInfo.device}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{fr ? "Navigateur" : "Browser"}</p>
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <Globe className="size-3.5" />
                  {deviceInfo.browser}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{fr ? "Connexion" : "Signed in"}</p>
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  {currentSession?.startedAt ?? "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{fr ? "Durée" : "Duration"}</p>
                <p className="text-sm font-medium">
                  {currentSession ? `${currentSession.duration} min` : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {fr ? "Échecs de connexion (24h)" : "Failed Logins (24h)"}
              </CardTitle>
              <AlertTriangle className="size-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats?.failedLogins24h ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {fr ? "Nouveaux employés (24h)" : "New Employees (24h)"}
              </CardTitle>
              <Users className="size-4 text-accent" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats?.newUsers24h ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {fr ? "Actions totales (24h)" : "Total Actions (24h)"}
              </CardTitle>
              <Activity className="size-4 text-accent" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats?.totalActions24h ?? 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Login Attempts */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="size-4 text-accent" />
                {fr ? "Tentatives de connexion" : "Login Attempts"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{fr ? "Tentatives" : "Attempts"}</span>
                <span className="font-medium">{loginAttempts.count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{fr ? "Verrouillé" : "Locked"}</span>
                <span className={loginAttempts.locked ? "text-destructive font-medium" : "font-medium"}>
                  {loginAttempts.locked
                    ? (fr ? `Oui (${loginAttempts.remainingTime}s restantes)` : `Yes (${loginAttempts.remainingTime}s left)`)
                    : (fr ? "Non" : "No")}
                </span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="size-4 text-accent" />
                {fr ? "Mon activité (24h)" : "My Activity (24h)"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{fr ? "Actions" : "Actions"}</span>
                <span className="font-medium">{myLogs.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{fr ? "Connexions" : "Logins"}</span>
                <span className="font-medium">{myAuditLogs.filter((l) => l.action === "login").length}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Module Activity */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">
              {fr ? "Activité par module" : "Activity by Module"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {moduleStats.map((ms) => (
                <div key={ms.module} className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground capitalize">{ms.module}</p>
                  <p className="text-lg font-bold mt-1">{ms.count}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {fr ? `${ms.myCount} miennes` : `${ms.myCount} mine`}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* My Session Audit Logs */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">
              {fr ? "Mes connexions (24h)" : "My Logins (24h)"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">{fr ? "Action" : "Action"}</th>
                    <th className="px-4 py-3 font-medium">{fr ? "Navigateur" : "Browser"}</th>
                    <th className="px-4 py-3 font-medium">{fr ? "Heure" : "Time"}</th>
                  </tr>
                </thead>
                <tbody>
                  {myAuditLogs.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                        {fr ? "Aucune connexion enregistrée" : "No login activity"}
                      </td>
                    </tr>
                  )}
                  {myAuditLogs.slice(0, 20).map((log) => {
                    const parsed = parseUserAgent(log.user_agent ?? null)
                    return (
                      <tr key={log.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <span className={cn(
                            "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
                            log.action === "login" ? "bg-success/10 text-success" :
                            log.action === "logout" ? "bg-muted text-muted-foreground" :
                            "bg-destructive/10 text-destructive"
                          )}>
                            {ACTION_LABELS[log.action]?.[lang] ?? log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {parsed.browser} / {parsed.os}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(log.created_at).toLocaleString(fr ? "fr-FR" : "en-US", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Employee Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {fr ? "Activité des employés (24h)" : "Employee Activity (24h)"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">{fr ? "Employé" : "Employee"}</th>
                    <th className="px-4 py-3 font-medium">{fr ? "Action" : "Action"}</th>
                    <th className="px-4 py-3 font-medium">{fr ? "Module" : "Module"}</th>
                    <th className="px-4 py-3 font-medium">{fr ? "Heure" : "Time"}</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeLogs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                        {fr ? "Aucune activité d'employé" : "No employee activity"}
                      </td>
                    </tr>
                  )}
                  {employeeLogs.slice(0, 30).map((log) => (
                    <tr key={log.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <UserAvatar
                            avatarUrl={null}
                            name={log.actor_name || ""}
                            email={log.actor_email || ""}
                            size="sm"
                            className="size-7"
                          />
                          <div>
                            <p className="text-xs font-medium text-foreground truncate max-w-[150px]">{log.actor_name || "—"}</p>
                            <p className="text-[11px] text-muted-foreground truncate max-w-[150px]">{log.actor_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                          {ACTION_LABELS[log.action_type]?.[lang] ?? log.action_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[11px] capitalize">{log.module}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(log.performed_at).toLocaleString(fr ? "fr-FR" : "en-US", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
      <PageFooter onNavigate={onNavigate as (p: string) => void} />
    </div>
  )
}
