import { useState, useEffect, useMemo } from "react";
import { insforge } from "@/lib/supabase";
import { useLanguage } from "@/lib/i18n";
import { useRole } from "@/hooks/use-role";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { getCurrency } from "@/lib/currency";
import { Textarea } from "@/components/ui/textarea";
import { DialogFooterBrand } from "@/components/DialogFooterBrand";
import { Loader2, Plus, Search, Users, UserCheck, Calendar, DollarSign, FileText, CreditCard, BarChart3, Edit2, Trash2, Clock, CheckCircle, XCircle, Copy, Check } from "lucide-react";
import { formatCurrency, fetchExchangeRate } from "@/lib/currency";

type Employee = {
  id: string; workspace_id: string; first_name: string; last_name: string; middle_name?: string;
  gender?: string; photo_url?: string; birth_date?: string; address?: string; phone?: string;
  email?: string; function?: string; department?: string; employee_code?: string; hire_date?: string;
  contract_type?: string; base_salary?: number; bonus?: number; allowance?: number; deduction?: number;
  bank_name?: string; bank_account?: string; status?: string; created_at?: string; user_id?: string;
};
type Attendance = {
  id: string; employee_id: string; date: string; clock_in?: string; clock_out?: string;
  status: string; hours_worked?: number; late_minutes?: number; notes?: string; approved?: boolean;
  first_name?: string; last_name?: string;
};
type PayrollPeriod = { id: string; month: number; year: number; label?: string; processed?: boolean; processed_at?: string; };
type Payslip = {
  id: string; employee_id: string; period_id: string; base_salary: number; bonus: number;
  allowance: number; overtime: number; deduction: number; absence_deduction: number;
  late_deduction: number; advance_deduction: number; net_pay: number; work_days: number;
  absent_days: number; late_days: number; payslip_number?: string; paid?: boolean; paid_at?: string;
  first_name?: string; last_name?: string; function?: string; month?: number; year?: number;
};
type PaymentRecord = {
  id: string; employee_id: string; payslip_id?: string; amount: number; payment_method?: string;
  reference?: string; notes?: string; status?: string; paid_at?: string;
  first_name?: string; last_name?: string;
};

const defaultEmployee: Employee = {
  id: "", workspace_id: "", first_name: "", last_name: "", middle_name: "",
  gender: "M", birth_date: "", address: "", phone: "", email: "", function: "",
  department: "", employee_code: "", hire_date: "", contract_type: "permanent",
  base_salary: 0, bonus: 0, allowance: 0, deduction: 0, bank_name: "", bank_account: "", status: "active",
};

interface Props { workspace: { id: string; owner_id?: string; name?: string; type?: string } | null }

