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
      const [empR, deptR, contR, leaveR, recR, evalR, trainR] = await Promise.all([
        insforge.database.from("hr_employees").select("*").eq("workspace_id", wid).order("last_name"),
        insforge.database.from("hr_departments").select("*").eq("workspace_id", wid).order("name"),
        insforge.database.from("hr_contracts").select("*").eq("workspace_id", wid).order("start_date", { ascending: false }),
        insforge.database.from("hr_leave_requests").select("*").eq("workspace_id", wid).order("created_at", { ascending: false }),
        insforge.database.from("hr_recruitments").select("*").eq("workspace_id", wid).order("created_at", { ascending: false }),
        insforge.database.from("hr_evaluations").select("*").eq("workspace_id", wid).order("created_at", { ascending: false }),
        insforge.database.from("hr_trainings").select("*").eq("workspace_id", wid).order("start_date", { ascending: false }),
      ])
      setEmployees((empR.data as any[]) || [])
      setDepartments((deptR.data as any[]) || [])
      setContracts((contR.data as any[]) || [])
      setLeaves((leaveR.data as any[]) || [])
      setRecruitments((recR.data as any[]) || [])
      setEvaluations((evalR.data as any[]) || [])
      setTrainings((trainR.data as any[]) || [])
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
        training: "hr_trainings",
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
        <SectionCard title={t("Présence", "Attendance")}>
          <EmptyState icon={ClipboardCheck} title={t("Pointage quotidien", "Daily attendance")} desc={t("Suivi des présences des employés", "Employee attendance tracking")} />
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
        <SectionCard title={t("Compétences", "Skills")}>
          <EmptyState icon={Zap} title={t("Gestion des compétences", "Skills management")} desc={t("Évaluez et suivez les compétences", "Track and evaluate skills")} />
        </SectionCard>
      )}

      {/* ─── PROMOTIONS ────────────────────────────────── */}
      {tab === "hr_promotions" && (
        <SectionCard title={t("Promotions", "Promotions")}>
          <EmptyState icon={ArrowUpRight} title={t("Promotions", "Promotions")} desc={t("Historique des promotions", "Promotion history")} />
        </SectionCard>
      )}

      {/* ─── DISCIPLINE ────────────────────────────────── */}
      {tab === "hr_discipline" && (
        <SectionCard title={t("Discipline", "Discipline")}>
          <EmptyState icon={Shield} title={t("Discipline", "Discipline")} desc={t("Gestion disciplinaire", "Disciplinary management")} />
        </SectionCard>
      )}

      {/* ─── HEALTH & SAFETY ───────────────────────────── */}
      {tab === "hr_health_safety" && (
        <SectionCard title={t("Santé et sécurité", "Health & Safety")}>
          <EmptyState icon={Heart} title={t("Santé et sécurité", "Health & Safety")} desc={t("Incidents et mesures de sécurité", "Incidents and safety measures")} />
        </SectionCard>
      )}

      {/* ─── DOCUMENTS ─────────────────────────────────── */}
      {tab === "hr_documents" && (
        <SectionCard
          title={t("Documents RH", "HR Documents")}
          action={<Button size="sm"><Upload className="size-4 mr-1" />{t("Importer", "Upload")}</Button>}
        >
          <EmptyState icon={FolderOpen} title={t("Aucun document", "No documents")} desc={t("Uploadez des documents RH", "Upload HR documents")} />
        </SectionCard>
      )}

      {/* ─── COMMUNICATION ─────────────────────────────── */}
      {tab === "hr_communication" && (
        <SectionCard title={t("Communication interne", "Internal Communication")}>
          <EmptyState icon={MessageSquare} title={t("Messages internes", "Internal messages")} desc={t("Communiquez avec l'équipe", "Communicate with the team")} />
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
          <EmptyState icon={Clipboard} title={t("Journal d'audit RH", "HR Audit Log")} desc={t("Toutes les actions sont enregistrées", "All actions are recorded")} />
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
              <Button variant="outline" size="sm">{t("Configurer", "Configure")}</Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">{t("Durée de congé annuel", "Annual leave days")}</p>
                <p className="text-xs text-muted-foreground">{t("Nombre de jours de congé par an", "Number of leave days per year")}</p>
              </div>
              <Button variant="outline" size="sm">{t("Modifier", "Edit")}</Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">{t("Politique de pointage", "Attendance policy")}</p>
                <p className="text-xs text-muted-foreground">{t("Horaires et règles de présence", "Working hours and attendance rules")}</p>
              </div>
              <Button variant="outline" size="sm">{t("Configurer", "Configure")}</Button>
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
