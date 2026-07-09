import * as React from "react"
import {
  BarChart3, Calendar, Clock, Loader2, RefreshCw, Filter,
  ShoppingCart, FlaskConical, BookOpen, Package, DollarSign,
  Smartphone, Monitor, Tablet, User, TrendingUp, Download
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { UserAvatar } from "@/components/UserAvatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { useLanguage } from "@/lib/i18n"
import { useAuth } from "@/hooks/use-auth"
import { useRole } from "@/hooks/use-role"
import { insforge } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/currency"
import type { Page } from "@/App"
import { EmptyState } from "@/components/EmptyState"
import { PageFooter } from "@/components/PageFooter"

interface Props { onNavigate: (p: Page) => void }

interface ActivityLog {
  id: string
  actor_user_id: string
  actor_email: string
  actor_name: string
  action_type: string
  module: string
  description: string
  amount_usd: number | null
  reference_id: string | null
  device_info: { platform?: string; isMobile?: boolean }
  performed_at: string
}

const MODULE_COLORS: Record<string, string> = {
  pharmacy: "text-success bg-success/10 border-success/30",
  commerce: "text-warning bg-warning/10 border-warning/30",
  education: "text-brand bg-brand/10 border-brand/30",
  gestion: "text-purple bg-purple/10 border-purple/30",
  hr: "text-sky-600 bg-sky-500/10 border-sky-500/30",
  system: "text-muted-foreground bg-muted border-border",
}

const MODULE_ICONS: Record<string, React.ReactNode> = {
  pharmacy: <FlaskConical className="size-3.5" />,
  commerce: <ShoppingCart className="size-3.5" />,
  education: <BookOpen className="size-3.5" />,
  gestion: <BarChart3 className="size-3.5" />,
  hr: <User className="size-3.5" />,
  system: <User className="size-3.5" />,
}

const ACTION_LABELS: Record<string, { fr: string; en: string }> = {
  sale: { fr: "Vente", en: "Sale" },
  stock_add: { fr: "Ajout stock", en: "Stock added" },
  stock_edit: { fr: "Modif. stock", en: "Stock edit" },
  student_add: { fr: "Élève ajouté", en: "Student added" },
  fee_payment: { fr: "Paiement scol.", en: "Fee payment" },
  product_add: { fr: "Produit ajouté", en: "Product added" },
  accounting_entry: { fr: "Entrée compta", en: "Accounting" },
  employee_add: { fr: "Employé ajouté", en: "Employee added" },
}

function deviceIcon(info: ActivityLog["device_info"]): React.ReactNode {
  if (info?.isMobile) return <Smartphone className="size-3.5" />
  return <Monitor className="size-3.5" />
}

function deviceLabel(info: ActivityLog["device_info"], fr: boolean): string {
  if (info?.isMobile) return fr ? "Mobile" : "Mobile"
  return fr ? "Ordinateur" : "Desktop"
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function ReportsPage({ onNavigate }: Props) {
  const { lang } = useLanguage()
  const { workspace, user } = useAuth()
  const { role } = useRole()
  const fr = lang === "fr"

  const [logs, setLogs] = React.useState<ActivityLog[]>([])
  const [loading, setLoading] = React.useState(true)
  const [actorFilter, setActorFilter] = React.useState("all")
  const [tab, setTab] = React.useState<"live" | "daily" | "monthly">("live")

  // Module filter auto-scoped to workspace type
  const moduleFilter = workspace?.type ?? "all"

  const fetchLogs = React.useCallback(async () => {
    if (!workspace) return
    setLoading(true)
    const { data } = await insforge.database
      .from("activity_logs")
      .select("*")
      .eq("workspace_id", workspace.id)
      .eq("module", workspace.type)
      .order("performed_at", { ascending: false })
      .limit(500)
    setLogs((data as ActivityLog[]) ?? [])
    setLoading(false)
  }, [workspace])

  React.useEffect(() => { fetchLogs() }, [fetchLogs])

  // Live feed: poll every 30s
  React.useEffect(() => {
    if (!workspace || tab !== "live") return
    const interval = setInterval(fetchLogs, 30000)
    return () => clearInterval(interval)
  }, [workspace, tab, fetchLogs])

  const actors = React.useMemo(() => {
    const map = new Map<string, string>()
    logs.forEach((l) => { if (!map.has(l.actor_user_id)) map.set(l.actor_user_id, l.actor_name || l.actor_email) })
    return Array.from(map.entries())
  }, [logs])

  const filtered = logs.filter((l) => {
    const mOk = moduleFilter === "all" || l.module === moduleFilter
    const aOk = actorFilter === "all" || l.actor_user_id === actorFilter
    return mOk && aOk
  })

  const now = new Date()
  const todayStart = startOfDay(now).toISOString()
  const monthStart = startOfMonth(now).toISOString()

  const todayLogs = filtered.filter((l) => l.performed_at >= todayStart)
  const monthLogs = filtered.filter((l) => l.performed_at >= monthStart)

  const todayRevenue = todayLogs.filter((l) => l.action_type === "sale").reduce((s, l) => s + Number(l.amount_usd ?? 0), 0)
  const monthRevenue = monthLogs.filter((l) => l.action_type === "sale").reduce((s, l) => s + Number(l.amount_usd ?? 0), 0)
  const todaySales = todayLogs.filter((l) => l.action_type === "sale").length
  const monthSales = monthLogs.filter((l) => l.action_type === "sale").length

  // Group daily logs by date
  const dailyGroups = React.useMemo(() => {
    const groups: Record<string, ActivityLog[]> = {}
    filtered.forEach((l) => {
      const date = l.performed_at.slice(0, 10)
      if (!groups[date]) groups[date] = []
      groups[date].push(l)
    })
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 30)
  }, [filtered])

  // Group monthly by month
  const monthlyGroups = React.useMemo(() => {
    const groups: Record<string, ActivityLog[]> = {}
    filtered.forEach((l) => {
      const month = l.performed_at.slice(0, 7)
      if (!groups[month]) groups[month] = []
      groups[month].push(l)
    })
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12)
  }, [filtered])

  if (!workspace || !user) return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <BarChart3 className="size-12 text-muted-foreground" />
      <p className="text-muted-foreground">{fr ? "Connectez-vous pour accéder aux rapports." : "Sign in to view reports."}</p>
      <Button onClick={() => onNavigate("signin")}>{fr ? "Se connecter" : "Sign in"}</Button>
    </div>
  )

  if (role !== "admin" && role !== "manager") return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <BarChart3 className="size-12 text-muted-foreground" />
      <p className="text-muted-foreground">{fr ? "Réservé à l'administrateur ou au manager." : "Admin or manager access only."}</p>
      <Button variant="outline" onClick={() => onNavigate("dashboard")}>{fr ? "Retour" : "Back"}</Button>
    </div>
  )

  const renderLogRow = (l: ActivityLog) => (
    <div key={l.id} className="flex gap-3 py-3 border-b border-border last:border-0 hover:bg-muted/20 px-1 rounded transition-colors">
      <div className="shrink-0 mt-0.5">
        <UserAvatar
          avatarUrl={null}
          name={l.actor_name || ""}
          email={l.actor_email || ""}
          size="sm"
          className="size-8"
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
          <span className="text-sm font-medium text-foreground">{l.actor_name || l.actor_email}</span>
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 gap-0.5 border", MODULE_COLORS[l.module])}>
            {MODULE_ICONS[l.module]}
            {fr ? ACTION_LABELS[l.action_type]?.fr : ACTION_LABELS[l.action_type]?.en ?? l.action_type}
          </Badge>
          {l.amount_usd && (
            <span className="text-xs font-semibold text-success">{formatCurrency(l.amount_usd, undefined, true)}</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{l.description}</p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="size-3" />
            {new Date(l.performed_at).toLocaleTimeString(fr ? "fr-FR" : "en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            {" · "}
            {new Date(l.performed_at).toLocaleDateString(fr ? "fr-FR" : "en-US", { day: "numeric", month: "short" })}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            {deviceIcon(l.device_info)}
            {deviceLabel(l.device_info, fr)}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-svh bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-primary/80 px-4 py-4 text-primary-foreground">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-primary-foreground/60 text-sm mb-1">
                <button onClick={() => onNavigate("dashboard")} className="hover:text-primary-foreground hover:underline">{fr ? "Tableau de bord" : "Dashboard"}</button>
                <span>/</span>
                <span className="text-primary-foreground">{fr ? "Rapports" : "Reports"}</span>
              </div>
              <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="size-6" /> {fr ? "Rapports & Activité" : "Reports & Activity"}</h1>
              <p className="text-primary-foreground/70 text-sm mt-0.5">{workspace.name}</p>
            </div>
            <Button variant="outline" size="sm" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 gap-1.5" onClick={fetchLogs}>
              <RefreshCw className="size-3.5" />{fr ? "Actualiser" : "Refresh"}
            </Button>
          </div>
          {/* KPI row */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: fr ? "Ventes aujourd'hui" : "Today's sales", value: todaySales },
              { label: fr ? "Revenus du jour" : "Today revenue", value: formatCurrency(todayRevenue) },
              { label: fr ? "Ventes ce mois" : "This month sales", value: monthSales },
              { label: fr ? "Revenus mensuels" : "Monthly revenue", value: formatCurrency(monthRevenue) },
            ].map((s, i) => (
              <div key={i} className="rounded-xl bg-primary-foreground/10 p-3 backdrop-blur-sm">
                <p className="text-primary-foreground/60 text-xs">{s.label}</p>
                <p className="text-xl font-bold text-primary-foreground">{loading ? "..." : s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-3 py-1.5 text-xs font-medium text-brand border border-brand/20">
            <Filter className="size-3" />
            {moduleFilter === "pharmacy" && (fr ? "Pharmacie" : "Pharmacy")}
            {moduleFilter === "commerce" && "Commerce"}
            {moduleFilter === "education" && (fr ? "Éducation" : "Education")}
            {moduleFilter === "gestion" && "Gestion"}
            {moduleFilter === "hr" && (fr ? "Ressources Humaines" : "Human Resources")}
          </span>
          <select value={actorFilter} onChange={(e) => setActorFilter(e.target.value)} className="rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="all">{fr ? "Tous les membres" : "All members"}</option>
            {actors.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground bg-success/10 border border-success/30 rounded-full px-3 py-1.5">
            <span className="size-1.5 rounded-full bg-success animate-pulse" />
            {fr ? "Temps réel activé" : "Live updates on"}
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="mb-5">
            <TabsTrigger value="live"><Clock className="size-4 mr-1.5" />{fr ? "Fil d'activité" : "Live feed"}</TabsTrigger>
            <TabsTrigger value="daily"><Calendar className="size-4 mr-1.5" />{fr ? "Rapport journalier" : "Daily report"}</TabsTrigger>
            <TabsTrigger value="monthly"><TrendingUp className="size-4 mr-1.5" />{fr ? "Rapport mensuel" : "Monthly report"}</TabsTrigger>
          </TabsList>

          {/* LIVE FEED */}
          <TabsContent value="live">
            {loading ? (
              <div className="flex h-32 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
            ) : filtered.length === 0 ? (
              <EmptyState icon={<BarChart3 className="size-12" />} title={fr ? "Aucune activité enregistrée" : "No activity recorded yet"} />
            ) : (
              <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
                {filtered.slice(0, 100).map(renderLogRow)}
              </div>
            )}
          </TabsContent>

          {/* DAILY */}
          <TabsContent value="daily">
            {loading ? (
              <div className="flex h-32 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
            ) : dailyGroups.length === 0 ? (
              <EmptyState icon={<Calendar className="size-12" />} title={fr ? "Aucun rapport journalier" : "No daily reports yet"} />
            ) : (
              <div className="space-y-4">
                {dailyGroups.map(([date, dayLogs]) => {
                  const sales = dayLogs.filter((l) => l.action_type === "sale")
                  const revenue = sales.reduce((s, l) => s + Number(l.amount_usd ?? 0), 0)
                  const actors = Array.from(new Set(dayLogs.map((l) => l.actor_name || l.actor_email)))
                  return (
                    <div key={date} className="rounded-xl border border-border bg-card overflow-hidden">
                      <div className="flex items-center justify-between bg-muted/50 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="size-4 text-muted-foreground" />
                          <span className="font-semibold text-foreground">
                            {new Date(date).toLocaleDateString(fr ? "fr-FR" : "en-US", { weekday: "long", day: "numeric", month: "long" })}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-muted-foreground">{dayLogs.length} {fr ? "actions" : "actions"}</span>
                          {revenue > 0 && <span className="font-bold text-success">{formatCurrency(revenue, undefined, true)}</span>}
                        </div>
                      </div>
                      {/* Per-member summary */}
                      <div className="px-4 py-3 flex flex-wrap gap-2 border-b border-border">
                        {actors.map((name) => {
                          const actorLogs = dayLogs.filter((l) => (l.actor_name || l.actor_email) === name)
                          const actorRev = actorLogs.filter((l) => l.action_type === "sale").reduce((s, l) => s + Number(l.amount_usd ?? 0), 0)
                          return (
                            <div key={name} className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs">
                              <UserAvatar avatarUrl={null} name={name} email="" size="sm" className="size-4" />
                              <span className="font-medium text-foreground">{name}</span>
                              <span className="text-muted-foreground">— {actorLogs.length} {fr ? "actions" : "actions"}</span>
                              {actorRev > 0 && <span className="text-success font-semibold">{formatCurrency(actorRev, undefined, true)}</span>}
                            </div>
                          )
                        })}
                      </div>
                      <div className="px-4">{dayLogs.map(renderLogRow)}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* MONTHLY */}
          <TabsContent value="monthly">
            {loading ? (
              <div className="flex h-32 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
            ) : monthlyGroups.length === 0 ? (
              <EmptyState icon={<TrendingUp className="size-12" />} title={fr ? "Aucun rapport mensuel" : "No monthly reports yet"} />
            ) : (
              <div className="space-y-4">
                {monthlyGroups.map(([month, mLogs]) => {
                  const sales = mLogs.filter((l) => l.action_type === "sale")
                  const revenue = sales.reduce((s, l) => s + Number(l.amount_usd ?? 0), 0)
                  const actors = Array.from(new Set(mLogs.map((l) => l.actor_name || l.actor_email)))
                  const [yr, mo] = month.split("-")
                  const monthLabel = new Date(parseInt(yr), parseInt(mo) - 1, 1)
                    .toLocaleDateString(fr ? "fr-FR" : "en-US", { month: "long", year: "numeric" })
                  return (
                    <div key={month} className="rounded-xl border border-border bg-card overflow-hidden">
                      <div className="flex items-center justify-between bg-muted/50 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="size-4 text-muted-foreground" />
                          <span className="font-semibold text-foreground capitalize">{monthLabel}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-muted-foreground">{mLogs.length} {fr ? "actions" : "actions"}</span>
                          {revenue > 0 && <span className="font-bold text-success">{formatCurrency(revenue, undefined, true)}</span>}
                        </div>
                      </div>
                      {/* Per-member monthly breakdown */}
                      <div className="divide-y divide-border">
                        {actors.map((name) => {
                          const actorLogs = mLogs.filter((l) => (l.actor_name || l.actor_email) === name)
                          const actorSales = actorLogs.filter((l) => l.action_type === "sale")
                          const actorRev = actorSales.reduce((s, l) => s + Number(l.amount_usd ?? 0), 0)
                          const byModule = Object.entries(
                            actorLogs.reduce((acc: Record<string, number>, l) => { acc[l.module] = (acc[l.module] ?? 0) + 1; return acc }, {})
                          )
                          return (
                            <div key={name} className="px-4 py-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <UserAvatar avatarUrl={null} name={name} email="" size="sm" className="size-7" />
                                  <span className="text-sm font-semibold text-foreground">{name}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-muted-foreground">{actorLogs.length} {fr ? "actions" : "actions"}</span>
                                  {actorRev > 0 && <span className="text-sm font-bold text-success">{formatCurrency(actorRev, undefined, true)}</span>}
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {byModule.map(([mod, count]) => (
                                  <Badge key={mod} variant="outline" className={cn("text-[10px] gap-1 px-2", MODULE_COLORS[mod])}>
                                    {MODULE_ICONS[mod]}{mod} · {count}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <PageFooter onNavigate={onNavigate} />
    </div>
  )
}
