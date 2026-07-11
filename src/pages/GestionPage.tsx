import * as React from "react"
import {
  BarChart3, Users, DollarSign, TrendingUp, Plus, Edit2, Trash2,
  Loader2, RefreshCw, Briefcase, Receipt, PieChart, ArrowUpCircle, ArrowDownCircle,
  FileText, Calculator, Check, X, Search, Printer
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ReportGenerator } from "@/components/ReportGenerator"
import { EmptyState } from "@/components/EmptyState"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLanguage } from "@/lib/i18n"
import { useAuth } from "@/hooks/use-auth"
import { useRole } from "@/hooks/use-role"
import { insforge } from "@/lib/supabase"
import { logActivity } from "@/lib/activity"
import { trackModuleOpen } from "@/lib/context-tracker"
import { cn, safeParseFloat, safeParseInt } from "@/lib/utils"
import { formatCurrency } from "@/lib/currency"
import { sanitizeHtml } from "@/lib/dompurify"
import { usePageEntrance } from "@/hooks/use-page-entrance"
import { validateFields, hasErrors } from "@/lib/validation"
import { employeeRules, accountingEntryRules } from "@/lib/rules"
import { DialogFooterBrand } from "@/components/DialogFooterBrand"
import { PageFooter } from "@/components/PageFooter"
import { publishNotification, createAccountingNotification, createPaymentNotification } from "@/lib/notifications"
import { detectInjection, logSecurityEvent } from "@/lib/security"

type Page = "home" | "education" | "pharmacy" | "commerce" | "gestion" | "dashboard" | "signin" | "signup" | "members" | "reports" | "privacy" | "terms"
interface Props { onNavigate: (p: Page) => void; initialTab?: string }

interface Employee {
  id: string; workspace_id: string; first_name: string; last_name: string; role: string
  department: string | null; salary_usd: number; phone: string | null; email: string | null
  status: string; hire_date: string | null; salary_type: string | null; salary_percentage: number | null
  repartition_key: string | null; cnss_rate?: number; ipr_rate?: number
}
interface AccountingEntry { id: string; type: "income" | "expense"; category: string; description: string; amount_usd: number; entry_date: string; account_code?: string; reference_number?: string; journal_code?: string; period?: string }
interface ActivityLog { id: string; action_type: string; description: string; amount_usd: number | null; performed_at: string; actor_name: string }
interface Payment {
  id: string; date: string; employee_id: string; employee_name: string
  amount: number; description: string; status: "paid" | "pending" | "cancelled"
}
interface HistoryEntry {
  id: string; date: string; type: string; description: string; amount: number | null
}

const EMPTY_EMP = { first_name: "", last_name: "", role: "", department: "", salary_usd: "", phone: "", email: "", salary_type: "fixed", salary_percentage: "", repartition_key: "", status: "active", hire_date: new Date().toISOString().slice(0, 10), cnss_rate: "5", ipr_rate: "0" }
const EMPTY_ENTRY = { type: "income" as "income" | "expense", category: "", description: "", amount_usd: "", entry_date: new Date().toISOString().slice(0, 10), account_code: "", reference_number: "", journal_code: "" }

