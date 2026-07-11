import * as React from "react"
import { useLanguage } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Users, Building2, Activity, UserCheck, Users2, ShieldCheck, UserCog,
  DollarSign, Calculator, Headset, Calendar, Bell, FileText,
  Search, X, ChevronLeft, ChevronRight, Loader2, Settings,
  AlertTriangle, Info, CheckCircle,
} from "lucide-react"
import {
  usePlatformAdmin, fetchPlatformDashboardStats, fetchAllUsers,
  fetchAllWorkspaces, fetchPlatformSettings,
  updatePlatformSetting, suspendUser, reactivateUser,
  suspendWorkspace, reactivateWorkspace, platformGetAuditLogs,
  fetchPlatformAdmins, addPlatformAdmin, removePlatformAdmin,
} from "@/lib/platform-admin"
import type { PlatformDashboardStats, PlatformSetting } from "@/lib/platform-admin"

interface Props {
  onNavigate: (p: string) => void
}

type Section = "dashboard" | "users" | "workspaces" | "activity" | "audit" | "settings"

const STAT_CARDS: Array<{
  key: keyof PlatformDashboardStats
  icon: React.ReactNode
  labelFr: string
  labelEn: string
}> = [
  { key: "totalUsers", icon: <Users className="size-5" />, labelFr: "Utilisateurs", labelEn: "Users" },
  { key: "totalWorkspaces", icon: <Building2 className="size-5" />, labelFr: "Espaces de travail", labelEn: "Workspaces" },
  { key: "activeWorkspaces", icon: <Activity className="size-5" />, labelFr: "Actifs", labelEn: "Active" },
  { key: "inactiveWorkspaces", icon: <AlertTriangle className="size-5" />, labelFr: "Inactifs", labelEn: "Inactive" },
  { key: "totalEmployees", icon: <Users2 className="size-5" />, labelFr: "Employés", labelEn: "Employees" },
  { key: "totalAdmins", icon: <ShieldCheck className="size-5" />, labelFr: "Administrateurs", labelEn: "Admins" },
  { key: "totalManagers", icon: <UserCog className="size-5" />, labelFr: "Gestionnaires", labelEn: "Managers" },
  { key: "totalCashiers", icon: <DollarSign className="size-5" />, labelFr: "Caissiers", labelEn: "Cashiers" },
  { key: "totalAccountants", icon: <Calculator className="size-5" />, labelFr: "Comptables", labelEn: "Accountants" },
  { key: "totalSupportTickets", icon: <Headset className="size-5" />, labelFr: "Tickets support", labelEn: "Support tickets" },
  { key: "totalAppointments", icon: <Calendar className="size-5" />, labelFr: "Rendez-vous", labelEn: "Appointments" },
  { key: "totalNotifications", icon: <Bell className="size-5" />, labelFr: "Notifications", labelEn: "Notifications" },
  { key: "totalReports", icon: <FileText className="size-5" />, labelFr: "Rapports", labelEn: "Reports" },
]

const ACTION_LABELS: Record<string, { fr: string; en: string }> = {
  login: { fr: "Connexion", en: "Login" },
  logout: { fr: "Déconnexion", en: "Logout" },
  login_failed: { fr: "Échec connexion", en: "Login failed" },
  user_created: { fr: "Utilisateur créé", en: "User created" },
  user_deleted: { fr: "Utilisateur supprimé", en: "User deleted" },
  user_updated: { fr: "Utilisateur modifié", en: "User updated" },
  permission_changed: { fr: "Permission modifiée", en: "Permission changed" },
  password_changed: { fr: "Mot de passe changé", en: "Password changed" },
  data_export: { fr: "Export de données", en: "Data export" },
  data_import: { fr: "Import de données", en: "Data import" },
  file_upload: { fr: "Fichier uploadé", en: "File uploaded" },
  file_download: { fr: "Fichier téléchargé", en: "File downloaded" },
  file_deleted: { fr: "Fichier supprimé", en: "File deleted" },
  settings_changed: { fr: "Paramètres modifiés", en: "Settings changed" },
  workspace_updated: { fr: "Espace modifié", en: "Workspace updated" },
  member_added: { fr: "Membre ajouté", en: "Member added" },
  member_removed: { fr: "Membre retiré", en: "Member removed" },
  member_role_changed: { fr: "Rôle modifié", en: "Role changed" },
  backup_created: { fr: "Sauvegarde créée", en: "Backup created" },
  session_revoked: { fr: "Session révoquée", en: "Session revoked" },
  leave_approved: { fr: "Congé approuvé", en: "Leave approved" },
  leave_rejected: { fr: "Congé refusé", en: "Leave rejected" },
  support_ticket_created: { fr: "Ticket créé", en: "Ticket created" },
  dpo_request_created: { fr: "Demande DPO", en: "DPO request" },
  appointment_created: { fr: "RDV créé", en: "Appointment created" },
  appointment_cancelled: { fr: "RDV annulé", en: "Appointment cancelled" },
  appointment_confirmed: { fr: "RDV confirmé", en: "Appointment confirmed" },
  contact_message_sent: { fr: "Message envoyé", en: "Message sent" },
}

