import * as React from "react"
import { useAuth } from "@/hooks/use-auth"
import { useLanguage } from "@/lib/i18n"
import { insforge } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { trackModuleOpen } from "@/lib/context-tracker"
import { logAudit } from "@/lib/audit"
import { detectInjection, logSecurityEvent } from "@/lib/security"
import { formatCurrency } from "@/lib/currency"
import { UserAvatar } from "@/components/UserAvatar"
import { PageFooter } from "@/components/PageFooter"
import {
  Users, UserPlus, ClipboardCheck, Plane, FileWarning, FileCheck,
  Building2, Network, GraduationCap, Star, Zap, ArrowUpRight,
  Shield, Heart, FolderOpen, MessageSquare, BarChart3, Clipboard,
  Sliders, Search, Plus, Pencil, Trash2, Eye, X, Loader2,
  Download, Upload, Filter, RefreshCw, CheckCircle, XCircle,
  Clock, Calendar, DollarSign, Briefcase, Mail, Phone,
  ChevronDown, ChevronRight, AlertTriangle, Save, Send,
  TrendingUp, FileText, Settings, LayoutDashboard, Package
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import type { Page } from "@/App"

interface Props {
  onNavigate: (p: Page) => void
  initialTab?: string
}

// ─── Types ──────────────────────────────────────────────
interface HREmployee {
  id: string; workspace_id: string; first_name: string; last_name: string;
  email: string; phone: string; position: string; department_id: string;
  hire_date: string; salary: number; status: string; avatar_url?: string;
  birth_date?: string; address?: string; emergency_contact?: string;
  contract_type?: string; created_at: string;
}
interface HRDepartment {
  id: string; workspace_id: string; name: string; description?: string;
  manager_id?: string; parent_id?: string; created_at: string;
}
interface HRContract {
  id: string; workspace_id: string; employee_id: string; contract_type: string;
  start_date: string; end_date?: string; salary: number; status: string;
  terms?: string; created_at: string;
}
interface HRLeave {
  id: string; workspace_id: string; employee_id: string; leave_type: string;
  start_date: string; end_date: string; status: string; reason?: string;
  approved_by?: string; created_at: string;
}
interface HRRecruitment {
  id: string; workspace_id: string; position: string; department_id?: string;
  status: string; candidates_count: number; salary_range?: string;
  description?: string; created_at: string;
}
interface HREvaluation {
  id: string; workspace_id: string; employee_id: string; period: string;
  score: number; comments?: string; evaluator_id?: string; created_at: string;
}
interface HRTraining {
  id: string; workspace_id: string; title: string; description?: string;
  instructor?: string; start_date: string; end_date?: string;
  status: string; participants_count: number; created_at: string;
}
interface HRAttendance {
  id: string; workspace_id: string; employee_id: string; date: string;
  check_in: string; check_out?: string; status: string; notes?: string; created_at: string;
}
interface HRAbsence {
  id: string; workspace_id: string; employee_id: string; start_date: string;
  end_date: string; reason: string; status: string; created_at: string;
}
interface HRSkill {
  id: string; workspace_id: string; employee_id: string; skill_name: string;
  level: string; notes?: string; created_at: string;
}
interface HRPromotion {
  id: string; workspace_id: string; employee_id: string; old_position: string;
  new_position: string; effective_date: string; notes?: string; created_at: string;
}
interface HRDiscipline {
  id: string; workspace_id: string; employee_id: string; type: string;
  description: string; action_taken: string; date: string; created_at: string;
}
interface HRHealthSafety {
  id: string; workspace_id: string; incident_type: string; date: string;
  description: string; location?: string; severity: string; status: string;
  reported_by?: string; created_at: string;
}
interface HRDocument {
  id: string; workspace_id: string; employee_id?: string; title: string;
  doc_type: string; file_name?: string; notes?: string; created_at: string;
}
interface HRCommunication {
  id: string; workspace_id: string; sender_id?: string; subject: string;
  message: string; priority: string; created_at: string;
}

// ─── Helpers ────────────────────────────────────────────
function EmptyState({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-muted">
        <Icon className="size-7 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{desc}</p>
    </div>
  )
}

function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

// ─── Main Component ─────────────────────────────────────
export function HRPage({ onNavigate, initialTab }: Props) {
  const { workspace, user } = useAuth()
  const { lang } = useLanguage()
  const fr = lang === "fr"
  const [tab, setTab] = React.useState(initialTab || "hr_dashboard")
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")

  // Data states
  const [employees, setEmployees] = React.useState<HREmployee[]>([])
  const [departments, setDepartments] = React.useState<HRDepartment[]>([])
  const [contracts, setContracts] = React.useState<HRContract[]>([])
  const [leaves, setLeaves] = React.useState<HRLeave[]>([])
  const [recruitments, setRecruitments] = React.useState<HRRecruitment[]>([])
  const [evaluations, setEvaluations] = React.useState<HREvaluation[]>([])
  const [trainings, setTrainings] = React.useState<HRTraining[]>([])
  const [attendanceList, setAttendanceList] = React.useState<HRAttendance[]>([])
  const [absences, setAbsences] = React.useState<HRAbsence[]>([])
  const [skills, setSkills] = React.useState<HRSkill[]>([])
  const [promotions, setPromotions] = React.useState<HRPromotion[]>([])
  const [disciplines, setDisciplines] = React.useState<HRDiscipline[]>([])
  const [healthIncidents, setHealthIncidents] = React.useState<HRHealthSafety[]>([])
  const [documents, setDocuments] = React.useState<HRDocument[]>([])
  const [communications, setCommunications] = React.useState<HRCommunication[]>([])
  const [auditLogs, setAuditLogs] = React.useState<any[]>([])
  const [notifPrefs, setNotifPrefs] = React.useState({ email: true, annual_days: 30, attendance_policy: "standard" })

  // Dialog states
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [dialogType, setDialogType] = React.useState<string>("")
  const [editingItem, setEditingItem] = React.useState<any>(null)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Sync initialTab
  React.useEffect(() => {
    if (initialTab && initialTab.startsWith("hr_")) setTab(initialTab)
  }, [initialTab])

  React.useEffect(() => {
    if (!workspace) return
    trackModuleOpen("hr")
    loadData()
  }, [workspace])

  async function loadData() {
    if (!workspace) return
    setLoading(true)
    try {
      const wid = workspace.id
      const [empR, deptR, contR, leaveR, recR, evalR, trainR, attR, absR, skillR, promoR, discR, hsR, docR, commR, auditR] = await Promise.all([
        insforge.database.from("hr_employees").select("*").eq("workspace_id", wid).order("last_name"),
        insforge.database.from("hr_departments").select("*").eq("workspace_id", wid).order("name"),
        insforge.database.from("hr_contracts").select("*").eq("workspace_id", wid).order("start_date", { ascending: false }),
        insforge.database.from("hr_leave_requests").select("*").eq("workspace_id", wid).order("created_at", { ascending: false }),
        insforge.database.from("hr_recruitments").select("*").eq("workspace_id", wid).order("created_at", { ascending: false }),
        insforge.database.from("hr_evaluations").select("*").eq("workspace_id", wid).order("created_at", { ascending: false }),
        insforge.database.from("hr_trainings").select("*").eq("workspace_id", wid).order("start_date", { ascending: false }),
        insforge.database.from("hr_attendance").select("*").eq("workspace_id", wid).order("date", { ascending: false }),
        insforge.database.from("hr_absences").select("*").eq("workspace_id", wid).order("created_at", { ascending: false }),
        insforge.database.from("hr_skills").select("*").eq("workspace_id", wid).order("skill_name"),
        insforge.database.from("hr_promotions").select("*").eq("workspace_id", wid).order("effective_date", { ascending: false }),
        insforge.database.from("hr_discipline").select("*").eq("workspace_id", wid).order("date", { ascending: false }),
        insforge.database.from("hr_health_safety").select("*").eq("workspace_id", wid).order("date", { ascending: false }),
        insforge.database.from("hr_documents").select("*").eq("workspace_id", wid).order("created_at", { ascending: false }),
        insforge.database.from("hr_communication").select("*").eq("workspace_id", wid).order("created_at", { ascending: false }),
        insforge.database.from("audit_logs").select("*").eq("workspace_id", wid).order("created_at", { ascending: false }).limit(200),
      ])
      setEmployees((empR.data as any[]) || [])
      setDepartments((deptR.data as any[]) || [])
      setContracts((contR.data as any[]) || [])
      setLeaves((leaveR.data as any[]) || [])
      setRecruitments((recR.data as any[]) || [])
      setEvaluations((evalR.data as any[]) || [])
      setTrainings((trainR.data as any[]) || [])
      setAttendanceList((attR.data as any[]) || [])
      setAbsences((absR.data as any[]) || [])
      setSkills((skillR.data as any[]) || [])
      setPromotions((promoR.data as any[]) || [])
      setDisciplines((discR.data as any[]) || [])
      setHealthIncidents((hsR.data as any[]) || [])
      setDocuments((docR.data as any[]) || [])
      setCommunications((commR.data as any[]) || [])
      setAuditLogs((auditR.data as any[]) || [])
    } catch (err) {
      console.error("HR load error:", err)
    }
    setLoading(false)
  }

  function openDialog(type: string, item?: any) {
    setDialogType(type)
    setEditingItem(item || null)
    setError(null)
    setDialogOpen(true)
  }

  async function handleSave(data: any) {
    if (!workspace) return
    if (detectInjection(JSON.stringify(data))) {
      logSecurityEvent({ type: "injection_attempt", details: "HR form injection", path: "hr" })
      setError(fr ? "Entrée suspecte détectée." : "Suspicious input detected.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const wid = workspace.id
      const tableMap: Record<string, string> = {
        employee: "hr_employees", department: "hr_departments", contract: "hr_contracts",
        leave: "hr_leave_requests", recruitment: "hr_recruitments", evaluation: "hr_evaluations",
        training: "hr_trainings", absence: "hr_absences", attendance: "hr_attendance",
        skill: "hr_skills", promotion: "hr_promotions", discipline: "hr_discipline",
        health_safety: "hr_health_safety", document: "hr_documents", communication: "hr_communication",
      }
      const table = tableMap[dialogType]
      if (!table) return

      if (editingItem?.id) {
        await insforge.database.from(table).update(data).eq("id", editingItem.id)
      } else {
        await insforge.database.from(table).insert([{ ...data, workspace_id: wid }])
      }

      await logAudit({
        action: editingItem ? "update" : "create",
        workspace_id: wid,
        actor_id: user?.id,
        actor_email: user?.email,
        metadata: { module: "hr", type: dialogType },
      })

      setDialogOpen(false)
      loadData()
    } catch (err: any) {
      setError(err.message || (fr ? "Erreur de sauvegarde" : "Save error"))
    }
    setSaving(false)
  }

  async function handleDelete(table: string, id: string) {
    if (!workspace) return
    if (!confirm(fr ? "Supprimer cet élément ?" : "Delete this item?")) return
    try {
      await insforge.database.from(table).delete().eq("id", id)
      await logAudit({
        action: "delete", workspace_id: workspace.id, actor_id: user?.id,
        actor_email: user?.email, metadata: { module: "hr", type: table, deleted_id: id },
      })
      loadData()
    } catch (err: any) {
      console.error("Delete error:", err)
    }
  }

  const t = (fr_val: string, en_val: string) => fr ? fr_val : en_val

  // ─── Tab definitions ──────────────────────────────────
  const tabs = [
    { id: "hr_dashboard", label: t("Tableau de bord", "Dashboard"), icon: LayoutDashboard },
    { id: "hr_employees", label: t("Employés", "Employees"), icon: Users },
    { id: "hr_recruitment", label: t("Recrutement", "Recruitment"), icon: UserPlus },
    { id: "hr_attendance", label: t("Présence", "Attendance"), icon: ClipboardCheck },
    { id: "hr_leave", label: t("Congés", "Leave"), icon: Plane },
    { id: "hr_absences", label: t("Absences", "Absences"), icon: FileWarning },
    { id: "hr_contracts", label: t("Contrats", "Contracts"), icon: FileCheck },
    { id: "hr_departments", label: t("Départements", "Departments"), icon: Building2 },
    { id: "hr_orgchart", label: t("Organigramme", "Org Chart"), icon: Network },
    { id: "hr_training", label: t("Formations", "Training"), icon: GraduationCap },
    { id: "hr_evaluations", label: t("Évaluations", "Evaluations"), icon: Star },
    { id: "hr_skills", label: t("Compétences", "Skills"), icon: Zap },
    { id: "hr_promotions", label: t("Promotions", "Promotions"), icon: ArrowUpRight },
    { id: "hr_discipline", label: t("Discipline", "Discipline"), icon: Shield },
    { id: "hr_health_safety", label: t("Santé et sécurité", "Health & Safety"), icon: Heart },
    { id: "hr_documents", label: t("Documents RH", "HR Documents"), icon: FolderOpen },
    { id: "hr_communication", label: t("Communication", "Communication"), icon: MessageSquare },
    { id: "hr_reports", label: t("Rapports", "Reports"), icon: BarChart3 },
    { id: "hr_audit_log", label: t("Journal d'audit", "Audit Log"), icon: Clipboard },
    { id: "hr_settings", label: t("Paramètres RH", "HR Settings"), icon: Sliders },
  ]

  const filteredEmployees = employees.filter(e =>
    `${e.first_name} ${e.last_name} ${e.email} ${e.position}`.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Search + Refresh */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={fr ? "Rechercher..." : "Search..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="size-4 mr-1" /> {fr ? "Actualiser" : "Refresh"}
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex overflow-x-auto gap-1 pb-2 -mb-2">
        {tabs.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-all",
                tab === t.id
                  ? "bg-[#1e293b] text-white shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ─── DASHBOARD ─────────────────────────────────── */}
      {tab === "hr_dashboard" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: t("Employés", "Employees"), value: employees.length, icon: Users, color: "bg-blue-500" },
              { label: t("Départements", "Departments"), value: departments.length, icon: Building2, color: "bg-emerald-500" },
              { label: t("Congés en attente", "Pending leave"), value: leaves.filter(l => l.status === "pending").length, icon: Plane, color: "bg-amber-500" },
              { label: t("Formations actives", "Active trainings"), value: trainings.filter(tr => tr.status === "active").length, icon: GraduationCap, color: "bg-violet-500" },
            ].map((stat, i) => {
              const Icon = stat.icon
              return (
                <div key={i} className={cn("rounded-xl p-5 text-white", stat.color)}>
                  <div className="flex items-start justify-between">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-white/20"><Icon className="size-5 text-white" /></div>
                  </div>
                  <p className="mt-3 text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-white/80 mt-1">{stat.label}</p>
                </div>
              )
            })}
          </div>

          {/* Recent leaves */}
          <SectionCard title={t("Congés récents", "Recent Leave Requests")}>
            {leaves.length === 0 ? (
              <EmptyState icon={Plane} title={t("Aucun congé", "No leave requests")} desc={t("Les demandes de congé apparaîtront ici", "Leave requests will appear here")} />
            ) : (
              <div className="space-y-2">
                {leaves.slice(0, 5).map((l) => {
                  const emp = employees.find(e => e.id === l.employee_id)
                  return (
                    <div key={l.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar avatarUrl={null} name={emp ? `${emp.first_name} ${emp.last_name}` : "?"} email="" size="sm" className="size-8" />
                        <div>
                          <p className="text-sm font-medium">{emp ? `${emp.first_name} ${emp.last_name}` : "—"}</p>
                          <p className="text-xs text-muted-foreground">{l.start_date} → {l.end_date}</p>
                        </div>
                      </div>
                      <Badge variant={l.status === "approved" ? "default" : l.status === "rejected" ? "destructive" : "secondary"}>
                        {l.status === "approved" ? t("Approuvé", "Approved") : l.status === "rejected" ? t("Refusé", "Rejected") : t("En attente", "Pending")}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </SectionCard>

          {/* Recent recruitment */}
          <SectionCard title={t("Recrutements actifs", "Active Recruitments")}>
            {recruitments.length === 0 ? (
              <EmptyState icon={UserPlus} title={t("Aucun recrutement", "No recruitments")} desc={t("Les offres d'emploi apparaîtront ici", "Job postings will appear here")} />
            ) : (
              <div className="space-y-2">
                {recruitments.slice(0, 5).map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">{r.position}</p>
                      <p className="text-xs text-muted-foreground">{r.candidates_count} {t("candidats", "candidates")}</p>
                    </div>
                    <Badge variant={r.status === "open" ? "default" : "secondary"}>
                      {r.status === "open" ? t("Ouvert", "Open") : r.status === "closed" ? t("Fermé", "Closed") : r.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* ─── EMPLOYEES ─────────────────────────────────── */}
      {tab === "hr_employees" && (
        <SectionCard
          title={t("Employés", "Employees")}
          action={<Button size="sm" onClick={() => openDialog("employee")}><Plus className="size-4 mr-1" />{t("Ajouter", "Add")}</Button>}
        >
          {filteredEmployees.length === 0 ? (
            <EmptyState icon={Users} title={t("Aucun employé", "No employees")} desc={t("Ajoutez votre premier employé", "Add your first employee")} />
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("Nom", "Name")}</TableHead>
                    <TableHead>{t("Poste", "Position")}</TableHead>
                    <TableHead>{t("Département", "Department")}</TableHead>
                    <TableHead>{t("Date d'embauche", "Hire date")}</TableHead>
                    <TableHead>{t("Statut", "Status")}</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((emp) => {
                    const dept = departments.find(d => d.id === emp.department_id)
                    return (
                      <TableRow key={emp.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <UserAvatar avatarUrl={emp.avatar_url} name={`${emp.first_name} ${emp.last_name}`} email={emp.email} size="sm" className="size-8" />
                            <div>
                              <p className="text-sm font-medium">{emp.first_name} {emp.last_name}</p>
                              <p className="text-xs text-muted-foreground">{emp.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{emp.position}</TableCell>
                        <TableCell className="text-sm">{dept?.name || "—"}</TableCell>
                        <TableCell className="text-sm">{emp.hire_date}</TableCell>
                        <TableCell>
                          <Badge variant={emp.status === "active" ? "default" : "secondary"}>
                            {emp.status === "active" ? t("Actif", "Active") : emp.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openDialog("employee", emp)}><Pencil className="size-3.5" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete("hr_employees", emp.id)}><Trash2 className="size-3.5 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </SectionCard>
      )}

      {/* ─── RECRUITMENT ───────────────────────────────── */}
      {tab === "hr_recruitment" && (
        <SectionCard
          title={t("Recrutement", "Recruitment")}
          action={<Button size="sm" onClick={() => openDialog("recruitment")}><Plus className="size-4 mr-1" />{t("Nouvelle offre", "New posting")}</Button>}
        >
          {recruitments.length === 0 ? (
            <EmptyState icon={UserPlus} title={t("Aucune offre", "No postings")} desc={t("Créez une offre d'emploi", "Create a job posting")} />
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("Poste", "Position")}</TableHead>
                    <TableHead>{t("Candidats", "Candidates")}</TableHead>
                    <TableHead>{t("Fourchette salariale", "Salary range")}</TableHead>
                    <TableHead>{t("Statut", "Status")}</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recruitments.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm font-medium">{r.position}</TableCell>
                      <TableCell className="text-sm">{r.candidates_count}</TableCell>
                      <TableCell className="text-sm">{r.salary_range || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "open" ? "default" : "secondary"}>
                          {r.status === "open" ? t("Ouvert", "Open") : r.status === "closed" ? t("Fermé", "Closed") : r.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openDialog("recruitment", r)}><Pencil className="size-3.5" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete("hr_recruitments", r.id)}><Trash2 className="size-3.5 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </SectionCard>
      )}

      {/* ─── LEAVE ─────────────────────────────────────── */}
      {tab === "hr_leave" && (
        <SectionCard
          title={t("Congés", "Leave Requests")}
          action={<Button size="sm" onClick={() => openDialog("leave")}><Plus className="size-4 mr-1" />{t("Demander un congé", "Request leave")}</Button>}
        >
          {leaves.length === 0 ? (
            <EmptyState icon={Plane} title={t("Aucun congé", "No leave requests")} desc={t("Les demandes apparaîtront ici", "Requests will appear here")} />
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("Employé", "Employee")}</TableHead>
                    <TableHead>{t("Type", "Type")}</TableHead>
                    <TableHead>{t("Période", "Period")}</TableHead>
                    <TableHead>{t("Statut", "Status")}</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaves.map((l) => {
                    const emp = employees.find(e => e.id === l.employee_id)
                    return (
                      <TableRow key={l.id}>
                        <TableCell className="text-sm">{emp ? `${emp.first_name} ${emp.last_name}` : "—"}</TableCell>
                        <TableCell className="text-sm">{l.leave_type}</TableCell>
                        <TableCell className="text-sm">{l.start_date} → {l.end_date}</TableCell>
                        <TableCell>
                          <Badge variant={l.status === "approved" ? "default" : l.status === "rejected" ? "destructive" : "secondary"}>
                            {l.status === "approved" ? t("Approuvé", "Approved") : l.status === "rejected" ? t("Refusé", "Rejected") : t("En attente", "Pending")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {l.status === "pending" && (
                              <>
                                <Button variant="ghost" size="sm" onClick={async () => {
                                  await insforge.database.from("hr_leave_requests").update({ status: "approved" }).eq("id", l.id)
                                  loadData()
                                }}><CheckCircle className="size-3.5 text-green-600" /></Button>
                                <Button variant="ghost" size="sm" onClick={async () => {
                                  await insforge.database.from("hr_leave_requests").update({ status: "rejected" }).eq("id", l.id)
                                  loadData()
                                }}><XCircle className="size-3.5 text-red-600" /></Button>
                              </>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => handleDelete("hr_leave_requests", l.id)}><Trash2 className="size-3.5 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </SectionCard>
      )}

      {/* ─── ABSENCES ──────────────────────────────────── */}
      {tab === "hr_absences" && (
        <SectionCard
          title={t("Absences", "Absences")}
          action={<Button size="sm" onClick={() => openDialog("absence")}><Plus className="size-4 mr-1" />{t("Enregistrer", "Record")}</Button>}
        >
          <EmptyState icon={FileWarning} title={t("Absences enregistrées", "Recorded absences")} desc={t("Historique des absences", "Absence history")} />
        </SectionCard>
      )}

      {/* ─── CONTRACTS ─────────────────────────────────── */}
      {tab === "hr_contracts" && (
        <SectionCard
          title={t("Contrats", "Contracts")}
          action={<Button size="sm" onClick={() => openDialog("contract")}><Plus className="size-4 mr-1" />{t("Nouveau contrat", "New contract")}</Button>}
        >
          {contracts.length === 0 ? (
            <EmptyState icon={FileCheck} title={t("Aucun contrat", "No contracts")} desc={t("Créez un contrat", "Create a contract")} />
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("Employé", "Employee")}</TableHead>
                    <TableHead>{t("Type", "Type")}</TableHead>
                    <TableHead>{t("Période", "Period")}</TableHead>
                    <TableHead>{t("Salaire", "Salary")}</TableHead>
                    <TableHead>{t("Statut", "Status")}</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map((c) => {
                    const emp = employees.find(e => e.id === c.employee_id)
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="text-sm">{emp ? `${emp.first_name} ${emp.last_name}` : "—"}</TableCell>
                        <TableCell className="text-sm">{c.contract_type}</TableCell>
                        <TableCell className="text-sm">{c.start_date} → {c.end_date || t("Indéterminé", "Indefinite")}</TableCell>
                        <TableCell className="text-sm">{formatCurrency(c.salary)}</TableCell>
                        <TableCell>
                          <Badge variant={c.status === "active" ? "default" : "secondary"}>
                            {c.status === "active" ? t("Actif", "Active") : c.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openDialog("contract", c)}><Pencil className="size-3.5" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete("hr_contracts", c.id)}><Trash2 className="size-3.5 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </SectionCard>
      )}

      {/* ─── DEPARTMENTS ───────────────────────────────── */}
      {tab === "hr_departments" && (
        <SectionCard
          title={t("Départements", "Departments")}
          action={<Button size="sm" onClick={() => openDialog("department")}><Plus className="size-4 mr-1" />{t("Ajouter", "Add")}</Button>}
        >
          {departments.length === 0 ? (
            <EmptyState icon={Building2} title={t("Aucun département", "No departments")} desc={t("Créez un département", "Create a department")} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {departments.map((d) => (
                <div key={d.id} className="rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold">{d.name}</p>
                      {d.description && <p className="text-xs text-muted-foreground mt-1">{d.description}</p>}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openDialog("department", d)}><Pencil className="size-3.5" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete("hr_departments", d.id)}><Trash2 className="size-3.5 text-destructive" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {/* ─── ATTENDANCE ────────────────────────────────── */}
      {tab === "hr_attendance" && (
        <SectionCard
          title={t("Présence", "Attendance")}
          action={<Button size="sm" onClick={() => openDialog("attendance")}><Plus className="size-4 mr-1" />{fr ? "Pointer" : "Clock in"}</Button>}
        >
          {attendanceList.length === 0 ? (
            <EmptyState icon={ClipboardCheck} title={t("Aucune présence", "No attendance records")} desc={t("Enregistrez les présences des employés", "Record employee attendance")} />
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{fr ? "Employé" : "Employee"}</TableHead>
                  <TableHead>{fr ? "Date" : "Date"}</TableHead>
                  <TableHead>{fr ? "Arrivée" : "Check In"}</TableHead>
                  <TableHead>{fr ? "Départ" : "Check Out"}</TableHead>
                  <TableHead>{fr ? "Statut" : "Status"}</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {attendanceList.map((a) => {
                    const emp = employees.find(e => e.id === a.employee_id)
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="text-sm font-medium">{emp ? `${emp.first_name} ${emp.last_name}` : a.employee_id}</TableCell>
                        <TableCell className="text-sm">{a.date}</TableCell>
                        <TableCell className="text-sm">{a.check_in || "—"}</TableCell>
                        <TableCell className="text-sm">{a.check_out || "—"}</TableCell>
                        <TableCell className="text-sm"><Badge variant={a.status === "present" ? "secondary" : a.status === "late" ? "outline" : "destructive"}>{a.status}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="size-7" onClick={() => openDialog("attendance", a)}><Pencil className="size-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => handleDelete("hr_attendance", a.id)}><Trash2 className="size-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </SectionCard>
      )}

      {/* ─── ORG CHART ─────────────────────────────────── */}
      {tab === "hr_orgchart" && (
        <SectionCard title={t("Organigramme", "Organization Chart")}>
          {departments.length === 0 ? (
            <EmptyState icon={Network} title={t("Aucune structure", "No structure")} desc={t("Ajoutez des départements pour voir l'organigramme", "Add departments to see the org chart")} />
          ) : (
            <div className="space-y-3">
              {departments.map((d) => (
                <div key={d.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-[#1e293b] text-white">
                    <Building2 className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{d.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {employees.filter(e => e.department_id === d.id).length} {t("membres", "members")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {/* ─── TRAINING ──────────────────────────────────── */}
      {tab === "hr_training" && (
        <SectionCard
          title={t("Formations", "Training")}
          action={<Button size="sm" onClick={() => openDialog("training")}><Plus className="size-4 mr-1" />{t("Nouvelle formation", "New training")}</Button>}
        >
          {trainings.length === 0 ? (
            <EmptyState icon={GraduationCap} title={t("Aucune formation", "No trainings")} desc={t("Planifiez une formation", "Schedule a training")} />
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("Formation", "Training")}</TableHead>
                    <TableHead>{t("Formateur", "Instructor")}</TableHead>
                    <TableHead>{t("Date", "Date")}</TableHead>
                    <TableHead>{t("Participants", "Participants")}</TableHead>
                    <TableHead>{t("Statut", "Status")}</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trainings.map((tr) => (
                    <TableRow key={tr.id}>
                      <TableCell className="text-sm font-medium">{tr.title}</TableCell>
                      <TableCell className="text-sm">{tr.instructor || "—"}</TableCell>
                      <TableCell className="text-sm">{tr.start_date}{tr.end_date ? ` → ${tr.end_date}` : ""}</TableCell>
                      <TableCell className="text-sm">{tr.participants_count}</TableCell>
                      <TableCell>
                        <Badge variant={tr.status === "active" ? "default" : tr.status === "completed" ? "secondary" : "outline"}>
                          {tr.status === "active" ? t("En cours", "Active") : tr.status === "completed" ? t("Terminé", "Completed") : tr.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openDialog("training", tr)}><Pencil className="size-3.5" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete("hr_trainings", tr.id)}><Trash2 className="size-3.5 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </SectionCard>
      )}

      {/* ─── EVALUATIONS ───────────────────────────────── */}
      {tab === "hr_evaluations" && (
        <SectionCard
          title={t("Évaluations", "Evaluations")}
          action={<Button size="sm" onClick={() => openDialog("evaluation")}><Plus className="size-4 mr-1" />{t("Nouvelle évaluation", "New evaluation")}</Button>}
        >
          {evaluations.length === 0 ? (
            <EmptyState icon={Star} title={t("Aucune évaluation", "No evaluations")} desc={t("Évaluez les performances", "Evaluate performance")} />
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("Employé", "Employee")}</TableHead>
                    <TableHead>{t("Période", "Period")}</TableHead>
                    <TableHead>{t("Score", "Score")}</TableHead>
                    <TableHead>{t("Commentaires", "Comments")}</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evaluations.map((ev) => {
                    const emp = employees.find(e => e.id === ev.employee_id)
                    return (
                      <TableRow key={ev.id}>
                        <TableCell className="text-sm">{emp ? `${emp.first_name} ${emp.last_name}` : "—"}</TableCell>
                        <TableCell className="text-sm">{ev.period}</TableCell>
                        <TableCell className="text-sm">
                          <span className={cn("font-semibold", ev.score >= 4 ? "text-green-600" : ev.score >= 3 ? "text-amber-600" : "text-red-600")}>
                            {ev.score}/5
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">{ev.comments || "—"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openDialog("evaluation", ev)}><Pencil className="size-3.5" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete("hr_evaluations", ev.id)}><Trash2 className="size-3.5 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </SectionCard>
      )}

      {/* ─── SKILLS ────────────────────────────────────── */}
      {tab === "hr_skills" && (
        <SectionCard
          title={t("Compétences", "Skills")}
          action={<Button size="sm" onClick={() => openDialog("skill")}><Plus className="size-4 mr-1" />{fr ? "Ajouter" : "Add"}</Button>}
        >
          {skills.length === 0 ? (
            <EmptyState icon={Zap} title={t("Aucune compétence", "No skills")} desc={t("Évaluez et suivez les compétences", "Track and evaluate skills")} />
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{fr ? "Employé" : "Employee"}</TableHead>
                  <TableHead>{fr ? "Compétence" : "Skill"}</TableHead>
                  <TableHead>{fr ? "Niveau" : "Level"}</TableHead>
                  <TableHead>{fr ? "Notes" : "Notes"}</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {skills.map((s) => {
                    const emp = employees.find(e => e.id === s.employee_id)
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="text-sm font-medium">{emp ? `${emp.first_name} ${emp.last_name}` : s.employee_id}</TableCell>
                        <TableCell className="text-sm">{s.skill_name}</TableCell>
                        <TableCell className="text-sm"><Badge variant="outline">{s.level}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{s.notes || "—"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="size-7" onClick={() => openDialog("skill", s)}><Pencil className="size-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => handleDelete("hr_skills", s.id)}><Trash2 className="size-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </SectionCard>
      )}

      {/* ─── PROMOTIONS ────────────────────────────────── */}
      {tab === "hr_promotions" && (
        <SectionCard
          title={t("Promotions", "Promotions")}
          action={<Button size="sm" onClick={() => openDialog("promotion")}><Plus className="size-4 mr-1" />{fr ? "Nouvelle promotion" : "New promotion"}</Button>}
        >
          {promotions.length === 0 ? (
            <EmptyState icon={ArrowUpRight} title={t("Aucune promotion", "No promotions")} desc={t("Historique des promotions", "Promotion history")} />
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{fr ? "Employé" : "Employee"}</TableHead>
                  <TableHead>{fr ? "Ancien poste" : "Old position"}</TableHead>
                  <TableHead>{fr ? "Nouveau poste" : "New position"}</TableHead>
                  <TableHead>{fr ? "Date" : "Date"}</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {promotions.map((p) => {
                    const emp = employees.find(e => e.id === p.employee_id)
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm font-medium">{emp ? `${emp.first_name} ${emp.last_name}` : p.employee_id}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.old_position}</TableCell>
                        <TableCell className="text-sm font-medium">{p.new_position}</TableCell>
                        <TableCell className="text-sm">{p.effective_date}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="size-7" onClick={() => openDialog("promotion", p)}><Pencil className="size-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => handleDelete("hr_promotions", p.id)}><Trash2 className="size-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </SectionCard>
      )}

      {/* ─── DISCIPLINE ────────────────────────────────── */}
      {tab === "hr_discipline" && (
        <SectionCard
          title={t("Discipline", "Discipline")}
          action={<Button size="sm" onClick={() => openDialog("discipline")}><Plus className="size-4 mr-1" />{fr ? "Nouvel incident" : "New incident"}</Button>}
        >
          {disciplines.length === 0 ? (
            <EmptyState icon={Shield} title={t("Aucun incident", "No incidents")} desc={t("Gestion disciplinaire", "Disciplinary management")} />
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{fr ? "Employé" : "Employee"}</TableHead>
                  <TableHead>{fr ? "Type" : "Type"}</TableHead>
                  <TableHead>{fr ? "Description" : "Description"}</TableHead>
                  <TableHead>{fr ? "Action" : "Action taken"}</TableHead>
                  <TableHead>{fr ? "Date" : "Date"}</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {disciplines.map((d) => {
                    const emp = employees.find(e => e.id === d.employee_id)
                    return (
                      <TableRow key={d.id}>
                        <TableCell className="text-sm font-medium">{emp ? `${emp.first_name} ${emp.last_name}` : d.employee_id}</TableCell>
                        <TableCell className="text-sm"><Badge variant="outline">{d.type}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{d.description}</TableCell>
                        <TableCell className="text-sm">{d.action_taken}</TableCell>
                        <TableCell className="text-sm">{d.date}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="size-7" onClick={() => openDialog("discipline", d)}><Pencil className="size-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => handleDelete("hr_discipline", d.id)}><Trash2 className="size-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </SectionCard>
      )}

      {/* ─── HEALTH & SAFETY ───────────────────────────── */}
      {tab === "hr_health_safety" && (
        <SectionCard
          title={t("Santé et sécurité", "Health & Safety")}
          action={<Button size="sm" onClick={() => openDialog("health_safety")}><Plus className="size-4 mr-1" />{fr ? "Signaler" : "Report"}</Button>}
        >
          {healthIncidents.length === 0 ? (
            <EmptyState icon={Heart} title={t("Aucun incident", "No incidents")} desc={t("Incidents et mesures de sécurité", "Incidents and safety measures")} />
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{fr ? "Type" : "Type"}</TableHead>
                  <TableHead>{fr ? "Date" : "Date"}</TableHead>
                  <TableHead>{fr ? "Lieu" : "Location"}</TableHead>
                  <TableHead>{fr ? "Gravité" : "Severity"}</TableHead>
                  <TableHead>{fr ? "Statut" : "Status"}</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {healthIncidents.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="text-sm font-medium">{h.incident_type}</TableCell>
                      <TableCell className="text-sm">{h.date}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{h.location || "—"}</TableCell>
                      <TableCell className="text-sm"><Badge variant={h.severity === "high" ? "destructive" : "outline"}>{h.severity}</Badge></TableCell>
                      <TableCell className="text-sm"><Badge variant={h.status === "resolved" ? "secondary" : "outline"}>{h.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="size-7" onClick={() => openDialog("health_safety", h)}><Pencil className="size-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => handleDelete("hr_health_safety", h.id)}><Trash2 className="size-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </SectionCard>
      )}

      {/* ─── DOCUMENTS ─────────────────────────────────── */}
      {tab === "hr_documents" && (
        <SectionCard
          title={t("Documents RH", "HR Documents")}
          action={<Button size="sm" onClick={() => openDialog("document")}><Plus className="size-4 mr-1" />{fr ? "Ajouter" : "Add"}</Button>}
        >
          {documents.length === 0 ? (
            <EmptyState icon={FolderOpen} title={t("Aucun document", "No documents")} desc={t("Uploadez des documents RH", "Upload HR documents")} />
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{fr ? "Titre" : "Title"}</TableHead>
                  <TableHead>{fr ? "Type" : "Type"}</TableHead>
                  <TableHead>{fr ? "Employé" : "Employee"}</TableHead>
                  <TableHead>{fr ? "Date" : "Date"}</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {documents.map((doc) => {
                    const emp = doc.employee_id ? employees.find(e => e.id === doc.employee_id) : null
                    return (
                      <TableRow key={doc.id}>
                        <TableCell className="text-sm font-medium">{doc.title}</TableCell>
                        <TableCell className="text-sm"><Badge variant="outline">{doc.doc_type}</Badge></TableCell>
                        <TableCell className="text-sm">{emp ? `${emp.first_name} ${emp.last_name}` : "—"}</TableCell>
                        <TableCell className="text-sm">{new Date(doc.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="size-7" onClick={() => openDialog("document", doc)}><Pencil className="size-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => handleDelete("hr_documents", doc.id)}><Trash2 className="size-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </SectionCard>
      )}

      {/* ─── COMMUNICATION ─────────────────────────────── */}
      {tab === "hr_communication" && (
        <SectionCard
          title={t("Communication interne", "Internal Communication")}
          action={<Button size="sm" onClick={() => openDialog("communication")}><Plus className="size-4 mr-1" />{fr ? "Nouveau message" : "New message"}</Button>}
        >
          {communications.length === 0 ? (
            <EmptyState icon={MessageSquare} title={t("Aucun message", "No messages")} desc={t("Communiquez avec l'équipe", "Communicate with the team")} />
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{fr ? "Sujet" : "Subject"}</TableHead>
                  <TableHead>{fr ? "Message" : "Message"}</TableHead>
                  <TableHead>{fr ? "Priorité" : "Priority"}</TableHead>
                  <TableHead>{fr ? "Date" : "Date"}</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {communications.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-sm font-medium">{c.subject}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[250px] truncate">{c.message}</TableCell>
                      <TableCell className="text-sm"><Badge variant={c.priority === "high" ? "destructive" : c.priority === "low" ? "outline" : "secondary"}>{c.priority}</Badge></TableCell>
                      <TableCell className="text-sm">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="size-7" onClick={() => openDialog("communication", c)}><Pencil className="size-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => handleDelete("hr_communication", c.id)}><Trash2 className="size-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </SectionCard>
      )}

      {/* ─── REPORTS ───────────────────────────────────── */}
      {tab === "hr_reports" && (
        <SectionCard title={t("Rapports RH", "HR Reports")}>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: t("Effectifs", "Headcount"), icon: Users, count: employees.length },
              { label: t("Congés", "Leave"), icon: Plane, count: leaves.length },
              { label: t("Contrats", "Contracts"), icon: FileCheck, count: contracts.length },
              { label: t("Formations", "Training"), icon: GraduationCap, count: trainings.length },
            ].map((r, i) => {
              const Icon = r.icon
              return (
                <div key={i} className="flex items-center gap-3 rounded-lg border p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-[#1e293b] text-white">
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{r.label}</p>
                    <p className="text-xs text-muted-foreground">{r.count} {t("éléments", "items")}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </SectionCard>
      )}

      {/* ─── AUDIT LOG ─────────────────────────────────── */}
      {tab === "hr_audit_log" && (
        <SectionCard title={t("Journal d'audit", "Audit Log")}>
          {auditLogs.length === 0 ? (
            <EmptyState icon={Clipboard} title={t("Aucune activité", "No activity")} desc={t("Les actions seront enregistrées ici", "Actions will be recorded here")} />
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{fr ? "Action" : "Action"}</TableHead>
                  <TableHead>{fr ? "Utilisateur" : "User"}</TableHead>
                  <TableHead>{fr ? "Email" : "Email"}</TableHead>
                  <TableHead>{fr ? "Date" : "Date"}</TableHead>
                  <TableHead>{fr ? "Détails" : "Details"}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {auditLogs.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-sm"><Badge variant={a.action === "delete" ? "destructive" : "secondary"}>{a.action}</Badge></TableCell>
                      <TableCell className="text-sm">{a.actor_id || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.actor_email || "—"}</TableCell>
                      <TableCell className="text-sm">{new Date(a.created_at).toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{typeof a.metadata === "object" ? JSON.stringify(a.metadata) : a.metadata || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </SectionCard>
      )}

      {/* ─── SETTINGS ──────────────────────────────────── */}
      {tab === "hr_settings" && (
        <SectionCard title={t("Paramètres RH", "HR Settings")}>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">{t("Notifications par email", "Email notifications")}</p>
                <p className="text-xs text-muted-foreground">{t("Recevoir les notifications RH par email", "Receive HR notifications by email")}</p>
              </div>
              <Button variant={notifPrefs.email ? "default" : "outline"} size="sm" onClick={() => setNotifPrefs(p => ({ ...p, email: !p.email }))}>
                {notifPrefs.email ? (fr ? "Activé" : "On") : (fr ? "Désactivé" : "Off")}
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">{t("Durée de congé annuel", "Annual leave days")}</p>
                <p className="text-xs text-muted-foreground">{t("Nombre de jours de congé par an", "Number of leave days per year")}</p>
              </div>
              <Input type="number" min={1} max={60} className="w-20 h-8 text-center" value={notifPrefs.annual_days} onChange={e => setNotifPrefs(p => ({ ...p, annual_days: Number(e.target.value) }))} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">{t("Politique de pointage", "Attendance policy")}</p>
                <p className="text-xs text-muted-foreground">{t("Horaires et règles de présence", "Working hours and attendance rules")}</p>
              </div>
              <Select value={notifPrefs.attendance_policy} onValueChange={v => setNotifPrefs(p => ({ ...p, attendance_policy: v }))}>
                <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">{fr ? "Standard (8h)" : "Standard (8h)"}</SelectItem>
                  <SelectItem value="flexible">{fr ? "Flexible" : "Flexible"}</SelectItem>
                  <SelectItem value="shift">{fr ? "Travail par équipes" : "Shift work"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </SectionCard>
      )}

      {/* ─── GENERIC DIALOG ────────────────────────────── */}
      <HRDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        type={dialogType}
        item={editingItem}
        employees={employees}
        departments={departments}
        onSave={handleSave}
        saving={saving}
        error={error}
        fr={fr}
      />
    </div>
  )
}

// ─── Generic HR Dialog ──────────────────────────────────
function HRDialog({ open, onOpenChange, type, item, employees, departments, onSave, saving, error, fr }: {
  open: boolean; onOpenChange: (v: boolean) => void; type: string; item: any;
  employees: HREmployee[]; departments: HRDepartment[];
  onSave: (data: any) => Promise<void>; saving: boolean; error: string | null; fr: boolean
}) {
  const [form, setForm] = React.useState<Record<string, any>>({})
  React.useEffect(() => {
    if (item) {
      setForm({ ...item })
    } else {
      setForm({})
    }
  }, [item, open])

  const set = (key: string, val: any) => setForm(prev => ({ ...prev, [key]: val }))

  const titles: Record<string, string> = {
    employee: fr ? "Employé" : "Employee",
    department: fr ? "Département" : "Department",
    contract: fr ? "Contrat" : "Contract",
    leave: fr ? "Demande de congé" : "Leave Request",
    recruitment: fr ? "Offre d'emploi" : "Job Posting",
    evaluation: fr ? "Évaluation" : "Evaluation",
    training: fr ? "Formation" : "Training",
    absence: fr ? "Absence" : "Absence",
    attendance: fr ? "Présence" : "Attendance",
    skill: fr ? "Compétence" : "Skill",
    promotion: fr ? "Promotion" : "Promotion",
    discipline: fr ? "Discipline" : "Discipline",
    health_safety: fr ? "Incident santé/sécurité" : "Health & Safety incident",
    document: fr ? "Document RH" : "HR Document",
    communication: fr ? "Message" : "Message",
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? fr ? "Modifier" : "Edit" : fr ? "Ajouter" : "Add"} {titles[type] || type}</DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
        )}

        <div className="space-y-4 py-2 px-1">
          {/* EMPLOYEE FORM */}
          {type === "employee" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>{fr ? "Prénom" : "First name"}</Label><Input value={form.first_name || ""} onChange={e => set("first_name", e.target.value)} /></div>
                <div><Label>{fr ? "Nom" : "Last name"}</Label><Input value={form.last_name || ""} onChange={e => set("last_name", e.target.value)} /></div>
              </div>
              <div><Label>{fr ? "Email" : "Email"}</Label><Input type="email" value={form.email || ""} onChange={e => set("email", e.target.value)} /></div>
              <div><Label>{fr ? "Téléphone" : "Phone"}</Label><Input value={form.phone || ""} onChange={e => set("phone", e.target.value)} /></div>
              <div><Label>{fr ? "Poste" : "Position"}</Label><Input value={form.position || ""} onChange={e => set("position", e.target.value)} /></div>
              <div>
                <Label>{fr ? "Département" : "Department"}</Label>
                <Select value={form.department_id || ""} onValueChange={v => set("department_id", v)}>
                  <SelectTrigger><SelectValue placeholder={fr ? "Sélectionner..." : "Select..."} /></SelectTrigger>
                  <SelectContent>
                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>{fr ? "Date d'embauche" : "Hire date"}</Label><Input type="date" value={form.hire_date || ""} onChange={e => set("hire_date", e.target.value)} /></div>
                <div><Label>{fr ? "Salaire" : "Salary"}</Label><Input type="number" value={form.salary || ""} onChange={e => set("salary", Number(e.target.value))} /></div>
              </div>
              <div><Label>{fr ? "Type de contrat" : "Contract type"}</Label>
                <Select value={form.contract_type || ""} onValueChange={v => set("contract_type", v)}>
                  <SelectTrigger><SelectValue placeholder={fr ? "Sélectionner..." : "Select..."} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cdi">{fr ? "CDI" : "Permanent"}</SelectItem>
                    <SelectItem value="cdd">{fr ? "CDD" : "Fixed-term"}</SelectItem>
                    <SelectItem value="stage">{fr ? "Stage" : "Internship"}</SelectItem>
                    <SelectItem value="freelance">Freelance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* DEPARTMENT FORM */}
          {type === "department" && (
            <>
              <div><Label>{fr ? "Nom du département" : "Department name"}</Label><Input value={form.name || ""} onChange={e => set("name", e.target.value)} /></div>
              <div><Label>{fr ? "Description" : "Description"}</Label><Textarea value={form.description || ""} onChange={e => set("description", e.target.value)} /></div>
            </>
          )}

          {/* CONTRACT FORM */}
          {type === "contract" && (
            <>
              <div>
                <Label>{fr ? "Employé" : "Employee"}</Label>
                <Select value={form.employee_id || ""} onValueChange={v => set("employee_id", v)}>
                  <SelectTrigger><SelectValue placeholder={fr ? "Sélectionner..." : "Select..."} /></SelectTrigger>
                  <SelectContent>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{fr ? "Type de contrat" : "Contract type"}</Label>
                <Select value={form.contract_type || ""} onValueChange={v => set("contract_type", v)}>
                  <SelectTrigger><SelectValue placeholder={fr ? "Sélectionner..." : "Select..."} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cdi">{fr ? "CDI" : "Permanent"}</SelectItem>
                    <SelectItem value="cdd">{fr ? "CDD" : "Fixed-term"}</SelectItem>
                    <SelectItem value="stage">{fr ? "Stage" : "Internship"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>{fr ? "Date de début" : "Start date"}</Label><Input type="date" value={form.start_date || ""} onChange={e => set("start_date", e.target.value)} /></div>
                <div><Label>{fr ? "Date de fin" : "End date"}</Label><Input type="date" value={form.end_date || ""} onChange={e => set("end_date", e.target.value)} /></div>
              </div>
              <div><Label>{fr ? "Salaire" : "Salary"}</Label><Input type="number" value={form.salary || ""} onChange={e => set("salary", Number(e.target.value))} /></div>
              <div><Label>{fr ? "Conditions" : "Terms"}</Label><Textarea value={form.terms || ""} onChange={e => set("terms", e.target.value)} /></div>
            </>
          )}

          {/* LEAVE FORM */}
          {type === "leave" && (
            <>
              <div>
                <Label>{fr ? "Employé" : "Employee"}</Label>
                <Select value={form.employee_id || ""} onValueChange={v => set("employee_id", v)}>
                  <SelectTrigger><SelectValue placeholder={fr ? "Sélectionner..." : "Select..."} /></SelectTrigger>
                  <SelectContent>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{fr ? "Type de congé" : "Leave type"}</Label>
                <Select value={form.leave_type || ""} onValueChange={v => set("leave_type", v)}>
                  <SelectTrigger><SelectValue placeholder={fr ? "Sélectionner..." : "Select..."} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annual">{fr ? "Congé annuel" : "Annual leave"}</SelectItem>
                    <SelectItem value="sick">{fr ? "Congé maladie" : "Sick leave"}</SelectItem>
                    <SelectItem value="maternity">{fr ? "Congé maternité" : "Maternity leave"}</SelectItem>
                    <SelectItem value="personal">{fr ? "Congé personnel" : "Personal leave"}</SelectItem>
                    <SelectItem value="unpaid">{fr ? "Congé sans solde" : "Unpaid leave"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>{fr ? "Date de début" : "Start date"}</Label><Input type="date" value={form.start_date || ""} onChange={e => set("start_date", e.target.value)} /></div>
                <div><Label>{fr ? "Date de fin" : "End date"}</Label><Input type="date" value={form.end_date || ""} onChange={e => set("end_date", e.target.value)} /></div>
              </div>
              <div><Label>{fr ? "Raison" : "Reason"}</Label><Textarea value={form.reason || ""} onChange={e => set("reason", e.target.value)} /></div>
            </>
          )}

          {/* RECRUITMENT FORM */}
          {type === "recruitment" && (
            <>
              <div><Label>{fr ? "Poste" : "Position"}</Label><Input value={form.position || ""} onChange={e => set("position", e.target.value)} /></div>
              <div>
                <Label>{fr ? "Département" : "Department"}</Label>
                <Select value={form.department_id || ""} onValueChange={v => set("department_id", v)}>
                  <SelectTrigger><SelectValue placeholder={fr ? "Sélectionner..." : "Select..."} /></SelectTrigger>
                  <SelectContent>
                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{fr ? "Fourchette salariale" : "Salary range"}</Label><Input value={form.salary_range || ""} onChange={e => set("salary_range", e.target.value)} placeholder="ex: 500000 - 800000 FC" /></div>
              <div><Label>{fr ? "Description" : "Description"}</Label><Textarea value={form.description || ""} onChange={e => set("description", e.target.value)} /></div>
            </>
          )}

          {/* EVALUATION FORM */}
          {type === "evaluation" && (
            <>
              <div>
                <Label>{fr ? "Employé" : "Employee"}</Label>
                <Select value={form.employee_id || ""} onValueChange={v => set("employee_id", v)}>
                  <SelectTrigger><SelectValue placeholder={fr ? "Sélectionner..." : "Select..."} /></SelectTrigger>
                  <SelectContent>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{fr ? "Période" : "Period"}</Label><Input value={form.period || ""} onChange={e => set("period", e.target.value)} placeholder="ex: Q1 2026" /></div>
              <div><Label>{fr ? "Score (1-5)" : "Score (1-5)"}</Label><Input type="number" min={1} max={5} value={form.score || ""} onChange={e => set("score", Number(e.target.value))} /></div>
              <div><Label>{fr ? "Commentaires" : "Comments"}</Label><Textarea value={form.comments || ""} onChange={e => set("comments", e.target.value)} /></div>
            </>
          )}

          {/* TRAINING FORM */}
          {type === "training" && (
            <>
              <div><Label>{fr ? "Titre" : "Title"}</Label><Input value={form.title || ""} onChange={e => set("title", e.target.value)} /></div>
              <div><Label>{fr ? "Description" : "Description"}</Label><Textarea value={form.description || ""} onChange={e => set("description", e.target.value)} /></div>
              <div><Label>{fr ? "Formateur" : "Instructor"}</Label><Input value={form.instructor || ""} onChange={e => set("instructor", e.target.value)} /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>{fr ? "Date de début" : "Start date"}</Label><Input type="date" value={form.start_date || ""} onChange={e => set("start_date", e.target.value)} /></div>
                <div><Label>{fr ? "Date de fin" : "End date"}</Label><Input type="date" value={form.end_date || ""} onChange={e => set("end_date", e.target.value)} /></div>
              </div>
              <div><Label>{fr ? "Nombre de participants" : "Participants"}</Label><Input type="number" value={form.participants_count || 0} onChange={e => set("participants_count", Number(e.target.value))} /></div>
            </>
          )}

          {/* ABSENCE FORM */}
          {type === "absence" && (
            <>
              <div>
                <Label>{fr ? "Employé" : "Employee"}</Label>
                <Select value={form.employee_id || ""} onValueChange={v => set("employee_id", v)}>
                  <SelectTrigger><SelectValue placeholder={fr ? "Sélectionner..." : "Select..."} /></SelectTrigger>
                  <SelectContent>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>{fr ? "Date de début" : "Start date"}</Label><Input type="date" value={form.start_date || ""} onChange={e => set("start_date", e.target.value)} /></div>
                <div><Label>{fr ? "Date de fin" : "End date"}</Label><Input type="date" value={form.end_date || ""} onChange={e => set("end_date", e.target.value)} /></div>
              </div>
              <div><Label>{fr ? "Raison" : "Reason"}</Label><Textarea value={form.reason || ""} onChange={e => set("reason", e.target.value)} /></div>
            </>
          )}

          {/* ATTENDANCE FORM */}
          {type === "attendance" && (
            <>
              <div>
                <Label>{fr ? "Employé" : "Employee"}</Label>
                <Select value={form.employee_id || ""} onValueChange={v => set("employee_id", v)}>
                  <SelectTrigger><SelectValue placeholder={fr ? "Sélectionner..." : "Select..."} /></SelectTrigger>
                  <SelectContent>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{fr ? "Date" : "Date"}</Label><Input type="date" value={form.date || ""} onChange={e => set("date", e.target.value)} /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>{fr ? "Arrivée" : "Check in"}</Label><Input type="time" value={form.check_in || ""} onChange={e => set("check_in", e.target.value)} /></div>
                <div><Label>{fr ? "Départ" : "Check out"}</Label><Input type="time" value={form.check_out || ""} onChange={e => set("check_out", e.target.value)} /></div>
              </div>
              <div>
                <Label>{fr ? "Statut" : "Status"}</Label>
                <Select value={form.status || "present"} onValueChange={v => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">{fr ? "Présent" : "Present"}</SelectItem>
                    <SelectItem value="late">{fr ? "En retard" : "Late"}</SelectItem>
                    <SelectItem value="absent">{fr ? "Absent" : "Absent"}</SelectItem>
                    <SelectItem value="half_day">{fr ? "Demi-journée" : "Half day"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{fr ? "Notes" : "Notes"}</Label><Input value={form.notes || ""} onChange={e => set("notes", e.target.value)} /></div>
            </>
          )}

          {/* SKILL FORM */}
          {type === "skill" && (
            <>
              <div>
                <Label>{fr ? "Employé" : "Employee"}</Label>
                <Select value={form.employee_id || ""} onValueChange={v => set("employee_id", v)}>
                  <SelectTrigger><SelectValue placeholder={fr ? "Sélectionner..." : "Select..."} /></SelectTrigger>
                  <SelectContent>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{fr ? "Compétence" : "Skill name"}</Label><Input value={form.skill_name || ""} onChange={e => set("skill_name", e.target.value)} /></div>
              <div>
                <Label>{fr ? "Niveau" : "Level"}</Label>
                <Select value={form.level || "beginner"} onValueChange={v => set("level", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">{fr ? "Débutant" : "Beginner"}</SelectItem>
                    <SelectItem value="intermediate">{fr ? "Intermédiaire" : "Intermediate"}</SelectItem>
                    <SelectItem value="advanced">{fr ? "Avancé" : "Advanced"}</SelectItem>
                    <SelectItem value="expert">{fr ? "Expert" : "Expert"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{fr ? "Notes" : "Notes"}</Label><Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} /></div>
            </>
          )}

          {/* PROMOTION FORM */}
          {type === "promotion" && (
            <>
              <div>
                <Label>{fr ? "Employé" : "Employee"}</Label>
                <Select value={form.employee_id || ""} onValueChange={v => set("employee_id", v)}>
                  <SelectTrigger><SelectValue placeholder={fr ? "Sélectionner..." : "Select..."} /></SelectTrigger>
                  <SelectContent>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>{fr ? "Ancien poste" : "Old position"}</Label><Input value={form.old_position || ""} onChange={e => set("old_position", e.target.value)} /></div>
                <div><Label>{fr ? "Nouveau poste" : "New position"}</Label><Input value={form.new_position || ""} onChange={e => set("new_position", e.target.value)} /></div>
              </div>
              <div><Label>{fr ? "Date d'effet" : "Effective date"}</Label><Input type="date" value={form.effective_date || ""} onChange={e => set("effective_date", e.target.value)} /></div>
              <div><Label>{fr ? "Notes" : "Notes"}</Label><Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} /></div>
            </>
          )}

          {/* DISCIPLINE FORM */}
          {type === "discipline" && (
            <>
              <div>
                <Label>{fr ? "Employé" : "Employee"}</Label>
                <Select value={form.employee_id || ""} onValueChange={v => set("employee_id", v)}>
                  <SelectTrigger><SelectValue placeholder={fr ? "Sélectionner..." : "Select..."} /></SelectTrigger>
                  <SelectContent>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{fr ? "Type" : "Type"}</Label>
                <Select value={form.type || "warning"} onValueChange={v => set("type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warning">{fr ? "Avertissement" : "Warning"}</SelectItem>
                    <SelectItem value="reprimand">{fr ? "Blâme" : "Reprimand"}</SelectItem>
                    <SelectItem value="suspension">{fr ? "Suspension" : "Suspension"}</SelectItem>
                    <SelectItem value="termination">{fr ? "Licenciement" : "Termination"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{fr ? "Description" : "Description"}</Label><Textarea value={form.description || ""} onChange={e => set("description", e.target.value)} /></div>
              <div><Label>{fr ? "Action prise" : "Action taken"}</Label><Input value={form.action_taken || ""} onChange={e => set("action_taken", e.target.value)} /></div>
              <div><Label>{fr ? "Date" : "Date"}</Label><Input type="date" value={form.date || ""} onChange={e => set("date", e.target.value)} /></div>
            </>
          )}

          {/* HEALTH & SAFETY FORM */}
          {type === "health_safety" && (
            <>
              <div>
                <Label>{fr ? "Type d'incident" : "Incident type"}</Label>
                <Select value={form.incident_type || ""} onValueChange={v => set("incident_type", v)}>
                  <SelectTrigger><SelectValue placeholder={fr ? "Sélectionner..." : "Select..."} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="accident">{fr ? "Accident de travail" : "Workplace accident"}</SelectItem>
                    <SelectItem value="near_miss">{fr ? "Presqu'accident" : "Near miss"}</SelectItem>
                    <SelectItem value="hazard">{fr ? "Danger identifié" : "Hazard identified"}</SelectItem>
                    <SelectItem value="equipment">{fr ? "Défaut équipement" : "Equipment failure"}</SelectItem>
                    <SelectItem value="other">{fr ? "Autre" : "Other"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>{fr ? "Date" : "Date"}</Label><Input type="date" value={form.date || ""} onChange={e => set("date", e.target.value)} /></div>
                <div><Label>{fr ? "Lieu" : "Location"}</Label><Input value={form.location || ""} onChange={e => set("location", e.target.value)} /></div>
              </div>
              <div><Label>{fr ? "Description" : "Description"}</Label><Textarea value={form.description || ""} onChange={e => set("description", e.target.value)} /></div>
              <div>
                <Label>{fr ? "Gravité" : "Severity"}</Label>
                <Select value={form.severity || "low"} onValueChange={v => set("severity", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{fr ? "Faible" : "Low"}</SelectItem>
                    <SelectItem value="medium">{fr ? "Moyen" : "Medium"}</SelectItem>
                    <SelectItem value="high">{fr ? "Élevé" : "High"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{fr ? "Statut" : "Status"}</Label>
                <Select value={form.status || "open"} onValueChange={v => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">{fr ? "Ouvert" : "Open"}</SelectItem>
                    <SelectItem value="investigating">{fr ? "En cours" : "Investigating"}</SelectItem>
                    <SelectItem value="resolved">{fr ? "Résolu" : "Resolved"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{fr ? "Signalé par" : "Reported by"}</Label><Input value={form.reported_by || ""} onChange={e => set("reported_by", e.target.value)} /></div>
            </>
          )}

          {/* DOCUMENT FORM */}
          {type === "document" && (
            <>
              <div><Label>{fr ? "Titre" : "Title"}</Label><Input value={form.title || ""} onChange={e => set("title", e.target.value)} /></div>
              <div>
                <Label>{fr ? "Type" : "Type"}</Label>
                <Select value={form.doc_type || ""} onValueChange={v => set("doc_type", v)}>
                  <SelectTrigger><SelectValue placeholder={fr ? "Sélectionner..." : "Select..."} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contract">{fr ? "Contrat" : "Contract"}</SelectItem>
                    <SelectItem value="id">{fr ? "Pièce d'identité" : "ID document"}</SelectItem>
                    <SelectItem value="certificate">{fr ? "Certificat" : "Certificate"}</SelectItem>
                    <SelectItem value="report">{fr ? "Rapport" : "Report"}</SelectItem>
                    <SelectItem value="other">{fr ? "Autre" : "Other"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{fr ? "Employé" : "Employee"}</Label>
                <Select value={form.employee_id || ""} onValueChange={v => set("employee_id", v)}>
                  <SelectTrigger><SelectValue placeholder={fr ? "Non assigné" : "Unassigned"} /></SelectTrigger>
                  <SelectContent>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{fr ? "Notes" : "Notes"}</Label><Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} /></div>
            </>
          )}

          {/* COMMUNICATION FORM */}
          {type === "communication" && (
            <>
              <div><Label>{fr ? "Sujet" : "Subject"}</Label><Input value={form.subject || ""} onChange={e => set("subject", e.target.value)} /></div>
              <div><Label>{fr ? "Message" : "Message"}</Label><Textarea rows={4} value={form.message || ""} onChange={e => set("message", e.target.value)} /></div>
              <div>
                <Label>{fr ? "Priorité" : "Priority"}</Label>
                <Select value={form.priority || "normal"} onValueChange={v => set("priority", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{fr ? "Basse" : "Low"}</SelectItem>
                    <SelectItem value="normal">{fr ? "Normale" : "Normal"}</SelectItem>
                    <SelectItem value="high">{fr ? "Haute" : "High"}</SelectItem>
                    <SelectItem value="urgent">{fr ? "Urgente" : "Urgent"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{fr ? "Annuler" : "Cancel"}</Button>
          <Button onClick={() => onSave(form)} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin mr-1" /> : <Save className="size-4 mr-1" />}
            {fr ? "Enregistrer" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default HRPage