export default function PersonnelManager({ workspace }: Props) {
  const { lang } = useLanguage();
  const frLang = lang === "fr";
  const { role } = useRole();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [empSearch, setEmpSearch] = useState("");

  // Dialogs
  const [empDialog, setEmpDialog] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee>({ ...defaultEmployee });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newCreds, setNewCreds] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Attendance
  const [attDate, setAttDate] = useState(new Date().toISOString().split("T")[0]);
  const [attEmpId, setAttEmpId] = useState("");
  const [attClockIn, setAttClockIn] = useState("");
  const [attClockOut, setAttClockOut] = useState("");
  const [attStatus, setAttStatus] = useState("present");

  // Payroll
  const [selPeriod, setSelPeriod] = useState<string>("");
  const [processingPayroll, setProcessingPayroll] = useState(false);

  // Payments
  const [payDialog, setPayDialog] = useState(false);
  const [payEmpId, setPayEmpId] = useState("");
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState("cash");
  const [payRef, setPayRef] = useState("");

  // Reports
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());

  const wsId = workspace?.id;

  async function load() {
    if (!wsId) return;
    setLoading(true);
    const [empRes, attRes, perRes, payRes, histRes] = await Promise.all([
      insforge.database.from("staff_employees").select("*").eq("workspace_id", wsId).order("last_name"),
      insforge.database.from("staff_attendance").select("*").eq("workspace_id", wsId).order("date", { ascending: false }).limit(200),
      insforge.database.from("staff_payroll_periods").select("*").eq("workspace_id", wsId).order("year", { ascending: false }).order("month", { ascending: false }),
      insforge.database.from("staff_payslips").select("*, staff_employees!inner(first_name,last_name,function), staff_payroll_periods!inner(month,year)").eq("workspace_id", wsId).order("created_at", { ascending: false }).limit(200),
      insforge.database.from("staff_payment_history").select("*, staff_employees!inner(first_name,last_name)").eq("workspace_id", wsId).order("created_at", { ascending: false }).limit(200),
    ]);
    if (empRes.data) setEmployees(empRes.data);
    if (attRes.data) setAttendance(attRes.data as Attendance[]);
    if (perRes.data) setPeriods(perRes.data);
    if (payRes.data) {
      setPayslips((payRes.data as any[]).map(p => ({
        ...p, first_name: p.staff_employees?.first_name, last_name: p.staff_employees?.last_name,
        function: p.staff_employees?.function, month: p.staff_payroll_periods?.month, year: p.staff_payroll_periods?.year,
      })));
    }
    if (histRes.data) {
      setPayments((histRes.data as any[]).map(p => ({
        ...p, first_name: p.staff_employees?.first_name, last_name: p.staff_employees?.last_name,
      })));
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [wsId]);
  useEffect(() => { fetchExchangeRate(); }, []);

  const filteredEmployees = useMemo(() => {
    if (!empSearch) return employees;
    const s = empSearch.toLowerCase();
    return employees.filter(e => `${e.first_name} ${e.last_name}`.toLowerCase().includes(s) || e.function?.toLowerCase().includes(s) || e.department?.toLowerCase().includes(s));
  }, [employees, empSearch]);

  // ── Employee CRUD ──
  function openAdd() { setEditingEmp({ ...defaultEmployee, workspace_id: wsId }); setEmpDialog(true); }
  function openEdit(e: Employee) { setEditingEmp({ ...e }); setEmpDialog(true); }

  function generatePassword(): string {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*";
    let pwd = "S";
    const randomValues = new Uint8Array(15);
    crypto.getRandomValues(randomValues);
    for (let i = 0; i < 15; i++) {
      pwd += chars.charAt(randomValues[i] % chars.length);
    }
    return pwd;
  }

  async function saveEmployee() {
    if (!wsId) return;
    const payload = { ...editingEmp };
    if (payload.id) {
      const { error } = await insforge.database.from("staff_employees").update(payload).eq("id", payload.id).eq("workspace_id", wsId);
      if (error) { toast.error(error.message); return; }
      toast.success(frLang ? "Employé modifié" : "Employee updated");
      setEmpDialog(false);
      load();
      return;
    }
    // New employee: create auth account via raw fetch (avoids replacing owner session)
    if (!payload.email) {
      toast.error(frLang ? "L'email est requis" : "Email is required");
      return;
    }
    const password = generatePassword();
    const fullName = `${payload.first_name} ${payload.last_name}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      let res: Response;
      try {
        res = await fetch(`${import.meta.env.VITE_INSFORGE_URL}/api/auth/users`, {
          method: "POST",
          headers: {
            apikey: import.meta.env.VITE_INSFORGE_ANON_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_INSFORGE_ANON_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: payload.email,
            password,
            name: fullName,
          }),
          signal: controller.signal,
        });
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        if (fetchErr.name === "AbortError") {
          toast.error(frLang ? "Délai dépassé. Vérifiez votre connexion." : "Timed out. Check your connection.");
        } else {
          toast.error(frLang ? "Erreur réseau" : "Network error");
        }
        return;
      }
      clearTimeout(timeoutId);

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = json?.msg || json?.message || json?.error_description || json?.error || `HTTP ${res.status}`;
        if (msg.includes("already")) {
          toast.error(frLang ? "Un compte avec cet email existe déjà" : "An account with this email already exists");
        } else {
          toast.error(msg);
        }
        return;
      }

      const userId = json?.user?.id ?? json?.id ?? null;
      if (!userId) {
        toast.error(frLang ? "Réponse invalide du serveur" : "Invalid server response");
        return;
      }

      const { error: memberErr } = await insforge.database.from("workspace_members").insert([{
        workspace_id: wsId, user_id: userId, owner_id: workspace?.owner_id,
        role: "employee", status: "active", email: payload.email,
        display_name: fullName,
        invited_at: new Date().toISOString(), accepted_at: new Date().toISOString(),
      }]);
      if (memberErr) { toast.error(memberErr.message); return; }
      const { error: empErr } = await insforge.database.from("staff_employees").insert([{ ...payload, user_id: userId }]);
      if (empErr) { toast.error(empErr.message); return; }
      import("@/lib/stats").then(({ invalidateStatsCache }) => invalidateStatsCache())
      setNewCreds({ email: payload.email, password });
      toast.success(frLang ? "Employé ajouté" : "Employee added");
      setEmpDialog(false);
      load();
    } catch (err: any) {
      toast.error(err?.message || (frLang ? "Erreur inattendue" : "Unexpected error"));
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    const { error } = await insforge.database.from("staff_employees").delete().eq("id", deleteId).eq("workspace_id", wsId);
    if (error) { toast.error(error.message); return; }
    toast.success(frLang ? "Employé supprimé" : "Employee deleted");
    setDeleteId(null);
    load();
  }

  async function copyCredentials() {
    if (!newCreds) return;
    const text = `SaveMali - Identifiants de connexion\n\nEmail : ${newCreds.email}\nMot de passe : ${newCreds.password}\n\nConnectez-vous sur www.savemali.online`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Attendance ──
  async function saveAttendance() {
    if (!wsId || !attEmpId) return;
    const { error } = await insforge.database.from("staff_attendance").upsert(
      [{ workspace_id: wsId, employee_id: attEmpId, date: attDate, clock_in: attClockIn || null, clock_out: attClockOut || null, status: attStatus }],
      { onConflict: "employee_id,date" }
    );
    if (error) { toast.error(error.message); return; }
    toast.success(frLang ? "Présence enregistrée" : "Attendance saved");
    load();
  }

  // ── Payroll ──
  async function createPeriod() {
    if (!wsId) return;
    const now = new Date();
    const m = now.getMonth() + 1;
    const y = now.getFullYear();
    const { error } = await insforge.database.from("staff_payroll_periods").upsert(
      [{ workspace_id: wsId, month: m, year: y, label: `${y}-${String(m).padStart(2, "0")}` }],
      { onConflict: "workspace_id,month,year" }
    );
    if (error) { toast.error(error.message); return; }
    toast.success(frLang ? "Période créée" : "Period created");
    load();
  }

  async function processPayroll() {
    if (!wsId || !selPeriod) return;
    setProcessingPayroll(true);
    const period = periods.find(p => p.id === selPeriod);
    if (!period) return;
    const daysInMonth = new Date(period.year, period.month, 0).getDate();

    const { data: activeEmp } = await insforge.database.from("staff_employees").select("*").eq("workspace_id", wsId).eq("status", "active");
    if (!activeEmp) { setProcessingPayroll(false); return; }

    const { data: attData } = await insforge.database.from("staff_attendance").select("*")
      .eq("workspace_id", wsId)
      .gte("date", `${period.year}-${String(period.month).padStart(2, "0")}-01`)
      .lte("date", `${period.year}-${String(period.month).padStart(2, "0")}-${daysInMonth}`);

    for (const emp of activeEmp) {
      const empAtt = (attData || []).filter(a => a.employee_id === emp.id);
      const absentDays = empAtt.filter(a => a.status === "absent").length;
      const lateDays = empAtt.filter(a => a.status === "late").length;
      const workDays = empAtt.filter(a => a.status === "present" || a.status === "permission").length;
      const dayRate = daysInMonth > 0 ? Math.round(((emp.base_salary || 0) / daysInMonth) * 100) / 100 : 0;
      const absenceDed = Math.round(absentDays * dayRate * 100) / 100;
      const lateDed = Math.round(lateDays * (dayRate * 0.25) * 100) / 100;
      const net = Math.round(((emp.base_salary || 0) + (emp.bonus || 0) + (emp.allowance || 0) - (emp.deduction || 0) - absenceDed - lateDed) * 100) / 100;

      const payslipNumber = `SLIP-${period.year}${String(period.month).padStart(2, "0")}-${String(activeEmp.indexOf(emp) + 1).padStart(3, "0")}`;
      await insforge.database.from("staff_payslips").upsert(
        [{
          workspace_id: wsId, employee_id: emp.id, period_id: selPeriod,
          base_salary: emp.base_salary || 0, bonus: emp.bonus || 0, allowance: emp.allowance || 0,
          deduction: emp.deduction || 0, overtime: 0, absence_deduction: absenceDed,
          late_deduction: lateDed, advance_deduction: 0, net_pay: Math.max(0, net),
          work_days: workDays, absent_days: absentDays, late_days: lateDays, payslip_number: payslipNumber,
        }],
        { onConflict: "employee_id,period_id" }
      );
    }

    await insforge.database.from("staff_payroll_periods").update({ processed: true, processed_at: new Date().toISOString() }).eq("id", selPeriod).eq("workspace_id", wsId);
    toast.success(frLang ? "Paie traitée" : "Payroll processed");
    setProcessingPayroll(false);
    load();
  }

  // ── Payments ──
  async function savePayment() {
    if (!wsId || !payEmpId) return;
    const { error } = await insforge.database.from("staff_payment_history").insert([{
      workspace_id: wsId, employee_id: payEmpId, amount: payAmount,
      payment_method: payMethod, reference: payRef || null, status: "completed",
    }]);
    if (error) { toast.error(error.message); return; }
    toast.success(frLang ? "Paiement enregistré" : "Payment recorded");
    setPayDialog(false);
    load();
  }

  // ── Reports helpers ──
  const totalPayroll = Math.round(payslips.filter(p => p.month === reportMonth && p.year === reportYear).reduce((s, p) => s + (p.net_pay || 0), 0) * 100) / 100;
  const activeCount = employees.filter(e => e.status === "active").length;
  const presentToday = attendance.filter(a => a.date === new Date().toISOString().split("T")[0] && a.status === "present").length;

  const t = (en: string, frStr: string) => frLang ? frStr : en;
  const currency = getCurrency();

  if (!wsId) return <div className="flex h-24 items-center justify-center text-muted-foreground">Loading workspace...</div>;

  return (
    <div>
      {/* Mini dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          [activeCount, t("Active staff", "Personnel actif")],
          [employees.length, t("Total staff", "Total personnel")],
          [presentToday, t("Present today", "Présents aujourd'hui")],
          [formatCurrency(totalPayroll), t("Month payroll", "Masse salariale")],
        ].map(([v, l]) => (
          <div key={l as string} className="rounded-xl bg-card border border-border p-3">
            <p className="text-xs text-muted-foreground">{l as string}</p>
            <p className="text-xl font-bold">{v}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="personnel">
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="personnel"><Users className="size-4 mr-1.5" />{t("Personnel", "Personnel")}</TabsTrigger>
          <TabsTrigger value="attendance"><Calendar className="size-4 mr-1.5" />{t("Attendance", "Présences")}</TabsTrigger>
          <TabsTrigger value="payroll"><DollarSign className="size-4 mr-1.5" />{t("Payroll", "Paie")}</TabsTrigger>
          <TabsTrigger value="payslips"><FileText className="size-4 mr-1.5" />{t("Payslips", "Bulletins")}</TabsTrigger>
          <TabsTrigger value="payments"><CreditCard className="size-4 mr-1.5" />{t("Payments", "Paiements")}</TabsTrigger>
          <TabsTrigger value="reports"><BarChart3 className="size-4 mr-1.5" />{t("Reports", "Rapports")}</TabsTrigger>
        </TabsList>

        {/* ═══════════ PERSONNEL TAB ═══════════ */}
        <TabsContent value="personnel">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input value={empSearch} onChange={e => setEmpSearch(e.target.value)} placeholder={t("Search...", "Rechercher...")} className="pl-9" />
            </div>
            <Button onClick={openAdd} className="gap-1.5 bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="size-4" />{t("Add employee", "Ajouter un employé")}</Button>
          </div>

          {loading ? <div className="flex h-24 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div> :
            filteredEmployees.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground"><Users className="size-10" /><p>{t("No employees", "Aucun employé")}</p><Button variant="outline" size="sm" onClick={openAdd}><Plus className="size-3.5 mr-1" />{t("Add", "Ajouter")}</Button></div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>{[t("Name", "Nom"), t("Function", "Fonction"), t("Department", "Département"), t("Contract", "Contrat"), t("Salary", "Salaire"), "Status", ""].map(h => <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredEmployees.map(e => (
                      <tr key={e.id} className="bg-card hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{e.first_name} {e.last_name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{e.function || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{e.department || "—"}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs">
                            {e.contract_type === "permanent" ? "CDI" : e.contract_type === "fixed-term" ? "CDD" : e.contract_type === "intern" ? "Stage" : "Temporaire"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{e.base_salary ? formatCurrency(e.base_salary) : "—"}</td>
                        <td className="px-4 py-3"><Badge variant={e.status === "active" ? "secondary" : e.status === "suspended" ? "outline" : "destructive"}>{e.status}</Badge></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5 justify-end">
                            {role === "admin" && (
                              <>
                                <Button size="icon" variant="ghost" className="size-7" onClick={() => openEdit(e)}><Edit2 className="size-3.5" /></Button>
                                <Button size="icon" variant="ghost" className="size-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(e.id)}><Trash2 className="size-3.5" /></Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </TabsContent>

        {/* ═══════════ ATTENDANCE TAB ═══════════ */}
        <TabsContent value="attendance">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Clock in/out form */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-4">
              <h3 className="font-semibold flex items-center gap-2"><Clock className="size-4" />{t("Record attendance", "Enregistrer présence")}</h3>
              <div className="space-y-2">
                <Label>{t("Date", "Date")}</Label>
                <Input type="date" value={attDate} onChange={e => setAttDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("Employee", "Employé")}</Label>
                <Select value={attEmpId} onValueChange={setAttEmpId}>
                  <SelectTrigger><SelectValue placeholder={t("Select...", "Sélectionner...")} /></SelectTrigger>
                  <SelectContent>
                    {employees.filter(e => e.status === "active").map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name} — {e.function || ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">{t("Clock in", "Entrée")}</Label>
                  <Input type="time" value={attClockIn} onChange={e => setAttClockIn(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("Clock out", "Sortie")}</Label>
                  <Input type="time" value={attClockOut} onChange={e => setAttClockOut(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("Status", "Statut")}</Label>
                <Select value={attStatus} onValueChange={setAttStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[{ v: "present", l: t("Present", "Présent") }, { v: "absent", l: t("Absent", "Absent") }, { v: "late", l: t("Late", "Retard") }, { v: "leave", l: t("Leave", "Congé") }, { v: "permission", l: t("Permission", "Permission") }].map(o => (
                      <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={saveAttendance} className="w-full gap-1.5"><CheckCircle className="size-4" />{t("Save", "Enregistrer")}</Button>
            </div>

            {/* Today's attendance list */}
            <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 space-y-3">
              <h3 className="font-semibold">{t("Today's attendance", "Présences du jour")} — {attDate}</h3>
              {loading ? <div className="flex h-24 items-center justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div> :
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30">
                      <tr><th className="px-3 py-2 text-left font-medium text-muted-foreground">{t("Name", "Nom")}</th><th className="px-3 py-2 text-left">{t("IN", "Entrée")}</th><th className="px-3 py-2 text-left">{t("OUT", "Sortie")}</th><th className="px-3 py-2 text-left">{t("Status", "Statut")}</th><th className="px-3 py-2 text-left">{t("Hours", "Heures")}</th></tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {attendance.filter(a => a.date === attDate).map(a => {
                        const emp = employees.find(e => e.id === a.employee_id);
                        return (
                          <tr key={a.id}>
                            <td className="px-3 py-2 font-medium">{emp ? `${emp.first_name} ${emp.last_name}` : "—"}</td>
                            <td className="px-3 py-2 text-muted-foreground">{a.clock_in ? new Date(a.clock_in).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                            <td className="px-3 py-2 text-muted-foreground">{a.clock_out ? new Date(a.clock_out).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                            <td className="px-3 py-2"><Badge variant={a.status === "present" ? "secondary" : a.status === "late" ? "outline" : "destructive"}>{a.status}</Badge></td>
                            <td className="px-3 py-2 text-muted-foreground">{a.hours_worked ? `${a.hours_worked}h` : "—"}</td>
                          </tr>
                        );
                      })}
                      {attendance.filter(a => a.date === attDate).length === 0 && (
                        <tr><td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">{t("No records", "Aucun enregistrement")}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              }
            </div>
          </div>
        </TabsContent>

        {/* ═══════════ PAYROLL TAB ═══════════ */}
        <TabsContent value="payroll">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex gap-2 items-center">
                <Button onClick={createPeriod} variant="outline" size="sm" className="gap-1.5"><Plus className="size-3.5" />{t("Create period", "Créer période")}</Button>
                <Select value={selPeriod} onValueChange={setSelPeriod}>
                  <SelectTrigger className="w-44"><SelectValue placeholder={t("Select period...", "Sélectionner période...")} /></SelectTrigger>
                  <SelectContent>
                    {periods.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.label || `${p.year}-${String(p.month).padStart(2, "0")}`} {p.processed ? `✅` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={processPayroll} disabled={!selPeriod || processingPayroll} size="sm" className="gap-1.5">
                  {processingPayroll ? <Loader2 className="size-3.5 animate-spin" /> : <DollarSign className="size-3.5" />}
                  {t("Process payroll", "Traiter la paie")}
                </Button>
              </div>
            </div>

            {loading ? <div className="flex h-24 items-center justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div> :
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr><th className="px-4 py-3 text-left">{t("Période", "Période")}</th><th className="px-4 py-3 text-left">{t("Processed", "Traitée")}</th><th className="px-4 py-3 text-left">{t("Date", "Date")}</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {periods.map(p => (
                      <tr key={p.id} className="bg-card hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{p.label || `${p.year}-${String(p.month).padStart(2, "0")}`}</td>
                        <td className="px-4 py-3">{p.processed ? <Badge variant="secondary">{t("Yes", "Oui")}</Badge> : <Badge variant="outline">{t("No", "Non")}</Badge>}</td>
                        <td className="px-4 py-3 text-muted-foreground">{p.processed_at ? new Date(p.processed_at).toLocaleDateString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            }
          </div>
        </TabsContent>

        {/* ═══════════ PAYSLIPS TAB ═══════════ */}
        <TabsContent value="payslips">
          {loading ? <div className="flex h-24 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div> :
            payslips.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground"><FileText className="size-10" /><p>{t("No payslips yet", "Aucun bulletin encore")}</p></div>
            ) : (
              <div className="space-y-3">
                {payslips.map(ps => {
                  const e = employees.find(emp => emp.id === ps.employee_id);
                  return (
                    <div key={ps.id} className="rounded-xl border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">{ps.first_name || e?.first_name} {ps.last_name || e?.last_name}</p>
                        <p className="text-xs text-muted-foreground">{ps.function || e?.function || ""} — {ps.payslip_number || ""}</p>
                        <p className="text-xs text-muted-foreground">{ps.month}/{ps.year || ""}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{formatCurrency(ps.net_pay || 0)}</p>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          <span>{t("Base", "Base")}: {formatCurrency(ps.base_salary || 0)}</span>
                          <span>{t("Ded.", "Déduc.")}: {formatCurrency((ps.deduction || 0) + (ps.absence_deduction || 0) + (ps.late_deduction || 0) + (ps.advance_deduction || 0))}</span>
                        </div>
                      </div>
                      <Badge variant={ps.paid ? "secondary" : "outline"}>{ps.paid ? t("Paid", "Payé") : t("Unpaid", "Impayé")}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
        </TabsContent>

        {/* ═══════════ PAYMENTS TAB ═══════════ */}
        <TabsContent value="payments">
          <div className="flex justify-between mb-4">
            <h3 className="font-semibold">{t("Payment history", "Historique des paiements")}</h3>
            <Dialog open={payDialog} onOpenChange={setPayDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5"><Plus className="size-3.5" />{t("Record payment", "Enregistrer paiement")}</Button>
              </DialogTrigger>
              <DialogContent className="ag-dialog max-w-md p-0">
                <DialogHeader className="px-6 pt-5 pb-0">
                  <DialogTitle className="text-foreground">{t("Record payment", "Enregistrer un paiement")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 px-6 py-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-foreground">{t("Employee", "Employé")}</Label>
                    <Select value={payEmpId} onValueChange={setPayEmpId}>
                      <SelectTrigger className="h-10 rounded-lg"><SelectValue placeholder={t("Select...", "Sélectionner...")} /></SelectTrigger>
                      <SelectContent>{employees.filter(e => e.status === "active").map(e => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-foreground">{t("Amount", "Montant")}</Label>
                    <Input type="number" value={payAmount} onChange={e => setPayAmount(Number(e.target.value))} className="h-10 rounded-lg" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-foreground">{t("Method", "Méthode")}</Label>
                    <Select value={payMethod} onValueChange={setPayMethod}>
                      <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
                      <SelectContent>{[{ v: "cash", l: t("Cash", "Espèces") }, { v: "bank_transfer", l: t("Bank transfer", "Virement") }, { v: "mobile_money", l: t("Mobile money", "Mobile money") }, { v: "check", l: "Chèque" }].map(o => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-foreground">{t("Reference", "Référence")}</Label>
                    <Input value={payRef} onChange={e => setPayRef(e.target.value)} className="h-10 rounded-lg" />
                  </div>
                </div>
                <DialogFooter className="px-6 py-4 border-t border-border/50">
                  <Button onClick={savePayment} className="bg-brand text-brand-foreground hover:bg-brand/90">{t("Save", "Enregistrer")}</Button>
                </DialogFooter>
                <DialogFooterBrand />
              </DialogContent>
            </Dialog>
          </div>

          {loading ? <div className="flex h-24 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div> :
            payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground"><CreditCard className="size-10" /><p>{t("No payments", "Aucun paiement")}</p></div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr><th className="px-4 py-3 text-left">{t("Employee", "Employé")}</th><th className="px-4 py-3 text-left">{t("Amount", "Montant")}</th><th className="px-4 py-3 text-left">{t("Method", "Méthode")}</th><th className="px-4 py-3 text-left">{t("Reference", "Référence")}</th><th className="px-4 py-3 text-left">{t("Date", "Date")}</th><th className="px-4 py-3 text-left">Status</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {payments.map(p => (
                      <tr key={p.id} className="bg-card hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{p.first_name} {p.last_name}</td>
                        <td className="px-4 py-3 font-semibold">{formatCurrency(p.amount)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{p.payment_method}</td>
                        <td className="px-4 py-3 text-muted-foreground">{p.reference || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{new Date(p.paid_at || p.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3"><Badge variant={p.status === "completed" ? "secondary" : p.status === "failed" ? "destructive" : "outline"}>{p.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </TabsContent>

        {/* ═══════════ REPORTS TAB ═══════════ */}
        <TabsContent value="reports">
          <div className="space-y-6">
            <div className="flex gap-2 items-center">
              <Label>{t("Month", "Mois")}</Label>
              <Select value={String(reportMonth)} onValueChange={v => setReportMonth(Number(v))}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>{Array.from({ length: 12 }, (_, i) => i + 1).map(m => <SelectItem key={m} value={String(m)}>{String(m).padStart(2, "0")}</SelectItem>)}</SelectContent>
              </Select>
              <Label>{t("Year", "Année")}</Label>
              <Input type="number" value={reportYear} onChange={e => setReportYear(Number(e.target.value))} className="w-20" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">{t("Total payroll", "Masse salariale")}</p>
                <p className="text-2xl font-bold">{formatCurrency(totalPayroll)}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">{t("Active employees", "Employés actifs")}</p>
                <p className="text-2xl font-bold">{activeCount}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">{t("Avg salary", "Salaire moyen")}</p>
                <p className="text-2xl font-bold">{activeCount > 0 ? formatCurrency(Math.round((totalPayroll / activeCount) * 100) / 100) : 0}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">{t("Payslips", "Bulletins")}</p>
                <p className="text-2xl font-bold">{payslips.filter(p => p.month === reportMonth && p.year === reportYear).length}</p>
              </div>
            </div>

            {/* Per-employee breakdown */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="font-semibold mb-3">{t("Employee breakdown", "Détail par employé")}</h3>
              {loading ? <div className="flex h-24 items-center justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div> :
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30">
                      <tr><th className="px-3 py-2 text-left">{t("Name", "Nom")}</th><th className="px-3 py-2 text-left">{t("Base", "Base")}</th><th className="px-3 py-2 text-left">Bonus</th><th className="px-3 py-2 text-left">{t("Allowance", "Indemnité")}</th><th className="px-3 py-2 text-left">{t("Deductions", "Déductions")}</th><th className="px-3 py-2 text-left">{t("Net", "Net")}</th><th className="px-3 py-2 text-left">{t("Days", "Jours")}</th></tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {payslips.filter(p => p.month === reportMonth && p.year === reportYear).map(ps => (
                        <tr key={ps.id}>
                          <td className="px-3 py-2 font-medium">{ps.first_name} {ps.last_name}</td>
                          <td className="px-3 py-2">{formatCurrency(ps.base_salary || 0)}</td>
                          <td className="px-3 py-2">{formatCurrency(ps.bonus || 0)}</td>
                          <td className="px-3 py-2">{formatCurrency(ps.allowance || 0)}</td>
                          <td className="px-3 py-2">{formatCurrency((ps.deduction || 0) + (ps.absence_deduction || 0) + (ps.late_deduction || 0) + (ps.advance_deduction || 0))}</td>
                          <td className="px-3 py-2 font-semibold">{formatCurrency(ps.net_pay || 0)}</td>
                          <td className="px-3 py-2 text-muted-foreground">{ps.work_days || 0}/{ps.absent_days || 0}/{ps.late_days || 0}</td>
                        </tr>
                      ))}
                      {payslips.filter(p => p.month === reportMonth && p.year === reportYear).length === 0 && (
                        <tr><td colSpan={7} className="px-3 py-4 text-center text-muted-foreground">{t("No payslips for this period", "Aucun bulletin pour cette période")}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              }
            </div>

            {/* Export buttons */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => {
                const csv = [
                  [t("Name", "Nom"), t("Net", "Net"), t("Base", "Base"), t("Bon.", "Bon."), t("Allow.", "Indem."), t("Ded.", "Déduc.")].join(","),
                  ...payslips.filter(p => p.month === reportMonth && p.year === reportYear).map(ps =>
                    [`${ps.first_name} ${ps.last_name}`, ps.net_pay, ps.base_salary, ps.bonus, ps.allowance, (ps.deduction || 0) + (ps.absence_deduction || 0) + (ps.late_deduction || 0)].join(",")
                  )
                ].join("\n");
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `paie_${reportYear}_${reportMonth}.csv`; link.click();
              }}>{t("Export CSV", "Exporter CSV")}</Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ═══ Employee Dialog ═══ */}
      <Dialog open={empDialog} onOpenChange={setEmpDialog}>
        <DialogContent className="max-w-2xl ag-dialog p-0">
          <DialogHeader className="px-6 pt-5 pb-0">
            <DialogTitle className="text-foreground">{editingEmp.id ? t("Edit employee", "Modifier employé") : t("Add employee", "Ajouter employé")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 py-4 flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">{t("First name*", "Prénom*")}</Label>
                <Input value={editingEmp.first_name} onChange={e => setEditingEmp({ ...editingEmp, first_name: e.target.value })} className="h-10 rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">{t("Last name*", "Nom*")}</Label>
                <Input value={editingEmp.last_name} onChange={e => setEditingEmp({ ...editingEmp, last_name: e.target.value })} className="h-10 rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">{t("Middle name", "Deuxième prénom")}</Label>
                <Input value={editingEmp.middle_name || ""} onChange={e => setEditingEmp({ ...editingEmp, middle_name: e.target.value })} className="h-10 rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">{t("Gender", "Genre")}</Label>
                <Select value={editingEmp.gender || "M"} onValueChange={v => setEditingEmp({ ...editingEmp, gender: v })}>
                  <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="M">{t("Male", "Masculin")}</SelectItem><SelectItem value="F">{t("Female", "Féminin")}</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">{t("Birth date", "Date naissance")}</Label>
                <Input type="date" value={editingEmp.birth_date || ""} onChange={e => setEditingEmp({ ...editingEmp, birth_date: e.target.value })} className="h-10 rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">{t("Phone", "Téléphone")}</Label>
                <Input value={editingEmp.phone || ""} onChange={e => setEditingEmp({ ...editingEmp, phone: e.target.value })} className="h-10 rounded-lg" />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-sm font-medium text-foreground">Email</Label>
                <Input type="email" value={editingEmp.email || ""} onChange={e => setEditingEmp({ ...editingEmp, email: e.target.value })} className="h-10 rounded-lg" />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-sm font-medium text-foreground">{t("Address", "Adresse")}</Label>
                <Input value={editingEmp.address || ""} onChange={e => setEditingEmp({ ...editingEmp, address: e.target.value })} className="h-10 rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">{t("Function", "Fonction")}</Label>
                <Input value={editingEmp.function || ""} onChange={e => setEditingEmp({ ...editingEmp, function: e.target.value })} className="h-10 rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">{t("Department", "Département")}</Label>
                <Input value={editingEmp.department || ""} onChange={e => setEditingEmp({ ...editingEmp, department: e.target.value })} className="h-10 rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">{t("Employee code", "Code employé")}</Label>
                <Input value={editingEmp.employee_code || ""} onChange={e => setEditingEmp({ ...editingEmp, employee_code: e.target.value })} className="h-10 rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">{t("Contract type", "Type contrat")}</Label>
                <Select value={editingEmp.contract_type || "permanent"} onValueChange={v => setEditingEmp({ ...editingEmp, contract_type: v })}>
                  <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="permanent">CDI</SelectItem><SelectItem value="fixed-term">CDD</SelectItem><SelectItem value="intern">{t("Intern", "Stage")}</SelectItem><SelectItem value="temporary">{t("Temporary", "Temporaire")}</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">{t("Hire date", "Date embauche")}</Label>
                <Input type="date" value={editingEmp.hire_date?.split("T")[0] || ""} onChange={e => setEditingEmp({ ...editingEmp, hire_date: e.target.value })} className="h-10 rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">{t("Status", "Statut")}</Label>
                <Select value={editingEmp.status || "active"} onValueChange={v => setEditingEmp({ ...editingEmp, status: v })}>
                  <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="active">{t("Active", "Actif")}</SelectItem><SelectItem value="suspended">{t("Suspended", "Suspendu")}</SelectItem><SelectItem value="inactive">{t("Inactive", "Inactif")}</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="border-t border-border pt-3 sm:col-span-2">
                <h4 className="font-medium mb-3 text-foreground">{t("Salary & Bank", "Salaire & Banque")}</h4>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">{t("Base salary", "Salaire base")}</Label>
                <Input type="number" value={editingEmp.base_salary || 0} onChange={e => setEditingEmp({ ...editingEmp, base_salary: Number(e.target.value) })} className="h-10 rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">{t("Bonus", "Prime")}</Label>
                <Input type="number" value={editingEmp.bonus || 0} onChange={e => setEditingEmp({ ...editingEmp, bonus: Number(e.target.value) })} className="h-10 rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">{t("Allowance", "Indemnité")}</Label>
                <Input type="number" value={editingEmp.allowance || 0} onChange={e => setEditingEmp({ ...editingEmp, allowance: Number(e.target.value) })} className="h-10 rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">{t("Deduction", "Retenue")}</Label>
                <Input type="number" value={editingEmp.deduction || 0} onChange={e => setEditingEmp({ ...editingEmp, deduction: Number(e.target.value) })} className="h-10 rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">{t("Bank name", "Banque")}</Label>
                <Input value={editingEmp.bank_name || ""} onChange={e => setEditingEmp({ ...editingEmp, bank_name: e.target.value })} className="h-10 rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">{t("Bank account", "Compte bancaire")}</Label>
                <Input value={editingEmp.bank_account || ""} onChange={e => setEditingEmp({ ...editingEmp, bank_account: e.target.value })} className="h-10 rounded-lg" />
              </div>
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border/50">
            <Button onClick={saveEmployee} className="bg-brand text-brand-foreground hover:bg-brand/90">{t("Save", "Enregistrer")}</Button>
          </DialogFooter>
          <DialogFooterBrand />
        </DialogContent>
      </Dialog>

      {/* ═══ Delete confirmation ═══ */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm ag-dialog p-0">
          <DialogHeader className="px-6 pt-5 pb-0">
            <DialogTitle className="text-foreground">{t("Confirm delete", "Confirmer suppression")}</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-4">
            <p className="text-sm text-muted-foreground">{t("Are you sure? This action cannot be undone.", "Êtes-vous sûr ? Cette action est irréversible.")}</p>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border/50">
            <Button variant="destructive" onClick={confirmDelete}>{t("Delete", "Supprimer")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ New employee credentials ═══ */}
      <Dialog open={!!newCreds} onOpenChange={() => { setNewCreds(null); setCopied(false) }}>
        <DialogContent className="max-w-sm ag-dialog p-0">
          <DialogHeader className="px-6 pt-5 pb-0">
            <DialogTitle className="text-foreground">{t("Employee account created", "Compte employé créé")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm px-6 py-4">
            <p>{frLang ? "Le compte de l'employé a été créé. Voici ses identifiants de connexion :" : "The employee account has been created. Here are their login credentials:"}</p>
            <div className="rounded-lg bg-muted p-3 space-y-1">
              <p><strong>Email:</strong> {newCreds?.email}</p>
              <p><strong>{t("Password", "Mot de passe")}:</strong> <code className="bg-background px-2 py-0.5 rounded font-mono text-base">{newCreds?.password}</code></p>
            </div>
            <p className="text-xs text-muted-foreground">
              {frLang ? "L'employé pourra modifier son mot de passe après la première connexion." : "The employee can change their password after first login."}
            </p>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border/50 flex flex-col gap-2">
            <Button onClick={copyCredentials} variant="outline" className="w-full gap-2">
              {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
              {copied ? (frLang ? "Copié !" : "Copied!") : (frLang ? "Copier les identifiants" : "Copy credentials")}
            </Button>
            <Button onClick={() => { setNewCreds(null); setCopied(false) }} className="bg-brand text-brand-foreground hover:bg-brand/90">{t("Done", "Terminé")}</Button>
          </DialogFooter>
          <DialogFooterBrand />
        </DialogContent>
      </Dialog>
    </div>
  );
}