const WORKSPACE_TYPES: Record<string, { fr: string; en: string }> = {
  education: { fr: "Éducation", en: "Education" },
  pharmacy: { fr: "Pharmacie", en: "Pharmacy" },
  commerce: { fr: "Commerce", en: "Commerce" },
  gestion: { fr: "Gestion", en: "Management" },
  hr: { fr: "RH", en: "HR" },
}

const SETTINGS_META: Array<{
  key: string
  labelFr: string
  labelEn: string
  type: "text" | "number"
}> = [
  { key: "platform_name", labelFr: "Nom de la plateforme", labelEn: "Platform Name", type: "text" },
  { key: "support_email", labelFr: "Email support", labelEn: "Support Email", type: "text" },
  { key: "dpo_email", labelFr: "Email DPO", labelEn: "DPO Email", type: "text" },
  { key: "password_min_length", labelFr: "Longueur min. mot de passe", labelEn: "Password Min Length", type: "number" },
  { key: "session_timeout", labelFr: "Expiration de session (min)", labelEn: "Session Timeout (min)", type: "number" },
  { key: "language_default", labelFr: "Langue par défaut", labelEn: "Language Default", type: "text" },
  { key: "timezone_default", labelFr: "Fuseau horaire par défaut", labelEn: "Timezone Default", type: "text" },
]

const ITEMS_PER_PAGE = 10

// ── Sub-components ──

function StatCard({ stat, value }: { stat: typeof STAT_CARDS[number]; value: number }) {
  const { lang } = useLanguage()
  const fr = lang === "fr"
  return (
    <Card className="bg-black/40 backdrop-blur-xl border border-white/[0.06] hover:border-white/[0.12] transition-all group">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-white/40 uppercase tracking-wider">{fr ? stat.labelFr : stat.labelEn}</p>
            <p className="text-3xl font-bold tracking-tight text-white">{value.toLocaleString()}</p>
          </div>
          <div className="rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-2.5 text-purple-400 group-hover:from-purple-500/30 group-hover:to-pink-500/30 transition-all">
            {stat.icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: string }) {
  const { lang } = useLanguage()
  const fr = lang === "fr"
  const variant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    active: "default",
    pending: "secondary",
    suspended: "destructive",
  }
  const labels: Record<string, string> = {
    active: fr ? "Actif" : "Active",
    pending: fr ? "En attente" : "Pending",
    suspended: fr ? "Suspendu" : "Suspended",
  }
  return (
    <Badge variant={variant[status] ?? "outline"} className={cn(
      status === "active" && "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      status === "pending" && "bg-amber-500/15 text-amber-400 border-amber-500/30",
      status === "suspended" && "bg-red-500/15 text-red-400 border-red-500/30",
    )}>
      {labels[status] ?? status}
    </Badge>
  )
}

function RoleBadge({ role }: { role: string }) {
  const { lang } = useLanguage()
  const fr = lang === "fr"
  const labels: Record<string, string> = {
    admin: fr ? "Admin" : "Admin",
    manager: fr ? "Gestionnaire" : "Manager",
    cashier: fr ? "Caissier" : "Cashier",
    accountant: fr ? "Comptable" : "Accountant",
    employee: fr ? "Employé" : "Employee",
  }
  const colors: Record<string, string> = {
    admin: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    manager: "bg-violet-500/15 text-violet-400 border-violet-500/30",
    cashier: "bg-green-500/15 text-green-400 border-green-500/30",
    accountant: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    employee: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  }
  return (
    <Badge variant="outline" className={cn("capitalize", colors[role] ?? "bg-slate-500/15 text-slate-400 border-slate-500/30")}>
      {labels[role] ?? role}
    </Badge>
  )
}

function LoadingSpinner({ text }: { text?: string }) {
  const { lang } = useLanguage()
  const fr = lang === "fr"
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <Loader2 className="size-8 animate-spin text-purple-400" />
      <p className="text-sm text-white/40">{text ?? (fr ? "Chargement..." : "Loading...")}</p>
    </div>
  )
}

