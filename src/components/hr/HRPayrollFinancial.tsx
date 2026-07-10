import React from "react"
import { useLanguage } from "@/lib/i18n"
import { insforge } from "@/lib/supabase"
import { formatCurrency } from "@/lib/currency"
import { toast } from "sonner"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend
} from "recharts"
import {
  DollarSign, TrendingUp, TrendingDown, Users
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface HREmployee {
  id: string; first_name: string; last_name: string; position: string; salary: number; status: string; department_id?: string;
}
interface HRPayslip {
  id: string; employee_id: string; base_salary: number; bonus: number; net_pay: number; status: string; paid_at?: string;
  first_name?: string; last_name?: string; month?: number; year?: number;
}
interface HRPaymentTransaction {
  id: string; employee_id: string; amount: number; payment_method: string; status: string; processed_at?: string;
  first_name?: string; last_name?: string;
}
interface HRPayrollPeriod {
  id: string; month: number; year: number; label?: string; status: string;
}

interface Props {
  workspace: { id: string } | null
  employees: HREmployee[]
}

const COLORS = ["#4f46e5", "#059669", "#ea580c", "#7c3aed", "#0284c7", "#d97706", "#dc2626", "#0891b2"]

export function HRPayrollFinancial({ workspace, employees }: Props) {
  const { lang } = useLanguage()
  const fr = lang === "fr"
  const wsId = workspace?.id

  const [periods, setPeriods] = React.useState<HRPayrollPeriod[]>([])
  const [payslips, setPayslips] = React.useState<HRPayslip[]>([])
  const [payments, setPayments] = React.useState<HRPaymentTransaction[]>([])
  const [loading, setLoading] = React.useState(true)

  async function load() {
    if (!wsId) return
    const [perRes, payRes, trxRes] = await Promise.all([
      insforge.database.from("hr_payroll_periods").select("*").eq("workspace_id", wsId).order("year", { ascending: false }).order("month", { ascending: false }),
      insforge.database.from("hr_payslips").select("*, hr_employees!inner(first_name,last_name)").eq("workspace_id", wsId).order("created_at", { ascending: false }).limit(500),
      insforge.database.from("hr_payment_transactions").select("*, hr_employees!inner(first_name,last_name)").eq("workspace_id", wsId).order("created_at", { ascending: false }).limit(200),
    ])
    if (perRes.error) toast.error(perRes.error.message)
    else if (perRes.data) setPeriods(perRes.data)
    if (payRes.error) toast.error(payRes.error.message)
    else if (payRes.data) {
      setPayslips((payRes.data as any[]).map(p => ({
        ...p, first_name: p.hr_employees?.first_name, last_name: p.hr_employees?.last_name,
      })))
    }
    if (trxRes.error) toast.error(trxRes.error.message)
    else if (trxRes.data) {
      setPayments((trxRes.data as any[]).map(p => ({
        ...p, first_name: p.hr_employees?.first_name, last_name: p.hr_employees?.last_name,
      })))
    }
    setLoading(false)
  }

  React.useEffect(() => { load() }, [wsId])

  const activeEmployees = employees.filter(e => e.status === "active")
  const totalPayroll = payslips.filter(p => p.status !== "cancelled").reduce((s, p) => s + (p.net_pay || 0), 0)
  const totalPaid = payslips.filter(p => p.status === "paid").reduce((s, p) => s + (p.net_pay || 0), 0)
  const totalPending = payslips.filter(p => p.status === "approved").reduce((s, p) => s + (p.net_pay || 0), 0)
  const totalTransactions = payments.reduce((s, p) => s + (p.amount || 0), 0)

  const monthlyData = React.useMemo(() => {
    const map: Record<string, { label: string; payroll: number; paid: number }> = {}
    periods.filter(p => p.status === "completed").forEach(p => {
      const key = `${p.year}-${String(p.month).padStart(2, "0")}`
      if (!map[key]) map[key] = { label: p.label || key, payroll: 0, paid: 0 }
    })
    payslips.filter(p => p.status !== "cancelled").forEach(p => {
      const key = p.month && p.year ? `${p.year}-${String(p.month).padStart(2, "0")}` : null
      if (key && map[key]) map[key].payroll += (p.net_pay || 0)
      if (key && map[key] && p.status === "paid") map[key].paid += (p.net_pay || 0)
    })
    return Object.values(map).sort((a, b) => a.label.localeCompare(b.label)).slice(-12)
  }, [periods, payslips])

  const deptPayroll = React.useMemo(() => {
    const map: Record<string, number> = {}
    payslips.filter(p => p.status !== "cancelled").forEach(p => {
      const emp = employees.find(e => e.id === p.employee_id)
      const dept = emp?.position || "N/A"
      map[dept] = (map[dept] || 0) + (p.net_pay || 0)
    })
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [payslips, employees])

  const topEmployees = React.useMemo(() => {
    const map: Record<string, { name: string; total: number; count: number }> = {}
    payslips.filter(p => p.status !== "cancelled").forEach(p => {
      const key = p.employee_id
      if (!map[key]) map[key] = { name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || key, total: 0, count: 0 }
      map[key].total += (p.net_pay || 0)
      map[key].count++
    })
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 10)
  }, [payslips])

  const recentPayments = payments.filter(p => p.status === "completed").slice(0, 10)

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="size-8 animate-spin rounded-full border-2 border-brand border-t-transparent" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full bg-brand/10 p-2.5"><Users className="size-5 text-brand" /></div>
            <div><p className="text-xs text-muted-foreground">{fr ? "Employés actifs" : "Active employees"}</p><p className="text-xl font-bold">{activeEmployees.length}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full bg-success/10 p-2.5"><DollarSign className="size-5 text-success" /></div>
            <div><p className="text-xs text-muted-foreground">{fr ? "Masse salariale" : "Total payroll"}</p><p className="text-xl font-bold">{formatCurrency(totalPayroll)}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full bg-brand/10 p-2.5"><TrendingUp className="size-5 text-brand" /></div>
            <div><p className="text-xs text-muted-foreground">{fr ? "Payé" : "Paid"}</p><p className="text-xl font-bold">{formatCurrency(totalPaid)}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full bg-warning/10 p-2.5"><TrendingDown className="size-5 text-warning" /></div>
            <div><p className="text-xs text-muted-foreground">{fr ? "En attente" : "Pending"}</p><p className="text-xl font-bold">{formatCurrency(totalPending)}</p></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">{fr ? "Évolution de la paie" : "Payroll trend"}</CardTitle></CardHeader>
          <CardContent>
            {monthlyData.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">{fr ? "Aucune donnée" : "No data"}</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                  <Bar dataKey="payroll" name={fr ? "Paie" : "Payroll"} fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="paid" name={fr ? "Payé" : "Paid"} fill="#059669" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">{fr ? "Répartition par poste" : "By position"}</CardTitle></CardHeader>
          <CardContent>
            {deptPayroll.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">{fr ? "Aucune donnée" : "No data"}</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={deptPayroll} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {deptPayroll.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">{fr ? "Top employés (cumul paie)" : "Top employees (total pay)"}</CardTitle></CardHeader>
          <CardContent>
            {topEmployees.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">{fr ? "Aucune donnée" : "No data"}</div>
            ) : (
              <div className="space-y-2">
                {topEmployees.map((emp, i) => (
                  <div key={emp.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2"><span className="text-muted-foreground w-4">{i + 1}.</span>{emp.name}</span>
                    <span className="font-semibold">{formatCurrency(emp.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">{fr ? "Derniers paiements" : "Recent payments"}</CardTitle></CardHeader>
          <CardContent>
            {recentPayments.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">{fr ? "Aucun paiement" : "No payments"}</div>
            ) : (
              <div className="space-y-2">
                {recentPayments.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span>{p.first_name} {p.last_name}</span>
                    <div className="text-right"><span className="font-semibold">{formatCurrency(p.amount)}</span><span className="text-xs text-muted-foreground ml-2">{p.processed_at ? new Date(p.processed_at).toLocaleDateString() : ""}</span></div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
