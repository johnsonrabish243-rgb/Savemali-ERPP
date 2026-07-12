import * as React from "react"
import { useLanguage } from "@/lib/i18n"
import { useAuth } from "@/hooks/use-auth"
import {
  fetchPlatformDashboardStats, fetchPlatformAdmins, platformGetAuditLogs,
  type PlatformDashboardStats, type PlatformAdmin
} from "@/lib/platform-admin"
import {
  Users, Building2, Shield, Activity, BarChart3, Settings, UserCheck,
  FileText, RefreshCw, Globe, Clock, TrendingUp, LayoutDashboard, Zap, Server
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { fr as frLocale, enUS } from "date-fns/locale"
import type { Page } from "@/App"

interface Props {
  onNavigate: (p: Page) => void
}

const QUICK_ACTIONS = [
  { id: "users", icon: Users, label: { fr: "Gérer les utilisateurs", en: "Manage Users" }, color: "bg-blue-500", section: "users" },
  { id: "workspaces", icon: Building2, label: { fr: "Gérer les espaces", en: "Manage Workspaces" }, color: "bg-purple-500", section: "workspaces" },
  { id: "audit", icon: FileText, label: { fr: "Journal d'audit", en: "Audit Logs" }, color: "bg-amber-500", section: "audit" },
  { id: "settings", icon: Settings, label: { fr: "Paramètres plateforme", en: "Platform Settings" }, color: "bg-slate-600", section: "settings" },
]

export function SuperAdminDashboard({ onNavigate }: Props) {
  const { workspace, user } = useAuth()
  const { lang } = useLanguage()
  const fr = lang === "fr"
  const [stats, setStats] = React.useState<PlatformDashboardStats | null>(null)
  const [admins, setAdmins] = React.useState<PlatformAdmin[]>([])
  const [auditLogs, setAuditLogs] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  const loadData = React.useCallback(async () => {
    setLoading(true)
    const [s, a, logs] = await Promise.all([
      fetchPlatformDashboardStats(),
      fetchPlatformAdmins(),
      platformGetAuditLogs(10, 0),
    ])
    setStats(s)
    setAdmins(a)
    setAuditLogs(logs)
    setLoading(false)
  }, [])

  React.useEffect(() => { loadData() }, [loadData])

  const visibleAdmins = admins.filter((a) => !a.hidden)
  const now = new Date()

  const kpiCards = [
    { label: fr ? "Utilisateurs" : "Users", value: stats?.totalUsers ?? 0, icon: <Users className="size-5 text-white" />, color: "bg-gradient-to-br from-blue-600 to-blue-400" },
    { label: fr ? "Espaces de travail" : "Workspaces", value: stats?.totalWorkspaces ?? 0, icon: <Building2 className="size-5 text-white" />, color: "bg-gradient-to-br from-purple-600 to-purple-400" },
    { label: fr ? "Administrateurs" : "Admins", value: visibleAdmins.length, icon: <Shield className="size-5 text-white" />, color: "bg-gradient-to-br from-amber-600 to-amber-400" },
    { label: fr ? "Actifs" : "Active", value: stats?.activeWorkspaces ?? 0, icon: <Activity className="size-5 text-white" />, color: "bg-gradient-to-br from-emerald-600 to-emerald-400" },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="size-5 sm:size-6 text-brand shrink-0" />
            {fr ? "Super Administration" : "Super Administration"}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {fr ? "Contrôle global de la plateforme" : "Global platform control"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} className="gap-1.5">
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            <span className="hidden sm:inline">{fr ? "Actualiser" : "Refresh"}</span>
          </Button>
          <Button variant="default" size="sm" onClick={() => onNavigate("platform")} className="gap-1.5">
            <Settings className="size-3.5" />
            <span className="hidden sm:inline">{fr ? "Panneau d'administration" : "Admin Panel"}</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card, i) => (
          <div
            key={i}
            className={cn(
              "relative overflow-hidden rounded-xl p-4 sm:p-5 text-white transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5",
              card.color,
              "animate-kpi-enter"
            )}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 translate-x-8 -translate-y-8 bg-white/5 rounded-full blur-xl" />
            <div className="relative z-10">
              <div className="flex items-start justify-between">
                <div className="flex size-8 sm:size-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm shadow-inner">
                  {card.icon}
                </div>
              </div>
              <p className="mt-3 sm:mt-4 text-xl sm:text-2xl font-bold">{loading ? "..." : card.value}</p>
              <p className="text-xs sm:text-sm text-white/80 mt-0.5">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="size-4 text-brand" />
            {fr ? "Actions rapides" : "Quick Actions"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-4">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon
              return (
                <button
                  key={action.id}
                  onClick={() => onNavigate("platform")}
                  className={cn(
                    "flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-3 rounded-lg border border-border p-3 sm:p-4 transition-all duration-200",
                    "hover:shadow-md hover:-translate-y-0.5 bg-card text-center sm:text-left"
                  )}
                >
                  <div className={cn("flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-lg", action.color)}>
                    <Icon className="size-4 sm:size-5 text-white" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-foreground leading-tight">{action.label[lang]}</span>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Platform Info + Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Workspace Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Server className="size-4 text-brand" />
              {fr ? "Espace de travail actuel" : "Current Workspace"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{fr ? "Nom" : "Name"}</span>
              <span className="text-sm font-medium">{workspace?.name ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{fr ? "Type" : "Type"}</span>
              <span className="text-sm font-medium">{fr ? "Gestion" : "Management"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{fr ? "Administrateurs visibles" : "Visible Admins"}</span>
              <span className="text-sm font-medium">{visibleAdmins.length}</span>
            </div>
            <div className="pt-2">
              <Button variant="outline" size="sm" onClick={() => onNavigate("platform")} className="w-full gap-1.5">
                <LayoutDashboard className="size-3.5" />
                {fr ? "Ouvrir le panneau d'administration" : "Open Admin Panel"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Platform Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="size-4 text-brand" />
              {fr ? "Activité récente" : "Recent Activity"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="size-6 animate-spin rounded-full border-4 border-accent border-t-transparent" />
              </div>
            ) : auditLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {fr ? "Aucune activité récente" : "No recent activity"}
              </p>
            ) : (
              <div className="space-y-3">
                {auditLogs.slice(0, 6).map((log: any, i: number) => {
                  let timeAgo = ""
                  try {
                    timeAgo = formatDistanceToNow(new Date(log.performed_at ?? log.created_at), {
                      addSuffix: true,
                      locale: fr ? frLocale : enUS,
                    })
                  } catch {}
                  return (
                    <div key={log.id ?? i} className="flex items-center gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                        <Activity className="size-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {log.action ?? log.action_type ?? log.description ?? "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {log.actor_email ?? log.actor_name ?? ""}
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer note */}
      <div className="rounded-lg border border-brand/20 bg-brand/5 p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="size-4 text-brand" />
          <span>
            {fr
              ? "Connecté en tant que Super Administrateur — vous avez un accès illimité à toutes les fonctionnalités de la plateforme."
              : "Logged in as Super Admin — you have unrestricted access to all platform features."}
          </span>
        </div>
      </div>
    </div>
  )
}