function SectionHeader({ titleFr, titleEn, children }: { titleFr: string; titleEn: string; children?: React.ReactNode }) {
  const { lang } = useLanguage()
  const fr = lang === "fr"
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
      <h2 className="text-xl font-semibold text-white">{fr ? titleFr : titleEn}</h2>
      {children}
    </div>
  )
}

// ── Sections ──

function DashboardSection() {
  const [stats, setStats] = React.useState<PlatformDashboardStats | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false
    fetchPlatformDashboardStats().then((s) => {
      if (!cancelled) { setStats(s); setLoading(false) }
    })
    return () => { cancelled = true }
  }, [])

  if (loading) return <LoadingSpinner />
  if (!stats) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {STAT_CARDS.map((stat) => (
        <StatCard key={stat.key} stat={stat} value={stats[stat.key] as number} />
      ))}
    </div>
  )
}

function UsersSection() {
  const { lang } = useLanguage()
  const fr = lang === "fr"
  const [users, setUsers] = React.useState<any[]>([])
  const [admins, setAdmins] = React.useState<Set<string>>(new Set())
  const [hiddenAdmins, setHiddenAdmins] = React.useState<Set<string>>(new Set())
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [page, setPage] = React.useState(0)
  const [promoting, setPromoting] = React.useState<string | null>(null)

  const loadData = React.useCallback(async () => {
    const [u, a] = await Promise.all([fetchAllUsers(), fetchPlatformAdmins()])
    setUsers(u)
    const visible = new Set<string>()
    const hidden = new Set<string>()
    for (const x of a) {
      if (x.hidden) hidden.add(x.user_id)
      else visible.add(x.user_id)
    }
    setAdmins(visible)
    setHiddenAdmins(hidden)
    setLoading(false)
  }, [])

  React.useEffect(() => { loadData() }, [loadData])

  const filtered = React.useMemo(() => {
    let result = users
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((u: any) =>
        (u.display_name?.toLowerCase() ?? "").includes(q) ||
        (u.email?.toLowerCase() ?? "").includes(q)
      )
    }
    if (statusFilter !== "all") {
      result = result.filter((u: any) => u.status === statusFilter)
    }
    return result
  }, [users, search, statusFilter])

  const pageCount = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const paged = filtered.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE)
  const totalPages = pageCount

  const handleSuspend = async (id: string) => {
    try {
      await suspendUser(id)
      setUsers((prev) => prev.map((u: any) => u.id === id ? { ...u, status: "suspended" } : u))
      toast.success(fr ? "Utilisateur suspendu" : "User suspended")
    } catch { toast.error(fr ? "Erreur" : "Error") }
  }

  const handleReactivate = async (id: string) => {
    try {
      await reactivateUser(id)
      setUsers((prev) => prev.map((u: any) => u.id === id ? { ...u, status: "active" } : u))
      toast.success(fr ? "Utilisateur réactivé" : "User reactivated")
    } catch { toast.error(fr ? "Erreur" : "Error") }
  }

  const handlePromote = async (userId: string) => {
    setPromoting(userId)
    const result = await addPlatformAdmin(userId)
    setPromoting(null)
    if (result.success) {
      setAdmins((prev) => new Set(prev).add(userId))
      toast.success(fr ? "Administrateur platforme ajouté" : "Platform admin added")
    } else {
      toast.error(result.error || (fr ? "Erreur" : "Error"))
    }
  }

  const handleDemote = async (userId: string) => {
    setPromoting(userId)
    const result = await removePlatformAdmin(userId)
    setPromoting(null)
    if (result.success) {
      setAdmins((prev) => { const n = new Set(prev); n.delete(userId); return n })
      toast.success(fr ? "Administrateur platforme retiré" : "Platform admin removed")
    } else {
      toast.error(result.error || (fr ? "Erreur" : "Error"))
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
          <Input
            placeholder={fr ? "Rechercher par nom ou email..." : "Search by name or email..."}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            className="pl-9 bg-black/40 border-white/[0.06] text-white placeholder:text-white/30"
          />
          {search && (
            <button onClick={() => { setSearch(""); setPage(0) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
              <X className="size-4" />
            </button>
          )}
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0) }}>
          <SelectTrigger className="w-[160px] bg-black/40 border-white/[0.06] text-white">
            <SelectValue placeholder={fr ? "Statut" : "Status"} />
          </SelectTrigger>
          <SelectContent className="bg-[#0d0d0d] border-white/[0.06] text-white">
            <SelectItem value="all">{fr ? "Tous" : "All"}</SelectItem>
            <SelectItem value="active">{fr ? "Actif" : "Active"}</SelectItem>
            <SelectItem value="suspended">{fr ? "Suspendu" : "Suspended"}</SelectItem>
            <SelectItem value="pending">{fr ? "En attente" : "Pending"}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="bg-black/40 backdrop-blur-xl border border-white/[0.06] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/[0.06] hover:bg-transparent">
              <TableHead className="text-white/40 font-medium">{fr ? "Nom" : "Name"}</TableHead>
              <TableHead className="text-white/40 font-medium">Email</TableHead>
              <TableHead className="text-white/40 font-medium">{fr ? "Admin" : "Admin"}</TableHead>
              <TableHead className="text-white/40 font-medium">{fr ? "Espace" : "Workspace"}</TableHead>
              <TableHead className="text-white/40 font-medium">{fr ? "Rôle" : "Role"}</TableHead>
              <TableHead className="text-white/40 font-medium">{fr ? "Statut" : "Status"}</TableHead>
              <TableHead className="text-white/40 font-medium text-right">{fr ? "Actions" : "Actions"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow className="border-white/[0.06]">
                <TableCell colSpan={7} className="text-center text-white/30 py-8">
                  {fr ? "Aucun utilisateur trouvé" : "No users found"}
                </TableCell>
              </TableRow>
            ) : paged.map((u: any) => (
              <TableRow key={u.id} className="border-white/[0.06] hover:bg-white/[0.02]">
                <TableCell className="text-white font-medium">{u.display_name ?? "-"}</TableCell>
                <TableCell className="text-white/60">{u.email ?? "-"}</TableCell>
                <TableCell>
                  {admins.has(u.user_id) ? (
                    <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                      {fr ? "Oui" : "Yes"}
                    </Badge>
                  ) : (
                    <span className="text-white/20 text-xs">-</span>
                  )}
                </TableCell>
                <TableCell className="text-white/60">{u.workspace_name ?? "-"}</TableCell>
                <TableCell><RoleBadge role={u.role} /></TableCell>
                <TableCell><StatusBadge status={u.status} /></TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {hiddenAdmins.has(u.user_id) ? null : admins.has(u.user_id) ? (
                      <Button size="sm" variant="ghost" onClick={() => handleDemote(u.user_id)} disabled={promoting === u.user_id} className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10">
                        {promoting === u.user_id ? <Loader2 className="size-3 animate-spin" /> : fr ? "Rétrograder" : "Demote"}
                      </Button>
                    ) : u.user_id ? (
                      <Button size="sm" variant="ghost" onClick={() => handlePromote(u.user_id)} disabled={promoting === u.user_id} className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10">
                        {promoting === u.user_id ? <Loader2 className="size-3 animate-spin" /> : fr ? "Promouvoir" : "Promote"}
                      </Button>
                    ) : null}
                    {u.status === "active" || u.status === "pending" ? (
                      <Button size="sm" variant="ghost" onClick={() => handleSuspend(u.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                        {fr ? "Suspendre" : "Suspend"}
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => handleReactivate(u.id)} className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10">
                        {fr ? "Réactiver" : "Reactivate"}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-white/40">
            {fr ? `Page ${page + 1} sur ${totalPages}` : `Page ${page + 1} of ${totalPages}`}
            &nbsp;·&nbsp;
            {filtered.length} {fr ? "résultat(s)" : "result(s)"}
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage(page - 1)} className="text-white/60 hover:text-white">
              <ChevronLeft className="size-4 mr-1" />{fr ? "Préc." : "Prev"}
            </Button>
            <Button size="sm" variant="ghost" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="text-white/60 hover:text-white">
              {fr ? "Suiv." : "Next"}<ChevronRight className="size-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function WorkspacesSection() {
  const { lang } = useLanguage()
  const fr = lang === "fr"
  const [workspaces, setWorkspaces] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState("all")

  React.useEffect(() => {
    fetchAllWorkspaces().then((d) => { setWorkspaces(d); setLoading(false) })
  }, [])

  const filtered = React.useMemo(() => {
    let result = workspaces
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((w: any) => w.name?.toLowerCase().includes(q))
    }
    if (typeFilter !== "all") {
      result = result.filter((w: any) => w.type === typeFilter)
    }
    return result
  }, [workspaces, search, typeFilter])

  const handleSuspend = async (id: string) => {
    try {
      await suspendWorkspace(id)
      setWorkspaces((prev) => prev.map((w: any) => w.id === id ? { ...w, status: "suspended" } : w))
      toast.success(fr ? "Espace suspendu" : "Workspace suspended")
    } catch { toast.error(fr ? "Erreur" : "Error") }
  }

  const handleReactivate = async (id: string) => {
    try {
      await reactivateWorkspace(id)
      setWorkspaces((prev) => prev.map((w: any) => w.id === id ? { ...w, status: "active" } : w))
      toast.success(fr ? "Espace réactivé" : "Workspace reactivated")
    } catch { toast.error(fr ? "Erreur" : "Error") }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
          <Input
            placeholder={fr ? "Rechercher par nom..." : "Search by name..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-black/40 border-white/[0.06] text-white placeholder:text-white/30"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
              <X className="size-4" />
            </button>
          )}
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px] bg-black/40 border-white/[0.06] text-white">
            <SelectValue placeholder={fr ? "Type" : "Type"} />
          </SelectTrigger>
          <SelectContent className="bg-[#0d0d0d] border-white/[0.06] text-white">
            <SelectItem value="all">{fr ? "Tous" : "All"}</SelectItem>
            {Object.entries(WORKSPACE_TYPES).map(([k, v]) => (
              <SelectItem key={k} value={k}>{fr ? v.fr : v.en}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="bg-black/40 backdrop-blur-xl border border-white/[0.06] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/[0.06] hover:bg-transparent">
              <TableHead className="text-white/40 font-medium">{fr ? "Nom" : "Name"}</TableHead>
              <TableHead className="text-white/40 font-medium">{fr ? "Type" : "Type"}</TableHead>
              <TableHead className="text-white/40 font-medium">{fr ? "Propriétaire" : "Owner"}</TableHead>
              <TableHead className="text-white/40 font-medium">{fr ? "Créé le" : "Created"}</TableHead>
              <TableHead className="text-white/40 font-medium">{fr ? "Membres" : "Members"}</TableHead>
              <TableHead className="text-white/40 font-medium">{fr ? "Statut" : "Status"}</TableHead>
              <TableHead className="text-white/40 font-medium text-right">{fr ? "Actions" : "Actions"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow className="border-white/[0.06]">
                <TableCell colSpan={7} className="text-center text-white/30 py-8">
                  {fr ? "Aucun espace trouvé" : "No workspaces found"}
                </TableCell>
              </TableRow>
            ) : filtered.map((w: any) => (
              <TableRow key={w.id} className="border-white/[0.06] hover:bg-white/[0.02]">
                <TableCell className="text-white font-medium">{w.name ?? "-"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-white/5 text-white/70 border-white/[0.06]">
                    {fr ? (WORKSPACE_TYPES[w.type]?.fr ?? w.type) : (WORKSPACE_TYPES[w.type]?.en ?? w.type)}
                  </Badge>
                </TableCell>
                <TableCell className="text-white/60">{w.owner_name ?? w.owner_id ?? "-"}</TableCell>
                <TableCell className="text-white/60">
                  {w.created_at ? new Date(w.created_at).toLocaleDateString() : "-"}
                </TableCell>
                <TableCell className="text-white/60">
                  {w.workspace_members_count ?? w.workspace_members?.length ?? w.member_count ?? "-"}
                </TableCell>
                <TableCell><StatusBadge status={w.status ?? "active"} /></TableCell>
                <TableCell className="text-right">
                  {(w.status ?? "active") === "active" ? (
                    <Button size="sm" variant="ghost" onClick={() => handleSuspend(w.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                      {fr ? "Suspendre" : "Suspend"}
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => handleReactivate(w.id)} className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10">
                      {fr ? "Réactiver" : "Reactivate"}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

function ActivitySection() {
  const { lang } = useLanguage()
  const fr = lang === "fr"
  const [logs, setLogs] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchAction, setSearchAction] = React.useState("all")

  React.useEffect(() => {
    platformGetAuditLogs(50, 0).then((d) => {
      setLogs(d)
      setLoading(false)
    })
  }, [])

  const filtered = React.useMemo(() => {
    if (searchAction === "all") return logs
    return logs.filter((l: any) => l.action === searchAction)
  }, [logs, searchAction])

  const uniqueActions = React.useMemo(() => {
    const set = new Set(logs.map((l: any) => l.action))
    return Array.from(set).sort()
  }, [logs])

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={searchAction} onValueChange={setSearchAction}>
          <SelectTrigger className="w-[220px] bg-black/40 border-white/[0.06] text-white">
            <SelectValue placeholder={fr ? "Type d'action" : "Action type"} />
          </SelectTrigger>
          <SelectContent className="bg-[#0d0d0d] border-white/[0.06] text-white max-h-[300px]">
            <SelectItem value="all">{fr ? "Toutes les actions" : "All actions"}</SelectItem>
            {uniqueActions.map((a) => (
              <SelectItem key={a} value={a}>{fr ? (ACTION_LABELS[a]?.fr ?? a) : (ACTION_LABELS[a]?.en ?? a)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-white/30">
          {filtered.length} {fr ? "événement(s)" : "event(s)"}
        </p>
      </div>

      <Card className="bg-black/40 backdrop-blur-xl border border-white/[0.06] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/[0.06] hover:bg-transparent">
              <TableHead className="text-white/40 font-medium">{fr ? "Utilisateur" : "User"}</TableHead>
              <TableHead className="text-white/40 font-medium">{fr ? "Action" : "Action"}</TableHead>
              <TableHead className="text-white/40 font-medium">{fr ? "Cible" : "Target"}</TableHead>
              <TableHead className="text-white/40 font-medium">{fr ? "Date" : "Date"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow className="border-white/[0.06]">
                <TableCell colSpan={4} className="text-center text-white/30 py-8">
                  {fr ? "Aucune activité" : "No activity"}
                </TableCell>
              </TableRow>
            ) : filtered.map((l: any) => (
              <TableRow key={l.id} className="border-white/[0.06] hover:bg-white/[0.02]">
                <TableCell className="text-white font-medium">{l.actor_email ?? l.actor_id ?? "-"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-white/5 text-white/70 border-white/[0.06]">
                    {fr ? (ACTION_LABELS[l.action]?.fr ?? l.action) : (ACTION_LABELS[l.action]?.en ?? l.action)}
                  </Badge>
                </TableCell>
                <TableCell className="text-white/60">{l.target_type ? `${l.target_type}${l.target_id ? `:${l.target_id.slice(0, 8)}` : ""}` : "-"}</TableCell>
                <TableCell className="text-white/40 text-sm">
                  {l.created_at ? new Date(l.created_at).toLocaleString() : "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

function AuditSection() {
  const { lang } = useLanguage()
  const fr = lang === "fr"
  const [logs, setLogs] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchAction, setSearchAction] = React.useState("all")
  const [searchActor, setSearchActor] = React.useState("")
  const [page, setPage] = React.useState(0)

  const ITEMS = 15

  React.useEffect(() => {
    platformGetAuditLogs(200, 0).then((d) => {
      setLogs(d)
      setLoading(false)
    })
  }, [])

  const filtered = React.useMemo(() => {
    let result = logs
    if (searchAction !== "all") result = result.filter((l: any) => l.action === searchAction)
    if (searchActor) {
      const q = searchActor.toLowerCase()
      result = result.filter((l: any) => (l.actor_email ?? "").toLowerCase().includes(q))
    }
    return result
  }, [logs, searchAction, searchActor])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS))
  const paged = filtered.slice(page * ITEMS, (page + 1) * ITEMS)

  const uniqueActions = React.useMemo(() => {
    const set = new Set(logs.map((l: any) => l.action))
    return Array.from(set).sort()
  }, [logs])

  const handleExport = () => {
    const csv = [
      ["Action", "Actor", "Target Type", "Target ID", "Date"].join(","),
      ...filtered.map((l: any) =>
        [l.action, l.actor_email ?? "", l.target_type ?? "", l.target_id ?? "", l.created_at ?? ""].map((v) => `"${v}"`).join(",")
      ),
    ].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
    toast.success(fr ? "Exporté avec succès" : "Exported successfully")
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
          <Input
            placeholder={fr ? "Rechercher par email..." : "Search by email..."}
            value={searchActor}
            onChange={(e) => { setSearchActor(e.target.value); setPage(0) }}
            className="pl-9 bg-black/40 border-white/[0.06] text-white placeholder:text-white/30"
          />
        </div>
        <Select value={searchAction} onValueChange={(v) => { setSearchAction(v); setPage(0) }}>
          <SelectTrigger className="w-[200px] bg-black/40 border-white/[0.06] text-white">
            <SelectValue placeholder={fr ? "Action" : "Action"} />
          </SelectTrigger>
          <SelectContent className="bg-[#0d0d0d] border-white/[0.06] text-white max-h-[300px]">
            <SelectItem value="all">{fr ? "Toutes" : "All"}</SelectItem>
            {uniqueActions.map((a) => (
              <SelectItem key={a} value={a}>{fr ? (ACTION_LABELS[a]?.fr ?? a) : (ACTION_LABELS[a]?.en ?? a)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={handleExport} className="border-white/[0.06] text-white/60 hover:text-white hover:bg-white/5">
          <FileText className="size-4 mr-2" />{fr ? "Exporter CSV" : "Export CSV"}
        </Button>
      </div>

      <Card className="bg-black/40 backdrop-blur-xl border border-white/[0.06] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/[0.06] hover:bg-transparent">
              <TableHead className="text-white/40 font-medium">{fr ? "Utilisateur" : "User"}</TableHead>
              <TableHead className="text-white/40 font-medium">{fr ? "Action" : "Action"}</TableHead>
              <TableHead className="text-white/40 font-medium">{fr ? "Type cible" : "Target Type"}</TableHead>
              <TableHead className="text-white/40 font-medium">{fr ? "ID cible" : "Target ID"}</TableHead>
              <TableHead className="text-white/40 font-medium">{fr ? "Date" : "Date"}</TableHead>
              <TableHead className="text-white/40 font-medium">{fr ? "IP" : "IP"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow className="border-white/[0.06]">
                <TableCell colSpan={6} className="text-center text-white/30 py-8">
                  {fr ? "Aucune entrée d'audit" : "No audit entries"}
                </TableCell>
              </TableRow>
            ) : paged.map((l: any) => (
              <TableRow key={l.id} className="border-white/[0.06] hover:bg-white/[0.02]">
                <TableCell className="text-white font-medium">{l.actor_email ?? l.actor_id ?? "-"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-white/5 text-white/70 border-white/[0.06]">
                    {fr ? (ACTION_LABELS[l.action]?.fr ?? l.action) : (ACTION_LABELS[l.action]?.en ?? l.action)}
                  </Badge>
                </TableCell>
                <TableCell className="text-white/60">{l.target_type ?? "-"}</TableCell>
                <TableCell className="text-white/40 text-xs font-mono">{l.target_id ? l.target_id.slice(0, 12) + "..." : "-"}</TableCell>
                <TableCell className="text-white/40 text-sm">
                  {l.created_at ? new Date(l.created_at).toLocaleString() : "-"}
                </TableCell>
                <TableCell className="text-white/40 text-xs font-mono">{l.ip_address ?? "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-white/40">
            {fr ? `Page ${page + 1} sur ${totalPages}` : `Page ${page + 1} of ${totalPages}`}
            &nbsp;·&nbsp;
            {filtered.length} {fr ? "entrée(s)" : "entries"}
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage(page - 1)} className="text-white/60 hover:text-white">
              <ChevronLeft className="size-4 mr-1" />{fr ? "Préc." : "Prev"}
            </Button>
            <Button size="sm" variant="ghost" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="text-white/60 hover:text-white">
              {fr ? "Suiv." : "Next"}<ChevronRight className="size-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function SettingsSection() {
  const { lang } = useLanguage()
  const fr = lang === "fr"
  const [settings, setSettings] = React.useState<PlatformSetting[]>([])
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState<Record<string, boolean>>({})

  React.useEffect(() => {
    fetchPlatformSettings().then((d) => { setSettings(d); setLoading(false) })
  }, [])

  const getValue = (key: string): string => {
    const s = settings.find((s) => s.key === key)
    if (!s || s.value === null || s.value === undefined) return ""
    try {
      const parsed = typeof s.value === "string" ? JSON.parse(s.value) : s.value
      return String(parsed ?? "")
    } catch {
      return String(s.value ?? "")
    }
  }

  const handleSave = async (key: string) => {
    setSaving((prev) => ({ ...prev, [key]: true }))
    try {
      const input = document.getElementById(`setting-${key}`) as HTMLInputElement
      const val = input?.value ?? ""
      const parsed = SETTINGS_META.find((m) => m.key === key)?.type === "number" ? Number(val) : val
      await updatePlatformSetting(key, parsed)
      setSettings((prev) =>
        prev.map((s) => s.key === key ? { ...s, value: parsed, updated_at: new Date().toISOString() } : s)
      )
      toast.success(fr ? "Paramètre mis à jour" : "Setting updated")
    } catch {
      toast.error(fr ? "Erreur lors de la mise à jour" : "Failed to update setting")
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }))
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {SETTINGS_META.map((meta) => {
        const isSaving = saving[meta.key]
        return (
          <Card key={meta.key} className="bg-black/40 backdrop-blur-xl border border-white/[0.06]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-white/60">{fr ? meta.labelFr : meta.labelEn}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
              <Input
                id={`setting-${meta.key}`}
                type={meta.type}
                defaultValue={getValue(meta.key)}
                className="flex-1 bg-white/5 border-white/[0.06] text-white placeholder:text-white/30"
                placeholder={fr ? `Entrez ${meta.labelFr.toLowerCase()}...` : `Enter ${meta.labelEn.toLowerCase()}...`}
              />
              <Button
                size="sm"
                onClick={() => handleSave(meta.key)}
                disabled={isSaving}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 min-w-[80px]"
              >
                {isSaving ? <Loader2 className="size-4 animate-spin" /> : (fr ? "Enregistrer" : "Save")}
              </Button>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// ── Navigation tabs ──

const NAV_ITEMS: Array<{ section: Section; icon: React.ReactNode; labelFr: string; labelEn: string }> = [
  { section: "dashboard", icon: <Activity className="size-4" />, labelFr: "Tableau de bord", labelEn: "Dashboard" },
  { section: "users", icon: <Users className="size-4" />, labelFr: "Utilisateurs", labelEn: "Users" },
  { section: "workspaces", icon: <Building2 className="size-4" />, labelFr: "Espaces de travail", labelEn: "Workspaces" },
  { section: "activity", icon: <Bell className="size-4" />, labelFr: "Activité", labelEn: "Activity" },
  { section: "audit", icon: <ShieldCheck className="size-4" />, labelFr: "Audit", labelEn: "Audit" },
  { section: "settings", icon: <Settings className="size-4" />, labelFr: "Paramètres", labelEn: "Settings" },
]

// ── Main component ──

export function PlatformPage({ onNavigate }: Props) {
  const { lang } = useLanguage()
  const fr = lang === "fr"
  const { isPlatformAdmin, loading: adminLoading } = usePlatformAdmin()
  const [section, setSection] = React.useState<Section>("dashboard")

  if (adminLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-gradient-to-br from-[#0a0a0a] via-[#0d0d0d] to-[#0f0a14]">
        <div className="flex flex-col items-center gap-4">
          <div className="size-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
          <p className="text-sm text-white/40 font-medium">{fr ? "Vérification des accès..." : "Checking access..."}</p>
        </div>
      </div>
    )
  }

  if (!isPlatformAdmin) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-gradient-to-br from-[#0a0a0a] via-[#0d0d0d] to-[#0f0a14]">
        <Card className="bg-black/40 backdrop-blur-xl border border-white/[0.06] max-w-md w-full mx-4">
          <CardContent className="flex flex-col items-center gap-4 pt-8 pb-8 text-center">
            <AlertTriangle className="size-12 text-red-400" />
            <CardTitle className="text-white text-xl">{fr ? "Accès refusé" : "Access denied"}</CardTitle>
            <p className="text-white/50 text-sm">
              {fr
                ? "Vous n'avez pas les droits d'administrateur de la plateforme."
                : "You do not have platform administrator privileges."}
            </p>
            <Button
              variant="outline"
              onClick={() => onNavigate("dashboard")}
              className="border-white/[0.06] text-white/60 hover:text-white hover:bg-white/5 mt-2"
            >
              {fr ? "Retour au tableau de bord" : "Back to dashboard"}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-gradient-to-br from-[#0a0a0a] via-[#0d0d0d] to-[#0f0a14]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{fr ? "Administration de la plateforme" : "Platform Administration"}</h1>
            <p className="text-sm text-white/40 mt-1">
              {fr ? "Gérez l'ensemble de la plateforme SaveMali" : "Manage the entire SaveMali platform"}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => onNavigate("dashboard")}
            className="border-white/[0.06] text-white/60 hover:text-white hover:bg-white/5"
          >
            <ChevronLeft className="size-4 mr-2" />{fr ? "Retour" : "Back"}
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex flex-wrap items-center gap-1 border-b border-white/[0.06] pb-0">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.section}
              onClick={() => setSection(item.section)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px",
                section === item.section
                  ? "text-purple-400 border-purple-500"
                  : "text-white/40 border-transparent hover:text-white/60 hover:border-white/20",
              )}
            >
              {item.icon}
              {fr ? item.labelFr : item.labelEn}
            </button>
          ))}
        </div>

        {/* Section content */}
        <div className="min-h-[400px]">
          {section === "dashboard" && <DashboardSection />}
          {section === "users" && <UsersSection />}
          {section === "workspaces" && <WorkspacesSection />}
          {section === "activity" && <ActivitySection />}
          {section === "audit" && <AuditSection />}
          {section === "settings" && <SettingsSection />}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-white/20 pt-8 pb-4 border-t border-white/[0.04]">
          SaveMali Platform &copy; {new Date().getFullYear()}
        </div>
      </div>
    </div>
  )
}
