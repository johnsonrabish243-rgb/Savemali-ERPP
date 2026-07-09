import * as React from "react"
import {
  BookOpen, Search, Plus, Users, GraduationCap, Calendar,
  Edit2, Trash2, Loader2, RefreshCw, DollarSign, Check, X,
  Clock, FileText, ClipboardList, UserCog,
  CalendarDays, Shield, AlertTriangle, Receipt, ClipboardCheck
} from "lucide-react"
import PersonnelManager from "@/components/education/PersonnelManager"
import { ReportGenerator } from "@/components/ReportGenerator"
import { EmptyState } from "@/components/EmptyState"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DialogFooterBrand } from "@/components/DialogFooterBrand"
import { PageFooter } from "@/components/PageFooter"
import { usePageEntrance } from "@/hooks/use-page-entrance"
import { useLanguage } from "@/lib/i18n"
import { useAuth } from "@/hooks/use-auth"
import { useRole } from "@/hooks/use-role"
import { insforge } from "@/lib/supabase"
import { trackModuleOpen } from "@/lib/context-tracker"
import { safeParseFloat } from "@/lib/utils"
import { formatCurrency } from "@/lib/currency"
import { validateFields, hasErrors } from "@/lib/validation"
import { studentRules, teacherRules, classRules, examRules, feePaymentRules } from "@/lib/rules"
import { publishNotification, createPaymentNotification, createGradeNotification, createAttendanceNotification } from "@/lib/notifications"
import { detectInjection, logSecurityEvent } from "@/lib/security"
import { toast } from "sonner"

type Page = "home" | "education" | "pharmacy" | "commerce" | "gestion" | "dashboard" | "signin" | "signup" | "members" | "reports" | "privacy" | "terms"
interface Props { onNavigate: (p: Page) => void; initialTab?: string }

interface Student { id: string; workspace_id: string; first_name: string; last_name: string; date_of_birth: string | null; class_name: string | null; gender: string | null; parent_phone: string | null; parent_email: string | null; enrolled_at: string | null; status: string }
interface Teacher { id: string; workspace_id: string; first_name: string; last_name: string; phone: string | null; email: string | null; subject: string | null; salary_usd: number | null; hire_date: string | null; status: string }
interface Class { id: string; workspace_id: string; name: string; level: string | null; teacher_id: string | null; fees_usd: number | null; status: string }
interface Attendance { id: string; workspace_id: string; student_id: string; class_id: string; date: string; status: string; notes: string | null }
interface Payment { id: string; workspace_id: string; student_id: string; amount_usd: number; description: string | null; paid_at: string }
interface Exam { id: string; workspace_id: string; class_id: string; name: string; subject: string; date: string; max_score: number; coefficient: number; term: string | null }
interface ExamResult { id: string; workspace_id: string; exam_id: string; student_id: string; score: number; grade: string | null; remarks: string | null }

const EMPTY_STUDENT = { first_name: "", last_name: "", class_name: "", gender: "M", parent_phone: "" }
const EMPTY_TEACHER = { first_name: "", last_name: "", phone: "", subject: "", salary_usd: "", status: "active" }
const EMPTY_CLASS = { name: "", level: "", teacher_id: "", fees_usd: "", status: "active" }
const EMPTY_EXAM = { name: "", class_id: "", subject: "", date: "", max_score: "20", coefficient: "1", term: "" }
const EMPTY_PAYMENT = { student_id: "", amount_usd: "", description: "" }

const GRADE_MAP: [number, string][] = [[16, "TB"], [14, "B"], [12, "AB"], [10, "S"], [8, "F"], [0, "I"]]

function getGrade(score: number): string {
  for (const [min, g] of GRADE_MAP) if (score >= min) return g
  return "I"
}

function getNormalizedGrade(score: number, maxScore: number): string {
  const normalized = maxScore > 0 ? (score / maxScore) * 20 : 0
  return getGrade(normalized)
}

