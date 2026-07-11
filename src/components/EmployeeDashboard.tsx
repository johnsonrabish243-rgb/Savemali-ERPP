import * as React from "react"
import { useAuth } from "@/hooks/use-auth"
import { useLanguage } from "@/lib/i18n"
import { insforge } from "@/lib/supabase"
import { formatCurrency } from "@/lib/currency"
import { cn } from "@/lib/utils"
import { UserAvatar } from "@/components/UserAvatar"
import { RoleDashboard } from "@/components/RoleDashboard"
import {
  GraduationCap, Users, BookOpen, ClipboardCheck, DollarSign, TrendingUp,
  AlertTriangle, Pill, Package, ShoppingCart, Clock, FileText, Receipt,
  BarChart3, Briefcase, ArrowUpRight, ArrowDownRight, PlayCircle, Eye,
  Truck, CheckCircle, XCircle, Send, Building2, UserCheck
} from "lucide-react"
import type { WorkspaceType } from "@/lib/supabase"
import type { RoleKey } from "@/hooks/use-role"

interface EmployeeDashboardProps { workspaceType: WorkspaceType; role: RoleKey; onNavigateToTab: (tab: string) => void }
interface StatCard { label: string; value: string | number; icon: React.ReactNode; color: string; change?: string; changeType?: "up" | "down" | "neutral" }
interface QuickAction { label: string; icon: React.ReactNode; color: string; onClick?: () => void }
interface RecentItem { title: string; subtitle: string; time: string; badge?: string; badgeColor?: string }
interface DashboardConfig { stats: StatCard[]; quickActions: QuickAction[]; recentItems: RecentItem[] }

