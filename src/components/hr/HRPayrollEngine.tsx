import React from "react"
import { useLanguage } from "@/lib/i18n"
import { insforge } from "@/lib/supabase"
import { formatCurrency } from "@/lib/currency"
import { logAudit } from "@/lib/audit"
import { toast } from "sonner"
import { publishNotification, createHRPayslipNotification, createHRPayrollPeriodNotification, createHRPaymentNotification } from "@/lib/notifications"
import {
  DollarSign, Plus, Loader2, FileText, CreditCard, Calendar,
  CheckCircle, XCircle, BadgeCheck, Users
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"

interface HREmployee {
  id: string; workspace_id: string; first_name: string; last_name: string;
  position: string; salary: number; status: string; department_id?: string;
}
interface HRPayrollPeriod {
  id: string; workspace_id: string; month: number; year: number;
  label?: string; status: string; processed_at?: string; notes?: string;
}
interface HRPayslip {
  id: string; employee_id: string; period_id: string;
  base_salary: number; bonus: number; allowance: number; overtime: number;
  deduction: number; absence_deduction: number; late_deduction: number;
  advance_deduction: number; tax_deduction: number; social_contrib: number;
  net_pay: number; work_days: number; absent_days: number; late_days: number;
  payslip_number?: string; status: string; paid_at?: string;
  first_name?: string; last_name?: string; position?: string;
  month?: number; year?: number;
}
interface HRPaymentTransaction {
  id: string; employee_id: string; payslip_id?: string;
  amount: number; payment_method: string; reference?: string; notes?: string;
  status: string; processed_at?: string; created_at?: string;
  first_name?: string; last_name?: string;
}

interface Props {
  workspace: { id: string; owner_id?: string; name?: string } | null
  user?: { id: string; email?: string } | null
  employees: HREmployee[]
}

const t = (fr: boolean, frVal: string, enVal: string) => fr ? frVal : enVal

export function HRPayrollEngine({ workspace, user, employees }: Props) {
  const { lang } = useLanguage()
  const fr = lang === "fr"
  const wsId = workspace?.id

  const [periods, setPeriods] = React.useState<HRPayrollPeriod[]>([])
  const [payslips, setPayslips] = React.useState<HRPayslip[]>([])
  const [payments, setPayments] = React.useState<HRPaymentTransaction[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selPeriod, setSelPeriod] = React.useState("")
  const [processingPayroll, setProcessingPayroll] = React.useState(false)
  const [payDialog, setPayDialog] = React.useState(false)
  const [payEmpId, setPayEmpId] = React.useState("")
  const [payAmount, setPayAmount] = React.useState(0)
  const [payMethod, setPayMethod] = React.useState("cash")
  const [payRef, setPayRef] = React.useState("")
  const [payNotes, setPayNotes] = React.useState("")
  const [tab, setTab] = React.useState("periods")

  async function load() {
    if (!wsId) return
    setLoading(true)
    const [perRes, payRes, trxRes] = await Promise.all([
      insforge.database.from("hr_payroll_periods").select("*").eq("workspace_id", wsId).order("year", { ascending: false }).order("month", { ascending: false }),
      insforge.database.from("hr_payslips").select("*, hr_employees!inner(first_name,last_name,position), hr_payroll_periods!inner(month,year)").eq("workspace_id", wsId).order("created_at", { ascending: false }).limit(200),
      insforge.database.from("hr_payment_transactions").select("*, hr_employees!inner(first_name,last_name)").eq("workspace_id", wsId).order("created_at", { ascending: false }).limit(200),
    ])
    if (perRes.data) setPeriods(perRes.data)
    if (payRes.data) {
      setPayslips((payRes.data as any[]).map(p => ({
        ...p, first_name: p.hr_employees?.first_name, last_name: p.hr_employees?.last_name,
        position: p.hr_employees?.position, month: p.hr_payroll_periods?.month, year: p.hr_payroll_periods?.year,
      })))
    }
    if (trxRes.data) {
      setPayments((trxRes.data as any[]).map(p => ({
        ...p, first_name: p.hr_employees?.first_name, last_name: p.hr_employees?.last_name,
      })))
    }
    setLoading(false)
  }

  React.useEffect(() => { load() }, [wsId])

  async function createPeriod() {
    if (!wsId) return
    const now = new Date()
    const m = now.getMonth() + 1
    const y = now.getFullYear()
    const { error } = await insforge.database.from("hr_payroll_periods").upsert(
      [{ workspace_id: wsId, month: m, year: y, label: `${y}-${String(m).padStart(2, "0")}`, status: "draft" }],
      { onConflict: "workspace_id,month,year" }
    )
    if (error) { toast.error(error.message); return }
    await publishNotification(createHRPayrollPeriodNotification(wsId, user?.email || "Admin", `${y}-${String(m).padStart(2, "0")}`, "created", "hr"))
    await logAudit({ action: "create", workspace_id: wsId, actor_id: user?.id, actor_email: user?.email, metadata: { module: "hr", type: "payroll_period", month: m, year: y } })
    load()
  }

  async function processPayroll() {
    if (!wsId || !selPeriod) return
    setProcessingPayroll(true)
    const period = periods.find(p => p.id === selPeriod)
    if (!period) { setProcessingPayroll(false); return }
    const daysInMonth = new Date(period.year, period.month, 0).getDate()
    const activeEmp = employees.filter(e => e.status === "active")
    if (activeEmp.length === 0) { setProcessingPayroll(false); return }

    await insforge.database.from("hr_payroll_periods").update({ status: "processing" }).eq("id", selPeriod)

    for (const emp of activeEmp) {
      const salary = emp.salary || 0
      const net = Math.round(salary * 100) / 100
      const payslipNumber = `HR-SLIP-${period.year}${String(period.month).padStart(2, "0")}-${String(activeEmp.indexOf(emp) + 1).padStart(3, "0")}`
      const { error: upsertErr } = await insforge.database.from("hr_payslips").upsert(
        [{
          workspace_id: wsId, employee_id: emp.id, period_id: selPeriod,
          base_salary: salary, bonus: 0, allowance: 0, overtime: 0,
          deduction: 0, absence_deduction: 0, late_deduction: 0,
          advance_deduction: 0, tax_deduction: 0, social_contrib: 0,
          net_pay: Math.max(0, net), work_days: daysInMonth,
          absent_days: 0, late_days: 0, payslip_number: payslipNumber,
          status: "draft",
        }],
        { onConflict: "employee_id,period_id" }
      )
      if (upsertErr) toast.error(`${fr ? "Erreur bulletin" : "Payslip error"} ${emp.first_name} ${emp.last_name}: ${upsertErr.message}`)
    }

    await insforge.database.from("hr_payroll_periods").update({ status: "completed", processed_at: new Date().toISOString(), processed_by: user?.id || null }).eq("id", selPeriod)
    await publishNotification(createHRPayrollPeriodNotification(wsId, user?.email || "Admin", period.label || `${period.year}-${String(period.month).padStart(2, "0")}`, "completed", "hr"))
    await logAudit({ action: "create", workspace_id: wsId, actor_id: user?.id, actor_email: user?.email, metadata: { module: "hr", type: "payroll_processed", period_id: selPeriod } })
    setProcessingPayroll(false)
    load()
  }

  async function approvePayslip(id: string) {
    if (!wsId) return
    const { error } = await insforge.database.from("hr_payslips").update({ status: "approved", approved_by: user?.id || null, approved_at: new Date().toISOString() }).eq("id", id)
    if (error) { toast.error(error.message); return }
    const ps = payslips.find(p => p.id === id)
    if (ps) {
      await publishNotification(createHRPayslipNotification(wsId, `${ps.first_name} ${ps.last_name}`, ps.payslip_number || "", ps.net_pay, "hr"))
      await logAudit({ action: "update", workspace_id: wsId, actor_id: user?.id, actor_email: user?.email, metadata: { module: "hr", type: "payslip_approved", payslip_id: id } })
    }
    load()
  }

  async function markPaid(id: string) {
    if (!wsId) return
    const { error: slipErr } = await insforge.database.from("hr_payslips").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", id)
    if (slipErr) { toast.error(slipErr.message); return }
    const ps = payslips.find(p => p.id === id)
    if (ps) {
      const { error: trxErr } = await insforge.database.from("hr_payment_transactions").insert([{
        workspace_id: wsId, employee_id: ps.employee_id, payslip_id: id,
        amount: ps.net_pay, payment_method: "bank_transfer", status: "completed",
        processed_by: user?.id || null, processed_at: new Date().toISOString(),
      }])
      if (trxErr) { toast.error(trxErr.message); return }
      await logAudit({ action: "update", workspace_id: wsId, actor_id: user?.id, actor_email: user?.email, metadata: { module: "hr", type: "payslip_paid", payslip_id: id, amount: ps.net_pay } })
    }
    load()
  }

  async function savePayment() {
    if (!wsId || !payEmpId) return
    if (payAmount <= 0) { toast.error(fr ? "Montant invalide" : "Invalid amount"); return }
    const { error } = await insforge.database.from("hr_payment_transactions").insert([{
      workspace_id: wsId, employee_id: payEmpId, amount: payAmount,
      payment_method: payMethod, reference: payRef || null, notes: payNotes || null,
      status: "completed", processed_by: user?.id || null, processed_at: new Date().toISOString(),
    }])
    if (error) { toast.error(error.message); return }
    const emp = employees.find(e => e.id === payEmpId)
    await publishNotification(createHRPaymentNotification(wsId, user?.email || "Admin", emp ? `${emp.first_name} ${emp.last_name}` : "", payAmount, "hr"))
    await logAudit({ action: "create", workspace_id: wsId, actor_id: user?.id, actor_email: user?.email, metadata: { module: "hr", type: "payment_recorded", amount: payAmount } })
    setPayDialog(false)
    load()
  }

  async function cancelPeriod(id: string) {
    if (!wsId) return
    if (!confirm(fr ? "Annuler cette période de paie ? Cela annulera tous les bulletins associés." : "Cancel this payroll period? This will cancel all associated payslips.")) return
    const { error: perErr } = await insforge.database.from("hr_payroll_periods").update({ status: "cancelled" }).eq("id", id)
    if (perErr) { toast.error(perErr.message); return }
    await insforge.database.from("hr_payslips").update({ status: "cancelled" }).eq("period_id", id)
    const period = periods.find(p => p.id === id)
    if (period) {
      await publishNotification(createHRPayrollPeriodNotification(wsId, user?.email || "Admin", period.label || `${period.year}-${String(period.month).padStart(2, "0")}`, "cancelled", "hr"))
    }
    await logAudit({ action: "update", workspace_id: wsId, actor_id: user?.id, actor_email: user?.email, metadata: { module: "hr", type: "payroll_cancelled", period_id: id } })
    load()
  }

  const totalPayroll = payslips.filter(p => p.status !== "cancelled").reduce((s, p) => s + (p.net_pay || 0), 0)
  const paidAmount = payslips.filter(p => p.status === "paid").reduce((s, p) => s + (p.net_pay || 0), 0)
  const pendingAmount = payslips.filter(p => p.status === "approved").reduce((s, p) => s + (p.net_pay || 0), 0)

  if (!wsId) return <div className="flex h-24 items-center justify-center text-muted-foreground">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          [employees.filter(e => e.status === "active").length, fr ? "Employés actifs" : "Active employees"],
          [totalPayroll, fr ? "Masse salariale" : "Total payroll"],
          [paidAmount, fr ? "Payé" : "Paid"],
          [pendingAmount, fr ? "En attente" : "Pending"],
        ].map(([v, l]) => (
          <Card key={l as string}>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{l as string}</p>
              <p className="text-xl font-bold">{typeof v === "number" ? formatCurrency(v) : v}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap border-b border-border pb-3">
        <Button variant={tab === "periods" ? "default" : "outline"} size="sm" onClick={() => setTab("periods")}><Calendar className="size-4 mr-1" />{fr ? "Périodes" : "Periods"}</Button>
        <Button variant={tab === "payslips" ? "default" : "outline"} size="sm" onClick={() => setTab("payslips")}><FileText className="size-4 mr-1" />{fr ? "Bulletins" : "Payslips"}</Button>
        <Button variant={tab === "payments" ? "default" : "outline"} size="sm" onClick={() => setTab("payments")}><CreditCard className="size-4 mr-1" />{fr ? "Paiements" : "Payments"}</Button>
      </div>

      {tab === "periods" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <Button onClick={createPeriod} variant="outline" size="sm" className="gap-1.5"><Plus className="size-3.5" />{fr ? "Créer période" : "Create period"}</Button>
            <Select value={selPeriod} onValueChange={setSelPeriod}>
              <SelectTrigger className="w-44"><SelectValue placeholder={fr ? "Sélectionner période..." : "Select period..."} /></SelectTrigger>
              <SelectContent>
                {periods.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.label || `${p.year}-${String(p.month).padStart(2, "0")}`} — {p.status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={processPayroll} disabled={!selPeriod || processingPayroll} size="sm" className="gap-1.5">
              {processingPayroll ? <Loader2 className="size-3.5 animate-spin" /> : <DollarSign className="size-3.5" />}
              {fr ? "Générer les bulletins" : "Generate payslips"}
            </Button>
          </div>
          {loading ? <div className="flex h-24 items-center justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div> : (
            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{fr ? "Période" : "Period"}</TableHead>
                    <TableHead>{fr ? "Statut" : "Status"}</TableHead>
                    <TableHead>{fr ? "Traitée le" : "Processed"}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periods.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.label || `${p.year}-${String(p.month).padStart(2, "0")}`}</TableCell>
                      <TableCell>
                        <Badge variant={p.status === "completed" ? "secondary" : p.status === "cancelled" ? "destructive" : "outline"}>
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.processed_at ? new Date(p.processed_at).toLocaleDateString() : "—"}</TableCell>
                      <TableCell className="text-right">
                        {p.status !== "cancelled" && p.status !== "completed" && (
                          <Button variant="ghost" size="sm" onClick={() => cancelPeriod(p.id)}><XCircle className="size-3.5 text-destructive" /></Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {periods.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">{fr ? "Aucune période" : "No periods"}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {tab === "payslips" && (
        <div className="space-y-4">
          {loading ? <div className="flex h-24 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div> :
            payslips.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground"><FileText className="size-10" /><p>{fr ? "Aucun bulletin" : "No payslips"}</p></div>
            ) : (
              <div className="rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{fr ? "Employé" : "Employee"}</TableHead>
                      <TableHead>{fr ? "Bulletin" : "Payslip"}</TableHead>
                      <TableHead>{fr ? "Salaire base" : "Base salary"}</TableHead>
                      <TableHead>{fr ? "Net" : "Net"}</TableHead>
                      <TableHead>{fr ? "Statut" : "Status"}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payslips.map(ps => (
                      <TableRow key={ps.id}>
                        <TableCell className="font-medium">{ps.first_name} {ps.last_name}</TableCell>
                        <TableCell className="text-muted-foreground">{ps.payslip_number || "—"}</TableCell>
                        <TableCell>{formatCurrency(ps.base_salary || 0)}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(ps.net_pay || 0)}</TableCell>
                        <TableCell>
                          <Badge variant={ps.status === "paid" ? "secondary" : ps.status === "approved" ? "default" : ps.status === "cancelled" ? "destructive" : "outline"}>
                            {ps.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {ps.status === "draft" && (
                            <Button size="sm" variant="ghost" onClick={() => approvePayslip(ps.id)}><BadgeCheck className="size-3.5 text-success" /></Button>
                          )}
                          {ps.status === "approved" && (
                            <Button size="sm" variant="ghost" onClick={() => markPaid(ps.id)}><CheckCircle className="size-3.5 text-brand" /></Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
        </div>
      )}

      {tab === "payments" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setPayDialog(true)} size="sm" className="gap-1.5"><Plus className="size-3.5" />{fr ? "Enregistrer paiement" : "Record payment"}</Button>
          </div>
          {loading ? <div className="flex h-24 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div> :
            payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground"><CreditCard className="size-10" /><p>{fr ? "Aucun paiement" : "No payments"}</p></div>
            ) : (
              <div className="rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{fr ? "Employé" : "Employee"}</TableHead>
                      <TableHead>{fr ? "Montant" : "Amount"}</TableHead>
                      <TableHead>{fr ? "Méthode" : "Method"}</TableHead>
                      <TableHead>{fr ? "Référence" : "Reference"}</TableHead>
                      <TableHead>{fr ? "Date" : "Date"}</TableHead>
                      <TableHead>{fr ? "Statut" : "Status"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.first_name} {p.last_name}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(p.amount)}</TableCell>
                        <TableCell className="text-muted-foreground">{p.payment_method}</TableCell>
                        <TableCell className="text-muted-foreground">{p.reference || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{new Date(p.processed_at || p.created_at || "").toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant={p.status === "completed" ? "secondary" : p.status === "failed" ? "destructive" : "outline"}>{p.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
        </div>
      )}

      <Dialog open={payDialog} onOpenChange={setPayDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{fr ? "Enregistrer un paiement" : "Record payment"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{fr ? "Employé" : "Employee"}</Label>
              <Select value={payEmpId} onValueChange={setPayEmpId}>
                <SelectTrigger><SelectValue placeholder={fr ? "Sélectionner..." : "Select..."} /></SelectTrigger>
                <SelectContent>
                  {employees.filter(e => e.status === "active").map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{fr ? "Montant" : "Amount"}</Label>
              <Input type="number" value={payAmount} onChange={e => setPayAmount(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>{fr ? "Méthode" : "Method"}</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[{ v: "cash", l: fr ? "Espèces" : "Cash" }, { v: "bank_transfer", l: fr ? "Virement" : "Bank transfer" }, { v: "mobile_money", l: "Mobile money" }, { v: "check", l: "Chèque" }].map(o => (
                    <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{fr ? "Référence" : "Reference"}</Label>
              <Input value={payRef} onChange={e => setPayRef(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{fr ? "Notes" : "Notes"}</Label>
              <Input value={payNotes} onChange={e => setPayNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={savePayment} className="bg-brand text-brand-foreground hover:bg-brand/90">{fr ? "Enregistrer" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