export function EducationPage({ onNavigate, initialTab }: Props) {
  const { lang } = useLanguage()
  const { workspace, user } = useAuth()
  const { role } = useRole()
  const fr = lang === "fr"
  const [tab, setTab] = React.useState(initialTab || "students")

  React.useEffect(() => {
    trackModuleOpen("education")
  }, [])

  const [students, setStudents] = React.useState<Student[]>([])
  const [teachers, setTeachers] = React.useState<Teacher[]>([])
  const [classes, setClasses] = React.useState<Class[]>([])
  const [attendance, setAttendance] = React.useState<Attendance[]>([])
  const [payments, setPayments] = React.useState<Payment[]>([])
  const [exams, setExams] = React.useState<Exam[]>([])
  const [examResults, setExamResults] = React.useState<ExamResult[]>([])
  const [members, setMembers] = React.useState<any[]>([])
  const [scheduleEntries, setScheduleEntries] = React.useState<any[]>([])
  const [scheduleDlg, setScheduleDlg] = React.useState(false)
  const [editScheduleId, setEditScheduleId] = React.useState<string | null>(null)
  const [scheduleForm, setScheduleForm] = React.useState({ day: "lundi", time: "08:00", class_name: "", subject: "", teacher: "" })
  const [gradeEntries, setGradeEntries] = React.useState<any[]>([])
  const [gradeFilterClass, setGradeFilterClass] = React.useState("")
  const [gradeDlg, setGradeDlg] = React.useState(false)
  const [editGradeId, setEditGradeId] = React.useState<string | null>(null)
  const [gradeForm, setGradeForm] = React.useState({ student_name: "", class_name: "", subject: "", score: "", date: "" })
  const [disciplineEntries, setDisciplineEntries] = React.useState<any[]>([])
  const [disciplineDlg, setDisciplineDlg] = React.useState(false)
  const [editDisciplineId, setEditDisciplineId] = React.useState<string | null>(null)
  const [disciplineForm, setDisciplineForm] = React.useState({ student_name: "", class_name: "", date: "", reason: "", action: "", status: "Open" })
  const [incidentEntries, setIncidentEntries] = React.useState<any[]>([])
  const [incidentDlg, setIncidentDlg] = React.useState(false)
  const [editIncidentId, setEditIncidentId] = React.useState<string | null>(null)
  const [incidentForm, setIncidentForm] = React.useState({ date: "", type: "Other", description: "", reported_by: "", status: "Open" })
  const [accountingEntries, setAccountingEntries] = React.useState<any[]>([])
  const [accountingDlg, setAccountingDlg] = React.useState(false)
  const [editAccountingId, setEditAccountingId] = React.useState<string | null>(null)
  const [accountingForm, setAccountingForm] = React.useState({ date: "", description: "", type: "income", category: "", amount: "" })
  const [historyEntries, setHistoryEntries] = React.useState<any[]>([])
  const [histDateStart, setHistDateStart] = React.useState("")
  const [histDateEnd, setHistDateEnd] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")

  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)

  const fetchData = React.useCallback(async () => {
    if (!workspace) return
    setLoading(true)
    const [{ data: stds }, { data: tchs }, { data: cls }, { data: att }, { data: pays }, { data: exs }, { data: exrs }, { data: mems }] = await Promise.all([
      insforge.database.from("students").select("*").eq("workspace_id", workspace.id).order("last_name"),
      insforge.database.from("teachers").select("*").eq("workspace_id", workspace.id).order("last_name"),
      insforge.database.from("classes").select("*").eq("workspace_id", workspace.id).order("name"),
      insforge.database.from("attendance").select("*").eq("workspace_id", workspace.id),
      insforge.database.from("fee_payments").select("*").eq("workspace_id", workspace.id).order("paid_at", { ascending: false }).limit(200),
      insforge.database.from("exams").select("*").eq("workspace_id", workspace.id).order("date", { ascending: false }),
      insforge.database.from("exam_results").select("*").eq("workspace_id", workspace.id),
      insforge.database.from("workspace_members").select("*").eq("workspace_id", workspace.id),
    ])
    setStudents((stds as Student[]) ?? [])
    setTeachers((tchs as Teacher[]) ?? [])
    setClasses((cls as Class[]) ?? [])
    setAttendance((att as Attendance[]) ?? [])
    setPayments((pays as Payment[]) ?? [])
    setExams((exs as Exam[]) ?? [])
    setExamResults((exrs as ExamResult[]) ?? [])
    setMembers((mems as any[]) ?? [])
    setLoading(false)
  }, [workspace])

  React.useEffect(() => { fetchData() }, [fetchData])
  const wsKey = workspace?.id || "default"

  React.useEffect(() => {
    if (!workspace) return
    async function loadExtra() {
      const [schRes, grRes, disRes, incRes] = await Promise.all([
        insforge.database.from("edu_schedule").select("*").eq("workspace_id", workspace.id).order("day"),
        insforge.database.from("edu_grades").select("*").eq("workspace_id", workspace.id).order("created_at", { ascending: false }),
        insforge.database.from("edu_discipline").select("*").eq("workspace_id", workspace.id).order("created_at", { ascending: false }),
        insforge.database.from("edu_incidents").select("*").eq("workspace_id", workspace.id).order("created_at", { ascending: false }),
      ])
      setScheduleEntries((schRes.data as any[]) ?? [])
      setGradeEntries((grRes.data as any[]) ?? [])
      setDisciplineEntries((disRes.data as any[]) ?? [])
      setIncidentEntries((incRes.data as any[]) ?? [])
      // Fetch accounting from DB
      const { data: accData } = await insforge.database.from("edu_accounting").select("*").eq("workspace_id", workspace.id).order("entry_date", { ascending: false })
      setAccountingEntries((accData as any[]) ?? [])
      setHistoryEntries([])
    }
    loadExtra()
  }, [workspace?.id])

  const activeStudents = students.filter((s) => s.status === "active")
  const activeTeachers = teachers.filter((t) => t.status === "active")
  const totalFees = payments.reduce((s, p) => s + Number(p.amount_usd), 0) ?? 0
  const classCount = classes.filter((c) => c.status === "active").length

  const studentBalances = React.useMemo(() => {
    const map: Record<string, { feesOwed: number; totalPaid: number; remaining: number }> = {}
    for (const s of activeStudents) {
      const cls = classes.find((c) => c.name === s.class_name)
      const feesOwed = Number(cls?.fees_usd ?? 0)
      const totalPaid = payments.filter((p) => p.student_id === s.id).reduce((sum, p) => sum + Number(p.amount_usd), 0)
      map[s.id] = { feesOwed, totalPaid, remaining: feesOwed - totalPaid }
    }
    return map
  }, [activeStudents, classes, payments])

  const stats = [
    { label: fr ? "Élèves inscrits" : "Enrolled students", value: activeStudents.length, icon: Users },
    { label: fr ? "Classes actives" : "Active classes", value: classCount, icon: GraduationCap },
    { label: fr ? "Total scolarité" : "Total fees", value: formatCurrency(totalFees), icon: DollarSign },
    { label: fr ? "Paiements" : "Payments", value: payments.length, icon: FileText },
  ]

  const filteredStudents = students.filter((s) =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    (s.class_name ?? "").toLowerCase().includes(search.toLowerCase())
  )
  const filteredTeachers = teachers.filter((t) =>
    `${t.first_name} ${t.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    (t.subject ?? "").toLowerCase().includes(search.toLowerCase())
  )
  const filteredClasses = classes.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.level ?? "").toLowerCase().includes(search.toLowerCase())
  )

  const rootRef = usePageEntrance([loading])

  const todayStr = new Date().toISOString().slice(0, 10)

  /* ---------- Student CRUD ---------- */
  const [showStudentDlg, setShowStudentDlg] = React.useState(false)
  const [editStudent, setEditStudent] = React.useState<Student | null>(null)
  const [studentForm, setStudentForm] = React.useState({ ...EMPTY_STUDENT })
  const [studentErrors, setStudentErrors] = React.useState<Record<string, string>>({})

  const openAddStudent = () => { setStudentForm({ ...EMPTY_STUDENT }); setEditStudent(null); setError(null); setStudentErrors({}); setShowStudentDlg(true) }
  const openEditStudent = (s: Student) => {
    setEditStudent(s)
    setStudentForm({ first_name: s.first_name, last_name: s.last_name, class_name: s.class_name ?? "", gender: s.gender ?? "M", parent_phone: s.parent_phone ?? "" })
    setError(null); setStudentErrors({}); setShowStudentDlg(true)
  }
  const saveStudent = async () => {
    if (!workspace) return
    const errs = validateFields(studentForm, studentRules)
    setStudentErrors(errs)
    if (hasErrors(errs)) return
    const formStr = [studentForm.first_name, studentForm.last_name, studentForm.class_name, studentForm.parent_phone].join(" ")
    if (detectInjection(formStr)) {
      logSecurityEvent({ type: "injection_attempt", details: `Suspicious input in student form`, path: "education" })
      setError(fr ? "Entrée suspecte détectée." : "Suspicious input detected."); setSaving(false); return
    }
    setSaving(true); setError(null)
    if (!editStudent && students.some((s) => s.first_name.trim().toLowerCase() === studentForm.first_name.trim().toLowerCase() && s.last_name.trim().toLowerCase() === studentForm.last_name.trim().toLowerCase())) {
      toast.error(fr ? "Un élève avec ce nom existe déjà" : "A student with this name already exists")
      setSaving(false); return
    }
    const payload = { workspace_id: workspace.id, ...studentForm, class_name: studentForm.class_name || null, parent_phone: studentForm.parent_phone || null, status: "active" }
    const { error: e } = editStudent
      ? await insforge.database.from("students").update(payload).eq("id", editStudent.id).eq("workspace_id", workspace.id)
      : await insforge.database.from("students").insert([payload])
    if (e) { setError(e.message); setSaving(false); return }
    if (!editStudent) import("@/lib/stats").then(({ invalidateStatsCache }) => invalidateStatsCache())
    setShowStudentDlg(false); setEditStudent(null); fetchData(); setSaving(false)
  }
  const deleteStudent = async (id: string) => {
    if (!confirm(fr ? "Supprimer cet élève ?" : "Delete this student?")) return
    await insforge.database.from("attendance").delete().eq("student_id", id).eq("workspace_id", workspace.id)
    await insforge.database.from("exam_results").delete().eq("student_id", id).eq("workspace_id", workspace.id)
    await insforge.database.from("fee_payments").delete().eq("student_id", id).eq("workspace_id", workspace.id)
    const { error } = await insforge.database.from("students").delete().eq("id", id).eq("workspace_id", workspace.id)
    if (error) { alert(fr ? "Erreur lors de la suppression" : "Delete error"); return }
    fetchData()
  }

  /* ---------- Teacher CRUD ---------- */
  const [showTeacherDlg, setShowTeacherDlg] = React.useState(false)
  const [editTeacher, setEditTeacher] = React.useState<Teacher | null>(null)
  const [teacherForm, setTeacherForm] = React.useState({ ...EMPTY_TEACHER })
  const [teacherErrors, setTeacherErrors] = React.useState<Record<string, string>>({})

  const openAddTeacher = () => { setTeacherForm({ ...EMPTY_TEACHER }); setEditTeacher(null); setError(null); setTeacherErrors({}); setShowTeacherDlg(true) }
  const openEditTeacher = (t: Teacher) => {
    setEditTeacher(t)
    setTeacherForm({ first_name: t.first_name, last_name: t.last_name, phone: t.phone ?? "", subject: t.subject ?? "", salary_usd: String(t.salary_usd ?? ""), status: t.status })
    setError(null); setTeacherErrors({}); setShowTeacherDlg(true)
  }
  const saveTeacher = async () => {
    if (!workspace) return
    const errs = validateFields(teacherForm, teacherRules)
    setTeacherErrors(errs)
    if (hasErrors(errs)) return
    const formStr = [teacherForm.first_name, teacherForm.last_name, teacherForm.phone, teacherForm.subject].join(" ")
    if (detectInjection(formStr)) {
      logSecurityEvent({ type: "injection_attempt", details: `Suspicious input in teacher form`, path: "education" })
      setError(fr ? "Entrée suspecte détectée." : "Suspicious input detected."); setSaving(false); return
    }
    setSaving(true); setError(null)
    if (!editTeacher && teachers.some((t) => t.first_name.trim().toLowerCase() === teacherForm.first_name.trim().toLowerCase() && t.last_name.trim().toLowerCase() === teacherForm.last_name.trim().toLowerCase())) {
      toast.error(fr ? "Un enseignant avec ce nom existe déjà" : "A teacher with this name already exists")
      setSaving(false); return
    }
    const payload = { workspace_id: workspace.id, first_name: teacherForm.first_name.trim(), last_name: teacherForm.last_name.trim(), phone: teacherForm.phone || null, subject: teacherForm.subject || null, salary_usd: safeParseFloat(teacherForm.salary_usd) || null, status: teacherForm.status }
    const { error: e } = editTeacher
      ? await insforge.database.from("teachers").update(payload).eq("id", editTeacher.id).eq("workspace_id", workspace.id)
      : await insforge.database.from("teachers").insert([payload])
    if (e) { setError(e.message); setSaving(false); return }
    if (!editTeacher) import("@/lib/stats").then(({ invalidateStatsCache }) => invalidateStatsCache())
    setShowTeacherDlg(false); setEditTeacher(null); fetchData(); setSaving(false)
  }
  const deleteTeacher = async (id: string) => {
    if (!confirm(fr ? "Supprimer cet enseignant ?" : "Delete this teacher?")) return
    const { error } = await insforge.database.from("teachers").delete().eq("id", id).eq("workspace_id", workspace.id)
    if (error) { alert(fr ? "Erreur lors de la suppression" : "Delete error"); return }
    fetchData()
  }

  /* ---------- Class CRUD ---------- */
  const [showClassDlg, setShowClassDlg] = React.useState(false)
  const [editClass, setEditClass] = React.useState<Class | null>(null)
  const [classForm, setClassForm] = React.useState({ ...EMPTY_CLASS })
  const [classErrors, setClassErrors] = React.useState<Record<string, string>>({})

  const openAddClass = () => { setClassForm({ ...EMPTY_CLASS }); setEditClass(null); setError(null); setClassErrors({}); setShowClassDlg(true) }
  const openEditClass = (c: Class) => {
    setEditClass(c)
    setClassForm({ name: c.name, level: c.level ?? "", teacher_id: c.teacher_id ?? "", fees_usd: String(c.fees_usd ?? ""), status: c.status })
    setError(null); setClassErrors({}); setShowClassDlg(true)
  }
  const saveClass = async () => {
    if (!workspace) return
    const errs = validateFields(classForm, classRules)
    setClassErrors(errs)
    if (hasErrors(errs)) return
    const formStr = [classForm.name, classForm.level, classForm.teacher_id].join(" ")
    if (detectInjection(formStr)) {
      logSecurityEvent({ type: "injection_attempt", details: `Suspicious input in class form`, path: "education" })
      setError(fr ? "Entrée suspecte détectée." : "Suspicious input detected."); setSaving(false); return
    }
    setSaving(true); setError(null)
    const payload = { workspace_id: workspace.id, name: classForm.name.trim(), level: classForm.level || null, teacher_id: classForm.teacher_id || null, fees_usd: safeParseFloat(classForm.fees_usd) || null, status: classForm.status }
    const { error: e } = editClass
      ? await insforge.database.from("classes").update(payload).eq("id", editClass.id).eq("workspace_id", workspace.id)
      : await insforge.database.from("classes").insert([payload])
    if (e) { setError(e.message); setSaving(false); return }
    setShowClassDlg(false); setEditClass(null); fetchData(); setSaving(false)
  }
  const deleteClass = async (id: string) => {
    if (!confirm(fr ? "Supprimer cette classe ?" : "Delete this class?")) return
    await insforge.database.from("exam_results").delete().eq("class_id", id).eq("workspace_id", workspace.id)
    await insforge.database.from("exams").delete().eq("class_id", id).eq("workspace_id", workspace.id)
    await insforge.database.from("students").update({ class_name: null }).eq("class_name", classes.find((c) => c.id === id)?.name ?? "").eq("workspace_id", workspace.id)
    const { error } = await insforge.database.from("classes").delete().eq("id", id).eq("workspace_id", workspace.id)
    if (error) { alert(fr ? "Erreur lors de la suppression" : "Delete error"); return }
    fetchData()
  }

  /* ---------- Payment ---------- */
  const [showPayDlg, setShowPayDlg] = React.useState(false)
  const [payForm, setPayForm] = React.useState({ ...EMPTY_PAYMENT })
  const [payErrors, setPayErrors] = React.useState<Record<string, string>>({})

  const openAddPayment = (studentId?: string) => {
    setPayForm({ student_id: studentId ?? "", amount_usd: "", description: "" })
    setError(null); setPayErrors({}); setShowPayDlg(true)
  }
  const savePayment = async () => {
    if (!workspace) return
    const errs = validateFields(payForm, feePaymentRules)
    setPayErrors(errs)
    if (hasErrors(errs)) return
    const formStr = [payForm.student_id, payForm.amount_usd, payForm.description].join(" ")
    if (detectInjection(formStr)) {
      logSecurityEvent({ type: "injection_attempt", details: `Suspicious input in payment form`, path: "education" })
      setError(fr ? "Entrée suspecte détectée." : "Suspicious input detected."); setSaving(false); return
    }
    setSaving(true); setError(null)
    const amountUsd = safeParseFloat(payForm.amount_usd, 0, false)
    const { error: e } = await insforge.database.from("fee_payments").insert([{ workspace_id: workspace.id, student_id: payForm.student_id, amount_usd: amountUsd, description: payForm.description || null }])
    if (e) { setError(e.message); setSaving(false); return }
    publishNotification(createPaymentNotification(workspace.id, user?.email?.split("@")[0] ?? "École", amountUsd, "FC", "education", "payments"))
    setShowPayDlg(false); fetchData(); setSaving(false)
  }

  /* ---------- Attendance ---------- */
  const [attDate, setAttDate] = React.useState(todayStr)
  const [attClassId, setAttClassId] = React.useState("")
  const [attRows, setAttRows] = React.useState<Record<string, string>>({})
  const [attView, setAttView] = React.useState<"saisie" | "rapport">("saisie")

  const attClassStudents = students.filter((s) => s.status === "active" && (!attClassId || s.class_name === classes.find((c) => c.id === attClassId)?.name))

  const loadAttendanceForDate = React.useCallback(() => {
    const existing = attendance.filter((a) => a.date === attDate)
    const map: Record<string, string> = {}
    for (const a of existing) map[a.student_id] = a.status
    setAttRows(map)
  }, [attendance, attDate])

  React.useEffect(() => { loadAttendanceForDate() }, [loadAttendanceForDate])

  const toggleAtt = async (studentId: string, status: string) => {
    if (!workspace || !attDate) return
    const current = attRows[studentId]
    const newStatus = current === status ? "" : status
    setAttRows((p) => {
      const next = { ...p }
      if (newStatus) next[studentId] = newStatus
      else delete next[studentId]
      return next
    })
    const cId = attClassId || ""
    if (newStatus) {
      await insforge.database.from("attendance").upsert({ workspace_id: workspace.id, student_id: studentId, class_id: cId, date: attDate, status: newStatus }, { onConflict: "student_id, date" })
    } else {
      await insforge.database.from("attendance").delete().eq("student_id", studentId).eq("date", attDate).eq("workspace_id", workspace.id)
    }
    fetchData()
  }

  const saveAttendance = async () => {
    if (!workspace || !attDate) return
    setSaving(true)
    const cId = attClassId || ""
    const upserts = attClassStudents
      .filter((s) => attRows[s.id])
      .map((s) => insforge.database.from("attendance").upsert({ workspace_id: workspace.id, student_id: s.id, class_id: cId, date: attDate, status: attRows[s.id] }, { onConflict: "student_id, date" }))
    await Promise.all(upserts)
    const className = classes.find((c) => c.id === cId)?.name ?? ""
    const presentCount = attClassStudents.filter((s) => attRows[s.id] === "present").length
    publishNotification(createAttendanceNotification(workspace.id, user?.email?.split("@")[0] ?? "École", className, presentCount, attClassStudents.length, "education", "attendance"))
    await fetchData()
    setSaving(false)
  }

  const attToday = attendance.filter((a) => a.date === attDate)
  const attSummary = {
    present: attToday.filter((a) => a.status === "present").length,
    absent: attToday.filter((a) => a.status === "absent").length,
    late: attToday.filter((a) => a.status === "late").length,
    excused: attToday.filter((a) => a.status === "excused").length,
  }

  /* ---------- Report cards ---------- */
  const [reportClassId, setReportClassId] = React.useState("")
  const [reportStudentId, setReportStudentId] = React.useState("")
  const [reportTerm, setReportTerm] = React.useState("")

  const reportStudents = students.filter((s) => {
    if (!reportClassId) return false
    const cls = classes.find((c) => c.id === reportClassId)
    return s.class_name === cls?.name && s.status === "active"
  })

  const reportClassExams = exams.filter((e) => e.class_id === reportClassId && (!reportTerm || e.term === reportTerm))
  const reportResults = examResults.filter((r) => reportStudentId ? r.student_id === reportStudentId : false)
  const studentReport = reportClassExams.map((e) => {
    const res = reportResults.find((r) => r.exam_id === e.id)
    return { exam: e, result: res ?? null, score: res ? res.score : null }
  })
  const totalScore = studentReport.reduce((s, r) => s + (r.score !== null ? (r.score / (r.exam.max_score || 20)) * 20 : 0) * r.exam.coefficient, 0)
  const totalCoef = Number(studentReport.reduce((s, r) => s + r.exam.coefficient, 0)) ?? 0
  const avgScore = totalCoef > 0 ? (totalScore / totalCoef) : 0

  /* ---------- Exam CRUD ---------- */
  const [showExamDlg, setShowExamDlg] = React.useState(false)
  const [editExam, setEditExam] = React.useState<Exam | null>(null)
  const [examForm, setExamForm] = React.useState({ ...EMPTY_EXAM })
  const [examErrors, setExamErrors] = React.useState<Record<string, string>>({})

  const openAddExam = () => { setExamForm({ ...EMPTY_EXAM }); setEditExam(null); setError(null); setExamErrors({}); setShowExamDlg(true) }
  const openEditExam = (e: Exam) => {
    setEditExam(e)
    setExamForm({ name: e.name, class_id: e.class_id, subject: e.subject, date: e.date?.slice(0, 10) ?? "", max_score: String(e.max_score), coefficient: String(e.coefficient), term: e.term ?? "" })
    setError(null); setExamErrors({}); setShowExamDlg(true)
  }
  const saveExam = async () => {
    if (!workspace) return
    const errs = validateFields(examForm, examRules)
    setExamErrors(errs)
    if (hasErrors(errs)) return
    const formStr = [examForm.name, examForm.class_id, examForm.subject, examForm.term].join(" ")
    if (detectInjection(formStr)) {
      logSecurityEvent({ type: "injection_attempt", details: `Suspicious input in exam form`, path: "education" })
      setError(fr ? "Entrée suspecte détectée." : "Suspicious input detected."); setSaving(false); return
    }
    setSaving(true); setError(null)
    const payload = { workspace_id: workspace.id, name: examForm.name.trim(), class_id: examForm.class_id, subject: examForm.subject || null, date: examForm.date || null, max_score: safeParseFloat(examForm.max_score) || 20, coefficient: safeParseFloat(examForm.coefficient) || 1, term: examForm.term || null }
    const { error: e } = editExam
      ? await insforge.database.from("exams").update(payload).eq("id", editExam.id).eq("workspace_id", workspace.id)
      : await insforge.database.from("exams").insert([payload])
    if (e) { setError(e.message); setSaving(false); return }
    setShowExamDlg(false); setEditExam(null); fetchData(); setSaving(false)
  }
  const deleteExam = async (id: string) => {
    if (!confirm(fr ? "Supprimer cet examen ?" : "Delete this exam?")) return
    const { error } = await insforge.database.from("exams").delete().eq("id", id).eq("workspace_id", workspace.id)
    if (error) { alert(fr ? "Erreur lors de la suppression" : "Delete error"); return }
    fetchData()
  }

  /* ---------- Grading ---------- */
  const [gradeExamId, setGradeExamId] = React.useState("")
  const [gradeScores, setGradeScores] = React.useState<Record<string, string>>({})

  const gradeExam = exams.find((e) => e.id === gradeExamId)
  const gradeClassStudents = students.filter((s) => {
    if (!gradeExam) return false
    const cls = classes.find((c) => c.id === gradeExam.class_id)
    return s.class_name === cls?.name && s.status === "active"
  })

  React.useEffect(() => {
    if (!gradeExamId) return
    const existing = examResults.filter((r) => r.exam_id === gradeExamId)
    const map: Record<string, string> = {}
    for (const r of existing) map[r.student_id] = String(r.score)
    setGradeScores(map)
  }, [examResults, gradeExamId])

  const saveGrades = async () => {
    if (!workspace || !gradeExamId) return
    setSaving(true)
    const exam = exams.find((e) => e.id === gradeExamId)
    for (const sid of gradeClassStudents.map((s) => s.id)) {
      const scoreStr = gradeScores[sid]
      if (scoreStr !== undefined && scoreStr !== "") {
        const score = safeParseFloat(scoreStr)
        const grade = getNormalizedGrade(score, exam?.max_score ?? 20)
        await insforge.database.from("exam_results").upsert({ workspace_id: workspace.id, exam_id: gradeExamId, student_id: sid, score, grade, remarks: null }, { onConflict: "exam_id, student_id" })
      }
    }
    if (exam) {
      const studentNames = gradeClassStudents.filter((s) => gradeScores[s.id] !== undefined && gradeScores[s.id] !== "").map((s) => `${s.first_name} ${s.last_name}`).join(", ")
      if (studentNames) {
        publishNotification(createGradeNotification(workspace.id, user?.email?.split("@")[0] ?? "École", studentNames, exam.subject, "education", "grades"))
      }
    }
    await fetchData()
    setSaving(false)
  }

  /* ---------- Rapport attendance ---------- */
  const [rapportDateStart, setRapportDateStart] = React.useState("")
  const [rapportDateEnd, setRapportDateEnd] = React.useState("")

  if (!workspace) return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <BookOpen className="size-12 text-muted-foreground" />
      <p className="text-muted-foreground">{fr ? "Connectez-vous pour accéder à l'éducation." : "Sign in to access education."}</p>
      <Button onClick={() => onNavigate("signin")}>{fr ? "Se connecter" : "Sign in"}</Button>
    </div>
  )

  const rapportAttendance = attendance.filter((a) => {
    if (rapportDateStart && a.date < rapportDateStart) return false
    if (rapportDateEnd && a.date > rapportDateEnd) return false
    return true
  })
  const rapportSummary = students.filter((s) => s.status === "active").map((s) => {
    const rows = rapportAttendance.filter((a) => a.student_id === s.id)
    const present = rows.filter((r) => r.status === "present").length
    const absent = rows.filter((r) => r.status === "absent").length
    const late = rows.filter((r) => r.status === "late").length
    const excused = rows.filter((r) => r.status === "excused").length
    return { student: `${s.first_name} ${s.last_name}`, present, absent, late, excused, total: rows.length }
  }).filter((r) => r.total > 0 || (!rapportDateStart && !rapportDateEnd))

  /* ---------- New tab helpers ---------- */
  const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
  const SCHEDULE_DAYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"]
  const SCHEDULE_TIMES = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"]
  const dayLabel = (d: string) => fr
    ? { lundi: "Lun", mardi: "Mar", mercredi: "Mer", jeudi: "Jeu", vendredi: "Ven", samedi: "Sam" }[d] ?? d
    : { lundi: "Mon", mardi: "Tue", mercredi: "Wed", jeudi: "Thu", vendredi: "Fri", samedi: "Sat" }[d] ?? d

  const saveScheduleEntry = async () => {
    if (!workspace) return
    const entry = { ...scheduleForm }
    if (editScheduleId) {
      await insforge.database.from("edu_schedule").update({ day: entry.day, time: entry.time, class_name: entry.class_name, subject: entry.subject, teacher: entry.teacher }).eq("id", editScheduleId)
      setScheduleEntries((prev) => prev.map((e) => e.id === editScheduleId ? { ...e, ...entry } : e))
    } else {
      const { data, error } = await insforge.database.from("edu_schedule").insert([{ workspace_id: workspace.id, ...entry }]).select().single()
      if (!error && data) setScheduleEntries((prev) => [...prev, data as any])
    }
    setScheduleDlg(false); setEditScheduleId(null)
  }
  const deleteScheduleEntry = async (id: string) => {
    if (!confirm(fr ? "Supprimer cette entrée ?" : "Delete this entry?")) return
    await insforge.database.from("edu_schedule").delete().eq("id", id)
    setScheduleEntries((prev) => prev.filter((e) => e.id !== id))
  }

  const saveGradeEntry = async () => {
    if (!workspace) return
    const score = safeParseFloat(gradeForm.score) || 0
    const entry = { ...gradeForm, score, grade: getNormalizedGrade(score, 100), date: gradeForm.date || new Date().toISOString().slice(0, 10) }
    if (editGradeId) {
      await insforge.database.from("edu_grades").update({ student_name: entry.student_name, class_name: entry.class_name, subject: entry.subject, score: entry.score, grade: entry.grade, date: entry.date }).eq("id", editGradeId)
      setGradeEntries((prev) => prev.map((e) => e.id === editGradeId ? { ...e, ...entry } : e))
    } else {
      const { data, error } = await insforge.database.from("edu_grades").insert([{ workspace_id: workspace.id, ...entry }]).select().single()
      if (!error && data) setGradeEntries((prev) => [...prev, data as any])
    }
    setGradeDlg(false); setEditGradeId(null)
  }
  const deleteGradeEntry = async (id: string) => {
    if (!confirm(fr ? "Supprimer cette note ?" : "Delete this grade?")) return
    await insforge.database.from("edu_grades").delete().eq("id", id)
    setGradeEntries((prev) => prev.filter((e) => e.id !== id))
  }

  const saveDisciplineEntry = async () => {
    if (!workspace) return
    const entry = { ...disciplineForm, date: disciplineForm.date || new Date().toISOString().slice(0, 10) }
    if (editDisciplineId) {
      await insforge.database.from("edu_discipline").update({ student_name: entry.student_name, class_name: entry.class_name, date: entry.date, reason: entry.reason, action: entry.action, status: entry.status }).eq("id", editDisciplineId)
      setDisciplineEntries((prev) => prev.map((e) => e.id === editDisciplineId ? { ...e, ...entry } : e))
    } else {
      const { data, error } = await insforge.database.from("edu_discipline").insert([{ workspace_id: workspace.id, ...entry }]).select().single()
      if (!error && data) setDisciplineEntries((prev) => [...prev, data as any])
    }
    setDisciplineDlg(false); setEditDisciplineId(null)
  }
  const deleteDisciplineEntry = async (id: string) => {
    if (!confirm(fr ? "Supprimer ce cas ?" : "Delete this case?")) return
    await insforge.database.from("edu_discipline").delete().eq("id", id)
    setDisciplineEntries((prev) => prev.filter((e) => e.id !== id))
  }

  const saveIncidentEntry = async () => {
    if (!workspace) return
    const entry = { ...incidentForm, date: incidentForm.date || new Date().toISOString().slice(0, 10) }
    if (editIncidentId) {
      await insforge.database.from("edu_incidents").update({ date: entry.date, type: entry.type, description: entry.description, reported_by: entry.reported_by, status: entry.status }).eq("id", editIncidentId)
      setIncidentEntries((prev) => prev.map((e) => e.id === editIncidentId ? { ...e, ...entry } : e))
    } else {
      const { data, error } = await insforge.database.from("edu_incidents").insert([{ workspace_id: workspace.id, ...entry }]).select().single()
      if (!error && data) setIncidentEntries((prev) => [...prev, data as any])
    }
    setIncidentDlg(false); setEditIncidentId(null)
  }
  const deleteIncidentEntry = async (id: string) => {
    if (!confirm(fr ? "Supprimer cet incident ?" : "Delete this incident?")) return
    await insforge.database.from("edu_incidents").delete().eq("id", id)
    setIncidentEntries((prev) => prev.filter((e) => e.id !== id))
  }

  const saveAccountingEntry = async () => {
    if (!accountingForm.description || !accountingForm.amount || !workspace) return
    const amount = safeParseFloat(accountingForm.amount, 0, true) || 0
    const entryDate = accountingForm.date || new Date().toISOString().slice(0, 10)
    const payload = { workspace_id: workspace.id, type: accountingForm.type, category: accountingForm.category, amount, description: accountingForm.description, entry_date: entryDate }
    if (editAccountingId) {
      const { error } = await insforge.database.from("edu_accounting").update(payload).eq("id", editAccountingId)
      if (error) return
      setAccountingEntries((prev) => prev.map((e) => e.id === editAccountingId ? { ...e, ...payload } : e))
    } else {
      const { data, error } = await insforge.database.from("edu_accounting").insert([payload]).select().single()
      if (error) return
      setAccountingEntries((prev) => [data, ...prev])
    }
    setAccountingDlg(false); setEditAccountingId(null)
    setAccountingForm({ date: "", description: "", type: "income", category: "", amount: "" })
  }
  const deleteAccountingEntry = async (id: string) => {
    if (!confirm(fr ? "Supprimer cette entrée ?" : "Delete this entry?")) return
    await insforge.database.from("edu_accounting").delete().eq("id", id)
    setAccountingEntries((prev) => prev.filter((e) => e.id !== id))
  }

  const filteredGrades = gradeFilterClass ? gradeEntries.filter((e) => e.class_name === gradeFilterClass) : gradeEntries
  const gradeAverage = filteredGrades.length > 0 ? filteredGrades.reduce((s, e) => s + Number(e.score || 0), 0) / filteredGrades.length : 0
  const disciplineTotal = disciplineEntries.length
  const disciplineOpen = disciplineEntries.filter((e) => e.status === "Open").length
  const totalIncome = accountingEntries.filter((e) => e.type === "income").reduce((s, e) => s + Number(e.amount || 0), 0)
  const totalExpense = accountingEntries.filter((e) => e.type === "expense").reduce((s, e) => s + Number(e.amount || 0), 0)
  const accountBalance = totalIncome - totalExpense
  const combinedHistory = [...payments.map((p) => ({ id: p.id, date: p.paid_at, description: p.description || (fr ? "Paiement" : "Payment"), type: "payment", amount: Number(p.amount_usd), source: "fee_payments" })), ...historyEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).filter((h) => { if (histDateStart && h.date < histDateStart) return false; if (histDateEnd && h.date > histDateEnd) return false; return true })

  return (
    <div ref={rootRef} className="min-h-svh bg-background">
      <div className="page-header bg-gradient-to-br from-brand to-brand/70 px-4 py-4 text-primary-foreground">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
                <button onClick={() => onNavigate("dashboard")} className="hover:text-white hover:underline">{fr ? "Tableau de bord" : "Dashboard"}</button>
                <span>/</span><span className="text-white">{fr ? "Éducation" : "Education"}</span>
              </div>
              <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="size-6" /> {fr ? "Éducation" : "Education"}</h1>
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
            <TabsTrigger value="students"><Users className="size-4 mr-1.5" />{fr ? "Élèves" : "Students"}</TabsTrigger>
            <TabsTrigger value="teachers"><GraduationCap className="size-4 mr-1.5" />{fr ? "Enseignants" : "Teachers"}</TabsTrigger>
            <TabsTrigger value="attendance"><Calendar className="size-4 mr-1.5" />{fr ? "Présences" : "Attendance"}</TabsTrigger>
            <TabsTrigger value="payments"><DollarSign className="size-4 mr-1.5" />{fr ? "Paiements" : "Payments"}</TabsTrigger>
            <TabsTrigger value="reportCards"><ClipboardList className="size-4 mr-1.5" />{fr ? "Bulletins" : "Reports"}</TabsTrigger>
            <TabsTrigger value="classes"><BookOpen className="size-4 mr-1.5" />{fr ? "Classes" : "Classes"}</TabsTrigger>
            <TabsTrigger value="exams"><FileText className="size-4 mr-1.5" />{fr ? "Examens" : "Exams"}</TabsTrigger>
            <TabsTrigger value="personnel"><UserCog className="size-4 mr-1.5" />{fr ? "Personnel" : "Staff"}</TabsTrigger>
            <TabsTrigger value="schedule"><CalendarDays className="size-4 mr-1.5" />{fr ? "Emplois du temps" : "Schedule"}</TabsTrigger>
            <TabsTrigger value="grades"><ClipboardCheck className="size-4 mr-1.5" />{fr ? "Notes" : "Grades"}</TabsTrigger>
            <TabsTrigger value="discipline"><Shield className="size-4 mr-1.5" />{fr ? "Discipline" : "Discipline"}</TabsTrigger>
            <TabsTrigger value="incidents"><AlertTriangle className="size-4 mr-1.5" />{fr ? "Incidents" : "Incidents"}</TabsTrigger>
            <TabsTrigger value="accounting"><Receipt className="size-4 mr-1.5" />{fr ? "Comptabilité" : "Accounting"}</TabsTrigger>
            <TabsTrigger value="history"><Clock className="size-4 mr-1.5" />{fr ? "Historique" : "History"}</TabsTrigger>
            <TabsTrigger value="reports"><FileText className="size-4 mr-1.5" />{fr ? "Rapports" : "Reports"}</TabsTrigger>
          </TabsList>

          {/* ========== STUDENTS TAB ========== */}
          <TabsContent value="students">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div className="relative flex-1 max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={fr ? "Rechercher..." : "Search..."} className="pl-9" /></div>
              <Button onClick={openAddStudent} className="gap-1.5 bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="size-4" />{fr ? "Ajouter un élève" : "Add student"}</Button>
            </div>
            {loading ? <div className="flex h-32 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div> :
              filteredStudents.length === 0 ? (
                <EmptyState icon={<Users className="size-12" />} title={fr ? "Aucun élève" : "No students"} description={fr ? "Ajoutez des élèves pour commencer." : "Add students to get started."} action={<Button variant="outline" size="sm" onClick={openAddStudent}><Plus className="size-3.5 mr-1" />{fr ? "Ajouter" : "Add"}</Button>} />
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50"><tr>{[fr ? "Nom" : "Name", fr ? "Classe" : "Class", fr ? "Genre" : "Gender", fr ? "Tél. Parent" : "Parent phone", fr ? "Solde" : "Balance", fr ? "Statut" : "Status", ""].map((h) => <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-border">
                      {filteredStudents.map((s) => (
                        <tr key={s.id} className="bg-card hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium text-foreground">{s.first_name} {s.last_name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{s.class_name ?? "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{s.gender ?? "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{s.parent_phone ?? "—"}</td>
                          <td className="px-4 py-3">
                            {(() => {
                              const bal = studentBalances[s.id]
                              if (!bal || bal.feesOwed === 0) return <span className="text-muted-foreground text-xs">—</span>
                              const pct = bal.feesOwed > 0 ? (bal.totalPaid / bal.feesOwed) * 100 : 0
                              const colorClass = pct >= 100 ? "text-success" : pct > 0 ? "text-warning" : "text-destructive"
                              return <span className={`text-xs font-medium ${colorClass}`}>{fr ? "Payé" : "Paid"}: {formatCurrency(bal.totalPaid)} / {formatCurrency(bal.feesOwed)}</span>
                            })()}
                          </td>
                          <td className="px-4 py-3"><Badge variant={s.status === "active" ? "secondary" : "outline"}>{s.status === "active" ? (fr ? "Actif" : "Active") : (fr ? "Inactif" : "Inactive")}</Badge></td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1.5 justify-end">
                              <Button size="icon" variant="ghost" className="size-7" title={fr ? "Paiement" : "Payment"} onClick={() => openAddPayment(s.id)}><DollarSign className="size-3.5" /></Button>
                              <Button size="icon" variant="ghost" className="size-7" onClick={() => openEditStudent(s)}><Edit2 className="size-3.5" /></Button>
                              {role === "admin" && <Button size="icon" variant="ghost" className="size-7 text-destructive hover:text-destructive" onClick={() => deleteStudent(s.id)}><Trash2 className="size-3.5" /></Button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </TabsContent>

          {/* ========== TEACHERS TAB ========== */}
          <TabsContent value="teachers">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div className="relative flex-1 max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={fr ? "Rechercher..." : "Search..."} className="pl-9" /></div>
              <Button onClick={openAddTeacher} className="gap-1.5 bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="size-4" />{fr ? "Ajouter un enseignant" : "Add teacher"}</Button>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-border bg-card p-3"><p className="text-xs text-muted-foreground">{fr ? "Total" : "Total"}</p><p className="text-lg font-bold text-foreground">{teachers.length}</p></div>
              <div className="rounded-lg border border-border bg-card p-3"><p className="text-xs text-muted-foreground">{fr ? "Actifs" : "Active"}</p><p className="text-lg font-bold text-foreground">{activeTeachers.length}</p></div>
              <div className="rounded-lg border border-border bg-card p-3"><p className="text-xs text-muted-foreground">{fr ? "Masse salariale (FC)" : "Salary pool (FC)"}</p><p className="text-lg font-bold text-foreground">{formatCurrency(teachers.reduce((s, t) => s + Number(t.salary_usd ?? 0), 0))}</p></div>
              <div className="rounded-lg border border-border bg-card p-3"><p className="text-xs text-muted-foreground">{fr ? "Matières" : "Subjects"}</p><p className="text-lg font-bold text-foreground">{new Set(teachers.map((t) => t.subject).filter(Boolean)).size}</p></div>
            </div>
            {loading ? <div className="flex h-32 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div> :
              filteredTeachers.length === 0 ? (
                <EmptyState icon={<GraduationCap className="size-12" />} title={fr ? "Aucun enseignant" : "No teachers"} description={fr ? "Ajoutez des enseignants pour commencer." : "Add teachers to get started."} action={<Button variant="outline" size="sm" onClick={openAddTeacher}><Plus className="size-3.5 mr-1" />{fr ? "Ajouter" : "Add"}</Button>} />
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50"><tr>{[fr ? "Nom" : "Name", fr ? "Matière" : "Subject", fr ? "Téléphone" : "Phone", fr ? "Statut" : "Status", fr ? "Salaire (FC)" : "Salary (FC)", ""].map((h) => <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-border">
                      {filteredTeachers.map((t) => (
                        <tr key={t.id} className="bg-card hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium text-foreground">{t.first_name} {t.last_name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{t.subject ?? "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{t.phone ?? "—"}</td>
                          <td className="px-4 py-3"><Badge variant={t.status === "active" ? "secondary" : "outline"}>{t.status === "active" ? (fr ? "Actif" : "Active") : (fr ? "Inactif" : "Inactive")}</Badge></td>
                          <td className="px-4 py-3 text-foreground">{t.salary_usd ? formatCurrency(Number(t.salary_usd)) : "—"}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1.5 justify-end">
                              <Button size="icon" variant="ghost" className="size-7" onClick={() => openEditTeacher(t)}><Edit2 className="size-3.5" /></Button>
                              {role === "admin" && <Button size="icon" variant="ghost" className="size-7 text-destructive hover:text-destructive" onClick={() => deleteTeacher(t.id)}><Trash2 className="size-3.5" /></Button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </TabsContent>

          {/* ========== ATTENDANCE TAB ========== */}
          <TabsContent value="attendance">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Label className="whitespace-nowrap text-foreground">{fr ? "Date" : "Date"}</Label>
                <Input type="date" value={attDate} onChange={(e) => setAttDate(e.target.value)} className="w-fit text-foreground" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="whitespace-nowrap text-foreground">{fr ? "Classe" : "Class"}</Label>
                <select value={attClassId} onChange={(e) => setAttClassId(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">{fr ? "Toutes" : "All"}</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <Button variant={attView === "saisie" ? "default" : "outline"} size="sm" onClick={() => setAttView("saisie")} className={attView === "saisie" ? "bg-brand text-brand-foreground" : ""}>{fr ? "Saisie" : "Entry"}</Button>
                <Button variant={attView === "rapport" ? "default" : "outline"} size="sm" onClick={() => setAttView("rapport")} className={attView === "rapport" ? "bg-brand text-brand-foreground" : ""}>{fr ? "Rapport" : "Report"}</Button>
              </div>
            </div>

            {attView === "saisie" ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div className="rounded-lg border border-border bg-card p-3"><p className="text-xs text-muted-foreground">{fr ? "Présents" : "Present"}</p><p className="text-lg font-bold text-success">{attSummary.present}</p></div>
                  <div className="rounded-lg border border-border bg-card p-3"><p className="text-xs text-muted-foreground">{fr ? "Absents" : "Absent"}</p><p className="text-lg font-bold text-destructive">{attSummary.absent}</p></div>
                  <div className="rounded-lg border border-border bg-card p-3"><p className="text-xs text-muted-foreground">{fr ? "Retards" : "Late"}</p><p className="text-lg font-bold text-warning">{attSummary.late}</p></div>
                  <div className="rounded-lg border border-border bg-card p-3"><p className="text-xs text-muted-foreground">{fr ? "Excusés" : "Excused"}</p><p className="text-lg font-bold text-info">{attSummary.excused}</p></div>
                </div>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50"><tr><th className="px-4 py-3 text-left font-medium text-muted-foreground">{fr ? "Élève" : "Student"}</th><th className="px-4 py-3 text-center font-medium text-muted-foreground">{fr ? "Statut" : "Status"}</th></tr></thead>
                    <tbody className="divide-y divide-border">
                      {attClassStudents.length === 0 ? (
                        <tr><td colSpan={2} className="px-4 py-4 text-center text-muted-foreground">{fr ? "Aucun élève dans cette classe" : "No students in this class"}</td></tr>
                      ) : (
                        attClassStudents.map((s) => (
                          <tr key={s.id} className="bg-card hover:bg-muted/30">
                            <td className="px-4 py-3 font-medium text-foreground">{s.first_name} {s.last_name}</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2 justify-center">
                                {(["present", "absent", "late", "excused"] as const).map((st) => (
                                  <button key={st} onClick={() => toggleAtt(s.id, st)} className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${attRows[s.id] === st ? "border-brand bg-brand/10 text-brand" : "border-border text-muted-foreground hover:bg-muted/30"}`}>
                                    {st === "present" ? (fr ? "P" : "P") : st === "absent" ? (fr ? "A" : "A") : st === "late" ? (fr ? "R" : "L") : (fr ? "E" : "E")}
                                  </button>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="flex items-center gap-2"><Label className="text-foreground whitespace-nowrap">{fr ? "Du" : "From"}</Label><Input type="date" value={rapportDateStart} onChange={(e) => setRapportDateStart(e.target.value)} className="w-fit text-foreground" /></div>
                  <div className="flex items-center gap-2"><Label className="text-foreground whitespace-nowrap">{fr ? "Au" : "To"}</Label><Input type="date" value={rapportDateEnd} onChange={(e) => setRapportDateEnd(e.target.value)} className="w-fit text-foreground" /></div>
                </div>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50"><tr><th className="px-4 py-3 text-left font-medium text-muted-foreground">{fr ? "Élève" : "Student"}</th><th className="px-4 py-3 text-center font-medium text-muted-foreground">{fr ? "Présences" : "Present"}</th><th className="px-4 py-3 text-center font-medium text-muted-foreground">{fr ? "Absences" : "Absent"}</th><th className="px-4 py-3 text-center font-medium text-muted-foreground">{fr ? "Retards" : "Late"}</th><th className="px-4 py-3 text-center font-medium text-muted-foreground">{fr ? "Excusés" : "Excused"}</th><th className="px-4 py-3 text-center font-medium text-muted-foreground">{fr ? "Total" : "Total"}</th></tr></thead>
                    <tbody className="divide-y divide-border">
                      {rapportSummary.map((r, i) => (
                        <tr key={i} className="bg-card hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium text-foreground">{r.student}</td>
                          <td className="px-4 py-3 text-center text-success">{r.present}</td>
                          <td className="px-4 py-3 text-center text-destructive">{r.absent}</td>
                          <td className="px-4 py-3 text-center text-warning">{r.late}</td>
                          <td className="px-4 py-3 text-center text-info">{r.excused}</td>
                          <td className="px-4 py-3 text-center text-foreground">{r.total}</td>
                        </tr>
                      ))}
                      {rapportSummary.length === 0 && <tr><td colSpan={6} className="px-4 py-4 text-center text-muted-foreground">{fr ? "Aucune donnée" : "No data"}</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ========== PAYMENTS TAB ========== */}
          <TabsContent value="payments">
            <div className="flex justify-end mb-4">
              <Button onClick={() => openAddPayment()} className="gap-1.5 bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="size-4" />{fr ? "Enregistrer un paiement" : "Record payment"}</Button>
            </div>
            {loading ? <div className="flex h-32 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div> :
              payments.length === 0 ? <EmptyState icon={<DollarSign className="size-12" />} title={fr ? "Aucun paiement" : "No payments"} description={fr ? "Les paiements apparaîtront ici." : "Payments will appear here."} /> : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50"><tr>{[fr ? "Élève" : "Student", fr ? "Montant (FC)" : "Amount (FC)", fr ? "Description" : "Description", fr ? "Date" : "Date"].map((h) => <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-border">
                      {payments.map((p) => {
                        const std = students.find((s) => s.id === p.student_id)
                        return (
                          <tr key={p.id} className="bg-card hover:bg-muted/30">
                            <td className="px-4 py-3 font-medium text-foreground">{std ? `${std.first_name} ${std.last_name}` : "—"}</td>
                            <td className="px-4 py-3 text-foreground">{formatCurrency(Number(p.amount_usd), undefined, true)}</td>
                            <td className="px-4 py-3 text-muted-foreground">{p.description ?? "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground">{new Date(p.paid_at).toLocaleDateString(fr ? "fr-FR" : "en-US")}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
          </TabsContent>

          {/* ========== REPORTS TAB ========== */}
          <TabsContent value="reports">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{fr ? "Rapports & Export" : "Reports & Export"}</h3>
                <p className="text-sm text-muted-foreground">{fr ? "Générez des rapports PDF ou Word pour votre module" : "Generate PDF or Word reports for your module"}</p>
              </div>
              <ReportGenerator
                moduleType="education"
                workspace={workspace!}
                data={{ students, teachers, classes, attendance, feePayments: payments, members }}
              />
            </div>
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <FileText className="size-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{fr ? "Cliquez sur PDF ou Word ci-dessus pour télécharger le rapport complet" : "Click PDF or Word above to download the full report"}</p>
            </div>
          </TabsContent>

          {/* ========== REPORT CARDS TAB ========== */}
          <TabsContent value="reportCards">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
              <div className="flex items-center gap-2">
                <Label className="whitespace-nowrap text-foreground">{fr ? "Classe" : "Class"}</Label>
                <select value={reportClassId} onChange={(e) => { setReportClassId(e.target.value); setReportStudentId("") }} className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">{fr ? "Sélectionner" : "Select"}</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="whitespace-nowrap text-foreground">{fr ? "Élève" : "Student"}</Label>
                <select value={reportStudentId} onChange={(e) => setReportStudentId(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">{fr ? "Sélectionner" : "Select"}</option>
                  {reportStudents.map((s) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="whitespace-nowrap text-foreground">{fr ? "Trimestre" : "Term"}</Label>
                <select value={reportTerm} onChange={(e) => setReportTerm(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">{fr ? "Tous" : "All"}</option>
                  {Array.from(new Set(exams.map((e) => e.term).filter(Boolean))).map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {reportStudentId && reportClassExams.length > 0 ? (
              <div className="rounded-lg border border-border bg-card p-6 max-w-2xl mx-auto">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-foreground">{fr ? "Bulletin de notes" : "Report Card"}</h2>
                  <p className="text-muted-foreground">
                    {students.find((s) => s.id === reportStudentId)?.first_name} {students.find((s) => s.id === reportStudentId)?.last_name}
                    {reportTerm ? ` — ${reportTerm}` : ""}
                  </p>
                  <p className="text-muted-foreground">{classes.find((c) => c.id === reportClassId)?.name}</p>
                </div>
                <table className="w-full text-sm mb-4">
                  <thead className="bg-muted/50"><tr><th className="px-4 py-2 text-left font-medium text-muted-foreground">{fr ? "Matière" : "Subject"}</th><th className="px-4 py-2 text-center font-medium text-muted-foreground">{fr ? "Note" : "Score"}</th><th className="px-4 py-2 text-center font-medium text-muted-foreground">{fr ? "Coef" : "Coef"}</th><th className="px-4 py-2 text-center font-medium text-muted-foreground">{fr ? "Note" : "Grade"}</th></tr></thead>
                  <tbody className="divide-y divide-border">
                    {studentReport.map((r, i) => (
                      <tr key={i} className="hover:bg-muted/30">
                        <td className="px-4 py-2 text-foreground">{r.exam.name} ({r.exam.subject})</td>
                        <td className="px-4 py-2 text-center text-foreground">{r.score !== null ? r.score.toFixed(1) : "—"}</td>
                        <td className="px-4 py-2 text-center text-muted-foreground">{r.exam.coefficient}</td>
                        <td className="px-4 py-2 text-center font-medium">{r.score !== null ? (() => { const normalized = r.exam.max_score > 0 ? (r.score / r.exam.max_score) * 20 : 0; return <Badge className={normalized >= 16 ? "bg-green-100 text-green-800" : normalized >= 14 ? "bg-blue-100 text-blue-800" : normalized >= 10 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}>{getNormalizedGrade(r.score, r.exam.max_score)}</Badge> })() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="border-t border-border pt-4 flex justify-between text-sm">
                  <span className="text-muted-foreground">{fr ? "Total des points" : "Total score"}: <strong className="text-foreground">{totalScore.toFixed(1)}</strong></span>
                  <span className="text-muted-foreground">{fr ? "Moyenne" : "Average"}: <strong className="text-foreground">{avgScore.toFixed(1)}</strong></span>
                  <span className="text-muted-foreground">{fr ? "Mention" : "Grade"}: <strong>{getGrade(avgScore)}</strong></span>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={<ClipboardList className="size-12" />}
                title={reportStudentId ? (fr ? "Aucun examen trouvé" : "No exams found") : (fr ? "Sélectionnez un élève" : "Select a student")}
                description={reportStudentId ? (fr ? "Modifiez les filtres pour afficher les résultats." : "Adjust filters to display results.") : (fr ? "Choisissez un élève pour voir son bulletin." : "Choose a student to view their report card.")}
              />
            )}
          </TabsContent>

          {/* ========== CLASSES TAB ========== */}
          <TabsContent value="classes">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div className="relative flex-1 max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={fr ? "Rechercher..." : "Search..."} className="pl-9" /></div>
              <Button onClick={openAddClass} className="gap-1.5 bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="size-4" />{fr ? "Ajouter une classe" : "Add class"}</Button>
            </div>
            {loading ? <div className="flex h-32 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div> :
              filteredClasses.length === 0 ? (
                <EmptyState icon={<BookOpen className="size-12" />} title={fr ? "Aucune classe" : "No classes"} description={fr ? "Créez des classes pour organiser vos élèves." : "Create classes to organize students."} action={<Button variant="outline" size="sm" onClick={openAddClass}><Plus className="size-3.5 mr-1" />{fr ? "Ajouter" : "Add"}</Button>} />
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50"><tr>{[fr ? "Nom" : "Name", fr ? "Niveau" : "Level", fr ? "Enseignant" : "Teacher", fr ? "Frais (FC)" : "Fees (FC)", fr ? "Statut" : "Status", fr ? "Élèves" : "Students", ""].map((h) => <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-border">
                      {filteredClasses.map((c) => {
                        const teacher = teachers.find((t) => t.id === c.teacher_id)
                        const studentCount = students.filter((s) => s.class_name === c.name).length
                        return (
                          <tr key={c.id} className="bg-card hover:bg-muted/30">
                            <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                            <td className="px-4 py-3 text-muted-foreground">{c.level ?? "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground">{teacher ? `${teacher.first_name} ${teacher.last_name}` : "—"}</td>
                            <td className="px-4 py-3 text-foreground">{c.fees_usd ? formatCurrency(Number(c.fees_usd)) : "—"}</td>
                            <td className="px-4 py-3"><Badge variant={c.status === "active" ? "secondary" : "outline"}>{c.status === "active" ? (fr ? "Actif" : "Active") : (fr ? "Inactif" : "Inactive")}</Badge></td>
                            <td className="px-4 py-3 text-muted-foreground">{studentCount}</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1.5 justify-end">
                                <Button size="icon" variant="ghost" className="size-7" onClick={() => openEditClass(c)}><Edit2 className="size-3.5" /></Button>
                                {role === "admin" && <Button size="icon" variant="ghost" className="size-7 text-destructive hover:text-destructive" onClick={() => deleteClass(c.id)}><Trash2 className="size-3.5" /></Button>}
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

          {/* ========== EXAMS TAB ========== */}
          <TabsContent value="exams">
            <Tabs defaultValue="exams-list">
              <TabsList className="mb-4">
                <TabsTrigger value="exams-list">{fr ? "Examens" : "Exams"}</TabsTrigger>
                <TabsTrigger value="grading">{fr ? "Notation" : "Grading"}</TabsTrigger>
              </TabsList>

              <TabsContent value="exams-list">
                <div className="flex justify-end mb-4">
                  <Button onClick={openAddExam} className="gap-1.5 bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="size-4" />{fr ? "Ajouter un examen" : "Add exam"}</Button>
                </div>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50"><tr>{[fr ? "Nom" : "Name", fr ? "Classe" : "Class", fr ? "Matière" : "Subject", fr ? "Date" : "Date", fr ? "Note max" : "Max score", fr ? "Coefficient" : "Coefficient", fr ? "Trimestre" : "Term", ""].map((h) => <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-border">
                      {exams.length === 0 ? (
                        <tr><td colSpan={8} className="px-4 py-4 text-center text-muted-foreground">{fr ? "Aucun examen" : "No exams"}</td></tr>
                      ) : (
                        exams.map((e) => {
                          const cls = classes.find((c) => c.id === e.class_id)
                          return (
                            <tr key={e.id} className="bg-card hover:bg-muted/30">
                              <td className="px-4 py-3 font-medium text-foreground">{e.name}</td>
                              <td className="px-4 py-3 text-muted-foreground">{cls?.name ?? "—"}</td>
                              <td className="px-4 py-3 text-muted-foreground">{e.subject ?? "—"}</td>
                              <td className="px-4 py-3 text-muted-foreground">{e.date ? new Date(e.date).toLocaleDateString(fr ? "fr-FR" : "en-US") : "—"}</td>
                              <td className="px-4 py-3 text-foreground">{e.max_score}</td>
                              <td className="px-4 py-3 text-foreground">{e.coefficient}</td>
                              <td className="px-4 py-3 text-muted-foreground">{e.term ?? "—"}</td>
                              <td className="px-4 py-3">
                                <div className="flex gap-1.5 justify-end">
                                  <Button size="icon" variant="ghost" className="size-7" onClick={() => openEditExam(e)}><Edit2 className="size-3.5" /></Button>
                                  {role === "admin" && <Button size="icon" variant="ghost" className="size-7 text-destructive hover:text-destructive" onClick={() => deleteExam(e.id)}><Trash2 className="size-3.5" /></Button>}
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              <TabsContent value="grading">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Label className="whitespace-nowrap text-foreground">{fr ? "Examen" : "Exam"}</Label>
                    <select value={gradeExamId} onChange={(e) => setGradeExamId(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="">{fr ? "Sélectionner" : "Select"}</option>
                      {exams.map((e) => <option key={e.id} value={e.id}>{e.name} — {classes.find((c) => c.id === e.class_id)?.name ?? ""}</option>)}
                    </select>
                  </div>
                  {gradeExam && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{fr ? "Note max" : "Max score"}: {gradeExam.max_score}</span>
                      <Button onClick={saveGrades} disabled={saving} className="gap-1.5 bg-brand text-brand-foreground hover:bg-brand/90">{saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}{fr ? "Tout enregistrer" : "Save all"}</Button>
                    </div>
                  )}
                </div>
                {gradeExamId ? (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50"><tr><th className="px-4 py-3 text-left font-medium text-muted-foreground">{fr ? "Élève" : "Student"}</th><th className="px-4 py-3 text-center font-medium text-muted-foreground">{fr ? "Note" : "Score"}</th><th className="px-4 py-3 text-center font-medium text-muted-foreground">{fr ? "Appréciation" : "Grade"}</th></tr></thead>
                      <tbody className="divide-y divide-border">
                        {gradeClassStudents.length === 0 ? (
                          <tr><td colSpan={3} className="px-4 py-4 text-center text-muted-foreground">{fr ? "Aucun élève dans cette classe" : "No students in this class"}</td></tr>
                        ) : (
                          gradeClassStudents.map((s) => {
                            const sc = gradeScores[s.id]
                            const numSc = sc !== undefined && sc !== "" ? safeParseFloat(sc) : null
                            const g = numSc !== null ? getNormalizedGrade(numSc, gradeExam?.max_score ?? 20) : ""
                            const maxScore = gradeExam?.max_score ?? 20
                            return (
                              <tr key={s.id} className="bg-card hover:bg-muted/30">
                                <td className="px-4 py-3 font-medium text-foreground">{s.first_name} {s.last_name}</td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-center gap-1">
                                    <Input type="number" step="0.5" min="0" max={maxScore} value={sc ?? ""} onChange={(e) => setGradeScores((p) => ({ ...p, [s.id]: e.target.value }))} className="w-20 text-center text-foreground" />
                                    <span className="text-muted-foreground">/ {maxScore}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-center font-medium">{g ? <Badge>{g}</Badge> : "—"}</td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState icon={<FileText className="size-12" />} title={fr ? "Sélectionnez un examen" : "Select an exam"} description={fr ? "Choisissez un examen pour saisir les notes." : "Choose an exam to enter grades."} />
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* ========== PERSONNEL TAB ========== */}
          <TabsContent value="personnel">
            <PersonnelManager workspace={workspace} />
          </TabsContent>

          {/* ========== SCHEDULE TAB ========== */}
          <TabsContent value="schedule">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">{fr ? "Emplois du temps" : "Schedule"}</h2>
              <Button onClick={() => { setScheduleForm({ day: "lundi", time: "08:00", class_name: "", subject: "", teacher: "" }); setEditScheduleId(null); setScheduleDlg(true) }} className="gap-1.5 bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="size-4" />{fr ? "Ajouter" : "Add"}</Button>
            </div>
            {loading ? <div className="flex h-32 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div> :
            <div className="overflow-x-auto rounded-lg border border-border">
              <div className="grid gap-px bg-border min-w-[700px]" style={{ gridTemplateColumns: "80px repeat(6, 1fr)" }}>
                <div className="bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">{fr ? "Horaire" : "Time"}</div>
                {SCHEDULE_DAYS.map((d) => <div key={d} className="bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground text-center">{dayLabel(d)}</div>)}
                {SCHEDULE_TIMES.map((t) => (
                  <React.Fragment key={t}>
                    <div className="bg-card px-2 py-3 text-xs text-muted-foreground font-medium border-t border-border/30">{t}</div>
                    {SCHEDULE_DAYS.map((d) => {
                      const entry = scheduleEntries.find((e) => e.day === d && e.time === t)
                      return (
                        <div key={`${d}-${t}`} className="bg-card px-1 py-1 min-h-[56px] cursor-pointer hover:bg-muted/30 transition-colors border-t border-border/30 relative group" onClick={() => { if (entry) { setScheduleForm({ day: entry.day, time: entry.time, class_name: entry.class_name, subject: entry.subject, teacher: entry.teacher }); setEditScheduleId(entry.id); setScheduleDlg(true) } else { setScheduleForm({ day: d, time: t, class_name: "", subject: "", teacher: "" }); setEditScheduleId(null); setScheduleDlg(true) } }}>
                          {entry ? <div className="text-xs leading-tight p-1 rounded bg-brand/10 text-brand"><p className="font-medium truncate">{entry.class_name}</p>{entry.subject && <p className="truncate opacity-80">{entry.subject}</p>}</div> : null}
                          {entry && <button onClick={(e) => { e.stopPropagation(); if (confirm(fr ? "Supprimer cette entrée ?" : "Delete this entry?")) deleteScheduleEntry(entry.id) }} className="absolute -top-1 -right-1 size-4 bg-destructive text-destructive-foreground rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="size-3" /></button>}
                        </div>
                      )
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>}
            <Dialog open={scheduleDlg} onOpenChange={(o) => { setScheduleDlg(o); if (!o) setEditScheduleId(null) }}>
              <DialogContent className="ag-dialog max-w-sm p-0">
                <DialogHeader className="px-6 pt-5 pb-0"><DialogTitle className="text-foreground">{editScheduleId ? (fr ? "Modifier le créneau" : "Edit slot") : (fr ? "Ajouter un créneau" : "Add slot")}</DialogTitle></DialogHeader>
                <div className="space-y-4 px-6 py-4">
                  <div className="space-y-1.5"><Label className="text-sm font-medium text-foreground">{fr ? "Jour" : "Day"}</Label>
                    <select value={scheduleForm.day} onChange={(e) => setScheduleForm((p) => ({ ...p, day: e.target.value }))} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground">{SCHEDULE_DAYS.map((d) => <option key={d} value={d}>{dayLabel(d)}</option>)}</select>
                  </div>
                  <div className="space-y-1.5"><Label className="text-sm font-medium text-foreground">{fr ? "Horaire" : "Time"}</Label>
                    <select value={scheduleForm.time} onChange={(e) => setScheduleForm((p) => ({ ...p, time: e.target.value }))} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground">{SCHEDULE_TIMES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
                  </div>
                  <div className="space-y-1.5"><Label className="text-sm font-medium text-foreground">{fr ? "Classe" : "Class"}</Label><Input value={scheduleForm.class_name} onChange={(e) => setScheduleForm((p) => ({ ...p, class_name: e.target.value }))} placeholder="Ex: CM2 A" className="h-10 rounded-lg text-foreground" /></div>
                  <div className="space-y-1.5"><Label className="text-sm font-medium text-foreground">{fr ? "Matière" : "Subject"}</Label><Input value={scheduleForm.subject} onChange={(e) => setScheduleForm((p) => ({ ...p, subject: e.target.value }))} placeholder="Ex: Mathématiques" className="h-10 rounded-lg text-foreground" /></div>
                  <div className="space-y-1.5"><Label className="text-sm font-medium text-foreground">{fr ? "Enseignant" : "Teacher"}</Label><Input value={scheduleForm.teacher} onChange={(e) => setScheduleForm((p) => ({ ...p, teacher: e.target.value }))} placeholder="Ex: M. Dupont" className="h-10 rounded-lg text-foreground" /></div>
                </div>
                <DialogFooter className="px-6 py-4 border-t border-border/50">
                  <Button variant="outline" onClick={() => { setScheduleDlg(false); setEditScheduleId(null) }}>{fr ? "Annuler" : "Cancel"}</Button>
                  <Button onClick={saveScheduleEntry} className="bg-brand text-brand-foreground hover:bg-brand/90">{editScheduleId ? (fr ? "Modifier" : "Edit") : (fr ? "Ajouter" : "Add")}</Button>
                </DialogFooter>
                <DialogFooterBrand />
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* ========== GRADES TAB ========== */}
          <TabsContent value="grades">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Label className="whitespace-nowrap text-foreground">{fr ? "Classe" : "Class"}</Label>
                <select value={gradeFilterClass} onChange={(e) => setGradeFilterClass(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">{fr ? "Toutes" : "All"}</option>
                  {Array.from(new Set(gradeEntries.map((g) => g.class_name).filter(Boolean))).map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                {gradeAverage > 0 && <span className="text-sm text-muted-foreground ml-2">{fr ? "Moyenne" : "Avg"}: <strong className="text-foreground">{gradeAverage.toFixed(1)}</strong></span>}
              </div>
              <Button onClick={() => { setGradeForm({ student_name: "", class_name: gradeFilterClass, subject: "", score: "", date: new Date().toISOString().slice(0, 10) }); setEditGradeId(null); setGradeDlg(true) }} className="gap-1.5 bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="size-4" />{fr ? "Ajouter une note" : "Add grade"}</Button>
            </div>
            {loading ? <div className="flex h-32 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div> :
            filteredGrades.length === 0 ? (
              <EmptyState icon={<ClipboardCheck className="size-12" />} title={fr ? "Aucune note" : "No grades"} description={fr ? "Saisissez des notes pour les examens." : "Enter grades for exams."} />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50"><tr><th className="px-4 py-3 text-left font-medium text-muted-foreground">{fr ? "Élève" : "Student"}</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">{fr ? "Classe" : "Class"}</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">{fr ? "Matière" : "Subject"}</th><th className="px-4 py-3 text-center font-medium text-muted-foreground">{fr ? "Note" : "Score"}</th><th className="px-4 py-3 text-center font-medium text-muted-foreground">{fr ? "Grade" : "Grade"}</th><th className="px-4 py-3 text-center font-medium text-muted-foreground">{fr ? "Date" : "Date"}</th><th className="px-4 py-3" /></tr></thead>
                  <tbody className="divide-y divide-border">
                    {filteredGrades.map((g) => (
                      <tr key={g.id} className="bg-card hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium text-foreground">{g.student_name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{g.class_name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{g.subject}</td>
                        <td className="px-4 py-3 text-center text-foreground">{g.score}</td>
                        <td className="px-4 py-3 text-center"><Badge className={(() => { const n = (g.score / 100) * 20; return n >= 16 ? "bg-green-100 text-green-800" : n >= 14 ? "bg-blue-100 text-blue-800" : n >= 10 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800" })()}>{g.grade}</Badge></td>
                        <td className="px-4 py-3 text-center text-muted-foreground">{g.date ? new Date(g.date).toLocaleDateString(fr ? "fr-FR" : "en-US") : "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5 justify-end">
                            <Button size="icon" variant="ghost" className="size-7" onClick={() => { setGradeForm({ student_name: g.student_name, class_name: g.class_name, subject: g.subject, score: String(g.score), date: g.date }); setEditGradeId(g.id); setGradeDlg(true) }}><Edit2 className="size-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="size-7 text-destructive hover:text-destructive" onClick={() => deleteGradeEntry(g.id)}><Trash2 className="size-3.5" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Dialog open={gradeDlg} onOpenChange={(o) => { setGradeDlg(o); if (!o) setEditGradeId(null) }}>
              <DialogContent className="ag-dialog max-w-lg p-0">
                <DialogHeader className="px-6 pt-5 pb-0"><DialogTitle className="text-foreground">{editGradeId ? (fr ? "Modifier la note" : "Edit grade") : (fr ? "Ajouter une note" : "Add grade")}</DialogTitle></DialogHeader>
                <div className="space-y-4 px-6 py-4">
                  <div className="space-y-1.5"><Label className="text-sm font-medium text-foreground">{fr ? "Élève" : "Student"}</Label><Input value={gradeForm.student_name} onChange={(e) => setGradeForm((p) => ({ ...p, student_name: e.target.value }))} placeholder="Ex: Jean Dupont" className="h-10 rounded-lg text-foreground" /></div>
                  <div className="space-y-1.5"><Label className="text-sm font-medium text-foreground">{fr ? "Classe" : "Class"}</Label><Input value={gradeForm.class_name} onChange={(e) => setGradeForm((p) => ({ ...p, class_name: e.target.value }))} placeholder="Ex: CM2 A" className="h-10 rounded-lg text-foreground" /></div>
                  <div className="space-y-1.5"><Label className="text-sm font-medium text-foreground">{fr ? "Matière" : "Subject"}</Label><Input value={gradeForm.subject} onChange={(e) => setGradeForm((p) => ({ ...p, subject: e.target.value }))} placeholder="Ex: Mathématiques" className="h-10 rounded-lg text-foreground" /></div>
                  <div className="space-y-1.5"><Label className="text-sm font-medium text-foreground">{fr ? "Note (0-100)" : "Score (0-100)"}</Label><Input type="number" min="0" max="100" step="0.5" value={gradeForm.score} onChange={(e) => setGradeForm((p) => ({ ...p, score: e.target.value }))} className="h-10 rounded-lg text-foreground" /></div>
                  {gradeForm.score && <p className="text-sm text-muted-foreground">{fr ? "Grade" : "Grade"}: <Badge>{getNormalizedGrade(safeParseFloat(gradeForm.score) || 0, 100)}</Badge></p>}
                  <div className="space-y-1.5"><Label className="text-sm font-medium text-foreground">{fr ? "Date" : "Date"}</Label><Input type="date" value={gradeForm.date} onChange={(e) => setGradeForm((p) => ({ ...p, date: e.target.value }))} className="h-10 rounded-lg text-foreground" /></div>
                </div>
                <DialogFooter className="px-6 py-4 border-t border-border/50">
                  <Button variant="outline" onClick={() => { setGradeDlg(false); setEditGradeId(null) }}>{fr ? "Annuler" : "Cancel"}</Button>
                  <Button onClick={saveGradeEntry} className="bg-brand text-brand-foreground hover:bg-brand/90">{editGradeId ? (fr ? "Modifier" : "Edit") : (fr ? "Ajouter" : "Add")}</Button>
                </DialogFooter>
                <DialogFooterBrand />
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* ========== DISCIPLINE TAB ========== */}
          <TabsContent value="discipline">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">{fr ? "Discipline" : "Discipline"}</h2>
              <Button onClick={() => { setDisciplineForm({ student_name: "", class_name: "", date: new Date().toISOString().slice(0, 10), reason: "", action: "", status: "Open" }); setEditDisciplineId(null); setDisciplineDlg(true) }} className="gap-1.5 bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="size-4" />{fr ? "Ajouter un cas" : "Add case"}</Button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-card p-3"><p className="text-xs text-muted-foreground">{fr ? "Total des cas" : "Total cases"}</p><p className="text-lg font-bold text-foreground">{disciplineTotal}</p></div>
              <div className="rounded-lg border border-border bg-card p-3"><p className="text-xs text-muted-foreground">{fr ? "Cas ouverts" : "Open cases"}</p><p className="text-lg font-bold text-warning">{disciplineOpen}</p></div>
            </div>
            {loading ? <div className="flex h-32 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div> :
            disciplineEntries.length === 0 ? (
              <EmptyState icon={<Shield className="size-12" />} title={fr ? "Aucun cas disciplinaire" : "No disciplinary cases"} description={fr ? "Les cas disciplinaires apparaîtront ici." : "Disciplinary cases will appear here."} />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50"><tr><th className="px-4 py-3 text-left font-medium text-muted-foreground">{fr ? "Élève" : "Student"}</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">{fr ? "Classe" : "Class"}</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">{fr ? "Date" : "Date"}</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">{fr ? "Motif" : "Reason"}</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">{fr ? "Action" : "Action"}</th><th className="px-4 py-3 text-center font-medium text-muted-foreground">{fr ? "Statut" : "Status"}</th><th className="px-4 py-3" /></tr></thead>
                  <tbody className="divide-y divide-border">
                    {disciplineEntries.map((d) => (
                      <tr key={d.id} className="bg-card hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium text-foreground">{d.student_name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{d.class_name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{d.date ? new Date(d.date).toLocaleDateString(fr ? "fr-FR" : "en-US") : "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{d.reason}</td>
                        <td className="px-4 py-3 text-muted-foreground">{d.action}</td>
                        <td className="px-4 py-3 text-center"><Badge variant={d.status === "Open" ? "secondary" : "outline"}>{d.status === "Open" ? (fr ? "Ouvert" : "Open") : (fr ? "Résolu" : "Resolved")}</Badge></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5 justify-end">
                            <Button size="icon" variant="ghost" className="size-7" onClick={() => { setDisciplineForm({ student_name: d.student_name, class_name: d.class_name, date: d.date, reason: d.reason, action: d.action, status: d.status }); setEditDisciplineId(d.id); setDisciplineDlg(true) }}><Edit2 className="size-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="size-7 text-destructive hover:text-destructive" onClick={() => deleteDisciplineEntry(d.id)}><Trash2 className="size-3.5" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Dialog open={disciplineDlg} onOpenChange={(o) => { setDisciplineDlg(o); if (!o) setEditDisciplineId(null) }}>
              <DialogContent className="ag-dialog max-w-lg p-0">
                <DialogHeader className="px-6 pt-5 pb-0"><DialogTitle className="text-foreground">{editDisciplineId ? (fr ? "Modifier le cas" : "Edit case") : (fr ? "Ajouter un cas" : "Add case")}</DialogTitle></DialogHeader>
                <div className="space-y-4 px-6 py-4">
                  <div className="space-y-1.5"><Label className="text-sm font-medium text-foreground">{fr ? "Élève" : "Student"}</Label><Input value={disciplineForm.student_name} onChange={(e) => setDisciplineForm((p) => ({ ...p, student_name: e.target.value }))} placeholder="Ex: Jean Dupont" className="h-10 rounded-lg text-foreground" /></div>
                  <div className="space-y-1.5"><Label className="text-sm font-medium text-foreground">{fr ? "Classe" : "Class"}</Label><Input value={disciplineForm.class_name} onChange={(e) => setDisciplineForm((p) => ({ ...p, class_name: e.target.value }))} placeholder="Ex: CM2 A" className="h-10 rounded-lg text-foreground" /></div>
                  <div className="space-y-1.5"><Label className="text-sm font-medium text-foreground">{fr ? "Date" : "Date"}</Label><Input type="date" value={disciplineForm.date} onChange={(e) => setDisciplineForm((p) => ({ ...p, date: e.target.value }))} className="h-10 rounded-lg text-foreground" /></div>
                  <div className="space-y-1.5"><Label className="text-sm font-medium text-foreground">{fr ? "Motif" : "Reason"}</Label><Input value={disciplineForm.reason} onChange={(e) => setDisciplineForm((p) => ({ ...p, reason: e.target.value }))} placeholder="Ex: Retard répété" className="h-10 rounded-lg text-foreground" /></div>
                  <div className="space-y-1.5"><Label className="text-sm font-medium text-foreground">{fr ? "Action prise" : "Action taken"}</Label><Input value={disciplineForm.action} onChange={(e) => setDisciplineForm((p) => ({ ...p, action: e.target.value }))} placeholder="Ex: Avertissement" className="h-10 rounded-lg text-foreground" /></div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-foreground">{fr ? "Statut" : "Status"}</Label>
                    <div className="flex gap-2">
                      {["Open", "Resolved"].map((st) => (
                        <button key={st} type="button" onClick={() => setDisciplineForm((p) => ({ ...p, status: st }))} className={`rounded-lg border px-4 py-2 text-sm transition-colors ${disciplineForm.status === st ? "border-brand bg-brand/10 text-brand font-medium" : "border-border text-muted-foreground hover:bg-muted"}`}>{st === "Open" ? (fr ? "Ouvert" : "Open") : (fr ? "Résolu" : "Resolved")}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter className="px-6 py-4 border-t border-border/50">
                  <Button variant="outline" onClick={() => { setDisciplineDlg(false); setEditDisciplineId(null) }}>{fr ? "Annuler" : "Cancel"}</Button>
                  <Button onClick={saveDisciplineEntry} className="bg-brand text-brand-foreground hover:bg-brand/90">{editDisciplineId ? (fr ? "Modifier" : "Edit") : (fr ? "Ajouter" : "Add")}</Button>
                </DialogFooter>
                <DialogFooterBrand />
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* ========== INCIDENTS TAB ========== */}
          <TabsContent value="incidents">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">{fr ? "Incidents" : "Incidents"}</h2>
              <Button onClick={() => { setIncidentForm({ date: new Date().toISOString().slice(0, 10), type: "Other", description: "", reported_by: "", status: "Open" }); setEditIncidentId(null); setIncidentDlg(true) }} className="gap-1.5 bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="size-4" />{fr ? "Signaler un incident" : "Report incident"}</Button>
            </div>
            {loading ? <div className="flex h-32 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div> :
            incidentEntries.length === 0 ? (
              <EmptyState icon={<AlertTriangle className="size-12" />} title={fr ? "Aucun incident" : "No incidents"} description={fr ? "Les incidents signalés apparaîtront ici." : "Reported incidents will appear here."} />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50"><tr><th className="px-4 py-3 text-left font-medium text-muted-foreground">{fr ? "Date" : "Date"}</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">{fr ? "Type" : "Type"}</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">{fr ? "Description" : "Description"}</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">{fr ? "Signalé par" : "Reported by"}</th><th className="px-4 py-3 text-center font-medium text-muted-foreground">{fr ? "Statut" : "Status"}</th><th className="px-4 py-3" /></tr></thead>
                  <tbody className="divide-y divide-border">
                    {incidentEntries.map((inc) => (
                      <tr key={inc.id} className="bg-card hover:bg-muted/30">
                        <td className="px-4 py-3 text-muted-foreground">{inc.date ? new Date(inc.date).toLocaleDateString(fr ? "fr-FR" : "en-US") : "—"}</td>
                        <td className="px-4 py-3"><Badge variant="outline">{inc.type}</Badge></td>
                        <td className="px-4 py-3 text-foreground">{inc.description}</td>
                        <td className="px-4 py-3 text-muted-foreground">{inc.reported_by}</td>
                        <td className="px-4 py-3 text-center"><Badge variant={inc.status === "Open" ? "secondary" : "outline"}>{inc.status === "Open" ? (fr ? "Ouvert" : "Open") : (fr ? "Fermé" : "Closed")}</Badge></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5 justify-end">
                            <Button size="icon" variant="ghost" className="size-7" onClick={() => { setIncidentForm({ date: inc.date, type: inc.type, description: inc.description, reported_by: inc.reported_by, status: inc.status }); setEditIncidentId(inc.id); setIncidentDlg(true) }}><Edit2 className="size-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="size-7 text-destructive hover:text-destructive" onClick={() => deleteIncidentEntry(inc.id)}><Trash2 className="size-3.5" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Dialog open={incidentDlg} onOpenChange={(o) => { setIncidentDlg(o); if (!o) setEditIncidentId(null) }}>
              <DialogContent className="ag-dialog max-w-lg p-0">
                <DialogHeader className="px-6 pt-5 pb-0"><DialogTitle className="text-foreground">{editIncidentId ? (fr ? "Modifier l'incident" : "Edit incident") : (fr ? "Signaler un incident" : "Report incident")}</DialogTitle></DialogHeader>
                <div className="space-y-4 px-6 py-4">
                  <div className="space-y-1.5"><Label className="text-sm font-medium text-foreground">{fr ? "Date" : "Date"}</Label><Input type="date" value={incidentForm.date} onChange={(e) => setIncidentForm((p) => ({ ...p, date: e.target.value }))} className="h-10 rounded-lg text-foreground" /></div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-foreground">{fr ? "Type" : "Type"}</Label>
                    <select value={incidentForm.type} onChange={(e) => setIncidentForm((p) => ({ ...p, type: e.target.value }))} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground">
                      {["Accident", "Fight", "Theft", "Other"].map((t) => <option key={t} value={t}>{t === "Accident" ? (fr ? "Accident" : "Accident") : t === "Fight" ? (fr ? "Bagarre" : "Fight") : t === "Theft" ? (fr ? "Vol" : "Theft") : (fr ? "Autre" : "Other")}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5"><Label className="text-sm font-medium text-foreground">{fr ? "Description" : "Description"}</Label><textarea value={incidentForm.description} onChange={(e) => setIncidentForm((p) => ({ ...p, description: e.target.value }))} className="w-full min-h-[80px] rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder={fr ? "Décrivez l'incident..." : "Describe the incident..."} /></div>
                  <div className="space-y-1.5"><Label className="text-sm font-medium text-foreground">{fr ? "Signalé par" : "Reported by"}</Label><Input value={incidentForm.reported_by} onChange={(e) => setIncidentForm((p) => ({ ...p, reported_by: e.target.value }))} placeholder="Ex: M. Dupont" className="h-10 rounded-lg text-foreground" /></div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-foreground">{fr ? "Statut" : "Status"}</Label>
                    <div className="flex gap-2">
                      {["Open", "Closed"].map((st) => (
                        <button key={st} type="button" onClick={() => setIncidentForm((p) => ({ ...p, status: st }))} className={`rounded-lg border px-4 py-2 text-sm transition-colors ${incidentForm.status === st ? "border-brand bg-brand/10 text-brand font-medium" : "border-border text-muted-foreground hover:bg-muted"}`}>{st === "Open" ? (fr ? "Ouvert" : "Open") : (fr ? "Fermé" : "Closed")}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter className="px-6 py-4 border-t border-border/50">
                  <Button variant="outline" onClick={() => { setIncidentDlg(false); setEditIncidentId(null) }}>{fr ? "Annuler" : "Cancel"}</Button>
                  <Button onClick={saveIncidentEntry} className="bg-brand text-brand-foreground hover:bg-brand/90">{editIncidentId ? (fr ? "Modifier" : "Edit") : (fr ? "Ajouter" : "Add")}</Button>
                </DialogFooter>
                <DialogFooterBrand />
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* ========== ACCOUNTING TAB ========== */}
          <TabsContent value="accounting">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">{fr ? "Comptabilité" : "Accounting"}</h2>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 mb-4">
              <h3 className="text-sm font-medium text-foreground mb-3">{fr ? "Ajouter une entrée" : "Add entry"}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                <div><Label className="text-xs text-foreground">{fr ? "Date" : "Date"}</Label><Input type="date" value={accountingForm.date} onChange={(e) => setAccountingForm((p) => ({ ...p, date: e.target.value }))} className="h-9 text-sm" /></div>
                <div><Label className="text-xs text-foreground">{fr ? "Description" : "Description"}</Label><Input value={accountingForm.description} onChange={(e) => setAccountingForm((p) => ({ ...p, description: e.target.value }))} placeholder="..." className="h-9 text-sm" /></div>
                <div><Label className="text-xs text-foreground">{fr ? "Type" : "Type"}</Label>
                  <select value={accountingForm.type} onChange={(e) => setAccountingForm((p) => ({ ...p, type: e.target.value }))} className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground">
                    <option value="income">{fr ? "Revenu" : "Income"}</option>
                    <option value="expense">{fr ? "Dépense" : "Expense"}</option>
                  </select>
                </div>
                <div><Label className="text-xs text-foreground">{fr ? "Catégorie" : "Category"}</Label>
                  <select value={accountingForm.category} onChange={(e) => setAccountingForm((p) => ({ ...p, category: e.target.value }))} className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground">
                    <option value="">—</option>
                    <option value="scolarité">{fr ? "Scolarité" : "Tuition"}</option>
                    <option value="fournitures">{fr ? "Fournitures" : "Supplies"}</option>
                    <option value="salaire">{fr ? "Salaire" : "Salary"}</option>
                    <option value="entretien">{fr ? "Entretien" : "Maintenance"}</option>
                    <option value="autre">{fr ? "Autre" : "Other"}</option>
                  </select>
                </div>
                <div><Label className="text-xs text-foreground">{fr ? "Montant (FC)" : "Amount (FC)"}</Label><Input type="number" step="0.01" min="0" value={accountingForm.amount} onChange={(e) => setAccountingForm((p) => ({ ...p, amount: e.target.value }))} className="h-9 text-sm" /></div>
                <div className="flex items-end">
                  <Button onClick={saveAccountingEntry} className="h-9 w-full bg-brand text-brand-foreground hover:bg-brand/90"><Plus className="size-4 mr-1" />{fr ? "Ajouter" : "Add"}</Button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-lg border border-border bg-card p-3"><p className="text-xs text-muted-foreground">{fr ? "Revenus" : "Income"}</p><p className="text-lg font-bold text-success">{formatCurrency(totalIncome, undefined, true)}</p></div>
              <div className="rounded-lg border border-border bg-card p-3"><p className="text-xs text-muted-foreground">{fr ? "Dépenses" : "Expenses"}</p><p className="text-lg font-bold text-destructive">{formatCurrency(totalExpense, undefined, true)}</p></div>
              <div className="rounded-lg border border-border bg-card p-3"><p className="text-xs text-muted-foreground">{fr ? "Solde" : "Balance"}</p><p className={`text-lg font-bold ${accountBalance >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(accountBalance, undefined, true)}</p></div>
            </div>
            {loading ? <div className="flex h-32 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div> :
            accountingEntries.length === 0 ? (
              <EmptyState icon={<Receipt className="size-12" />} title={fr ? "Aucune entrée" : "No entries"} description={fr ? "Ajoutez des revenus ou dépenses pour suivre la comptabilité." : "Add income or expenses to track accounting."} />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50"><tr><th className="px-4 py-3 text-left font-medium text-muted-foreground">{fr ? "Date" : "Date"}</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">{fr ? "Description" : "Description"}</th><th className="px-4 py-3 text-center font-medium text-muted-foreground">{fr ? "Type" : "Type"}</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">{fr ? "Catégorie" : "Category"}</th><th className="px-4 py-3 text-right font-medium text-muted-foreground">{fr ? "Montant (FC)" : "Amount (FC)"}</th><th className="px-4 py-3" /></tr></thead>
                  <tbody className="divide-y divide-border">
                    {accountingEntries.slice().sort((a, b) => new Date(b.entry_date || b.date).getTime() - new Date(a.entry_date || a.date).getTime()).map((e) => (
                      <tr key={e.id} className="bg-card hover:bg-muted/30">
                        <td className="px-4 py-3 text-muted-foreground">{(e.entry_date || e.date) ? new Date(e.entry_date || e.date).toLocaleDateString(fr ? "fr-FR" : "en-US") : "—"}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{e.description}</td>
                        <td className="px-4 py-3 text-center"><Badge variant={e.type === "income" ? "secondary" : "destructive"}>{e.type === "income" ? (fr ? "Revenu" : "Income") : (fr ? "Dépense" : "Expense")}</Badge></td>
                        <td className="px-4 py-3 text-muted-foreground capitalize">{e.category || "—"}</td>
                        <td className="px-4 py-3 text-right font-medium text-foreground">{e.type === "income" ? "+" : "-"}{formatCurrency(Number(e.amount), undefined, true)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5 justify-end">
                            <Button size="icon" variant="ghost" className="size-7" onClick={() => { setAccountingForm({ date: e.entry_date || e.date || "", description: e.description, type: e.type, category: e.category, amount: String(e.amount) }); setEditAccountingId(e.id); setAccountingDlg(true) }}><Edit2 className="size-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="size-7 text-destructive hover:text-destructive" onClick={() => deleteAccountingEntry(e.id)}><Trash2 className="size-3.5" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Dialog open={accountingDlg} onOpenChange={(o) => { setAccountingDlg(o); if (!o) { setEditAccountingId(null); setAccountingForm({ date: "", description: "", type: "income", category: "", amount: "" }) }}}>
              <DialogContent className="ag-dialog max-w-lg p-0">
                <DialogHeader className="px-6 pt-5 pb-0"><DialogTitle className="text-foreground">{fr ? "Modifier l'entrée" : "Edit entry"}</DialogTitle></DialogHeader>
                <div className="space-y-4 px-6 py-4">
                  <div className="space-y-1.5"><Label className="text-sm font-medium text-foreground">{fr ? "Date" : "Date"}</Label><Input type="date" value={accountingForm.date} onChange={(e) => setAccountingForm((p) => ({ ...p, date: e.target.value }))} className="h-10 rounded-lg text-foreground" /></div>
                  <div className="space-y-1.5"><Label className="text-sm font-medium text-foreground">{fr ? "Description" : "Description"}</Label><Input value={accountingForm.description} onChange={(e) => setAccountingForm((p) => ({ ...p, description: e.target.value }))} className="h-10 rounded-lg text-foreground" /></div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-foreground">{fr ? "Type" : "Type"}</Label>
                    <select value={accountingForm.type} onChange={(e) => setAccountingForm((p) => ({ ...p, type: e.target.value }))} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground">
                      <option value="income">{fr ? "Revenu" : "Income"}</option>
                      <option value="expense">{fr ? "Dépense" : "Expense"}</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-foreground">{fr ? "Catégorie" : "Category"}</Label>
                    <select value={accountingForm.category} onChange={(e) => setAccountingForm((p) => ({ ...p, category: e.target.value }))} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground">
                      <option value="">—</option>
                      <option value="scolarité">{fr ? "Scolarité" : "Tuition"}</option>
                      <option value="fournitures">{fr ? "Fournitures" : "Supplies"}</option>
                      <option value="salaire">{fr ? "Salaire" : "Salary"}</option>
                      <option value="entretien">{fr ? "Entretien" : "Maintenance"}</option>
                      <option value="autre">{fr ? "Autre" : "Other"}</option>
                    </select>
                  </div>
                  <div className="space-y-1.5"><Label className="text-sm font-medium text-foreground">{fr ? "Montant (FC)" : "Amount (FC)"}</Label><Input type="number" step="0.01" min="0" value={accountingForm.amount} onChange={(e) => setAccountingForm((p) => ({ ...p, amount: e.target.value }))} className="h-10 rounded-lg text-foreground" /></div>
                </div>
                <DialogFooter className="px-6 py-4 border-t border-border/50">
                  <Button variant="outline" onClick={() => { setAccountingDlg(false); setEditAccountingId(null); setAccountingForm({ date: "", description: "", type: "income", category: "", amount: "" }) }}>{fr ? "Annuler" : "Cancel"}</Button>
                  <Button onClick={saveAccountingEntry} className="bg-brand text-brand-foreground hover:bg-brand/90">{fr ? "Enregistrer" : "Save"}</Button>
                </DialogFooter>
                <DialogFooterBrand />
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* ========== HISTORY TAB ========== */}
          <TabsContent value="history">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">{fr ? "Historique" : "History"}</h2>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
              <div className="flex items-center gap-2"><Label className="whitespace-nowrap text-foreground">{fr ? "Du" : "From"}</Label><Input type="date" value={histDateStart} onChange={(e) => setHistDateStart(e.target.value)} className="w-fit text-foreground" /></div>
              <div className="flex items-center gap-2"><Label className="whitespace-nowrap text-foreground">{fr ? "Au" : "To"}</Label><Input type="date" value={histDateEnd} onChange={(e) => setHistDateEnd(e.target.value)} className="w-fit text-foreground" /></div>
              {(histDateStart || histDateEnd) && <Button variant="ghost" size="sm" onClick={() => { setHistDateStart(""); setHistDateEnd("") }}><X className="size-3.5 mr-1" />{fr ? "Effacer" : "Clear"}</Button>}
            </div>
            {loading ? <div className="flex h-32 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div> :
            combinedHistory.length === 0 ? (
              <EmptyState icon={<Clock className="size-12" />} title={fr ? "Aucune transaction" : "No transactions"} description={fr ? "L'historique des transactions apparaîtra ici." : "Transaction history will appear here."} />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50"><tr><th className="px-4 py-3 text-left font-medium text-muted-foreground">{fr ? "Date" : "Date"}</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">{fr ? "Description" : "Description"}</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">{fr ? "Source" : "Source"}</th><th className="px-4 py-3 text-right font-medium text-muted-foreground">{fr ? "Montant (FC)" : "Amount (FC)"}</th></tr></thead>
                  <tbody className="divide-y divide-border">
                    {combinedHistory.map((h) => (
                      <tr key={h.id} className="bg-card hover:bg-muted/30">
                        <td className="px-4 py-3 text-muted-foreground">{new Date(h.date).toLocaleDateString(fr ? "fr-FR" : "en-US")}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{h.description || "—"}</td>
                        <td className="px-4 py-3"><Badge variant={h.source === "fee_payments" ? "secondary" : "outline"}>{h.source === "fee_payments" ? (fr ? "Paiement" : "Payment") : (fr ? "Local" : "Local")}</Badge></td>
                        <td className="px-4 py-3 text-right font-medium text-foreground">{formatCurrency(Number(h.amount), undefined, true)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Student Dialog */}
      <Dialog open={showStudentDlg} onOpenChange={(o) => { setShowStudentDlg(o); if (!o) setEditStudent(null) }}>
        <DialogContent className="ag-dialog max-w-lg p-0">
          <DialogHeader className="px-6 pt-5 pb-0">
            <DialogTitle className="text-foreground">{editStudent ? (fr ? "Modifier l'élève" : "Edit student") : (fr ? "Ajouter un élève" : "Add student")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 py-4">
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[{ id: "first_name", label: fr ? "Prénom" : "First name" }, { id: "last_name", label: fr ? "Nom" : "Last name" }].map((f) => (
                <div key={f.id} className="space-y-1.5"><Label htmlFor={f.id} className="text-sm font-medium text-foreground">{f.label}</Label><Input id={f.id} value={(studentForm as any)[f.id]} onChange={(e) => setStudentForm((p) => ({ ...p, [f.id]: e.target.value }))} className="h-10 rounded-lg text-foreground" />{studentErrors[f.id] && <p className="text-xs text-destructive">{studentErrors[f.id]}</p>}</div>
              ))}
            </div>
            <div className="space-y-1.5"><Label htmlFor="class_name" className="text-sm font-medium text-foreground">{fr ? "Classe" : "Class"}</Label><Input id="class_name" value={studentForm.class_name} onChange={(e) => setStudentForm((p) => ({ ...p, class_name: e.target.value }))} placeholder="Ex: CM2, 6ème" className="h-10 rounded-lg text-foreground" /></div>
            <div className="space-y-1.5"><Label htmlFor="parent_phone" className="text-sm font-medium text-foreground">{fr ? "Téléphone parent" : "Parent phone"}</Label><Input id="parent_phone" value={studentForm.parent_phone} onChange={(e) => setStudentForm((p) => ({ ...p, parent_phone: e.target.value }))} className="h-10 rounded-lg text-foreground" />{studentErrors.parent_phone && <p className="text-xs text-destructive">{studentErrors.parent_phone}</p>}</div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">{fr ? "Genre" : "Gender"}</Label>
              <div className="flex gap-2">
                {["M", "F", "other"].map((g) => (
                  <button key={g} type="button" onClick={() => setStudentForm((p) => ({ ...p, gender: g }))} className={`rounded-lg border px-4 py-2 text-sm transition-colors ${studentForm.gender === g ? "border-brand bg-brand/10 text-brand font-medium" : "border-border text-muted-foreground hover:bg-muted"}`}>{g}</button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border/50">
            <Button variant="outline" onClick={() => setShowStudentDlg(false)}>{fr ? "Annuler" : "Cancel"}</Button>
            <Button onClick={saveStudent} disabled={saving} className="bg-brand text-brand-foreground hover:bg-brand/90 gap-2">{saving && <Loader2 className="size-4 animate-spin" />}{fr ? "Enregistrer" : "Save"}</Button>
          </DialogFooter>
          <DialogFooterBrand />
        </DialogContent>
      </Dialog>

      {/* Teacher Dialog */}
      <Dialog open={showTeacherDlg} onOpenChange={(o) => { setShowTeacherDlg(o); if (!o) setEditTeacher(null) }}>
        <DialogContent className="ag-dialog max-w-lg p-0">
          <DialogHeader className="px-6 pt-5 pb-0">
            <DialogTitle className="text-foreground">{editTeacher ? (fr ? "Modifier l'enseignant" : "Edit teacher") : (fr ? "Ajouter un enseignant" : "Add teacher")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 py-4">
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[{ id: "first_name", label: fr ? "Prénom" : "First name" }, { id: "last_name", label: fr ? "Nom" : "Last name" }].map((f) => (
                <div key={f.id} className="space-y-1.5"><Label htmlFor={f.id} className="text-sm font-medium text-foreground">{f.label}</Label><Input id={f.id} value={(teacherForm as any)[f.id]} onChange={(e) => setTeacherForm((p) => ({ ...p, [f.id]: e.target.value }))} className="h-10 rounded-lg text-foreground" />{teacherErrors[f.id] && <p className="text-xs text-destructive">{teacherErrors[f.id]}</p>}</div>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="phone" className="text-sm font-medium text-foreground">{fr ? "Téléphone" : "Phone"}</Label><Input id="phone" value={teacherForm.phone} onChange={(e) => setTeacherForm((p) => ({ ...p, phone: e.target.value }))} className="h-10 rounded-lg text-foreground" />{teacherErrors.phone && <p className="text-xs text-destructive">{teacherErrors.phone}</p>}</div>
              <div className="space-y-1.5"><Label htmlFor="subject" className="text-sm font-medium text-foreground">{fr ? "Matière" : "Subject"}</Label><Input id="subject" value={teacherForm.subject} onChange={(e) => setTeacherForm((p) => ({ ...p, subject: e.target.value }))} className="h-10 rounded-lg text-foreground" /></div>
            </div>
            <div className="space-y-1.5"><Label htmlFor="salary_usd" className="text-sm font-medium text-foreground">{fr ? "Salaire (FC)" : "Salary (FC)"}</Label><Input id="salary_usd" value={teacherForm.salary_usd} onChange={(e) => setTeacherForm((p) => ({ ...p, salary_usd: e.target.value }))} type="number" className="h-10 rounded-lg text-foreground" />{teacherErrors.salary_usd && <p className="text-xs text-destructive">{teacherErrors.salary_usd}</p>}</div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">{fr ? "Statut" : "Status"}</Label>
              <div className="flex gap-2">
                {["active", "inactive"].map((st) => (
                  <button key={st} type="button" onClick={() => setTeacherForm((p) => ({ ...p, status: st }))} className={`rounded-lg border px-4 py-2 text-sm transition-colors ${teacherForm.status === st ? "border-brand bg-brand/10 text-brand font-medium" : "border-border text-muted-foreground hover:bg-muted"}`}>{st === "active" ? (fr ? "Actif" : "Active") : (fr ? "Inactif" : "Inactive")}</button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border/50">
            <Button variant="outline" onClick={() => setShowTeacherDlg(false)}>{fr ? "Annuler" : "Cancel"}</Button>
            <Button onClick={saveTeacher} disabled={saving} className="bg-brand text-brand-foreground hover:bg-brand/90 gap-2">{saving && <Loader2 className="size-4 animate-spin" />}{fr ? "Enregistrer" : "Save"}</Button>
          </DialogFooter>
          <DialogFooterBrand />
        </DialogContent>
      </Dialog>

      {/* Class Dialog */}
      <Dialog open={showClassDlg} onOpenChange={(o) => { setShowClassDlg(o); if (!o) setEditClass(null) }}>
        <DialogContent className="ag-dialog max-w-lg p-0">
          <DialogHeader className="px-6 pt-5 pb-0">
            <DialogTitle className="text-foreground">{editClass ? (fr ? "Modifier la classe" : "Edit class") : (fr ? "Ajouter une classe" : "Add class")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 py-4">
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="cl-name" className="text-sm font-medium text-foreground">{fr ? "Nom" : "Name"}</Label><Input id="cl-name" value={classForm.name} onChange={(e) => setClassForm((p) => ({ ...p, name: e.target.value }))} placeholder="Ex: CM2 A" className="h-10 rounded-lg text-foreground" />{classErrors.name && <p className="text-xs text-destructive">{classErrors.name}</p>}</div>
              <div className="space-y-1.5"><Label htmlFor="cl-level" className="text-sm font-medium text-foreground">{fr ? "Niveau" : "Level"}</Label><Input id="cl-level" value={classForm.level} onChange={(e) => setClassForm((p) => ({ ...p, level: e.target.value }))} placeholder="Ex: Primaire" className="h-10 rounded-lg text-foreground" /></div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">{fr ? "Enseignant" : "Teacher"}</Label>
              <select value={classForm.teacher_id} onChange={(e) => setClassForm((p) => ({ ...p, teacher_id: e.target.value }))} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">{fr ? "Aucun" : "None"}</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5"><Label htmlFor="cl-fees" className="text-sm font-medium text-foreground">{fr ? "Frais (FC)" : "Fees (FC)"}</Label><Input id="cl-fees" value={classForm.fees_usd} onChange={(e) => setClassForm((p) => ({ ...p, fees_usd: e.target.value }))} type="number" className="h-10 rounded-lg text-foreground" />{classErrors.fees_usd && <p className="text-xs text-destructive">{classErrors.fees_usd}</p>}</div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">{fr ? "Statut" : "Status"}</Label>
              <div className="flex gap-2">
                {["active", "inactive"].map((st) => (
                  <button key={st} type="button" onClick={() => setClassForm((p) => ({ ...p, status: st }))} className={`rounded-lg border px-4 py-2 text-sm transition-colors ${classForm.status === st ? "border-brand bg-brand/10 text-brand font-medium" : "border-border text-muted-foreground hover:bg-muted"}`}>{st === "active" ? (fr ? "Actif" : "Active") : (fr ? "Inactif" : "Inactive")}</button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border/50">
            <Button variant="outline" onClick={() => setShowClassDlg(false)}>{fr ? "Annuler" : "Cancel"}</Button>
            <Button onClick={saveClass} disabled={saving} className="bg-brand text-brand-foreground hover:bg-brand/90 gap-2">{saving && <Loader2 className="size-4 animate-spin" />}{fr ? "Enregistrer" : "Save"}</Button>
          </DialogFooter>
          <DialogFooterBrand />
        </DialogContent>
      </Dialog>

      {/* Exam Dialog */}
      <Dialog open={showExamDlg} onOpenChange={(o) => { setShowExamDlg(o); if (!o) setEditExam(null) }}>
        <DialogContent className="ag-dialog max-w-lg p-0">
          <DialogHeader className="px-6 pt-5 pb-0">
            <DialogTitle className="text-foreground">{editExam ? (fr ? "Modifier l'examen" : "Edit exam") : (fr ? "Ajouter un examen" : "Add exam")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 py-4">
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <div className="space-y-1.5"><Label htmlFor="ex-name" className="text-sm font-medium text-foreground">{fr ? "Nom" : "Name"}</Label><Input id="ex-name" value={examForm.name} onChange={(e) => setExamForm((p) => ({ ...p, name: e.target.value }))} placeholder="Ex: Composition T1" className="h-10 rounded-lg text-foreground" />{examErrors.name && <p className="text-xs text-destructive">{examErrors.name}</p>}</div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">{fr ? "Classe" : "Class"}</Label>
              <select value={examForm.class_id} onChange={(e) => setExamForm((p) => ({ ...p, class_id: e.target.value }))} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">{fr ? "Sélectionner" : "Select"}</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5"><Label htmlFor="ex-subject" className="text-sm font-medium text-foreground">{fr ? "Matière" : "Subject"}</Label><Input id="ex-subject" value={examForm.subject} onChange={(e) => setExamForm((p) => ({ ...p, subject: e.target.value }))} className="h-10 rounded-lg text-foreground" /></div>
            <div className="space-y-1.5"><Label htmlFor="ex-date" className="text-sm font-medium text-foreground">{fr ? "Date" : "Date"}</Label><Input id="ex-date" type="date" value={examForm.date} onChange={(e) => setExamForm((p) => ({ ...p, date: e.target.value }))} className="h-10 rounded-lg text-foreground" /></div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="ex-max" className="text-sm font-medium text-foreground">{fr ? "Note max" : "Max score"}</Label><Input id="ex-max" type="number" value={examForm.max_score} onChange={(e) => setExamForm((p) => ({ ...p, max_score: e.target.value }))} className="h-10 rounded-lg text-foreground" /></div>
              <div className="space-y-1.5"><Label htmlFor="ex-coef" className="text-sm font-medium text-foreground">{fr ? "Coefficient" : "Coefficient"}</Label><Input id="ex-coef" type="number" step="0.5" value={examForm.coefficient} onChange={(e) => setExamForm((p) => ({ ...p, coefficient: e.target.value }))} className="h-10 rounded-lg text-foreground" /></div>
            </div>
            <div className="space-y-1.5"><Label htmlFor="ex-term" className="text-sm font-medium text-foreground">{fr ? "Trimestre" : "Term"}</Label><Input id="ex-term" value={examForm.term} onChange={(e) => setExamForm((p) => ({ ...p, term: e.target.value }))} placeholder="Ex: T1, T2, T3" className="h-10 rounded-lg text-foreground" /></div>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border/50">
            <Button variant="outline" onClick={() => setShowExamDlg(false)}>{fr ? "Annuler" : "Cancel"}</Button>
            <Button onClick={saveExam} disabled={saving} className="bg-brand text-brand-foreground hover:bg-brand/90 gap-2">{saving && <Loader2 className="size-4 animate-spin" />}{fr ? "Enregistrer" : "Save"}</Button>
          </DialogFooter>
          <DialogFooterBrand />
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPayDlg} onOpenChange={setShowPayDlg}>
        <DialogContent className="ag-dialog max-w-lg p-0">
          <DialogHeader className="px-6 pt-5 pb-0">
            <DialogTitle className="text-foreground">{fr ? "Enregistrer un paiement" : "Record payment"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 py-4">
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">{fr ? "Élève" : "Student"}</Label>
              <select value={payForm.student_id} onChange={(e) => setPayForm((p) => ({ ...p, student_id: e.target.value }))} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">{fr ? "Sélectionner un élève" : "Select student"}</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} {s.class_name ? `(${s.class_name})` : ""}</option>)}
              </select>
              {payErrors.student_id && <p className="text-xs text-destructive">{payErrors.student_id}</p>}
            </div>
            <div className="space-y-1.5"><Label className="text-sm font-medium text-foreground">{fr ? "Montant (FC)" : "Amount (FC)"}</Label><Input value={payForm.amount_usd} onChange={(e) => setPayForm((p) => ({ ...p, amount_usd: e.target.value }))} placeholder="50.00" type="number" min="0" step="0.01" className="h-10 rounded-lg text-foreground" />{payErrors.amount_usd && <p className="text-xs text-destructive">{payErrors.amount_usd}</p>}</div>
            <div className="space-y-1.5"><Label className="text-sm font-medium text-foreground">{fr ? "Description" : "Description"}</Label><Input value={payForm.description} onChange={(e) => setPayForm((p) => ({ ...p, description: e.target.value }))} placeholder={fr ? "Ex: Frais de scolarité T1" : "Ex: Term 1 fees"} className="h-10 rounded-lg text-foreground" /></div>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border/50">
            <Button variant="outline" onClick={() => setShowPayDlg(false)}>{fr ? "Annuler" : "Cancel"}</Button>
            <Button onClick={savePayment} disabled={saving} className="bg-brand text-brand-foreground hover:bg-brand/90 gap-2">{saving && <Loader2 className="size-4 animate-spin" />}{fr ? "Enregistrer" : "Save"}</Button>
          </DialogFooter>
          <DialogFooterBrand />
        </DialogContent>
      </Dialog>
      <PageFooter onNavigate={onNavigate} />
    </div>
  )
}