function Stat({ s, index = 0 }: { s: StatCard; index?: number }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl p-4 text-white transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5",
        `bg-gradient-to-br ${s.color}`,
        "animate-kpi-enter"
      )}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="absolute top-0 right-0 w-28 h-28 translate-x-6 -translate-y-6 bg-white/5 rounded-full blur-xl" />
      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div className="flex size-9 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm shadow-inner">{s.icon}</div>
          {s.change && (
            <span className={cn("flex items-center gap-0.5 text-xs font-medium rounded-full bg-white/15 px-2 py-0.5 backdrop-blur-sm", s.changeType === "up" && "text-emerald-100", s.changeType === "down" && "text-red-100")}>
              {s.changeType === "up" && <ArrowUpRight className="size-3" />}{s.changeType === "down" && <ArrowDownRight className="size-3" />}{s.change}
            </span>
          )}
        </div>
        <p className="mt-2.5 text-xl font-bold text-white tabular-nums tracking-tight">{s.value}</p>
        <p className="text-xs text-white/75 mt-1 font-medium">{s.label}</p>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm card-hover overflow-hidden">
      <div className="border-b border-border/50 px-4 py-3 bg-muted/20"><h3 className="text-sm font-semibold text-foreground tracking-tight">{title}</h3></div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function Recent({ items, fr }: { items: RecentItem[]; fr: boolean }) {
  return (
    <Section title={fr ? "Activité récente" : "Recent Activity"}>
      <div className="space-y-3">
        {items.length === 0 ? <p className="text-sm text-muted-foreground py-2">{fr ? "Aucune activité" : "No activity"}</p> : items.map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <UserAvatar
              avatarUrl={null}
              name={item.title}
              email=""
              size="sm"
              className="size-8 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.subtitle}</p>
            </div>
            <div className="text-right shrink-0">
              {item.badge && <span className={cn("inline-block rounded-full px-2 py-0.5 text-[10px] font-medium", item.badgeColor ?? "bg-muted text-muted-foreground")}>{item.badge}</span>}
              <p className="text-[10px] text-muted-foreground mt-0.5">{item.time}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}

const viewerConfig = (workspaceType: WorkspaceType, data: Record<string, number>, fr: boolean): DashboardConfig => {
  if (workspaceType === "education") return {
    stats: [
      { label: fr ? "Élèves" : "Students", value: data.students ?? 0, icon: <GraduationCap className="size-5 text-white" />, color: "bg-indigo-500" },
      { label: fr ? "Enseignants" : "Teachers", value: data.teachers ?? 0, icon: <Users className="size-5 text-white" />, color: "bg-blue-500" },
      { label: fr ? "Classes" : "Classes", value: data.classes ?? 0, icon: <BookOpen className="size-5 text-white" />, color: "bg-emerald-500" },
      { label: fr ? "Revenus" : "Revenue", value: formatCurrency(data.revenue ?? 0), icon: <DollarSign className="size-5 text-white" />, color: "bg-violet-500" },
    ],
    quickActions: [],
    recentItems: [{ title: fr ? "Mode lecture seule" : "Read-only mode", subtitle: fr ? "Vous consultez les données" : "You are viewing data", time: "—", badge: fr ? "Observateur" : "Observer", badgeColor: "bg-slate-100 text-slate-700" }],
  }
  if (workspaceType === "pharmacy") return {
    stats: [
      { label: fr ? "Médicaments" : "Medicines", value: data.medicines ?? 0, icon: <Pill className="size-5 text-white" />, color: "bg-teal-500" },
      { label: fr ? "Ventes" : "Sales", value: data.sales ?? 0, icon: <ShoppingCart className="size-5 text-white" />, color: "bg-sky-500" },
      { label: fr ? "Stock faible" : "Low stock", value: data.lowStock ?? 0, icon: <AlertTriangle className="size-5 text-white" />, color: "bg-red-500" },
      { label: fr ? "Revenus" : "Revenue", value: formatCurrency(data.revenue ?? 0), icon: <DollarSign className="size-5 text-white" />, color: "bg-emerald-500" },
    ],
    quickActions: [],
    recentItems: [{ title: fr ? "Mode lecture seule" : "Read-only mode", subtitle: fr ? "Vous consultez les données" : "You are viewing data", time: "—", badge: fr ? "Observateur" : "Observer", badgeColor: "bg-slate-100 text-slate-700" }],
  }
  if (workspaceType === "commerce") return {
    stats: [
      { label: fr ? "Produits" : "Products", value: data.products ?? 0, icon: <Package className="size-5 text-white" />, color: "bg-violet-500" },
      { label: fr ? "Clients" : "Customers", value: data.customers ?? 0, icon: <Users className="size-5 text-white" />, color: "bg-blue-500" },
      { label: fr ? "Ventes" : "Sales", value: data.sales ?? 0, icon: <ShoppingCart className="size-5 text-white" />, color: "bg-sky-500" },
      { label: fr ? "Revenus" : "Revenue", value: formatCurrency(data.revenue ?? 0), icon: <DollarSign className="size-5 text-white" />, color: "bg-emerald-500" },
    ],
    quickActions: [],
    recentItems: [{ title: fr ? "Mode lecture seule" : "Read-only mode", subtitle: fr ? "Vous consultez les données" : "You are viewing data", time: "—", badge: fr ? "Observateur" : "Observer", badgeColor: "bg-slate-100 text-slate-700" }],
  }
  if (workspaceType === "hr") return {
    stats: [
      { label: fr ? "Employés" : "Employees", value: data.employees ?? 0, icon: <Users className="size-5 text-white" />, color: "bg-sky-500" },
      { label: fr ? "Départements" : "Departments", value: data.departments ?? 0, icon: <Building2 className="size-5 text-white" />, color: "bg-blue-500" },
      { label: fr ? "Congés en attente" : "Pending leaves", value: data.pendingLeaves ?? 0, icon: <Clock className="size-5 text-white" />, color: "bg-amber-500" },
      { label: fr ? "Membres" : "Members", value: data.members ?? 0, icon: <UserCheck className="size-5 text-white" />, color: "bg-emerald-500" },
    ],
    quickActions: [],
    recentItems: [{ title: fr ? "Mode lecture seule" : "Read-only mode", subtitle: fr ? "Vous consultez les données" : "You are viewing data", time: "—", badge: fr ? "Observateur" : "Observer", badgeColor: "bg-slate-100 text-slate-700" }],
  }
  // gestion
  return {
    stats: [
      { label: fr ? "Employés" : "Employees", value: data.employees ?? 0, icon: <Briefcase className="size-5 text-white" />, color: "bg-amber-500" },
      { label: fr ? "Revenus" : "Revenue", value: formatCurrency(data.revenue ?? 0), icon: <TrendingUp className="size-5 text-white" />, color: "bg-emerald-500" },
      { label: fr ? "Dépenses" : "Expenses", value: formatCurrency(data.expenses ?? 0), icon: <TrendingUp className="size-5 text-white rotate-180" />, color: "bg-red-500" },
      { label: fr ? "Factures" : "Invoices", value: data.invoices ?? 0, icon: <Receipt className="size-5 text-white" />, color: "bg-blue-500" },
    ],
    quickActions: [],
    recentItems: [{ title: fr ? "Mode lecture seule" : "Read-only mode", subtitle: fr ? "Vous consultez les données" : "You are viewing data", time: "—", badge: fr ? "Observateur" : "Observer", badgeColor: "bg-slate-100 text-slate-700" }],
  }
}

const toRecent = (data: any[], fr: boolean, type: "payment" | "entry" | "sale") =>
  data.slice(0, 5).map((e: any) => ({
    title: type === "entry" ? (e.description || (fr ? "Écriture" : "Entry")) : formatCurrency(Number(e.amount_usd ?? e.total_usd ?? 0)),
    subtitle: type === "payment" ? (fr ? "Paiement frais" : "Fee payment") : type === "entry" ? formatCurrency(Number(e.amount_usd ?? 0)) : (fr ? "Vente" : "Sale"),
    time: (e.paid_at ?? e.entry_date ?? e.sold_at ?? "—").slice(0, 10) || "—",
    badge: type === "entry" ? (e.type === "income" ? (fr ? "Revenu" : "Income") : (fr ? "Dépense" : "Expense")) : (fr ? "Payé" : "Paid"),
    badgeColor: type === "entry" ? (e.type === "income" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700") : "bg-emerald-50 text-emerald-700",
  }))

export function EmployeeDashboard({ workspaceType, role, onNavigateToTab }: EmployeeDashboardProps) {
  const { workspace, user } = useAuth()
  const { lang } = useLanguage()
  const fr = lang === "fr"
  const [loading, setLoading] = React.useState(true)
  const [config, setConfig] = React.useState<DashboardConfig>({ stats: [], quickActions: [], recentItems: [] })
  const [myReports, setMyReports] = React.useState<any[]>([])

  // Fetch employee's own submitted reports
  React.useEffect(() => {
    if (!workspace?.id || !user?.id) return
    let cancelled = false
    async function fetchReports() {
      try {
        const { data } = await insforge.database
          .from("shared_reports")
          .select("id, title, module_type, status, admin_comment, reviewed_at, created_at")
          .eq("workspace_id", workspace!.id)
          .eq("sender_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(10)
        if (!cancelled) setMyReports(data ?? [])
      } catch (e) { console.error("Error:", e) }
    }
    fetchReports()
    const interval = setInterval(fetchReports, 15_000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [workspace?.id, user?.id])

  React.useEffect(() => {
    if (!workspace?.id) return
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [workspace?.id, workspaceType, role])

  async function load() {
    const wid = workspace?.id
    if (!wid) return
    try {
      const now = new Date()
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
      const weekAgoDate = new Date(now.getTime() - 7 * 86400000)
      const weekAgo = `${weekAgoDate.getFullYear()}-${String(weekAgoDate.getMonth() + 1).padStart(2, "0")}-${String(weekAgoDate.getDate()).padStart(2, "0")}`
      if (workspaceType === "education") setConfig(await loadEdu(wid, today, weekAgo))
      else if (workspaceType === "pharmacy") setConfig(await loadPharm(wid, today, weekAgo))
      else if (workspaceType === "commerce") setConfig(await loadComm(wid, today, weekAgo))
      else if (workspaceType === "gestion") setConfig(await loadGest(wid, today, weekAgo))
      else if (workspaceType === "hr") setConfig(await loadHR(wid))
    } catch { setConfig({ stats: [], quickActions: [], recentItems: [] }) }
  }

  async function loadEdu(wid: string, today: string, weekAgo: string): Promise<DashboardConfig> {
    const [sR, cR, aR, fR, iR, eR, tR] = await Promise.all([
      insforge.database.from("students").select("id", { count: "exact", head: true }).eq("workspace_id", wid),
      insforge.database.from("classes").select("id", { count: "exact", head: true }).eq("workspace_id", wid),
      insforge.database.from("attendance").select("id, status").eq("workspace_id", wid).eq("date", today),
      insforge.database.from("fee_payments").select("id, amount_usd, paid_at").eq("workspace_id", wid),
      insforge.database.from("invoices").select("id, status").eq("workspace_id", wid),
      insforge.database.from("accounting_entries").select("id, type, amount_usd, description, entry_date").eq("workspace_id", wid).gte("entry_date", weekAgo),
      insforge.database.from("teachers").select("id", { count: "exact", head: true }).eq("workspace_id", wid),
    ])
    const sCount = sR.count ?? 0, cCount = cR.count ?? 0, tCount = tR.count ?? 0
    const att = aR.data ?? [], fees = fR.data ?? [], inv = iR.data ?? [], ents = eR.data ?? []
    const present = att.filter((a: any) => a.status === "present").length
    const absent = att.filter((a: any) => a.status === "absent").length
    const rate = sCount > 0 ? Math.round((present / sCount) * 100) : 0
    const todayFees = fees.filter((f: any) => f.paid_at?.slice(0, 10) === today).reduce((s: number, f: any) => s + Number(f.amount_usd ?? 0), 0)
    const totalColl = fees.reduce((s: number, f: any) => s + Number(f.amount_usd ?? 0), 0)
    const pending = inv.filter((i: any) => i.status === "pending" || i.status === "draft").length
    const income = ents.filter((e: any) => e.type === "income").reduce((s: number, e: any) => s + Number(e.amount_usd ?? 0), 0)
    const expenses = ents.filter((e: any) => e.type === "expense").reduce((s: number, e: any) => s + Number(e.amount_usd ?? 0), 0)
    const recentFees = fees.sort((a: any, b: any) => (b.paid_at ?? "").localeCompare(a.paid_at ?? "")).slice(0, 5)
    const recentEnts = ents.sort((a: any, b: any) => (b.entry_date ?? "").localeCompare(a.entry_date ?? ""))

    if (role === "teacher") return {
      stats: [
        { label: fr ? "Élèves" : "Students", value: sCount, icon: <GraduationCap className="size-5 text-white" />, color: "bg-indigo-500" },
        { label: fr ? "Mes classes" : "My classes", value: cCount, icon: <BookOpen className="size-5 text-white" />, color: "bg-blue-500" },
        { label: fr ? "Présents" : "Present today", value: present, icon: <ClipboardCheck className="size-5 text-white" />, color: "bg-emerald-500" },
        { label: fr ? "Absents" : "Absent today", value: absent, icon: <Clock className="size-5 text-white" />, color: "bg-red-500" },
      ],
      quickActions: [
        { label: fr ? "Prendre présence" : "Take attendance", icon: <ClipboardCheck className="size-4 text-white" />, color: "bg-emerald-500", onClick: () => onNavigateToTab("attendance") },
        { label: fr ? "Saisir notes" : "Enter grades", icon: <FileText className="size-4 text-white" />, color: "bg-blue-500", onClick: () => onNavigateToTab("grades") },
      ],
      recentItems: toRecent(recentFees, fr, "payment").length > 0 ? toRecent(recentFees, fr, "payment") : [{ title: fr ? "Aucun paiement" : "No payments", subtitle: fr ? "En attente" : "Awaiting data", time: "—" }],
    }
    if (role === "manager") return {
      stats: [
        { label: fr ? "Élèves" : "Students", value: sCount, icon: <GraduationCap className="size-5 text-white" />, color: "bg-indigo-500" },
        { label: fr ? "Enseignants" : "Teachers", value: tCount, icon: <Users className="size-5 text-white" />, color: "bg-blue-500" },
        { label: fr ? "Taux présence" : "Attendance rate", value: `${rate}%`, icon: <BarChart3 className="size-5 text-white" />, color: "bg-emerald-500" },
        { label: fr ? "Revenus" : "Revenue", value: formatCurrency(totalColl), icon: <DollarSign className="size-5 text-white" />, color: "bg-violet-500" },
      ],
      quickActions: [],
      recentItems: toRecent(recentFees, fr, "payment").length > 0 ? toRecent(recentFees, fr, "payment") : [{ title: fr ? "Aucune activité" : "No activity", subtitle: fr ? "Suivi opérationnel" : "Operational monitoring", time: "—" }],
    }
    if (role === "supervisor") return {
      stats: [
        { label: fr ? "Élèves" : "Students", value: sCount, icon: <GraduationCap className="size-5 text-white" />, color: "bg-indigo-500" },
        { label: fr ? "Présents" : "Present", value: present, icon: <ClipboardCheck className="size-5 text-white" />, color: "bg-emerald-500" },
        { label: fr ? "Taux présence" : "Attendance rate", value: `${rate}%`, icon: <BarChart3 className="size-5 text-white" />, color: "bg-blue-500" },
        { label: fr ? "Absents" : "Absent", value: absent, icon: <AlertTriangle className="size-5 text-white" />, color: "bg-red-500" },
      ],
      quickActions: [{ label: fr ? "Voir présence" : "View attendance", icon: <Eye className="size-4 text-white" />, color: "bg-blue-500", onClick: () => onNavigateToTab("attendance") }],
      recentItems: [{ title: `${present} ${fr ? "présents" : "present"}`, subtitle: `${absent} ${fr ? "absents" : "absent"}`, time: today, badge: fr ? "Aujourd'hui" : "Today", badgeColor: "bg-blue-50 text-blue-700" }],
    }
    if (role === "cashier") return {
      stats: [
        { label: fr ? "Paiements aujourd'hui" : "Payments today", value: formatCurrency(todayFees), icon: <DollarSign className="size-5 text-white" />, color: "bg-emerald-500" },
        { label: fr ? "Factures en attente" : "Pending invoices", value: pending, icon: <Receipt className="size-5 text-white" />, color: "bg-amber-500" },
        { label: fr ? "Total collecté" : "Total collected", value: formatCurrency(totalColl), icon: <TrendingUp className="size-5 text-white" />, color: "bg-blue-500" },
        { label: fr ? "Élèves" : "Students", value: sCount, icon: <GraduationCap className="size-5 text-white" />, color: "bg-indigo-500" },
      ],
      quickActions: [],
      recentItems: toRecent(recentFees, fr, "payment"),
    }
    if (role === "accountant") return {
      stats: [
        { label: fr ? "Revenus" : "Revenue", value: formatCurrency(income), icon: <TrendingUp className="size-5 text-white" />, color: "bg-emerald-500" },
        { label: fr ? "Dépenses" : "Expenses", value: formatCurrency(expenses), icon: <TrendingUp className="size-5 text-white rotate-180" />, color: "bg-red-500" },
        { label: fr ? "Solde" : "Balance", value: formatCurrency(income - expenses), icon: <DollarSign className="size-5 text-white" />, color: "bg-blue-500" },
        { label: fr ? "Écritures" : "Entries", value: ents.length, icon: <BarChart3 className="size-5 text-white" />, color: "bg-violet-500" },
      ],
      quickActions: [],
      recentItems: toRecent(recentEnts, fr, "entry"),
    }
    return viewerConfig(workspaceType, { students: sCount, teachers: tCount, classes: cCount, revenue: totalColl }, fr)
  }

  async function loadPharm(wid: string, today: string, weekAgo: string): Promise<DashboardConfig> {
    const [mR, sR, eR] = await Promise.all([
      insforge.database.from("store_medicines").select("id, stock_quantity, min_stock_alert, expiry_date").eq("workspace_id", wid),
      insforge.database.from("sales").select("id, total_usd, sold_at").eq("workspace_id", wid).gte("sold_at", weekAgo),
      insforge.database.from("accounting_entries").select("id, type, amount_usd, description, entry_date").eq("workspace_id", wid).gte("entry_date", weekAgo),
    ])
    const meds = mR.data ?? [], sales = sR.data ?? [], ents = eR.data ?? []
    const todaySales = sales.filter((s: any) => s.sold_at?.slice(0, 10) === today)
    const todayRev = todaySales.reduce((s: number, r: any) => s + Number(r.total_usd ?? 0), 0)
    const totalRev = sales.reduce((s: number, r: any) => s + Number(r.total_usd ?? 0), 0)
    const lowStock = meds.filter((m: any) => (m.stock_quantity ?? 0) <= (m.min_stock_alert ?? 0)).length
    const expiring = meds.filter((m: any) => { if (!m.expiry_date) return false; const d = new Date(m.expiry_date).getTime() - Date.now(); return d > 0 && d < 30 * 86400000 }).length
    const income = ents.filter((e: any) => e.type === "income").reduce((s: number, e: any) => s + Number(e.amount_usd ?? 0), 0)
    const expenses = ents.filter((e: any) => e.type === "expense").reduce((s: number, e: any) => s + Number(e.amount_usd ?? 0), 0)
    const recentS = sales.sort((a: any, b: any) => (b.sold_at ?? "").localeCompare(a.sold_at ?? ""))
    const recentE = ents.sort((a: any, b: any) => (b.entry_date ?? "").localeCompare(a.entry_date ?? ""))

    if (role === "pharmacist") return {
      stats: [
        { label: fr ? "Médicaments" : "Medicines", value: meds.length, icon: <Pill className="size-5 text-white" />, color: "bg-teal-500" },
        { label: fr ? "Stock faible" : "Low stock", value: lowStock, icon: <AlertTriangle className="size-5 text-white" />, color: "bg-red-500" },
        { label: fr ? "Expirent bientôt" : "Expiring soon", value: expiring, icon: <Clock className="size-5 text-white" />, color: "bg-amber-500" },
        { label: fr ? "Ventes du jour" : "Today's sales", value: todaySales.length, icon: <ShoppingCart className="size-5 text-white" />, color: "bg-blue-500" },
      ],
      quickActions: [
        { label: fr ? "Vérifier stock" : "Check stock", icon: <Eye className="size-4 text-white" />, color: "bg-teal-500", onClick: () => onNavigateToTab("inventory") },
        { label: fr ? "Ordonnances" : "Prescriptions", icon: <FileText className="size-4 text-white" />, color: "bg-blue-500", onClick: () => onNavigateToTab("prescriptions") },
      ],
      recentItems: toRecent(recentS, fr, "sale"),
    }
    if (role === "manager") return {
      stats: [
        { label: fr ? "Médicaments" : "Medicines", value: meds.length, icon: <Pill className="size-5 text-white" />, color: "bg-teal-500" },
        { label: fr ? "Stock faible" : "Low stock", value: lowStock, icon: <AlertTriangle className="size-5 text-white" />, color: "bg-red-500" },
        { label: fr ? "Revenus semaine" : "Weekly revenue", value: formatCurrency(totalRev), icon: <DollarSign className="size-5 text-white" />, color: "bg-emerald-500" },
        { label: fr ? "Ventes" : "Sales", value: sales.length, icon: <ShoppingCart className="size-5 text-white" />, color: "bg-blue-500" },
      ],
      quickActions: [],
      recentItems: toRecent(recentS, fr, "sale"),
    }
    if (role === "cashier") return {
      stats: [
        { label: fr ? "Ventes du jour" : "Today's sales", value: todaySales.length, icon: <ShoppingCart className="size-5 text-white" />, color: "bg-sky-500" },
        { label: fr ? "Transactions" : "Transactions", value: todaySales.length, icon: <Receipt className="size-5 text-white" />, color: "bg-blue-500" },
        { label: fr ? "Revenu du jour" : "Today's revenue", value: formatCurrency(todayRev), icon: <DollarSign className="size-5 text-white" />, color: "bg-emerald-500" },
        { label: fr ? "Médicaments" : "Medicines", value: meds.length, icon: <Pill className="size-5 text-white" />, color: "bg-teal-500" },
      ],
      quickActions: [
        { label: fr ? "Nouvelle vente" : "New sale", icon: <PlayCircle className="size-4 text-white" />, color: "bg-emerald-500", onClick: () => onNavigateToTab("sales") },
        { label: fr ? "Ordonnances" : "Prescriptions", icon: <FileText className="size-4 text-white" />, color: "bg-blue-500", onClick: () => onNavigateToTab("prescriptions") },
        { label: fr ? "Commandes" : "Orders", icon: <ShoppingCart className="size-4 text-white" />, color: "bg-violet-500", onClick: () => onNavigateToTab("orders") },
      ],
      recentItems: toRecent(recentS, fr, "sale"),
    }
    if (role === "accountant") return {
      stats: [
        { label: fr ? "Revenus" : "Revenue", value: formatCurrency(income), icon: <TrendingUp className="size-5 text-white" />, color: "bg-emerald-500" },
        { label: fr ? "Dépenses" : "Expenses", value: formatCurrency(expenses), icon: <TrendingUp className="size-5 text-white rotate-180" />, color: "bg-red-500" },
        { label: fr ? "Profit" : "Profit", value: formatCurrency(income - expenses), icon: <DollarSign className="size-5 text-white" />, color: "bg-violet-500" },
        { label: fr ? "Écritures" : "Entries", value: ents.length, icon: <BarChart3 className="size-5 text-white" />, color: "bg-blue-500" },
      ],
      quickActions: [],
      recentItems: toRecent(recentE, fr, "entry"),
    }
    return viewerConfig(workspaceType, { medicines: meds.length, sales: sales.length, lowStock, revenue: totalRev }, fr)
  }

  async function loadComm(wid: string, today: string, weekAgo: string): Promise<DashboardConfig> {
    const [pR, sR, cR, iR, eR] = await Promise.all([
      insforge.database.from("commerce_products").select("id, stock_quantity").eq("workspace_id", wid),
      insforge.database.from("sales").select("id, total_usd, sold_at").eq("workspace_id", wid).gte("sold_at", weekAgo),
      insforge.database.from("customers").select("id", { count: "exact", head: true }).eq("workspace_id", wid),
      insforge.database.from("invoices").select("id", { count: "exact", head: true }).eq("workspace_id", wid),
      insforge.database.from("accounting_entries").select("id, type, amount_usd, description, entry_date").eq("workspace_id", wid).gte("entry_date", weekAgo),
    ])
    const prods = pR.data ?? [], sales = sR.data ?? [], custs = cR.count ?? 0, invs = iR.count ?? 0, ents = eR.data ?? []
    const todaySales = sales.filter((s: any) => s.sold_at?.slice(0, 10) === today)
    const todayRev = todaySales.reduce((s: number, r: any) => s + Number(r.total_usd ?? 0), 0)
    const totalRev = sales.reduce((s: number, r: any) => s + Number(r.total_usd ?? 0), 0)
    const lowStock = prods.filter((p: any) => (p.stock_quantity ?? 0) <= 5).length
    const income = ents.filter((e: any) => e.type === "income").reduce((s: number, e: any) => s + Number(e.amount_usd ?? 0), 0)
    const expenses = ents.filter((e: any) => e.type === "expense").reduce((s: number, e: any) => s + Number(e.amount_usd ?? 0), 0)
    const recentS = sales.sort((a: any, b: any) => (b.sold_at ?? "").localeCompare(a.sold_at ?? ""))
    const recentE = ents.sort((a: any, b: any) => (b.entry_date ?? "").localeCompare(a.entry_date ?? ""))

    if (role === "cashier") return {
      stats: [
        { label: fr ? "Ventes du jour" : "Today's sales", value: todaySales.length, icon: <ShoppingCart className="size-5 text-white" />, color: "bg-sky-500" },
        { label: fr ? "Transactions" : "Transactions", value: todaySales.length, icon: <Receipt className="size-5 text-white" />, color: "bg-blue-500" },
        { label: fr ? "Revenu du jour" : "Today's revenue", value: formatCurrency(todayRev), icon: <DollarSign className="size-5 text-white" />, color: "bg-emerald-500" },
        { label: fr ? "Produits" : "Products", value: prods.length, icon: <Package className="size-5 text-white" />, color: "bg-violet-500" },
      ],
      quickActions: [
        { label: fr ? "Vérifier stock" : "Check stock", icon: <Eye className="size-4 text-white" />, color: "bg-teal-500", onClick: () => onNavigateToTab("produits") },
        { label: fr ? "Nouvelle vente" : "New sale", icon: <PlayCircle className="size-4 text-white" />, color: "bg-emerald-500", onClick: () => onNavigateToTab("ventes") },
      ],
      recentItems: toRecent(recentS, fr, "sale"),
    }
    if (role === "manager") return {
      stats: [
        { label: fr ? "Produits" : "Products", value: prods.length, icon: <Package className="size-5 text-white" />, color: "bg-violet-500" },
        { label: fr ? "Clients" : "Customers", value: custs, icon: <Users className="size-5 text-white" />, color: "bg-blue-500" },
        { label: fr ? "Ventes semaine" : "Weekly sales", value: sales.length, icon: <ShoppingCart className="size-5 text-white" />, color: "bg-sky-500" },
        { label: fr ? "Revenus" : "Revenue", value: formatCurrency(totalRev), icon: <DollarSign className="size-5 text-white" />, color: "bg-emerald-500" },
      ],
      quickActions: [],
      recentItems: toRecent(recentS, fr, "sale"),
    }
    if (role === "accountant") return {
      stats: [
        { label: fr ? "Revenus" : "Revenue", value: formatCurrency(income), icon: <TrendingUp className="size-5 text-white" />, color: "bg-emerald-500" },
        { label: fr ? "Dépenses" : "Expenses", value: formatCurrency(expenses), icon: <TrendingUp className="size-5 text-white rotate-180" />, color: "bg-red-500" },
        { label: fr ? "Profit" : "Profit", value: formatCurrency(income - expenses), icon: <DollarSign className="size-5 text-white" />, color: "bg-violet-500" },
        { label: fr ? "Factures" : "Invoices", value: invs, icon: <Receipt className="size-5 text-white" />, color: "bg-amber-500" },
      ],
      quickActions: [],
      recentItems: toRecent(recentE, fr, "entry"),
    }
    return viewerConfig(workspaceType, { products: prods.length, customers: custs, sales: sales.length, revenue: totalRev }, fr)
  }

  async function loadGest(wid: string, today: string, weekAgo: string): Promise<DashboardConfig> {
    const [eR, aR, iR] = await Promise.all([
      insforge.database.from("employees").select("id", { count: "exact", head: true }).eq("workspace_id", wid).eq("status", "active"),
      insforge.database.from("accounting_entries").select("id, type, amount_usd, description, entry_date").eq("workspace_id", wid).gte("entry_date", weekAgo),
      insforge.database.from("invoices").select("id", { count: "exact", head: true }).eq("workspace_id", wid),
    ])
    const emps = eR.count ?? 0, ents = aR.data ?? [], invs = iR.count ?? 0
    const income = ents.filter((e: any) => e.type === "income").reduce((s: number, e: any) => s + Number(e.amount_usd ?? 0), 0)
    const expenses = ents.filter((e: any) => e.type === "expense").reduce((s: number, e: any) => s + Number(e.amount_usd ?? 0), 0)
    const todayPay = ents.filter((e: any) => e.entry_date === today && e.type === "income")
    const todayAmt = todayPay.reduce((s: number, e: any) => s + Number(e.amount_usd ?? 0), 0)
    const recentE = ents.sort((a: any, b: any) => (b.entry_date ?? "").localeCompare(a.entry_date ?? ""))

    if (role === "accountant") return {
      stats: [
        { label: fr ? "Revenus" : "Revenue", value: formatCurrency(income), icon: <TrendingUp className="size-5 text-white" />, color: "bg-emerald-500" },
        { label: fr ? "Dépenses" : "Expenses", value: formatCurrency(expenses), icon: <TrendingUp className="size-5 text-white rotate-180" />, color: "bg-red-500" },
        { label: fr ? "Solde" : "Balance", value: formatCurrency(income - expenses), icon: <DollarSign className="size-5 text-white" />, color: "bg-blue-500" },
        { label: fr ? "Écritures" : "Entries", value: ents.length, icon: <BarChart3 className="size-5 text-white" />, color: "bg-violet-500" },
      ],
      quickActions: [],
      recentItems: toRecent(recentE, fr, "entry"),
    }
    if (role === "cashier") return {
      stats: [
        { label: fr ? "Paiements aujourd'hui" : "Payments today", value: todayPay.length, icon: <DollarSign className="size-5 text-white" />, color: "bg-emerald-500" },
        { label: fr ? "Transactions" : "Transactions", value: ents.length, icon: <Receipt className="size-5 text-white" />, color: "bg-blue-500" },
        { label: fr ? "Montant du jour" : "Today's amount", value: formatCurrency(todayAmt), icon: <TrendingUp className="size-5 text-white" />, color: "bg-violet-500" },
        { label: fr ? "Employés" : "Employees", value: emps, icon: <Briefcase className="size-5 text-white" />, color: "bg-amber-500" },
      ],
      quickActions: [],
      recentItems: toRecent(recentE, fr, "entry"),
    }
    if (role === "manager") return {
      stats: [
        { label: fr ? "Employés actifs" : "Active employees", value: emps, icon: <Briefcase className="size-5 text-white" />, color: "bg-amber-500" },
        { label: fr ? "Revenus" : "Revenue", value: formatCurrency(income), icon: <TrendingUp className="size-5 text-white" />, color: "bg-emerald-500" },
        { label: fr ? "Dépenses" : "Expenses", value: formatCurrency(expenses), icon: <TrendingUp className="size-5 text-white rotate-180" />, color: "bg-red-500" },
        { label: fr ? "Factures" : "Invoices", value: invs, icon: <Receipt className="size-5 text-white" />, color: "bg-blue-500" },
      ],
      quickActions: [],
      recentItems: toRecent(recentE, fr, "entry"),
    }
    return viewerConfig(workspaceType, { employees: emps, revenue: income, expenses, invoices: invs }, fr)
  }

  async function loadHR(wid: string): Promise<DashboardConfig> {
    const [empR, deptR, leaveR] = await Promise.all([
      insforge.database.from("hr_employees").select("id, status", { count: "exact", head: false }).eq("workspace_id", wid),
      insforge.database.from("hr_departments").select("id", { count: "exact", head: true }).eq("workspace_id", wid),
      insforge.database.from("hr_leave_requests").select("id, status").eq("workspace_id", wid).eq("status", "pending"),
    ])
    const totalEmp = (empR.data ?? []).length
    const deptCount = deptR.count ?? 0
    const pendingLeaves = (leaveR.data ?? []).length
    return viewerConfig(workspaceType, { employees: totalEmp, departments: deptCount, pendingLeaves, members: 0 }, fr)
  }

  if (role === "admin") return <RoleDashboard />
  if (loading) return (
    <div className="flex h-64 items-center justify-center"><div className="size-8 animate-spin rounded-full border-2 border-border border-t-brand" /></div>
  )

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {config.stats.length > 0 && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{config.stats.map((stat, i) => <Stat key={i} s={stat} index={i} />)}</div>}
      {config.quickActions.length > 0 && (
        <Section title={fr ? "Actions rapides" : "Quick Actions"}>
          <div className="flex flex-wrap gap-2">
            {config.quickActions.map((a, i) => (
              <button key={i} onClick={a.onClick} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-all hover:shadow-sm text-foreground hover:bg-muted">
                <div className={cn("flex size-7 items-center justify-center rounded-md", a.color)}>{a.icon}</div>{a.label}
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* My Reports Section */}
      {myReports.length > 0 && (
        <Section title={fr ? "Mes rapports soumis" : "My Submitted Reports"}>
          <div className="space-y-2">
            {myReports.map((report) => {
              const statusConfig: Record<string, { fr: string; en: string; icon: React.ReactNode; className: string }> = {
                pending: { fr: "En cours de révision", en: "Under review", icon: <Clock className="size-4" />, className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30" },
                in_review: { fr: "En cours de révision", en: "Under review", icon: <Clock className="size-4" />, className: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
                accepted: { fr: "Validé et accepté", en: "Validated and accepted", icon: <CheckCircle className="size-4" />, className: "bg-green-500/10 text-green-600 border-green-500/30" },
                rejected: { fr: "Refusé — Corrections demandées", en: "Rejected — Corrections requested", icon: <XCircle className="size-4" />, className: "bg-red-500/10 text-red-600 border-red-500/30" },
                archived: { fr: "Archivé", en: "Archived", icon: <Eye className="size-4" />, className: "bg-muted text-muted-foreground" },
              }
              const cfg = statusConfig[report.status] ?? statusConfig.pending
              const moduleLabels: Record<string, { fr: string; en: string }> = {
                education: { fr: "Éducation", en: "Education" },
                pharmacy: { fr: "Pharmacie", en: "Pharmacy" },
                commerce: { fr: "Commerce", en: "Commerce" },
                gestion: { fr: "Gestion", en: "Management" },
              }
              const ml = moduleLabels[report.module_type] ?? { fr: report.module_type, en: report.module_type }
              return (
                <div key={report.id} className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
                  <div className="flex-shrink-0">
                    <div className={cn("size-8 rounded-full flex items-center justify-center", cfg.className.split(" ")[0])}>
                      {cfg.icon}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{report.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {ml[fr ? "fr" : "en"]} — {new Date(report.created_at).toLocaleString(fr ? "fr-FR" : "en-US")}
                    </p>
                    {report.admin_comment && (
                      <p className="text-xs text-muted-foreground mt-0.5 italic">"{report.admin_comment}"</p>
                    )}
                  </div>
                  <div className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", cfg.className)}>
                    {cfg.icon}
                    {fr ? cfg.fr : cfg.en}
                  </div>
                </div>
              )
            })}
          </div>
        </Section>
      )}

      <Recent items={config.recentItems} fr={fr} />
    </div>
  )
}
