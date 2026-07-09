import * as React from "react"
import { useAuth } from "@/hooks/use-auth"
import { useRole } from "@/hooks/use-role"
import { useLanguage } from "@/lib/i18n"
import { insforge } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/currency"
import { UserAvatar } from "@/components/UserAvatar"
import { ReportPreviewModal } from "@/components/ReportPreviewModal"
import type { ReportData } from "@/lib/report-generator"
import {
  GraduationCap, Users, BookOpen, ClipboardCheck, DollarSign, TrendingUp,
  AlertTriangle, Pill, Package, ShoppingCart, Clock, FileText, Receipt,
  BarChart3, Briefcase, ArrowUpRight, ArrowDownRight, Search, Zap,
  ClipboardList, Calendar, Filter, X, Send, CheckCircle, Archive, Eye, XCircle
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell
} from "recharts"

interface StatCard {
  label: string
  value: string | number
  icon: React.ReactNode
  change?: string
  changeType?: "up" | "down" | "neutral"
  color: string
}

interface RecentItem {
  title: string
  subtitle: string
  time: string
  badge?: string
  badgeColor?: string
}

export function RoleDashboard() {
  const { workspace } = useAuth()
  const role = useRole()
  const { lang } = useLanguage()
  const fr = lang === "fr"
  const [stats, setStats] = React.useState<Record<string, number>>({})
  const [chartData, setChartData] = React.useState<Record<string, { day: string; value: number }[]>>({})
  const [loading, setLoading] = React.useState(true)
  const [activity, setActivity] = React.useState<any[]>([])
  const [sharedReports, setSharedReports] = React.useState<any[]>([])
  const [processingReport, setProcessingReport] = React.useState<string | null>(null)
  const [previewReport, setPreviewReport] = React.useState<any | null>(null)

  // Filters
  const [dateRange, setDateRange] = React.useState<"7" | "30" | "90" | "all">("7")

  const days = dateRange === "all" ? 365 : Number(dateRange)

  React.useEffect(() => {
    if (!workspace) return
    loadStats()
  }, [workspace, dateRange])

  async function loadStats() {
    if (!workspace) return
    const wid = workspace.id
    const wsType = workspace.type
    try {
      const now = new Date()
      const rangeStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

      // Only query tables relevant to this workspace type
      const queries: Record<string, any> = {
        members: insforge.database.from("workspace_members").select("id, display_name, email, role, status").eq("workspace_id", wid).eq("status", "active"),
        activity: insforge.database.from("activity_logs").select("*").eq("workspace_id", wid).order("performed_at", { ascending: false }).limit(20),
        sharedReports: insforge.database.from("shared_reports").select("*").eq("workspace_id", wid).order("created_at", { ascending: false }).limit(20),
      }

      if (wsType === "education") {
        queries.students = insforge.database.from("students").select("id", { count: "exact", head: true }).eq("workspace_id", wid)
        queries.teachers = insforge.database.from("teachers").select("id", { count: "exact", head: true }).eq("workspace_id", wid)
        queries.classes = insforge.database.from("classes").select("id, name, level, fees_usd", { count: "exact", head: false }).eq("workspace_id", wid)
        queries.feePayments = insforge.database.from("fee_payments").select("amount_usd, paid_at").eq("workspace_id", wid).gte("paid_at", rangeStart)
        queries.attendance = insforge.database.from("attendance").select("status, date").eq("workspace_id", wid).eq("date", now.toISOString().slice(0, 10))
      }

      if (wsType === "pharmacy") {
        queries.medicines = insforge.database.from("store_medicines").select("id, stock_quantity, min_stock_alert, category").eq("workspace_id", wid)
        queries.recentSales = insforge.database.from("sales").select("total_usd, sold_at").eq("workspace_id", wid).gte("sold_at", rangeStart)
        queries.allSales = insforge.database.from("sales").select("total_usd, sold_at").eq("workspace_id", wid)
        queries.orders = insforge.database.from("supplier_orders").select("id, total_cost, status, ordered_at").eq("workspace_id", wid)
      }

      if (wsType === "commerce") {
        queries.products = insforge.database.from("commerce_products").select("id, category, stock_quantity, price_usd", { count: "exact", head: false }).eq("workspace_id", wid)
        queries.customers = insforge.database.from("customers").select("id", { count: "exact", head: true }).eq("workspace_id", wid)
        queries.recentSales = insforge.database.from("sales").select("total_usd, sold_at").eq("workspace_id", wid).gte("sold_at", rangeStart)
        queries.allSales = insforge.database.from("sales").select("total_usd, sold_at").eq("workspace_id", wid)
        queries.invoices = insforge.database.from("invoices").select("id, total_usd, status").eq("workspace_id", wid)
      }

      if (wsType === "gestion") {
        queries.employees = insforge.database.from("employees").select("id, role, department", { count: "exact", head: false }).eq("workspace_id", wid).eq("status", "active")
        queries.entries = insforge.database.from("accounting_entries").select("type, amount_usd, entry_date").eq("workspace_id", wid).gte("entry_date", rangeStart)
        queries.invoices = insforge.database.from("invoices").select("id, total_usd, status").eq("workspace_id", wid)
      }

      if (wsType === "hr") {
        queries.hrEmployees = insforge.database.from("hr_employees").select("id, status, department_id", { count: "exact", head: false }).eq("workspace_id", wid)
        queries.hrDepartments = insforge.database.from("hr_departments").select("id", { count: "exact", head: true }).eq("workspace_id", wid)
        queries.hrLeaves = insforge.database.from("hr_leave_requests").select("id, status").eq("workspace_id", wid).eq("status", "pending")
      }

      const results: Record<string, any> = {}
      const entries = Object.entries(queries)
      const values = await Promise.all(entries.map(([, q]) => q))
      entries.forEach(([key], i) => { results[key] = values[i] })

      const members = results.members?.data ?? []
      const activityLogs = (results.activity?.data ?? []) as any[]

      const dayNames = fr ? ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

      // Build day buckets
      const dayBuckets: Record<string, number> = {}
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        dayBuckets[d.toISOString().slice(0, 10)] = 0
      }

      // Education stats
      const students = results.students?.count ?? 0
      const teachers = results.teachers?.count ?? 0
      const classes = results.classes?.count ?? 0
      const feePayments = results.feePayments?.data ?? []
      const totalFees = feePayments.reduce((s: number, r: any) => s + Number(r.amount_usd ?? 0), 0)
      const attendanceData = results.attendance?.data ?? []
      const presentToday = attendanceData.filter((a: any) => a.status === "present").length
      const absentToday = attendanceData.filter((a: any) => a.status === "absent").length
      const lateToday = attendanceData.filter((a: any) => a.status === "late").length

      const feesByDay = { ...dayBuckets }
      feePayments.forEach((f: any) => { const day = f.paid_at?.slice(0, 10); if (day && day in feesByDay) feesByDay[day] += Number(f.amount_usd ?? 0) })
      const feeChartData = Object.entries(feesByDay).map(([date, value]) => ({ day: days <= 14 ? dayNames[new Date(date).getDay()] : new Date(date).getDate().toString(), value: Math.round(value) }))

      // Pharmacy stats
      const medicines = results.medicines?.data ?? []
      const lowStock = medicines.filter((m: any) => (m.stock_quantity ?? 0) <= (m.min_stock_alert ?? 0)).length
      const recentSales = results.recentSales?.data ?? []
      const allSales = results.allSales?.data ?? []
      const orders = results.orders?.data ?? []

      const salesByDay = { ...dayBuckets }
      recentSales.forEach((s: any) => { const day = s.sold_at?.slice(0, 10); if (day && day in salesByDay) salesByDay[day] += Number(s.total_usd ?? 0) })
      const salesChartData = Object.entries(salesByDay).map(([date, value]) => ({ day: days <= 14 ? dayNames[new Date(date).getDay()] : new Date(date).getDate().toString(), value: Math.round(value) }))

      // Commerce stats
      const products = results.products?.data ?? []
      const commerceLowStock = products.filter((p: any) => (p.stock_quantity ?? 0) <= 5).length
      const customers = results.customers?.count ?? 0
      const invoices = results.invoices?.data ?? []

      // Gestion stats
      const employees = results.employees?.data ?? []
      const accountingEntries = results.entries?.data ?? []

      // HR stats
      const hrEmployees = results.hrEmployees?.data ?? []
      const hrDepartmentsCount = results.hrDepartments?.count ?? 0
      const hrPendingLeaves = results.hrLeaves?.data ?? []

      const financeByDay: Record<string, { income: number; expenses: number }> = {}
      for (let i = days - 1; i >= 0; i--) { const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000); financeByDay[d.toISOString().slice(0, 10)] = { income: 0, expenses: 0 } }
      accountingEntries.forEach((e: any) => { const day = e.entry_date?.slice(0, 10); if (day && day in financeByDay) { if (e.type === "income") financeByDay[day].income += Number(e.amount_usd ?? 0); else financeByDay[day].expenses += Number(e.amount_usd ?? 0) } })
      const financeChartData = Object.entries(financeByDay).map(([date, v]) => ({ day: days <= 14 ? dayNames[new Date(date).getDay()] : new Date(date).getDate().toString(), income: Math.round(v.income), expenses: Math.round(v.expenses) }))

      // Category breakdowns
      const medicineByCategory: Record<string, number> = {}
      medicines.forEach((m: any) => { const cat = m.category || "Autre"; medicineByCategory[cat] = (medicineByCategory[cat] || 0) + 1 })
      const productsByCategory: Record<string, number> = {}
      products.forEach((p: any) => { const cat = p.category || "Autre"; productsByCategory[cat] = (productsByCategory[cat] || 0) + 1 })
      const employeesByDept: Record<string, number> = {}
      employees.forEach((e: any) => { const dept = e.department || "Général"; employeesByDept[dept] = (employeesByDept[dept] || 0) + 1 })

      setStats({
        students,
        teachers,
        classes,
        medicines: medicines.length,
        lowStock: wsType === "commerce" ? commerceLowStock : lowStock,
        commerceLowStock,
        todaySales: recentSales.length,
        todayRevenue: recentSales.reduce((s: number, r: any) => s + Number(r.total_usd ?? 0), 0),
        totalRevenue: allSales.reduce((s: number, r: any) => s + Number(r.total_usd ?? 0), 0),
        products: products.length,
        customers,
        members: members.length,
        staffEmployees: 0,
        employees: employees.length,
        totalFees,
        invoices: invoices.length,
        pendingInvoices: invoices.filter((i: any) => i.status === "draft").length,
        income: accountingEntries.filter((e: any) => e.type === "income").reduce((s: number, r: any) => s + Number(r.amount_usd ?? 0), 0),
        expenses: accountingEntries.filter((e: any) => e.type === "expense").reduce((s: number, r: any) => s + Number(r.amount_usd ?? 0), 0),
        presentToday,
        absentToday,
        lateToday,
        totalEmployees: hrEmployees.length,
        departments: hrDepartmentsCount,
        pendingLeaves: hrPendingLeaves.length,
        totalUsers: members.length,
      })

      setChartData({
        sales: salesChartData,
        fees: feeChartData,
        finance: financeChartData,
        medicineCategories: Object.entries(medicineByCategory).map(([name, value]) => ({ name, value })),
        productCategories: Object.entries(productsByCategory).map(([name, value]) => ({ name, value })),
        employeesByDept: Object.entries(employeesByDept).map(([name, value]) => ({ name, value })),
      })

      setActivity(activityLogs)
      setSharedReports(results.sharedReports?.data ?? [])
    } catch {}
    setLoading(false)
  }

  const ws = workspace?.type
  const r = role?.role

  const wsType = workspace?.type

  const dateRangeOptions = [
    { value: "7", label: fr ? "7 jours" : "7 days" },
    { value: "30", label: fr ? "30 jours" : "30 days" },
    { value: "90", label: fr ? "90 jours" : "90 days" },
    { value: "all", label: fr ? "Tout" : "All" },
  ]

  // Module filter scoped to workspace type — admin only sees their own module
  const moduleOptions = React.useMemo(() => {
    const labels: Record<string, { fr: string; en: string }> = {
      pharmacy: { fr: "Pharmacie", en: "Pharmacy" },
      commerce: { fr: "Commerce", en: "Commerce" },
      education: { fr: "Éducation", en: "Education" },
      gestion: { fr: "Gestion", en: "Management" },
      hr: { fr: "Ressources Humaines", en: "Human Resources" },
    }
    if (!wsType) return []
    return [{ value: wsType, label: labels[wsType] }]
  }, [wsType])

  const hasActiveFilters = dateRange !== "7"

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-border border-t-brand" />
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Filter Bar */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Range */}
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">{fr ? "Période" : "Period"}</span>
            <div className="flex gap-1">
              {dateRangeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDateRange(opt.value as any)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                    dateRange === opt.value
                      ? "bg-brand text-white shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-6 w-px bg-border" />

          {/* Module Badge (auto-scoped, not selectable) */}
          {moduleOptions.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter className="size-4 text-muted-foreground" />
              <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand">
                {moduleOptions[0].label[lang]}
              </span>
            </div>
          )}

          {/* Clear Filters */}
          {hasActiveFilters && (
            <>
              <div className="h-6 w-px bg-border" />
              <button
                onClick={() => setDateRange("7")}
                className="flex items-center gap-1 rounded-lg bg-destructive/10 px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"
              >
                <X className="size-3" />
                {fr ? "Réinitialiser" : "Reset"}
              </button>
            </>
          )}

          {/* Active filter badges */}
          {hasActiveFilters && (
            <div className="flex gap-1.5 ml-auto">
              {dateRange !== "7" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-medium text-brand">
                  {fr ? "Période" : "Period"}: {dateRangeOptions.find(o => o.value === dateRange)?.label}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dashboard Content */}
      {sharedReports.length > 0 && (r === "admin" || r === "manager") && (
        <div className="mb-6 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Send className="size-5 text-brand" />
            <h3 className="text-lg font-semibold text-foreground">{fr ? "Rapports reçus" : "Received Reports"}</h3>
            <span className="ml-auto rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-medium text-brand">{sharedReports.length}</span>
          </div>
          <div className="space-y-3">
            {sharedReports.map((report) => {
              const isPending = report.status === "pending" || report.status === "in_review"
              return (
                <div key={report.id} className={cn(
                  "rounded-lg border p-4 transition-colors",
                  isPending ? "border-brand/30 bg-brand/5" : "border-border bg-background"
                )}>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      {isPending ? (
                        <div className="size-9 rounded-full bg-brand/10 flex items-center justify-center">
                          <Send className="size-4 text-brand" />
                        </div>
                      ) : report.status === "accepted" ? (
                        <div className="size-9 rounded-full bg-green-500/10 flex items-center justify-center">
                          <CheckCircle className="size-4 text-green-600" />
                        </div>
                      ) : report.status === "rejected" ? (
                        <div className="size-9 rounded-full bg-red-500/10 flex items-center justify-center">
                          <XCircle className="size-4 text-red-600" />
                        </div>
                      ) : (
                        <div className="size-9 rounded-full bg-muted flex items-center justify-center">
                          <Archive className="size-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">{report.title}</p>
                        {report.status === "pending" && <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-[10px] font-medium text-yellow-600 border border-yellow-500/30">{fr ? "En attente" : "Pending"}</span>}
                        {report.status === "accepted" && <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-600 border border-green-500/30">{fr ? "Validé" : "Accepted"}</span>}
                        {report.status === "rejected" && <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-600 border border-red-500/30">{fr ? "Refusé" : "Rejected"}</span>}
                      </div>
                      {report.description && <p className="text-xs text-muted-foreground mt-1">{report.description}</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        {fr ? "De" : "From"}: {report.sender_name} — {new Date(report.created_at).toLocaleString(fr ? "fr-FR" : "en-US")}
                      </p>
                      {report.admin_comment && (
                        <p className="text-xs text-muted-foreground mt-1 italic bg-muted/50 rounded px-2 py-1">
                          {fr ? "Commentaire :" : "Comment:"} {report.admin_comment}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 ml-12 flex items-center gap-2">
                    <button
                      onClick={() => setPreviewReport(report)}
                      className="flex items-center gap-1.5 rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand/20 transition-colors"
                    >
                      <Eye className="size-3.5" />
                      {fr ? "Visualiser" : "Preview"}
                    </button>
                    {report.status !== "archived" && (
                      <button
                        disabled={processingReport === report.id}
                        onClick={async () => {
                          setProcessingReport(report.id)
                          try {
                            await insforge.database.from("shared_reports").update({ status: "archived" }).eq("id", report.id)
                            setSharedReports((prev) => prev.map((r) => r.id === report.id ? { ...r, status: "archived" } : r))
                          } catch (err) {
                            console.error("Failed to archive report:", err)
                          } finally {
                            setProcessingReport(null)
                          }
                        }}
                        className="flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/80 transition-colors ml-auto"
                      >
                        <Archive className="size-3.5" />
                        {fr ? "Archiver" : "Archive"}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {ws === "education" && (r === "admin" || r === "manager") && <DirectorDashboard stats={stats} chartData={chartData} fr={fr} activity={activity} />}
      {ws === "education" && r === "teacher" && <TeacherDashboard stats={stats} fr={fr} />}
      {ws === "education" && r === "cashier" && <EducationCashierDashboard stats={stats} chartData={chartData} fr={fr} />}
      {ws === "education" && r === "accountant" && <EducationAccountantDashboard stats={stats} chartData={chartData} fr={fr} />}
      {ws === "education" && r === "supervisor" && <SupervisorDashboard stats={stats} fr={fr} />}
      {ws === "education" && r === "viewer" && <ObserverDashboard stats={stats} fr={fr} ws={ws} />}
      {ws === "pharmacy" && (r === "admin" || r === "manager") && <PharmacyManagerDashboard stats={stats} chartData={chartData} fr={fr} activity={activity} />}
      {ws === "pharmacy" && r === "cashier" && <PharmacyCashierDashboard stats={stats} fr={fr} />}
      {ws === "pharmacy" && (r === "accountant" || r === "pharmacist") && <PharmacyAccountantDashboard stats={stats} chartData={chartData} fr={fr} />}
      {ws === "pharmacy" && r === "viewer" && <ObserverDashboard stats={stats} fr={fr} ws={ws} />}
      {ws === "commerce" && (r === "admin" || r === "manager") && <CommerceManagerDashboard stats={stats} chartData={chartData} fr={fr} activity={activity} />}
      {ws === "commerce" && r === "cashier" && <CommerceCashierDashboard stats={stats} fr={fr} />}
      {ws === "commerce" && r === "accountant" && <CommerceAccountantDashboard stats={stats} chartData={chartData} fr={fr} />}
      {ws === "commerce" && r === "viewer" && <ObserverDashboard stats={stats} fr={fr} ws={ws} />}
      {ws === "gestion" && (r === "admin" || r === "manager") && <GestionManagerDashboard stats={stats} chartData={chartData} fr={fr} activity={activity} />}
      {ws === "gestion" && r === "cashier" && <GestionCashierDashboard stats={stats} chartData={chartData} fr={fr} />}
      {ws === "gestion" && r === "accountant" && <GestionAccountantDashboard stats={stats} chartData={chartData} fr={fr} />}
      {ws === "gestion" && r === "viewer" && <ObserverDashboard stats={stats} fr={fr} ws={ws} />}
      {ws === "hr" && (r === "admin" || r === "manager") && <HRAdminDashboard stats={stats} fr={fr} activity={activity} />}
      {ws === "hr" && r === "viewer" && <ObserverDashboard stats={stats} fr={fr} ws={ws} />}

      {/* Report Preview Modal */}
      {previewReport && (
        <ReportPreviewModal
          open={!!previewReport}
          onClose={() => setPreviewReport(null)}
          report={previewReport}
          onStatusChange={(id, newStatus, comment) => {
            setSharedReports((prev) => prev.map((r) => r.id === id ? { ...r, status: newStatus, admin_comment: comment ?? r.admin_comment, reviewed_at: new Date().toISOString() } : r))
          }}
        />
      )}
    </div>
  )
}

function StatCardComponent({ stat }: { stat: StatCard }) {
  return (
    <div className={cn("rounded-xl p-5 text-white transition-all hover:shadow-lg hover:scale-[1.02]", stat.color)}>
      <div className="flex items-start justify-between">
        <div className="flex size-10 items-center justify-center rounded-lg bg-white/20">
          {stat.icon}
        </div>
        {stat.change && (
          <span className={cn("flex items-center gap-0.5 text-xs font-medium",
            stat.changeType === "up" && "text-emerald-100",
            stat.changeType === "down" && "text-red-100",
            stat.changeType === "neutral" && "text-white/70"
          )}>
            {stat.changeType === "up" && <ArrowUpRight className="size-3" />}
            {stat.changeType === "down" && <ArrowDownRight className="size-3" />}
            {stat.change}
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl font-bold text-white">{stat.value}</p>
      <p className="text-xs text-white/80 mt-1">{stat.label}</p>
    </div>
  )
}

function SectionCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card", className)}>
      <div className="border-b border-border px-5 py-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function RecentList({ items }: { items: RecentItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <UserAvatar
            avatarUrl={null}
            name={item.title}
            email=""
            size="sm"
            className="size-8"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
            <p className="text-xs text-muted-foreground">{item.subtitle}</p>
          </div>
          <div className="text-right shrink-0">
            {item.badge && (
              <span className={cn("inline-block rounded-full px-2 py-0.5 text-[10px] font-medium", item.badgeColor ?? "bg-muted text-muted-foreground")}>
                {item.badge}
              </span>
            )}
            <p className="text-[10px] text-muted-foreground mt-0.5">{item.time}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ═══════ CHART COMPONENTS ═══════

const CHART_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316"]

function MiniBarChart({ data, dataKey = "value", labelKey = "day", color = "#6366f1", height = 160 }: {
  data: { day: string; value: number }[]; dataKey?: string; labelKey?: string; color?: string; height?: number
}) {
  if (!data || data.length === 0) return null
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
        <XAxis dataKey={labelKey} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
        <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
        <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function FinanceChart({ data, height = 160 }: { data: { day: string; income: number; expenses: number }[]; height?: number }) {
  if (!data || data.length === 0) return null
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
        <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
        <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenus" />
        <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="Dépenses" />
      </BarChart>
    </ResponsiveContainer>
  )
}

function MiniPieChart({ data, height = 160 }: { data: { name: string; value: number }[]; height?: number }) {
  if (!data || data.length === 0) return null
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value">
          {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Pie>
        <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
      </RechartsPieChart>
    </ResponsiveContainer>
  )
}

function ChartLegend({ data }: { data: { name: string }[] }) {
  return (
    <div className="flex flex-wrap gap-3 mt-2 justify-center">
      {data.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
          {item.name}
        </div>
      ))}
    </div>
  )
}

function formatTimeAgo(dateStr: string, fr: boolean): string {
  if (!dateStr) return "—"
  const now = new Date()
  const then = new Date(dateStr)
  const diffMs = now.getTime() - then.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)
  if (diffMin < 1) return fr ? "à l'instant" : "just now"
  if (diffMin < 60) return fr ? `il y a ${diffMin}m` : `${diffMin}m ago`
  if (diffHr < 24) return fr ? `il y a ${diffHr}h` : `${diffHr}h ago`
  return fr ? `il y a ${diffDay}j` : `${diffDay}d ago`
}

function activityToItems(logs: any[], fr: boolean): RecentItem[] {
  if (!logs || logs.length === 0) {
    return [{ title: fr ? "Aucune activité" : "No activity", subtitle: fr ? "En attente de données" : "Awaiting data", time: "—" }]
  }
  return logs.slice(0, 8).map((log) => {
    const actionLabels: Record<string, { fr: string; en: string }> = {
      sale: { fr: "Vente", en: "Sale" },
      stock_add: { fr: "Ajout stock", en: "Stock added" },
      stock_edit: { fr: "Modif. stock", en: "Stock edit" },
      student_add: { fr: "Élève ajouté", en: "Student added" },
      fee_payment: { fr: "Paiement scol.", en: "Fee payment" },
      product_add: { fr: "Produit ajouté", en: "Product added" },
      accounting_entry: { fr: "Entrée compta", en: "Accounting" },
      employee_add: { fr: "Employé ajouté", en: "Employee added" },
      attendance: { fr: "Présence", en: "Attendance" },
      grade: { fr: "Note", en: "Grade" },
      order: { fr: "Commande", en: "Order" },
      expense: { fr: "Dépense", en: "Expense" },
      invoice: { fr: "Facture", en: "Invoice" },
      payment: { fr: "Paiement", en: "Payment" },
      member_add: { fr: "Membre ajouté", en: "Member added" },
    }
    const label = actionLabels[log.action_type]?.[fr ? "fr" : "en"] || log.action_type
    const actor = log.actor_name || log.actor_email?.split("@")[0] || (fr ? "Utilisateur" : "User")
    return {
      title: `${actor} — ${label}`,
      subtitle: log.description || "",
      time: formatTimeAgo(log.performed_at, fr),
    }
  })
}

// ═══════ EDUCATION ═══════

function DirectorDashboard({ stats, chartData, fr, activity }: { stats: Record<string, number>; chartData: Record<string, any[]>; fr: boolean; activity?: any[] }) {
  const s: StatCard[] = [
    { label: fr ? "Équipe" : "Team", value: stats.members ?? 0, icon: <Users className="size-5 text-white" />, color: "bg-emerald-500" },
    { label: fr ? "Élèves" : "Students", value: stats.students ?? 0, icon: <GraduationCap className="size-5 text-white" />, color: "bg-blue-500" },
    { label: fr ? "Enseignants" : "Teachers", value: stats.teachers ?? 0, icon: <BookOpen className="size-5 text-white" />, color: "bg-teal-500" },
    { label: fr ? "Frais collectés" : "Fees collected", value: formatCurrency(stats.totalFees ?? 0), icon: <DollarSign className="size-5 text-white" />, color: "bg-orange-500" },
  ]

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{s.map((stat, i) => <StatCardComponent key={i} stat={stat} />)}</div>
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title={fr ? "Frais des 30 derniers jours" : "Last 30 days fees"} className="lg:col-span-2">
          <MiniBarChart data={chartData.fees ?? []} color="#6366f1" height={180} />
        </SectionCard>
        <SectionCard title={fr ? "Répartition" : "Distribution"}>
          <MiniPieChart data={[
            { name: fr ? "Élèves" : "Students", value: stats.students ?? 0 },
            { name: fr ? "Enseignants" : "Teachers", value: stats.teachers ?? 0 },
            { name: fr ? "Classes" : "Classes", value: stats.classes ?? 0 },
          ]} height={140} />
          <ChartLegend data={[
            { name: fr ? "Élèves" : "Students" },
            { name: fr ? "Enseignants" : "Teachers" },
            { name: fr ? "Classes" : "Classes" },
          ]} />
        </SectionCard>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title={fr ? "Activité de l'équipe" : "Team activity"}>
          <RecentList items={activityToItems(activity ?? [], fr)} />
        </SectionCard>
        <SectionCard title={fr ? "Résumé" : "Summary"}>
          <div className="space-y-4">
            {[
              { label: fr ? "Élèves actifs" : "Active students", value: stats.students ?? 0, color: "text-blue-600" },
              { label: fr ? "Enseignants actifs" : "Active teachers", value: stats.teachers ?? 0, color: "text-indigo-600" },
              { label: fr ? "Membres actifs" : "Active members", value: stats.members ?? 0, color: "text-emerald-600" },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className={cn("text-sm font-semibold", item.color)}>{item.value}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </>
  )
}

function TeacherDashboard({ stats, fr }: { stats: Record<string, number>; fr: boolean }) {
  const s: StatCard[] = [
    { label: fr ? "Mes classes" : "My classes", value: stats.classes ?? 0, icon: <BookOpen className="size-5 text-white" />, color: "bg-blue-500" },
    { label: fr ? "Mes élèves" : "My students", value: stats.students ?? 0, icon: <GraduationCap className="size-5 text-white" />, color: "bg-indigo-500" },
    { label: fr ? "Cours du jour" : "Today's classes", value: "—", icon: <Calendar className="size-5 text-white" />, color: "bg-violet-500" },
    { label: fr ? "Bulletins à compléter" : "Reports to complete", value: "—", icon: <ClipboardList className="size-5 text-white" />, color: "bg-amber-500" },
  ]

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{s.map((stat, i) => <StatCardComponent key={i} stat={stat} />)}</div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title={fr ? "Mes cours aujourd'hui" : "My classes today"}>
          <RecentList items={[
            { title: fr ? "Aucun cours" : "No classes", subtitle: fr ? "En attente de données" : "Awaiting data", time: "—" },
          ]} />
        </SectionCard>
        <SectionCard title={fr ? "Devoirs à rendre" : "Assignments due"}>
          <RecentList items={[
            { title: fr ? "Aucun devoir" : "No assignments", subtitle: fr ? "En attente de données" : "Awaiting data", time: "—" },
          ]} />
        </SectionCard>
      </div>
    </>
  )
}

function SupervisorDashboard({ stats, fr }: { stats: Record<string, number>; fr: boolean }) {
  const s: StatCard[] = [
    { label: fr ? "Élèves présents" : "Present", value: stats.presentToday ?? 0, icon: <ClipboardCheck className="size-5 text-white" />, color: "bg-emerald-500" },
    { label: fr ? "Élèves absents" : "Absent", value: stats.absentToday ?? 0, icon: <Users className="size-5 text-white" />, color: "bg-red-500" },
    { label: fr ? "Retards" : "Lateness", value: stats.lateToday ?? 0, icon: <Clock className="size-5 text-white" />, color: "bg-orange-500" },
    { label: fr ? "Total élèves" : "Total students", value: stats.students ?? 0, icon: <GraduationCap className="size-5 text-white" />, color: "bg-indigo-500" },
  ]

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{s.map((stat, i) => <StatCardComponent key={i} stat={stat} />)}</div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title={fr ? "Présences du jour" : "Today's attendance"}>
          <RecentList items={[
            { title: fr ? "Aucune donnée" : "No data", subtitle: fr ? "En attente" : "Awaiting data", time: "—" },
          ]} />
        </SectionCard>
        <SectionCard title={fr ? "Incidents récents" : "Recent incidents"}>
          <RecentList items={[
            { title: fr ? "Aucun incident" : "No incidents", subtitle: fr ? "En attente de données" : "Awaiting data", time: "—" },
          ]} />
        </SectionCard>
      </div>
    </>
  )
}

function ObserverDashboard({ stats, fr, ws }: { stats: Record<string, number>; fr: boolean; ws: string }) {
  const s: StatCard[] = ws === "education" ? [
    { label: fr ? "Élèves" : "Students", value: stats.students ?? 0, icon: <GraduationCap className="size-5 text-white" />, color: "bg-indigo-500" },
    { label: fr ? "Enseignants" : "Teachers", value: stats.teachers ?? 0, icon: <BookOpen className="size-5 text-white" />, color: "bg-blue-500" },
    { label: fr ? "Classes" : "Classes", value: stats.classes ?? 0, icon: <ClipboardCheck className="size-5 text-white" />, color: "bg-emerald-500" },
    { label: fr ? "Frais collectés" : "Fees collected", value: formatCurrency(stats.totalFees ?? 0), icon: <DollarSign className="size-5 text-white" />, color: "bg-violet-500" },
  ] : ws === "pharmacy" ? [
    { label: fr ? "Médicaments" : "Medicines", value: stats.totalMedicines ?? 0, icon: <Package className="size-5 text-white" />, color: "bg-teal-500" },
    { label: fr ? "Ventes" : "Sales", value: stats.salesCount ?? 0, icon: <ShoppingCart className="size-5 text-white" />, color: "bg-emerald-500" },
    { label: fr ? "Stock faible" : "Low stock", value: stats.lowStock ?? 0, icon: <AlertTriangle className="size-5 text-white" />, color: "bg-amber-500" },
    { label: fr ? "Revenus" : "Revenue", value: formatCurrency(stats.totalRevenue ?? 0), icon: <DollarSign className="size-5 text-white" />, color: "bg-violet-500" },
  ] : ws === "commerce" ? [
    { label: fr ? "Produits" : "Products", value: stats.totalProducts ?? 0, icon: <Package className="size-5 text-white" />, color: "bg-orange-500" },
    { label: fr ? "Ventes" : "Sales", value: stats.salesCount ?? 0, icon: <ShoppingCart className="size-5 text-white" />, color: "bg-emerald-500" },
    { label: fr ? "Clients" : "Customers", value: stats.customers ?? 0, icon: <Users className="size-5 text-white" />, color: "bg-blue-500" },
    { label: fr ? "Revenus" : "Revenue", value: formatCurrency(stats.totalRevenue ?? 0), icon: <DollarSign className="size-5 text-white" />, color: "bg-violet-500" },
  ] : ws === "hr" ? [
    { label: fr ? "Employés" : "Employees", value: stats.totalEmployees ?? 0, icon: <Users className="size-5 text-white" />, color: "bg-sky-500" },
    { label: fr ? "Départements" : "Departments", value: stats.departments ?? 0, icon: <Building2 className="size-5 text-white" />, color: "bg-blue-500" },
    { label: fr ? "Congés en attente" : "Pending leaves", value: stats.pendingLeaves ?? 0, icon: <Plane className="size-5 text-white" />, color: "bg-amber-500" },
    { label: fr ? "Membres" : "Members", value: stats.totalUsers ?? 0, icon: <UserCheck className="size-5 text-white" />, color: "bg-emerald-500" },
  ] : [
    { label: fr ? "Employés" : "Employees", value: stats.totalEmployees ?? 0, icon: <Users className="size-5 text-white" />, color: "bg-purple-500" },
    { label: fr ? "Départements" : "Departements", value: stats.departments ?? 0, icon: <Building2 className="size-5 text-white" />, color: "bg-blue-500" },
    { label: fr ? "Membres" : "Members", value: stats.totalUsers ?? 0, icon: <UserCheck className="size-5 text-white" />, color: "bg-emerald-500" },
    { label: fr ? "Revenus" : "Revenue", value: formatCurrency(stats.income ?? 0), icon: <DollarSign className="size-5 text-white" />, color: "bg-violet-500" },
  ]

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{s.map((stat, i) => <StatCardComponent key={i} stat={stat} />)}</div>
      <SectionCard title={fr ? "Aperçu" : "Overview"}>
        <RecentList items={[
          { title: fr ? "Mode lecture seule" : "Read-only mode", subtitle: fr ? "Vous consultez les données" : "You are viewing data", time: "—", badge: fr ? "Observateur" : "Observer", badgeColor: "bg-slate-100 text-slate-700" },
        ]} />
      </SectionCard>
    </>
  )
}

function EducationCashierDashboard({ stats, chartData, fr }: { stats: Record<string, number>; chartData: Record<string, any[]>; fr: boolean }) {
  const s: StatCard[] = [
    { label: fr ? "Frais collectés" : "Fees collected", value: formatCurrency(stats.totalFees ?? 0), icon: <DollarSign className="size-5 text-white" />, color: "bg-emerald-500" },
    { label: fr ? "Total paiements" : "Total payments", value: stats.invoices ?? 0, icon: <Receipt className="size-5 text-white" />, color: "bg-sky-500" },
    { label: fr ? "Élèves" : "Students", value: stats.students ?? 0, icon: <GraduationCap className="size-5 text-white" />, color: "bg-indigo-500" },
    { label: fr ? "Classes" : "Classes", value: stats.classes ?? 0, icon: <BookOpen className="size-5 text-white" />, color: "bg-violet-500" },
  ]

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{s.map((stat, i) => <StatCardComponent key={i} stat={stat} />)}</div>
      <SectionCard title={fr ? "Revenus vs Dépenses" : "Revenue vs Expenses"}>
        <FinanceChart data={chartData.finance ?? []} height={180} />
      </SectionCard>
    </>
  )
}

function HRAdminDashboard({ stats, fr, activity }: { stats: Record<string, number>; fr: boolean; activity?: any[] }) {
  const s: StatCard[] = [
    { label: fr ? "Employés" : "Employees", value: stats.totalEmployees ?? 0, icon: <Users className="size-5 text-white" />, color: "bg-sky-500" },
    { label: fr ? "Départements" : "Departments", value: stats.departments ?? 0, icon: <Building2 className="size-5 text-white" />, color: "bg-blue-500" },
    { label: fr ? "Congés en attente" : "Pending leaves", value: stats.pendingLeaves ?? 0, icon: <Plane className="size-5 text-white" />, color: "bg-amber-500" },
    { label: fr ? "Membres" : "Members", value: stats.totalUsers ?? 0, icon: <UserCheck className="size-5 text-white" />, color: "bg-emerald-500" },
  ]

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{s.map((stat, i) => <StatCardComponent key={i} stat={stat} />)}</div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title={fr ? "Activité récente" : "Recent activity"}>
          <RecentList items={activityToItems(activity ?? [], fr)} />
        </SectionCard>
        <SectionCard title={fr ? "Résumé RH" : "HR Summary"}>
          <div className="space-y-4">
            {[
              { label: fr ? "Employés actifs" : "Active employees", value: stats.totalEmployees ?? 0, color: "text-sky-600" },
              { label: fr ? "Départements" : "Departments", value: stats.departments ?? 0, color: "text-blue-600" },
              { label: fr ? "Congés en attente" : "Pending leaves", value: stats.pendingLeaves ?? 0, color: "text-amber-600" },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className={cn("text-sm font-semibold", item.color)}>{item.value}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </>
  )
}

function EducationAccountantDashboard({ stats, chartData, fr }: { stats: Record<string, number>; chartData: Record<string, any[]>; fr: boolean }) {
  const s: StatCard[] = [
    { label: fr ? "Frais collectés" : "Fees collected", value: formatCurrency(stats.totalFees ?? 0), icon: <TrendingUp className="size-5 text-white" />, color: "bg-emerald-500" },
    { label: fr ? "Dépenses" : "Expenses", value: formatCurrency(stats.expenses ?? 0), icon: <TrendingUp className="size-5 text-white rotate-180" />, color: "bg-red-500" },
    { label: fr ? "Profit" : "Profit", value: formatCurrency((stats.totalFees ?? 0) - (stats.expenses ?? 0)), icon: <DollarSign className="size-5 text-white" />, color: "bg-violet-500" },
    { label: fr ? "Élèves" : "Students", value: stats.students ?? 0, icon: <GraduationCap className="size-5 text-white" />, color: "bg-indigo-500" },
  ]

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{s.map((stat, i) => <StatCardComponent key={i} stat={stat} />)}</div>
      <SectionCard title={fr ? "Frais vs Dépenses" : "Fees vs Expenses"}>
        <FinanceChart data={chartData.finance ?? []} height={180} />
      </SectionCard>
    </>
  )
}

function GestionCashierDashboard({ stats, chartData, fr }: { stats: Record<string, number>; chartData: Record<string, any[]>; fr: boolean }) {
  const s: StatCard[] = [
    { label: fr ? "Revenus" : "Income", value: formatCurrency(stats.income ?? 0), icon: <DollarSign className="size-5 text-white" />, color: "bg-emerald-500" },
    { label: fr ? "Employés" : "Employees", value: stats.employees ?? 0, icon: <Briefcase className="size-5 text-white" />, color: "bg-blue-500" },
    { label: fr ? "Factures" : "Invoices", value: stats.invoices ?? 0, icon: <Receipt className="size-5 text-white" />, color: "bg-amber-500" },
    { label: fr ? "Membres" : "Members", value: stats.members ?? 0, icon: <Users className="size-5 text-white" />, color: "bg-purple-500" },
  ]

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{s.map((stat, i) => <StatCardComponent key={i} stat={stat} />)}</div>
      <SectionCard title={fr ? "Revenus vs Dépenses" : "Income vs Expenses"}>
        <FinanceChart data={chartData.finance ?? []} height={180} />
      </SectionCard>
    </>
  )
}

// ═══════ PHARMACY ═══════

function PharmacyManagerDashboard({ stats, chartData, fr, activity }: { stats: Record<string, number>; chartData: Record<string, any[]>; fr: boolean; activity?: any[] }) {
  const s: StatCard[] = [
    { label: fr ? "Équipe" : "Team", value: stats.members ?? 0, icon: <Users className="size-5 text-white" />, color: "bg-emerald-500" },
    { label: fr ? "Médicaments" : "Medicines", value: stats.medicines ?? 0, icon: <Pill className="size-5 text-white" />, color: "bg-teal-500" },
    { label: fr ? "Stock faible" : "Low stock", value: stats.lowStock ?? 0, icon: <AlertTriangle className="size-5 text-white" />, color: "bg-red-500" },
    { label: fr ? "Revenu total" : "Total revenue", value: formatCurrency(stats.totalRevenue ?? 0), icon: <DollarSign className="size-5 text-white" />, color: "bg-violet-500" },
  ]

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{s.map((stat, i) => <StatCardComponent key={i} stat={stat} />)}</div>
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title={fr ? "Ventes des 7 derniers jours" : "Last 7 days sales"} className="lg:col-span-2">
          <MiniBarChart data={chartData.sales ?? []} color="#10b981" height={180} />
        </SectionCard>
        <SectionCard title={fr ? "Par catégorie" : "By category"}>
          <MiniPieChart data={chartData.medicineCategories ?? []} height={140} />
          <ChartLegend data={chartData.medicineCategories ?? []} />
        </SectionCard>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title={fr ? "Activité de l'équipe" : "Team activity"}>
          <RecentList items={activityToItems(activity ?? [], fr)} />
        </SectionCard>
        <SectionCard title={fr ? "Résumé" : "Summary"}>
          <div className="space-y-4">
            {[
              { label: fr ? "Médicaments" : "Medicines", value: stats.medicines ?? 0, color: "text-teal-600" },
              { label: fr ? "Membres actifs" : "Active members", value: stats.members ?? 0, color: "text-emerald-600" },
              { label: fr ? "Stock faible" : "Low stock", value: stats.lowStock ?? 0, color: "text-red-600" },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className={cn("text-sm font-semibold", item.color)}>{item.value}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </>
  )
}

function PharmacyCashierDashboard({ stats, fr }: { stats: Record<string, number>; fr: boolean }) {
  const s: StatCard[] = [
    { label: fr ? "Ventes du jour" : "Today's sales", value: stats.todaySales ?? 0, icon: <ShoppingCart className="size-5 text-white" />, color: "bg-sky-500" },
    { label: fr ? "Chiffre du jour" : "Today's total", value: formatCurrency(stats.todayRevenue ?? 0), icon: <DollarSign className="size-5 text-white" />, color: "bg-emerald-500" },
    { label: fr ? "Médicaments" : "Medicines", value: stats.medicines ?? 0, icon: <Pill className="size-5 text-white" />, color: "bg-teal-500" },
    { label: fr ? "Stock faible" : "Low stock", value: stats.lowStock ?? 0, icon: <AlertTriangle className="size-5 text-white" />, color: "bg-red-500" },
  ]

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{s.map((stat, i) => <StatCardComponent key={i} stat={stat} />)}</div>
      <SectionCard title={fr ? "Historique des ventes" : "Sales history"}>
        <RecentList items={[
          { title: fr ? "Aucune vente" : "No sales", subtitle: fr ? "En attente" : "Awaiting data", time: "—" },
        ]} />
      </SectionCard>
    </>
  )
}

function PharmacyAccountantDashboard({ stats, chartData, fr }: { stats: Record<string, number>; chartData: Record<string, any[]>; fr: boolean }) {
  const s: StatCard[] = [
    { label: fr ? "Revenus" : "Revenue", value: formatCurrency(stats.totalRevenue ?? 0), icon: <TrendingUp className="size-5 text-white" />, color: "bg-emerald-500" },
    { label: fr ? "Dépenses" : "Expenses", value: formatCurrency(stats.expenses ?? 0), icon: <TrendingUp className="size-5 text-white rotate-180" />, color: "bg-red-500" },
    { label: fr ? "Profit" : "Profit", value: formatCurrency((stats.income ?? 0) - (stats.expenses ?? 0)), icon: <DollarSign className="size-5 text-white" />, color: "bg-violet-500" },
    { label: fr ? "Factures" : "Invoices", value: stats.invoices ?? 0, icon: <Receipt className="size-5 text-white" />, color: "bg-amber-500" },
  ]

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{s.map((stat, i) => <StatCardComponent key={i} stat={stat} />)}</div>
      <SectionCard title={fr ? "Revenus vs Dépenses" : "Revenue vs Expenses"}>
        <FinanceChart data={chartData.finance ?? []} height={180} />
      </SectionCard>
    </>
  )
}

// ═══════ COMMERCE ═══════

function CommerceManagerDashboard({ stats, chartData, fr, activity }: { stats: Record<string, number>; chartData: Record<string, any[]>; fr: boolean; activity?: any[] }) {
  const s: StatCard[] = [
    { label: fr ? "Équipe" : "Team", value: stats.members ?? 0, icon: <Users className="size-5 text-white" />, color: "bg-orange-500" },
    { label: fr ? "Produits" : "Products", value: stats.products ?? 0, icon: <Package className="size-5 text-white" />, color: "bg-blue-500" },
    { label: fr ? "Stock faible" : "Low stock", value: stats.lowStock ?? 0, icon: <AlertTriangle className="size-5 text-white" />, color: "bg-red-500" },
    { label: fr ? "Revenu total" : "Total revenue", value: formatCurrency(stats.totalRevenue ?? 0), icon: <DollarSign className="size-5 text-white" />, color: "bg-violet-500" },
  ]

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{s.map((stat, i) => <StatCardComponent key={i} stat={stat} />)}</div>
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title={fr ? "Ventes des 7 derniers jours" : "Last 7 days sales"} className="lg:col-span-2">
          <MiniBarChart data={chartData.sales ?? []} color="#f97316" height={180} />
        </SectionCard>
        <SectionCard title={fr ? "Par catégorie" : "By category"}>
          <MiniPieChart data={chartData.productCategories ?? []} height={140} />
          <ChartLegend data={chartData.productCategories ?? []} />
        </SectionCard>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title={fr ? "Activité de l'équipe" : "Team activity"}>
          <RecentList items={activityToItems(activity ?? [], fr)} />
        </SectionCard>
        <SectionCard title={fr ? "Résumé" : "Summary"}>
          <div className="space-y-4">
            {[
              { label: fr ? "Produits" : "Products", value: stats.products ?? 0, color: "text-blue-600" },
              { label: fr ? "Membres actifs" : "Active members", value: stats.members ?? 0, color: "text-orange-600" },
              { label: fr ? "Stock faible" : "Low stock", value: stats.lowStock ?? 0, color: "text-red-600" },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className={cn("text-sm font-semibold", item.color)}>{item.value}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </>
  )
}

function CommerceCashierDashboard({ stats, fr }: { stats: Record<string, number>; fr: boolean }) {
  const s: StatCard[] = [
    { label: fr ? "Ventes du jour" : "Today's sales", value: stats.todaySales ?? 0, icon: <ShoppingCart className="size-5 text-white" />, color: "bg-sky-500" },
    { label: fr ? "Chiffre du jour" : "Today's total", value: formatCurrency(stats.todayRevenue ?? 0), icon: <DollarSign className="size-5 text-white" />, color: "bg-emerald-500" },
    { label: fr ? "Produits" : "Products", value: stats.products ?? 0, icon: <Package className="size-5 text-white" />, color: "bg-blue-500" },
    { label: fr ? "Stock faible" : "Low stock", value: stats.lowStock ?? 0, icon: <AlertTriangle className="size-5 text-white" />, color: "bg-red-500" },
  ]

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{s.map((stat, i) => <StatCardComponent key={i} stat={stat} />)}</div>
      <SectionCard title={fr ? "Historique" : "History"}>
        <RecentList items={[
          { title: fr ? "Aucune transaction" : "No transactions", subtitle: fr ? "En attente" : "Awaiting data", time: "—" },
        ]} />
      </SectionCard>
    </>
  )
}

function CommerceAccountantDashboard({ stats, chartData, fr }: { stats: Record<string, number>; chartData: Record<string, any[]>; fr: boolean }) {
  const s: StatCard[] = [
    { label: fr ? "Revenus" : "Revenue", value: formatCurrency(stats.income ?? 0), icon: <TrendingUp className="size-5 text-white" />, color: "bg-emerald-500" },
    { label: fr ? "Dépenses" : "Expenses", value: formatCurrency(stats.expenses ?? 0), icon: <TrendingUp className="size-5 text-white rotate-180" />, color: "bg-red-500" },
    { label: fr ? "Profit" : "Profit", value: formatCurrency((stats.income ?? 0) - (stats.expenses ?? 0)), icon: <DollarSign className="size-5 text-white" />, color: "bg-violet-500" },
    { label: fr ? "Factures" : "Invoices", value: stats.invoices ?? 0, icon: <Receipt className="size-5 text-white" />, color: "bg-amber-500" },
  ]

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{s.map((stat, i) => <StatCardComponent key={i} stat={stat} />)}</div>
      <SectionCard title={fr ? "Revenus vs Dépenses" : "Revenue vs Expenses"}>
        <FinanceChart data={chartData.finance ?? []} height={180} />
      </SectionCard>
    </>
  )
}

// ═══════ GESTION ═══════

function GestionManagerDashboard({ stats, chartData, fr, activity }: { stats: Record<string, number>; chartData: Record<string, any[]>; fr: boolean; activity?: any[] }) {
  const netResult = (stats.income ?? 0) - (stats.expenses ?? 0)
  const s: StatCard[] = [
    { label: fr ? "Équipe" : "Team", value: stats.members ?? 0, icon: <Users className="size-5 text-white" />, color: "bg-purple-500" },
    { label: fr ? "Revenus" : "Income", value: formatCurrency(stats.income ?? 0), icon: <TrendingUp className="size-5 text-white" />, color: "bg-emerald-500" },
    { label: fr ? "Dépenses" : "Expenses", value: formatCurrency(stats.expenses ?? 0), icon: <TrendingUp className="size-5 text-white rotate-180" />, color: "bg-red-500" },
    { label: fr ? "Résultat net" : "Net result", value: formatCurrency(netResult), icon: <Briefcase className="size-5 text-white" />, color: netResult >= 0 ? "bg-emerald-500" : "bg-red-500" },
    { label: fr ? "Employés actifs" : "Active employees", value: stats.employees ?? 0, icon: <Briefcase className="size-5 text-white" />, color: "bg-blue-500" },
    { label: fr ? "Factures en attente" : "Pending invoices", value: stats.pendingInvoices ?? 0, icon: <Receipt className="size-5 text-white" />, color: "bg-amber-500" },
  ]

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{s.map((stat, i) => <StatCardComponent key={i} stat={stat} />)}</div>
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title={fr ? "Revenus vs Dépenses" : "Revenue vs Expenses"} className="lg:col-span-2">
          <FinanceChart data={chartData.finance ?? []} height={180} />
        </SectionCard>
        <SectionCard title={fr ? "Répartition" : "Distribution"}>
          <MiniPieChart data={chartData.employeesByDept ?? []} height={140} />
          <ChartLegend data={chartData.employeesByDept ?? []} />
        </SectionCard>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title={fr ? "Activité de l'équipe" : "Team activity"}>
          <RecentList items={activityToItems(activity ?? [], fr)} />
        </SectionCard>
        <SectionCard title={fr ? "Résumé" : "Summary"}>
          <div className="space-y-4">
            {[
              { label: fr ? "Membres actifs" : "Active members", value: stats.members ?? 0, color: "text-purple-600" },
              { label: fr ? "Employés actifs" : "Active employees", value: stats.employees ?? 0, color: "text-blue-600" },
              { label: fr ? "Revenus" : "Income", value: formatCurrency(stats.income ?? 0), color: "text-emerald-600" },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className={cn("text-sm font-semibold", item.color)}>{item.value}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </>
  )
}

function GestionAccountantDashboard({ stats, chartData, fr }: { stats: Record<string, number>; chartData: Record<string, any[]>; fr: boolean }) {
  const s: StatCard[] = [
    { label: fr ? "Revenus" : "Income", value: formatCurrency(stats.income ?? 0), icon: <TrendingUp className="size-5 text-white" />, color: "bg-emerald-500" },
    { label: fr ? "Dépenses" : "Expenses", value: formatCurrency(stats.expenses ?? 0), icon: <TrendingUp className="size-5 text-white rotate-180" />, color: "bg-red-500" },
    { label: fr ? "Factures" : "Invoices", value: stats.invoices ?? 0, icon: <Receipt className="size-5 text-white" />, color: "bg-amber-500" },
    { label: fr ? "Profit" : "Profit", value: formatCurrency((stats.income ?? 0) - (stats.expenses ?? 0)), icon: <DollarSign className="size-5 text-white" />, color: "bg-violet-500" },
  ]

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{s.map((stat, i) => <StatCardComponent key={i} stat={stat} />)}</div>
      <SectionCard title={fr ? "Revenus vs Dépenses" : "Revenue vs Expenses"}>
        <FinanceChart data={chartData.finance ?? []} height={180} />
      </SectionCard>
    </>
  )
}