const MONTHS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"]
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export function GestionPage({ onNavigate, initialTab }: Props) {
  const { lang } = useLanguage()
  const { workspace, user } = useAuth()
  const { role } = useRole()
  const fr = lang === "fr"
  const [tab, setTab] = React.useState(initialTab || "employees")

  React.useEffect(() => {
    trackModuleOpen("gestion")
  }, [])

  const [employees, setEmployees] = React.useState<Employee[]>([])
  const [entries, setEntries] = React.useState<AccountingEntry[]>([])
  const [activities, setActivities] = React.useState<ActivityLog[]>([])
  const [members, setMembers] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  const [showEmpDlg, setShowEmpDlg] = React.useState(false)
  const [editEmp, setEditEmp] = React.useState<Employee | null>(null)
  const [empForm, setEmpForm] = React.useState({ ...EMPTY_EMP })
  const [employeeErrors, setEmployeeErrors] = React.useState<Record<string, string>>({})
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [showEntryDlg, setShowEntryDlg] = React.useState(false)
  const [entryForm, setEntryForm] = React.useState({ ...EMPTY_ENTRY })
  const [entryErrors, setEntryErrors] = React.useState<Record<string, string>>({})

  const [entrySearch, setEntrySearch] = React.useState("")
  const [receiptEmp, setReceiptEmp] = React.useState<Employee | null>(null)
  const [payments, setPayments] = React.useState<Payment[]>([])
  const [paymentForm, setPaymentForm] = React.useState({ employee_id: "", date: new Date().toISOString().slice(0, 10), amount: "", description: "", status: "paid" })
  const [historyEntries, setHistoryEntries] = React.useState<HistoryEntry[]>([])
  const [historyFilter, setHistoryFilter] = React.useState({ startDate: "", endDate: "", type: "__all__" })

  const fetchData = React.useCallback(async () => {
    if (!workspace) return
    setLoading(true)
    const [{ data: emps }, { data: acc }, { data: logs }, { data: mems }] = await Promise.all([
      insforge.database.from("employees").select("*").eq("workspace_id", workspace.id).order("last_name"),
      insforge.database.from("accounting_entries").select("*").eq("workspace_id", workspace.id).order("entry_date", { ascending: false }).limit(200),
      insforge.database.from("activity_logs").select("*").eq("workspace_id", workspace.id).eq("module", "gestion").order("performed_at", { ascending: false }).limit(10),
      insforge.database.from("workspace_members").select("*").eq("workspace_id", workspace.id),
    ])
    setEmployees((emps as Employee[]) ?? [])
    setEntries((acc as AccountingEntry[]) ?? [])
    setActivities((logs as ActivityLog[]) ?? [])
    setMembers((mems as any[]) ?? [])
    setLoading(false)
  }, [workspace])

  React.useEffect(() => { fetchData() }, [fetchData])

  React.useEffect(() => {
    if (!workspace) return
    async function loadPayments() {
      const { data } = await insforge.database.from("gestion_payments").select("*").eq("workspace_id", workspace.id).order("created_at", { ascending: false })
      setPayments((data as any[]) ?? [])
      setHistoryEntries([])
    }
    loadPayments()
  }, [workspace?.id])

  const now = new Date()
  const currMonth = now.getMonth()
  const currYear = now.getFullYear()
  const startOfMonth = `${currYear}-${String(currMonth + 1).padStart(2, "0")}-01`

  const totalIncome = entries.filter((e) => e.type === "income").reduce((s, e) => s + Number(e.amount_usd), 0) ?? 0
  const totalExpense = entries.filter((e) => e.type === "expense").reduce((s, e) => s + Number(e.amount_usd), 0) ?? 0
  const currentMonthIncome = entries.filter((e) => e.type === "income" && e.entry_date >= startOfMonth).reduce((s, e) => s + Number(e.amount_usd), 0) ?? 0

  const activeEmployees = employees.filter((e) => e.status === "active")
  const fixedEmployees = activeEmployees.filter((e) => e.salary_type !== "percentage" && e.salary_type !== "pourcentage")
  const pctEmployees = activeEmployees.filter((e) => e.salary_type === "percentage" || e.salary_type === "pourcentage")

  const fixedPayroll = fixedEmployees.reduce((s, e) => s + Number(e.salary_usd), 0) ?? 0
  const pctPayroll = pctEmployees.reduce((s, e) => s + (currentMonthIncome * (Number(e.salary_percentage) || 0) / 100), 0)
  const totalPayroll = fixedPayroll + pctPayroll

  const calcPctSalary = (emp: Employee) => currentMonthIncome * (Number(emp.salary_percentage) || 0) / 100

  const stats = [
    { label: fr ? "Employés" : "Total employees", value: employees.length, color: "text-purple" },
    { label: fr ? "Actifs" : "Active", value: activeEmployees.length, color: "text-success" },
    { label: fr ? "Paie fixe" : "Fixed payroll", value: formatCurrency(fixedPayroll), color: "text-purple" },
    { label: fr ? "Paie totale" : "Total payroll", value: formatCurrency(totalPayroll), color: "text-purple" },
  ]

  const totalAccountingEntries = entries.length
  const totalIncomeCount = entries.filter((e) => e.type === "income").length
  const totalExpenseCount = entries.filter((e) => e.type === "expense").length

  const reportStats = [
    { label: fr ? "Revenus" : "Revenue", value: totalIncome, color: "text-success", fmt: "currency" as const },
    { label: fr ? "Dépenses" : "Expenses", value: totalExpense, color: "text-destructive", fmt: "currency" as const },
    { label: fr ? "Bénéfice net" : "Net profit", value: totalIncome - totalExpense, color: totalIncome >= totalExpense ? "text-success" : "text-destructive", fmt: "currency" as const },
    { label: fr ? "Coût salarial" : "Payroll cost", value: totalPayroll, color: "text-purple", fmt: "currency" as const },
    { label: fr ? "Écritures" : "Entries", value: totalAccountingEntries, color: "text-blue", fmt: "count" as const },
    { label: fr ? "Balance" : "Balance", value: totalIncome - totalExpense - totalPayroll, color: (totalIncome - totalExpense - totalPayroll) >= 0 ? "text-success" : "text-destructive", fmt: "currency" as const },
  ]

  const repartitionGroups = React.useMemo(() => {
    const map = new Map<string, { count: number; totalPct: number }>()
    pctEmployees.forEach((e) => {
      const key = e.repartition_key || (fr ? "Sans clé" : "No key")
      const existing = map.get(key) || { count: 0, totalPct: 0 }
      existing.count++
      existing.totalPct += Number(e.salary_percentage) || 0
      map.set(key, existing)
    })
    return Array.from(map.entries()).sort((a, b) => b[1].totalPct - a[1].totalPct)
  }, [pctEmployees, fr])

  const monthlyChart = React.useMemo(() => {
    const months: { label: string; income: number; expense: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currYear, currMonth - i, 1)
      const m = d.getMonth()
      const y = d.getFullYear()
      const prefix = `${y}-${String(m + 1).padStart(2, "0")}`
      const label = fr ? MONTHS_FR[m] : MONTHS_EN[m]
      const monthLabel = `${label} ${y !== currYear ? y : ""}`.trim()
      const income = entries.filter((e) => e.type === "income" && e.entry_date.startsWith(prefix)).reduce((s, e) => s + Number(e.amount_usd), 0) ?? 0
      const expense = entries.filter((e) => e.type === "expense" && e.entry_date.startsWith(prefix)).reduce((s, e) => s + Number(e.amount_usd), 0) ?? 0
      months.push({ label: monthLabel, income, expense })
    }
    return months
  }, [entries, currMonth, currYear, fr])

  const chartMax = Math.max(...monthlyChart.map((m) => Math.max(m.income, m.expense, 1)), 1)

  const filteredEntries = React.useMemo(() => {
    if (!entrySearch.trim()) return entries
    const q = entrySearch.toLowerCase()
    return entries.filter((e) => e.description.toLowerCase().includes(q) || e.category.toLowerCase().includes(q) || (e.account_code ?? "").toLowerCase().includes(q) || (e.reference_number ?? "").toLowerCase().includes(q) || (e.journal_code ?? "").toLowerCase().includes(q))
  }, [entries, entrySearch])

  const combinedHistory = React.useMemo(() => {
    const activityItems = activities.map((a) => ({
      id: a.id,
      date: a.performed_at,
      type: a.action_type,
      description: a.description,
      amount: a.amount_usd,
    }))
    const all = [...activityItems, ...historyEntries]
    const filtered = all.filter((item) => {
      if (historyFilter.startDate && item.date < historyFilter.startDate) return false
      if (historyFilter.endDate && item.date > historyFilter.endDate + "T23:59:59") return false
      if (historyFilter.type && historyFilter.type !== "__all__" && item.type !== historyFilter.type) return false
      return true
    })
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [activities, historyEntries, historyFilter])

  const openAddEmp = () => { setEmpForm({ ...EMPTY_EMP }); setEditEmp(null); setError(null); setEmployeeErrors({}); setShowEmpDlg(true) }
  const openEditEmp = (e: Employee) => {
    setEditEmp(e)
    setEmpForm({
      first_name: e.first_name, last_name: e.last_name, role: e.role, department: e.department ?? "",
      salary_usd: String(e.salary_usd), phone: e.phone ?? "", email: e.email ?? "",
      salary_type: e.salary_type || "fixed", salary_percentage: String(e.salary_percentage ?? ""),
      repartition_key: e.repartition_key ?? "", status: e.status, hire_date: e.hire_date ?? new Date().toISOString().slice(0, 10),
      cnss_rate: String(e.cnss_rate ?? 5), ipr_rate: String(e.ipr_rate ?? 0),
    })
    setError(null); setEmployeeErrors({}); setShowEmpDlg(true)
  }
  const saveEmp = async () => {
    if (!workspace || !user) { return }
    const errs = validateFields(empForm, employeeRules)
    setEmployeeErrors(errs)
    if (hasErrors(errs)) return
    const formStr = [empForm.first_name, empForm.last_name, empForm.role, empForm.department, empForm.phone, empForm.email].join(" ")
    if (detectInjection(formStr)) {
      logSecurityEvent({ type: "injection_attempt", details: `Suspicious input in employee form`, path: "gestion" })
      setError(fr ? "Entrée suspecte détectée." : "Suspicious input detected."); setSaving(false); return
    }
    setSaving(true); setError(null)
    const percentage = safeParseFloat(empForm.salary_percentage)
    const payload = {
      workspace_id: workspace.id, first_name: empForm.first_name.trim(), last_name: empForm.last_name.trim(),
      role: empForm.role.trim(), department: empForm.department || null, phone: empForm.phone || null,
      email: empForm.email || null, status: empForm.status, hire_date: empForm.hire_date || null,
      salary_type: empForm.salary_type, salary_percentage: empForm.salary_type === "percentage" || empForm.salary_type === "pourcentage" ? Math.min(percentage, 100) : null,
      salary_usd: empForm.salary_type === "percentage" || empForm.salary_type === "pourcentage" ? 0 : safeParseFloat(empForm.salary_usd),
      repartition_key: (empForm.salary_type === "percentage" || empForm.salary_type === "pourcentage") ? (empForm.repartition_key || null) : null,
      cnss_rate: safeParseFloat(empForm.cnss_rate, 5),
      ipr_rate: safeParseFloat(empForm.ipr_rate, 0),
    }
    const { error: e } = editEmp
      ? await insforge.database.from("employees").update(payload).eq("id", editEmp.id).eq("workspace_id", workspace.id)
      : await insforge.database.from("employees").insert([payload])
    if (e) { setError(e.message); setSaving(false); return }
    if (!editEmp) import("@/lib/stats").then(({ invalidateStatsCache }) => invalidateStatsCache())
    const fullName = `${payload.first_name} ${payload.last_name}`
    await logActivity({
      workspaceId: workspace.id, ownerId: workspace.owner_id, actorUserId: user.id,
      actorEmail: user.email || "", actorName: "", actionType: editEmp ? "update" : "create",
      module: "gestion", description: editEmp ? `${fr ? "Modification" : "Updated"} employee: ${fullName}` : `${fr ? "Ajout" : "Added"} employee: ${fullName}`, referenceId: null,
    })
    setShowEmpDlg(false); setEditEmp(null); fetchData(); setSaving(false)
  }
  const deleteEmp = async (id: string) => {
    if (!workspace || !user) return
    if (!confirm(fr ? "Supprimer cet employé ?" : "Delete this employee?")) return
    const emp = employees.find((e) => e.id === id)
    const { error } = await insforge.database.from("employees").delete().eq("id", id).eq("workspace_id", workspace.id)
    if (error) { alert(fr ? "Erreur lors de la suppression" : "Delete error"); return }
    if (emp) {
      await logActivity({
        workspaceId: workspace.id, ownerId: workspace.owner_id, actorUserId: user.id,
        actorEmail: user.email || "", actorName: "", actionType: "delete",
        module: "gestion", description: `${fr ? "Suppression" : "Deleted"} employee: ${emp.first_name} ${emp.last_name}`, referenceId: id,
      })
    }
    fetchData()
  }

  const openAddEntry = (type?: "income" | "expense") => {
    setEntryForm({ ...EMPTY_ENTRY, type: type ?? "income" })
    setError(null); setEntryErrors({}); setShowEntryDlg(true)
  }
  const saveEntry = async () => {
    if (!workspace || !user) { return }
    const errs = validateFields(entryForm, accountingEntryRules)
    setEntryErrors(errs)
    if (hasErrors(errs)) return
    const formStr = [entryForm.category, entryForm.description, entryForm.amount_usd, entryForm.entry_date].join(" ")
    if (detectInjection(formStr)) {
      logSecurityEvent({ type: "injection_attempt", details: `Suspicious input in accounting entry form`, path: "gestion" })
      setError(fr ? "Entrée suspecte détectée." : "Suspicious input detected."); setSaving(false); return
    }
    setSaving(true); setError(null)
    const amount = safeParseFloat(entryForm.amount_usd, 0, true)
    const period = entryForm.entry_date ? entryForm.entry_date.slice(0, 7) : null
    const { error: e } = await insforge.database.from("accounting_entries").insert([{
      workspace_id: workspace.id, type: entryForm.type, category: entryForm.category || entryForm.type,
      description: entryForm.description.trim(), amount_usd: amount, entry_date: entryForm.entry_date,
      account_code: entryForm.account_code || null, reference_number: entryForm.reference_number || null,
      journal_code: entryForm.journal_code || null, period,
    }])
    if (e) { setError(e.message); setSaving(false); return }
    publishNotification(createAccountingNotification(workspace.id, user.email?.split("@")[0] ?? "Gestion", entryForm.description.trim(), amount, entryForm.type, "gestion", "accounting"))
    await logActivity({
      workspaceId: workspace.id, ownerId: workspace.owner_id, actorUserId: user.id,
      actorEmail: user.email || "", actorName: "", actionType: "create",
      module: "gestion", description: `${fr ? "Ajout" : "Added"} ${entryForm.type === "income" ? (fr ? "revenu" : "income") : (fr ? "dépense" : "expense")}: ${entryForm.description.trim()}`,
      amountUsd: amount, referenceId: null,
    })
    setShowEntryDlg(false); fetchData(); setSaving(false)
  }
  const deleteEntry = async (id: string) => {
    if (!workspace || !user) return
    if (!confirm(fr ? "Supprimer cette entrée ?" : "Delete this entry?")) return
    const entry = entries.find((e) => e.id === id)
    const { error } = await insforge.database.from("accounting_entries").delete().eq("id", id).eq("workspace_id", workspace.id)
    if (error) { alert(fr ? "Erreur lors de la suppression" : "Delete error"); return }
    if (entry) {
      await logActivity({
        workspaceId: workspace.id, ownerId: workspace.owner_id, actorUserId: user.id,
        actorEmail: user.email || "", actorName: "", actionType: "delete",
        module: "gestion", description: `${fr ? "Suppression" : "Deleted"} ${entry.type === "income" ? (fr ? "revenu" : "income") : (fr ? "dépense" : "expense")}: ${entry.description}`,
        amountUsd: Number(entry.amount_usd), referenceId: id,
      })
    }
    fetchData()
  }

  const addPayment = async () => {
    if (!paymentForm.employee_id || !paymentForm.amount) return
    const emp = employees.find((e) => e.id === paymentForm.employee_id)
    if (!emp || !workspace) return
    const amount = parseFloat(paymentForm.amount) || 0
    const empName = `${emp.first_name} ${emp.last_name}`
    const { data, error } = await insforge.database.from("gestion_payments").insert([{
      workspace_id: workspace.id,
      date: paymentForm.date,
      employee_id: paymentForm.employee_id,
      employee_name: empName,
      amount,
      description: paymentForm.description,
      status: paymentForm.status,
    }]).select().single()
    if (!error && data) setPayments((prev) => [data as any, ...prev])
    if (workspace) {
      publishNotification(createPaymentNotification(workspace.id, empName, amount, "FC", "gestion", "payments"))
    }
    setPaymentForm({ employee_id: "", date: new Date().toISOString().slice(0, 10), amount: "", description: "", status: "paid" })
    setHistoryEntries((prev) => [{
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      type: "payment",
      description: `${fr ? "Paiement ajouté" : "Payment added"}: ${empName} — ${formatCurrency(amount)}`,
      amount,
    }, ...prev])
  }

  const deletePayment = async (id: string) => {
    if (!confirm(fr ? "Supprimer ce paiement ?" : "Delete this payment?")) return
    const payment = payments.find((p) => p.id === id)
    if (!payment) return
    await insforge.database.from("gestion_payments").delete().eq("id", id).eq("workspace_id", workspace?.id)
    setPayments((prev) => prev.filter((p) => p.id !== id))
    setHistoryEntries((prev) => [{
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      type: "delete",
      description: `${fr ? "Paiement supprimé" : "Payment deleted"}: ${payment.employee_name} — ${formatCurrency(payment.amount)}`,
      amount: payment.amount,
    }, ...prev])
  }

  const printReceipt = (emp: Employee) => {
    const isPct = emp.salary_type === "percentage" || emp.salary_type === "pourcentage"
    const grossSalary = isPct ? calcPctSalary(emp) : Number(emp.salary_usd)
    const cnssRate = emp.cnss_rate ?? 5
    const iprRate = emp.ipr_rate ?? 0
    const cnssEmployee = grossSalary * cnssRate / 100
    const iprAmount = grossSalary * iprRate / 100
    const netSalary = grossSalary - cnssEmployee - iprAmount
    const now = new Date()
    const dateStr = now.toLocaleDateString(fr ? "fr-FR" : "en-US", { year: "numeric", month: "long", day: "numeric" })
    const timeStr = now.toLocaleTimeString(fr ? "fr-FR" : "en-US", { hour: "2-digit", minute: "2-digit" })
    const wsName = workspace?.name || "SaveMali"

    const html = `<!DOCTYPE html>
<html><head><title>Reçu / Receipt</title>
<style>
  @media print { body { margin: 0; } }
  body { font-family: 'Segoe UI', Arial, sans-serif; width: 300px; margin: 0 auto; padding: 20px; color: #111; }
  .center { text-align: center; }
  .logo { font-size: 20px; font-weight: 800; color: #8B5CF6; margin-bottom: 2px; }
  .ws { font-size: 11px; color: #6b7280; margin-bottom: 12px; }
  .line { border-top: 1px dashed #d1d5db; margin: 10px 0; }
  .row { display: flex; justify-content: space-between; font-size: 12px; margin: 4px 0; }
  .row .label { color: #6b7280; }
  .row .value { font-weight: 600; }
  .total { font-size: 16px; font-weight: 800; color: #8B5CF6; text-align: center; margin: 12px 0; }
  .paid { font-size: 13px; font-weight: 700; color: #059669; text-align: center; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 6px 12px; margin: 10px 0; }
  .footer { font-size: 10px; color: #9ca3af; text-align: center; margin-top: 12px; }
  .dashed { border-top: 2px dashed #111; margin: 10px 0; }
</style></head><body>
  <div class="center">
    <div class="logo">SaveMali</div>
    <div class="ws">${sanitizeHtml(wsName)}</div>
  </div>
  <div class="dashed"></div>
    <div class="center" style="font-size:14px;font-weight:700;margin-bottom:8px;">${fr ? "BULLETIN DE PAIE" : "PAYSLIP"}</div>
  <div class="line"></div>
  <div class="row"><span class="label">${fr ? "Date" : "Date"}</span><span class="value">${dateStr}</span></div>
  <div class="row"><span class="label">${fr ? "Heure" : "Time"}</span><span class="value">${timeStr}</span></div>
  <div class="line"></div>
  <div class="row"><span class="label">${fr ? "Employé" : "Employee"}</span><span class="value">${sanitizeHtml(emp.first_name)} ${sanitizeHtml(emp.last_name)}</span></div>
  <div class="row"><span class="label">${fr ? "Poste" : "Role"}</span><span class="value">${sanitizeHtml(emp.role)}</span></div>
  ${emp.department ? `<div class="row"><span class="label">${fr ? "Département" : "Department"}</span><span class="value">${sanitizeHtml(emp.department)}</span></div>` : ""}
  <div class="line"></div>
  <div class="row"><span class="label">${fr ? "Salaire brut" : "Gross salary"}</span><span class="value">${formatCurrency(grossSalary, undefined, true)}</span></div>
  <div class="row" style="color:#dc2626"><span class="label">CNSS (${cnssRate}%)</span><span class="value">-${formatCurrency(cnssEmployee, undefined, true)}</span></div>
  ${iprRate > 0 ? `<div class="row" style="color:#dc2626"><span class="label">IPR (${iprRate}%)</span><span class="value">-${formatCurrency(iprAmount, undefined, true)}</span></div>` : ""}
  <div class="line"></div>
  <div class="total">${formatCurrency(netSalary, undefined, true)}</div>
  <div class="paid">${fr ? "Net à payer" : "Net pay"}</div>
  <div class="dashed"></div>
  <div class="footer">
    ${sanitizeHtml(wsName)} — ${fr ? "Développé par John Mocket" : "Developed by John Mocket"}<br>
    ${dateStr} ${timeStr}
  </div>
</body></html>`

    const printWindow = window.open("", "_blank", "width=350,height=600")
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => printWindow.print(), 300)
    }
    setReceiptEmp(emp)
  }

  const rootRef = usePageEntrance([loading])

  if (!workspace) return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <BarChart3 className="size-12 text-muted-foreground" />
      <p className="text-muted-foreground">{fr ? "Connectez-vous pour accéder à la gestion." : "Sign in to access management."}</p>
      <Button onClick={() => onNavigate("signin")}>{fr ? "Se connecter" : "Sign in"}</Button>
    </div>
  )

  return (
    <div ref={rootRef} className="min-h-svh bg-background">
      <div className="page-header bg-gradient-to-br from-purple to-purple/70 px-4 py-4 text-primary-foreground">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
                <button onClick={() => onNavigate("dashboard")} className="hover:text-white hover:underline">{fr ? "Tableau de bord" : "Dashboard"}</button>
                <span>/</span><span className="text-white">{fr ? "Gestion" : "Management"}</span>
              </div>
              <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="size-6" /> {fr ? "Gestion d'entreprise" : "Business Management"}</h1>
              <p className="text-white/70 text-sm mt-0.5">{workspace.name}</p>
            </div>
            <Button variant="outline" size="sm" className="border-white/30 text-white hover:bg-white/10 gap-1.5" onClick={fetchData}><RefreshCw className="size-3.5" />{fr ? "Actualiser" : "Refresh"}</Button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s, i) => (
              <div key={i} className="rounded-xl bg-white/10 p-3 backdrop-blur-sm">
                <p className="text-white/60 text-xs">{s.label}</p>
                <p className="text-xl font-bold text-white">{loading ? "..." : s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="page-content mx-auto max-w-7xl px-4 py-4 sm:px-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6 flex-wrap">
            <TabsTrigger value="employees"><Users className="size-4 mr-1.5" />{fr ? "Employés" : "Employees"}</TabsTrigger>
            <TabsTrigger value="accounting"><Receipt className="size-4 mr-1.5" />{fr ? "Comptabilité" : "Accounting"}</TabsTrigger>
            <TabsTrigger value="reports"><BarChart3 className="size-4 mr-1.5" />{fr ? "Rapports" : "Reports"}</TabsTrigger>
            <TabsTrigger value="payments"><DollarSign className="size-4 mr-1.5" />{fr ? "Paiements" : "Payments"}</TabsTrigger>
            <TabsTrigger value="history"><FileText className="size-4 mr-1.5" />{fr ? "Historique" : "History"}</TabsTrigger>
          </TabsList>

          <TabsContent value="employees">
            <div className="flex justify-end mb-4">
              <Button onClick={openAddEmp} className="gap-1.5 bg-purple text-purple-foreground hover:bg-purple/90"><Plus className="size-4" />{fr ? "Ajouter un employé" : "Add employee"}</Button>
            </div>
            {loading ? <div className="flex h-32 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div> :
              employees.length === 0 ? (
                <EmptyState
                  icon={<Users className="size-12" />}
                  title={fr ? "Aucun employé" : "No employees"}
                  description={fr ? "Ajoutez des employés pour gérer la paie." : "Add employees to manage payroll."}
                  action={<Button variant="outline" size="sm" onClick={openAddEmp}><Plus className="size-3.5 mr-1" />{fr ? "Ajouter" : "Add"}</Button>}
                />
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50"><tr>
                      {[
                        fr ? "Nom" : "Name", fr ? "Poste" : "Role", fr ? "Départ." : "Dept.", fr ? "Téléphone" : "Phone",
                        fr ? "Type de paie" : "Pay type", fr ? "Salaire" : "Salary", fr ? "Clé répartition" : "Repartition key",
                        fr ? "Statut" : "Status", ""
                      ].map((h) => <th key={h} className="px-3 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>)}
                    </tr></thead>
                    <tbody className="divide-y divide-border">
                      {employees.map((e) => {
                        const isPct = e.salary_type === "percentage" || e.salary_type === "pourcentage"
                        const pctSalary = isPct ? calcPctSalary(e) : 0
                        return (
                          <tr key={e.id} className="bg-card hover:bg-muted/30">
                            <td className="px-3 py-3 font-medium text-foreground whitespace-nowrap">{e.first_name} {e.last_name}</td>
                            <td className="px-3 py-3 text-muted-foreground">{e.role}</td>
                            <td className="px-3 py-3 text-muted-foreground">{e.department ?? "—"}</td>
                            <td className="px-3 py-3 text-muted-foreground">{e.phone ?? "—"}</td>
                            <td className="px-3 py-3">
                              <Badge variant={isPct ? "secondary" : "default"} className="text-xs whitespace-nowrap">
                                {isPct ? (fr ? "%" : "Percentage") : (fr ? "Fixe" : "Fixed")}
                              </Badge>
                            </td>
                            <td className="px-3 py-3 text-foreground whitespace-nowrap">
                              {isPct ? `${e.salary_percentage}% (${formatCurrency(pctSalary)})` : formatCurrency(Number(e.salary_usd))}
                            </td>
                            <td className="px-3 py-3 text-muted-foreground">{e.repartition_key ?? "—"}</td>
                            <td className="px-3 py-3">
                              <Badge variant={e.status === "active" ? "secondary" : "outline"} className="text-xs">
                                {e.status === "active" ? (fr ? "Actif" : "Active") : (fr ? "Inactif" : "Inactive")}
                              </Badge>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex gap-1.5 justify-end">
                                <Button size="icon" variant="ghost" className="size-7" onClick={() => printReceipt(e)} title={fr ? "Imprimer le reçu" : "Print receipt"}><Printer className="size-3.5" /></Button>
                                <Button size="icon" variant="ghost" className="size-7" onClick={() => openEditEmp(e)}><Edit2 className="size-3.5" /></Button>
                                {role === "admin" && <Button size="icon" variant="ghost" className="size-7 text-destructive hover:text-destructive" onClick={() => deleteEmp(e.id)}><Trash2 className="size-3.5" /></Button>}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
          </TabsContent>

          <TabsContent value="accounting">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input value={entrySearch} onChange={(e) => setEntrySearch(e.target.value)} placeholder={fr ? "Rechercher..." : "Search..."} className="pl-9" />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => openAddEntry("income")} className="gap-1.5 bg-success text-success-foreground hover:bg-success/90 text-xs"><ArrowUpCircle className="size-4" />{fr ? "Revenu" : "Income"}</Button>
                <Button onClick={() => openAddEntry("expense")} className="gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs"><ArrowDownCircle className="size-4" />{fr ? "Dépense" : "Expense"}</Button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: fr ? "Revenus" : "Income", value: totalIncome, color: "border-success/30 bg-success/5 text-success" },
                { label: fr ? "Dépenses" : "Expenses", value: totalExpense, color: "border-destructive/30 bg-destructive/5 text-destructive" },
                { label: fr ? "Solde" : "Balance", value: totalIncome - totalExpense, color: (totalIncome - totalExpense) >= 0 ? "border-success/30 bg-success/5 text-success" : "border-destructive/30 bg-destructive/5 text-destructive" },
              ].map((c, i) => (
                <div key={i} className={`rounded-lg border p-4 ${c.color}`}>
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                  <p className="text-lg font-bold">{formatCurrency(c.value, undefined, true)}</p>
                </div>
              ))}
            </div>
            {loading ? <div className="flex h-32 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div> :
              filteredEntries.length === 0 ? (
                <EmptyState
                  icon={<Receipt className="size-12" />}
                  title={fr ? "Aucune entrée comptable" : "No accounting entries"}
                  description={fr ? "Ajoutez des revenus ou dépenses pour suivre la comptabilité." : "Add income or expenses to track accounting."}
                  action={<Button variant="outline" size="sm" onClick={() => openAddEntry("income")}><Plus className="size-3.5 mr-1" />{fr ? "Ajouter" : "Add"}</Button>}
                />
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50"><tr>{[fr ? "Date" : "Date", fr ? "Compte" : "Account", fr ? "Réf." : "Ref.", fr ? "Journal" : "Journal", fr ? "Type" : "Type", fr ? "Catégorie" : "Category", fr ? "Description" : "Description", fr ? "Montant (FC)" : "Amount (FC)", ""].map((h) => <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-border">
                      {filteredEntries.map((e) => (
                        <tr key={e.id} className="bg-card hover:bg-muted/30">
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{new Date(e.entry_date).toLocaleDateString(fr ? "fr-FR" : "en-US")}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs font-mono">{e.account_code ?? "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{e.reference_number ?? "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{e.journal_code ?? "—"}</td>
                          <td className="px-4 py-3"><Badge variant={e.type === "income" ? "secondary" : "destructive"} className="text-xs">{e.type === "income" ? (fr ? "Recette" : "Income") : (fr ? "Charge" : "Expense")}</Badge></td>
                          <td className="px-4 py-3 text-muted-foreground">{e.category}</td>
                          <td className="px-4 py-3 text-foreground">{e.description}</td>
                          <td className={`px-4 py-3 font-medium whitespace-nowrap ${e.type === "income" ? "text-success" : "text-destructive"}`}>{e.type === "income" ? "+" : "-"}{formatCurrency(Number(e.amount_usd), undefined, true)}</td>
                          {role === "admin" && <td className="px-4 py-3"><Button size="icon" variant="ghost" className="size-7 text-destructive hover:text-destructive" onClick={() => deleteEntry(e.id)}><Trash2 className="size-3.5" /></Button></td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </TabsContent>

          <TabsContent value="reports">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{fr ? "Rapports & Export" : "Reports & Export"}</h3>
                <p className="text-sm text-muted-foreground">{fr ? "Générez des rapports PDF ou Word" : "Generate PDF or Word reports"}</p>
              </div>
              <ReportGenerator
                moduleType="gestion"
                workspace={workspace!}
                data={{ employees, accounting: entries, members }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
              {reportStats.map((s, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-4 page-card">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className={`text-xl font-bold ${s.color}`}>{s.fmt === "currency" ? formatCurrency(s.value) : s.value}</p>
                </div>
              ))}
            </div>

            <Card className="mb-6 page-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="size-4 text-purple" />{fr ? "Comparaison mensuelle (6 mois)" : "Monthly comparison (6 months)"}</CardTitle>
              </CardHeader>
              <CardContent>
                {monthlyChart.length === 0 || monthlyChart.every((m) => m.income === 0 && m.expense === 0) ? (
                  <p className="text-sm text-muted-foreground text-center py-8">{fr ? "Aucune donnée pour les 6 derniers mois" : "No data for the last 6 months"}</p>
                ) : (
                  <div className="flex items-end gap-3 h-48 pt-4">
                    {monthlyChart.map((m, i) => {
                      const incomeH = (m.income / chartMax) * 100
                      const expenseH = (m.expense / chartMax) * 100
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                          <div className="w-full flex flex-col items-center gap-0.5 justify-end" style={{ height: `${Math.max(incomeH, expenseH, 2)}%` }}>
                            {m.income > 0 && <div className="w-full rounded-t-sm bg-success/70" style={{ height: `${incomeH}%`, minHeight: m.income > 0 ? 4 : 0 }} title={`${fr ? "Revenus" : "Income"}: ${formatCurrency(m.income)}`} />}
                            {m.expense > 0 && <div className="w-full rounded-t-sm bg-destructive/70" style={{ height: `${expenseH}%`, minHeight: m.expense > 0 ? 4 : 0 }} title={`${fr ? "Dépenses" : "Expenses"}: ${formatCurrency(m.expense)}`} />}
                          </div>
                          {m.income === 0 && m.expense === 0 && <div className="w-full h-1 rounded bg-muted" />}
                          <span className="text-[10px] text-muted-foreground mt-1 whitespace-nowrap">{m.label}</span>
                          <span className="text-[10px] font-medium">{formatCurrency(m.income - m.expense)}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2 mb-6">
              <Card className="page-card">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><Calculator className="size-4 text-purple" />{fr ? "Analyse de la paie" : "Payroll analysis"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{fr ? "Coût salarial fixe" : "Fixed salary cost"}</span>
                    <span className="font-medium">{formatCurrency(fixedPayroll)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{fr ? "Employés au pourcentage" : "Percentage-based employees"}</span>
                    <span className="font-medium">{pctEmployees.length}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{fr ? "Paie au pourcentage (est.)" : "Percentage payroll (est.)"}</span>
                    <span className="font-medium">{formatCurrency(pctPayroll)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{fr ? "Paie totale" : "Total payroll"}</span>
                    <span className="font-bold text-purple">{formatCurrency(totalPayroll)}</span>
                  </div>
                  {repartitionGroups.length > 0 && (
                    <>
                      <Separator />
                      <p className="text-xs font-medium text-muted-foreground mt-2">{fr ? "Répartition par clé" : "Breakdown by repartition key"}</p>
                      {repartitionGroups.map(([key, val]) => (
                        <div key={key} className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{key}</span>
                          <span className="font-medium">{val.count} {fr ? "emp." : "emp."} — {val.totalPct.toFixed(0)}%</span>
                        </div>
                      ))}
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="page-card">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><FileText className="size-4 text-purple" />{fr ? "Activité récente" : "Recent activity"}</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex h-24 items-center justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
                  ) : activities.length === 0 ? (
                    <EmptyState icon={<FileText className="size-12" />} title={fr ? "Aucune activité récente" : "No recent activity"} description={fr ? "L'activité récente apparaîtra ici." : "Recent activity will appear here."} />
                  ) : (
                    <ScrollArea className="h-72 pr-3">
                      <div className="space-y-3">
                        {activities.map((a) => {
                          const actionIcon = a.action_type === "create" ? <Plus className="size-3 text-success" /> :
                            a.action_type === "delete" ? <Trash2 className="size-3 text-destructive" /> :
                            <Edit2 className="size-3 text-purple" />
                          return (
                            <div key={a.id} className="flex items-start gap-2 text-sm">
                              <div className="mt-0.5 shrink-0">{actionIcon}</div>
                              <div className="flex-1 min-w-0">
                                <p className="text-foreground truncate">{a.description}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  {new Date(a.performed_at).toLocaleDateString(fr ? "fr-FR" : "en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                  {a.actor_name ? ` · ${a.actor_name}` : ""}
                                </p>
                              </div>
                              {a.amount_usd != null && (
                                <span className="shrink-0 text-xs font-medium text-muted-foreground">{formatCurrency(Number(a.amount_usd))}</span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* PAIEMENTS */}
          <TabsContent value="payments">
            <Card className="mb-6 page-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><DollarSign className="size-4 text-purple" />{fr ? "Ajouter un paiement" : "Add payment"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{fr ? "Employé" : "Employee"}</Label>
                    <Select value={paymentForm.employee_id} onValueChange={(v) => setPaymentForm((p) => ({ ...p, employee_id: v }))}>
                      <SelectTrigger className="h-10 rounded-lg"><SelectValue placeholder={fr ? "Choisir" : "Select"} /></SelectTrigger>
                      <SelectContent>
                        {employees.map((e) => (
                          <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{fr ? "Montant (FC)" : "Amount (FC)"}</Label>
                    <Input type="number" min="0" step="0.01" value={paymentForm.amount} onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))} placeholder="0.00" className="h-10 rounded-lg" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{fr ? "Date" : "Date"}</Label>
                    <Input type="date" value={paymentForm.date} onChange={(e) => setPaymentForm((p) => ({ ...p, date: e.target.value }))} className="h-10 rounded-lg" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{fr ? "Description" : "Description"}</Label>
                    <Input value={paymentForm.description} onChange={(e) => setPaymentForm((p) => ({ ...p, description: e.target.value }))} placeholder={fr ? "Notes..." : "Notes..."} className="h-10 rounded-lg" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{fr ? "Statut" : "Status"}</Label>
                    <Select value={paymentForm.status} onValueChange={(v) => setPaymentForm((p) => ({ ...p, status: v }))}>
                      <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paid">{fr ? "Payé" : "Paid"}</SelectItem>
                        <SelectItem value="pending">{fr ? "En attente" : "Pending"}</SelectItem>
                        <SelectItem value="cancelled">{fr ? "Annulé" : "Cancelled"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={addPayment} className="gap-1.5 bg-purple text-purple-foreground hover:bg-purple/90"><Plus className="size-4" />{fr ? "Ajouter" : "Add"}</Button>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="rounded-lg border border-success/30 bg-success/5 p-4">
                <p className="text-xs text-muted-foreground">{fr ? "Total payé" : "Total paid"}</p>
                <p className="text-lg font-bold text-success">{formatCurrency(payments.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0) ?? 0, undefined, true)}</p>
              </div>
              <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
                <p className="text-xs text-muted-foreground">{fr ? "Total en attente" : "Total pending"}</p>
                <p className="text-lg font-bold text-yellow-500">{formatCurrency(payments.filter((p) => p.status === "pending").reduce((s, p) => s + Number(p.amount), 0) ?? 0, undefined, true)}</p>
              </div>
            </div>

            {payments.length === 0 ? (
              <EmptyState
                icon={<DollarSign className="size-12" />}
                title={fr ? "Aucun paiement" : "No payments"}
                description={fr ? "Les paiements aux employés apparaîtront ici." : "Employee payments will appear here."}
              />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50"><tr>
                    {[fr ? "Date" : "Date", fr ? "Employé" : "Employee", fr ? "Montant (FC)" : "Amount (FC)", fr ? "Description" : "Description", fr ? "Statut" : "Status", ""].map((h) => <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-border">
                    {payments.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((p) => (
                      <tr key={p.id} className="bg-card hover:bg-muted/30">
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{new Date(p.date).toLocaleDateString(fr ? "fr-FR" : "en-US")}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{p.employee_name}</td>
                        <td className="px-4 py-3 font-medium whitespace-nowrap">{formatCurrency(p.amount, undefined, true)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{p.description || "—"}</td>
                        <td className="px-4 py-3">
                          <Badge variant={p.status === "paid" ? "secondary" : p.status === "pending" ? "outline" : "destructive"} className="text-xs">
                            {p.status === "paid" ? (fr ? "Payé" : "Paid") : p.status === "pending" ? (fr ? "En attente" : "Pending") : (fr ? "Annulé" : "Cancelled")}
                          </Badge>
                        </td>
                        {role === "admin" && <td className="px-4 py-3"><Button size="icon" variant="ghost" className="size-7 text-destructive hover:text-destructive" onClick={() => deletePayment(p.id)}><Trash2 className="size-3.5" /></Button></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* HISTORIQUE */}
          <TabsContent value="history">
            <div className="flex flex-wrap items-end gap-3 mb-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{fr ? "Date début" : "Start date"}</Label>
                <Input type="date" value={historyFilter.startDate} onChange={(e) => setHistoryFilter((p) => ({ ...p, startDate: e.target.value }))} className="h-10 rounded-lg w-40" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{fr ? "Date fin" : "End date"}</Label>
                <Input type="date" value={historyFilter.endDate} onChange={(e) => setHistoryFilter((p) => ({ ...p, endDate: e.target.value }))} className="h-10 rounded-lg w-40" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{fr ? "Type" : "Type"}</Label>
                <Select value={historyFilter.type} onValueChange={(v) => setHistoryFilter((p) => ({ ...p, type: v }))}>
                  <SelectTrigger className="h-10 rounded-lg w-40"><SelectValue placeholder={fr ? "Tous" : "All"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{fr ? "Tous" : "All"}</SelectItem>
                    <SelectItem value="create">{fr ? "Création" : "Create"}</SelectItem>
                    <SelectItem value="update">{fr ? "Modification" : "Update"}</SelectItem>
                    <SelectItem value="delete">{fr ? "Suppression" : "Delete"}</SelectItem>
                    <SelectItem value="payment">{fr ? "Paiement" : "Payment"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loading ? (
              <div className="flex h-32 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
            ) : combinedHistory.length === 0 ? (
              <EmptyState icon={<FileText className="size-12" />} title={fr ? "Aucune activité" : "No activity"} description={fr ? "L'historique des activités apparaîtra ici." : "Activity history will appear here."} />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50"><tr>
                    {[fr ? "Date" : "Date", fr ? "Type d'action" : "Action type", fr ? "Description" : "Description", fr ? "Montant (FC)" : "Amount (FC)"].map((h) => <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-border">
                    {combinedHistory.map((item) => (
                      <tr key={item.id} className="bg-card hover:bg-muted/30">
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{new Date(item.date).toLocaleDateString(fr ? "fr-FR" : "en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                        <td className="px-4 py-3">
                          <Badge variant={item.type === "create" ? "secondary" : item.type === "delete" ? "destructive" : item.type === "payment" ? "default" : "outline"} className="text-xs">
                            {item.type === "create" ? (fr ? "Création" : "Create") : item.type === "update" ? (fr ? "Modification" : "Update") : item.type === "delete" ? (fr ? "Suppression" : "Delete") : item.type === "payment" ? (fr ? "Paiement" : "Payment") : item.type}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-foreground">{item.description}</td>
                        <td className="px-4 py-3 font-medium whitespace-nowrap">{item.amount != null ? formatCurrency(Number(item.amount)) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showEmpDlg} onOpenChange={(o) => { setShowEmpDlg(o); if (!o) setEditEmp(null) }}>
        <DialogContent className="ag-dialog max-w-lg p-0">
          <DialogHeader className="px-6 pt-5 pb-0">
            <DialogTitle className="text-foreground">{editEmp ? (fr ? "Modifier l'employé" : "Edit employee") : (fr ? "Ajouter un employé" : "Add employee")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 py-4 flex-1 overflow-y-auto">
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="first_name" className="text-sm font-medium text-foreground">{fr ? "Prénom" : "First name"}</Label>
                <Input id="first_name" value={empForm.first_name} onChange={(e) => setEmpForm((p) => ({ ...p, first_name: e.target.value }))} className="h-10 rounded-lg text-foreground" />
                {employeeErrors.first_name && <p className="text-xs text-destructive">{employeeErrors.first_name}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="last_name" className="text-sm font-medium text-foreground">{fr ? "Nom" : "Last name"}</Label>
                <Input id="last_name" value={empForm.last_name} onChange={(e) => setEmpForm((p) => ({ ...p, last_name: e.target.value }))} className="h-10 rounded-lg text-foreground" />
                {employeeErrors.last_name && <p className="text-xs text-destructive">{employeeErrors.last_name}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="role" className="text-sm font-medium text-foreground">{fr ? "Poste" : "Role"}</Label>
                <Input id="role" value={empForm.role} onChange={(e) => setEmpForm((p) => ({ ...p, role: e.target.value }))} placeholder={fr ? "Ex: Caissier" : "Ex: Cashier"} className="h-10 rounded-lg text-foreground" />
                {employeeErrors.role && <p className="text-xs text-destructive">{employeeErrors.role}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="department" className="text-sm font-medium text-foreground">{fr ? "Département" : "Department"}</Label>
                <Input id="department" value={empForm.department} onChange={(e) => setEmpForm((p) => ({ ...p, department: e.target.value }))} className="h-10 rounded-lg text-foreground" />
                {employeeErrors.department && <p className="text-xs text-destructive">{employeeErrors.department}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-sm font-medium text-foreground">{fr ? "Téléphone" : "Phone"}</Label>
                <Input id="phone" value={empForm.phone} onChange={(e) => setEmpForm((p) => ({ ...p, phone: e.target.value }))} className="h-10 rounded-lg text-foreground" />
                {employeeErrors.phone && <p className="text-xs text-destructive">{employeeErrors.phone}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">{fr ? "Courriel" : "Email"}</Label>
                <Input id="email" type="email" value={empForm.email} onChange={(e) => setEmpForm((p) => ({ ...p, email: e.target.value }))} className="h-10 rounded-lg text-foreground" />
                {employeeErrors.email && <p className="text-xs text-destructive">{employeeErrors.email}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">{fr ? "Type de salaire" : "Salary type"}</Label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEmpForm((p) => ({ ...p, salary_type: "fixed" }))} className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${empForm.salary_type === "fixed" ? "border-purple bg-purple/10 text-purple" : "border-border text-muted-foreground hover:bg-muted"}`}>
                    {fr ? "Fixe" : "Fixed"}
                  </button>
                  <button type="button" onClick={() => setEmpForm((p) => ({ ...p, salary_type: "percentage" }))} className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${empForm.salary_type === "percentage" || empForm.salary_type === "pourcentage" ? "border-purple bg-purple/10 text-purple" : "border-border text-muted-foreground hover:bg-muted"}`}>
                    {fr ? "Pourcentage" : "Percentage"}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">{fr ? "Statut" : "Status"}</Label>
                <Select value={empForm.status} onValueChange={(v) => setEmpForm((p) => ({ ...p, status: v }))}>
                  <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{fr ? "Actif" : "Active"}</SelectItem>
                    <SelectItem value="inactive">{fr ? "Inactif" : "Inactive"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {empForm.salary_type === "percentage" || empForm.salary_type === "pourcentage" ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="salary_percentage" className="text-sm font-medium text-foreground">{fr ? "Pourcentage (0-100)" : "Percentage (0-100)"}</Label>
                  <Input id="salary_percentage" type="number" min="0" max="100" value={empForm.salary_percentage} onChange={(e) => setEmpForm((p) => ({ ...p, salary_percentage: e.target.value }))} placeholder="10" className="h-10 rounded-lg text-foreground" />
                  {employeeErrors.salary_percentage && <p className="text-xs text-destructive">{employeeErrors.salary_percentage}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="repartition_key" className="text-sm font-medium text-foreground">{fr ? "Clé de répartition" : "Repartition key"}</Label>
                  <Input id="repartition_key" value={empForm.repartition_key} onChange={(e) => setEmpForm((p) => ({ ...p, repartition_key: e.target.value }))} placeholder={fr ? "Ex: Ventes" : "Ex: Sales"} className="h-10 rounded-lg text-foreground" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="salary_usd" className="text-sm font-medium text-foreground">{fr ? "Salaire (FC)" : "Salary (FC)"}</Label>
                  <Input id="salary_usd" type="number" min="0" value={empForm.salary_usd} onChange={(e) => setEmpForm((p) => ({ ...p, salary_usd: e.target.value }))} placeholder="300" className="h-10 rounded-lg text-foreground" />
                  {employeeErrors.salary_usd && <p className="text-xs text-destructive">{employeeErrors.salary_usd}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="hire_date" className="text-sm font-medium text-foreground">{fr ? "Date d'embauche" : "Hire date"}</Label>
                  <Input id="hire_date" type="date" value={empForm.hire_date} onChange={(e) => setEmpForm((p) => ({ ...p, hire_date: e.target.value }))} className="h-10 rounded-lg text-foreground" />
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4">
              <div className="space-y-1.5">
                <Label htmlFor="cnss_rate" className="text-sm font-medium text-foreground">{fr ? "Taux CNSS (%)" : "CNSS rate (%)"}</Label>
                <Input id="cnss_rate" type="number" min="0" max="100" step="0.1" value={empForm.cnss_rate} onChange={(e) => setEmpForm((p) => ({ ...p, cnss_rate: e.target.value }))} placeholder="5" className="h-10 rounded-lg text-foreground" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ipr_rate" className="text-sm font-medium text-foreground">{fr ? "Taux IPR (%)" : "IPR rate (%)"}</Label>
                <Input id="ipr_rate" type="number" min="0" max="100" step="0.1" value={empForm.ipr_rate} onChange={(e) => setEmpForm((p) => ({ ...p, ipr_rate: e.target.value }))} placeholder="0" className="h-10 rounded-lg text-foreground" />
              </div>
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border/50">
            <Button variant="outline" onClick={() => setShowEmpDlg(false)}>{fr ? "Annuler" : "Cancel"}</Button>
            <Button onClick={saveEmp} disabled={saving} className="bg-purple text-purple-foreground hover:bg-purple/90 gap-2">{saving && <Loader2 className="size-4 animate-spin" />}{fr ? "Enregistrer" : "Save"}</Button>
          </DialogFooter>
          <DialogFooterBrand />
        </DialogContent>
      </Dialog>

      <Dialog open={showEntryDlg} onOpenChange={setShowEntryDlg}>
        <DialogContent className="ag-dialog max-w-md p-0">
          <DialogHeader className="px-6 pt-5 pb-0">
            <DialogTitle className="text-foreground">{fr ? "Nouvelle entrée comptable" : "New accounting entry"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 py-4">
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">{fr ? "Type" : "Type"}</Label>
              <div className="flex gap-2">
                {[{ v: "income" as const, label: fr ? "Revenu" : "Income", cls: "border-success text-success bg-success/10" }, { v: "expense" as const, label: fr ? "Dépense" : "Expense", cls: "border-destructive text-destructive bg-destructive/10" }].map((t) => (
                  <button key={t.v} type="button" onClick={() => setEntryForm((p) => ({ ...p, type: t.v }))} className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${entryForm.type === t.v ? t.cls : "border-border text-muted-foreground hover:bg-muted"}`}>{t.label}</button>
                ))}
              </div>
              {entryErrors.type && <p className="text-xs text-destructive">{entryErrors.type}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category" className="text-sm font-medium text-foreground">{fr ? "Catégorie" : "Category"}</Label>
              <Input id="category" value={entryForm.category} onChange={(e) => setEntryForm((p) => ({ ...p, category: e.target.value }))} placeholder={fr ? "Ex: Ventes, Loyer" : "Ex: Sales, Rent"} className="h-10 rounded-lg text-foreground" />
              {entryErrors.category && <p className="text-xs text-destructive">{entryErrors.category}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-sm font-medium text-foreground">{fr ? "Description" : "Description"}</Label>
              <Input id="description" value={entryForm.description} onChange={(e) => setEntryForm((p) => ({ ...p, description: e.target.value }))} placeholder={fr ? "Ex: Vente du jour" : "Ex: Daily sales"} className="h-10 rounded-lg text-foreground" />
              {entryErrors.description && <p className="text-xs text-destructive">{entryErrors.description}</p>}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="amount_usd" className="text-sm font-medium text-foreground">{fr ? "Montant (FC)" : "Amount (FC)"}</Label><Input id="amount_usd" type="number" value={entryForm.amount_usd} onChange={(e) => setEntryForm((p) => ({ ...p, amount_usd: e.target.value }))} placeholder="100.00" className="h-10 rounded-lg text-foreground" />
                {entryErrors.amount_usd && <p className="text-xs text-destructive">{entryErrors.amount_usd}</p>}
              </div>
              <div className="space-y-1.5"><Label htmlFor="entry_date" className="text-sm font-medium text-foreground">{fr ? "Date" : "Date"}</Label><Input id="entry_date" type="date" value={entryForm.entry_date} onChange={(e) => setEntryForm((p) => ({ ...p, entry_date: e.target.value }))} className="h-10 rounded-lg text-foreground" />
                {entryErrors.entry_date && <p className="text-xs text-destructive">{entryErrors.entry_date}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="account_code" className="text-sm font-medium text-foreground">{fr ? "Compte OHADA" : "OHADA Account"}</Label>
                <Input id="account_code" value={entryForm.account_code} onChange={(e) => setEntryForm((p) => ({ ...p, account_code: e.target.value }))} placeholder={fr ? "Ex: 701, 601" : "Ex: 701, 601"} className="h-10 rounded-lg text-foreground" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reference_number" className="text-sm font-medium text-foreground">{fr ? "Référence" : "Reference"}</Label>
                <Input id="reference_number" value={entryForm.reference_number} onChange={(e) => setEntryForm((p) => ({ ...p, reference_number: e.target.value }))} placeholder={fr ? "N° de pièce" : "Doc number"} className="h-10 rounded-lg text-foreground" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="journal_code" className="text-sm font-medium text-foreground">{fr ? "Journal" : "Journal"}</Label>
                <Input id="journal_code" value={entryForm.journal_code} onChange={(e) => setEntryForm((p) => ({ ...p, journal_code: e.target.value }))} placeholder={fr ? "AC, BQ, CA" : "AC, BQ, CA"} className="h-10 rounded-lg text-foreground" />
              </div>
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border/50">
            <Button variant="outline" onClick={() => setShowEntryDlg(false)}>{fr ? "Annuler" : "Cancel"}</Button>
            <Button onClick={saveEntry} disabled={saving} className="gap-2 bg-purple text-purple-foreground hover:bg-purple/90">{saving && <Loader2 className="size-4 animate-spin" />}{fr ? "Enregistrer" : "Save"}</Button>
          </DialogFooter>
          <DialogFooterBrand />
        </DialogContent>
      </Dialog>
      <PageFooter onNavigate={onNavigate} />
    </div>
  )
}
