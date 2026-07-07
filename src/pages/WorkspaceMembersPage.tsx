import * as React from "react"
import {
  Users, Plus, Mail, Edit2, Trash2, Loader2, RefreshCw,
  UserCheck, UserX, Crown, Shield, Eye, ShieldCheck, User, Lock, Briefcase, Copy, Check
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { UserAvatar } from "@/components/UserAvatar"
import { DialogFooterBrand } from "@/components/DialogFooterBrand"
import { PageFooter } from "@/components/PageFooter"
import { EmptyState } from "@/components/EmptyState"
import { useLanguage } from "@/lib/i18n"
import { useAuth } from "@/hooks/use-auth"
import { useRole } from "@/hooks/use-role"
import { insforge } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { generateCsrfToken, validateCsrfToken } from "@/lib/security"
import { validateFields, hasErrors } from "@/lib/validation"
import { memberRules } from "@/lib/rules"
import type { Page } from "@/App"

interface Props { onNavigate: (p: Page) => void }

interface Member {
  id: string
  workspace_id: string
  owner_id: string
  user_id: string | null
  email: string
  display_name: string
  role: string
  status: string
  avatar_url: string | null
  invited_at: string
  accepted_at: string | null
  invite_token: string | null
}

const WORKSPACE_ROLES: Record<string, { key: string; label: string; icon: React.ReactNode; color: string }[]> = {
  education: [
    { key: "manager", label: "Directeur", icon: <Crown className="size-3.5" />, color: "text-brand" },
    { key: "teacher", label: "Enseignant", icon: <Users className="size-3.5" />, color: "text-primary" },
    { key: "cashier", label: "Caissier", icon: <UserCheck className="size-3.5" />, color: "text-success" },
    { key: "accountant", label: "Comptable", icon: <Shield className="size-3.5" />, color: "text-purple" },
    { key: "supervisor", label: "Surveillant", icon: <ShieldCheck className="size-3.5" />, color: "text-warning" },
    { key: "viewer", label: "Observateur", icon: <Eye className="size-3.5" />, color: "text-muted-foreground" },
  ],
  pharmacy: [
    { key: "manager", label: "Manager", icon: <Crown className="size-3.5" />, color: "text-brand" },
    { key: "pharmacist", label: "Pharmacien", icon: <ShieldCheck className="size-3.5" />, color: "text-success" },
    { key: "cashier", label: "Caissier", icon: <UserCheck className="size-3.5" />, color: "text-primary" },
    { key: "accountant", label: "Comptable", icon: <Shield className="size-3.5" />, color: "text-purple" },
    { key: "stock_manager", label: "Gestionnaire stock", icon: <Briefcase className="size-3.5" />, color: "text-warning" },
    { key: "viewer", label: "Observateur", icon: <Eye className="size-3.5" />, color: "text-muted-foreground" },
  ],
  commerce: [
    { key: "manager", label: "Manager", icon: <Crown className="size-3.5" />, color: "text-brand" },
    { key: "cashier", label: "Caissier", icon: <UserCheck className="size-3.5" />, color: "text-success" },
    { key: "accountant", label: "Comptable", icon: <Shield className="size-3.5" />, color: "text-purple" },
    { key: "seller", label: "Vendeur", icon: <UserCheck className="size-3.5" />, color: "text-primary" },
    { key: "stock_manager", label: "Gestionnaire stock", icon: <Briefcase className="size-3.5" />, color: "text-warning" },
    { key: "viewer", label: "Observateur", icon: <Eye className="size-3.5" />, color: "text-muted-foreground" },
  ],
  gestion: [
    { key: "manager", label: "Manager", icon: <Crown className="size-3.5" />, color: "text-brand" },
    { key: "accountant", label: "Comptable", icon: <Shield className="size-3.5" />, color: "text-success" },
    { key: "hr", label: "RH", icon: <Users className="size-3.5" />, color: "text-primary" },
    { key: "cashier", label: "Caissier", icon: <UserCheck className="size-3.5" />, color: "text-purple" },
    { key: "payroll", label: "Paie", icon: <ShieldCheck className="size-3.5" />, color: "text-warning" },
    { key: "viewer", label: "Observateur", icon: <Eye className="size-3.5" />, color: "text-muted-foreground" },
  ],
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/30",
  active: "bg-success/10 text-success border-success/30",
  suspended: "bg-destructive/10 text-destructive border-destructive/30",
}

export function WorkspaceMembersPage({ onNavigate }: Props) {
  const { lang } = useLanguage()
  const { workspace, user } = useAuth()
  const { role } = useRole()
  const fr = lang === "fr"

  const [members, setMembers] = React.useState<Member[]>([])
  const [loading, setLoading] = React.useState(true)
  const [showDlg, setShowDlg] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<Member | null>(null)
  const [form, setForm] = React.useState({ email: "", display_name: "", role: "cashier", password: "" })
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [memberErrors, setMemberErrors] = React.useState<Record<string, string>>({})
  const [createdCredentials, setCreatedCredentials] = React.useState<{ email: string; password: string; name: string } | null>(null)
  const [copied, setCopied] = React.useState(false)

  const workspaceType = workspace?.type ?? "gestion"
  const roles = WORKSPACE_ROLES[workspaceType] ?? WORKSPACE_ROLES.gestion

  const fetchMembers = React.useCallback(async () => {
    if (!workspace) return
    setLoading(true)
    const { data } = await insforge.database
      .from("workspace_members")
      .select("*")
      .eq("workspace_id", workspace.id)
      .order("invited_at", { ascending: false })
    setMembers((data as Member[]) ?? [])
    setLoading(false)
  }, [workspace])

  React.useEffect(() => { fetchMembers() }, [fetchMembers])

  const openAdd = () => {
    const defaultRole = roles[1]?.key ?? roles[0]?.key ?? "cashier"
    setForm({ email: "", display_name: "", role: defaultRole, password: "" })
    setEditTarget(null); setError(null); setMemberErrors({}); setShowDlg(true)
  }

  const openEdit = (m: Member) => {
    setEditTarget(m)
    setForm({ email: m.email, display_name: m.display_name, role: m.role, password: "" })
    setError(null); setMemberErrors({}); setShowDlg(true)
  }

  const generatePassword = (name: string) => {
    const first = name.split(" ")[0] || "emp"
    const clean = first.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]/g, "")
    const base = clean || "emp"
    const digits = new Uint8Array(4)
    crypto.getRandomValues(digits)
    return `${base}${Array.from(digits, (b) => b % 10).join("")}`
  }

  const handleSave = async () => {
    if (!workspace || !user) return
    const errs = validateFields(form, memberRules)
    setMemberErrors(errs)
    if (hasErrors(errs)) return
    setSaving(true); setError(null)
    const csrfToken = generateCsrfToken()

    try {
      if (editTarget) {
        const { error: e } = await insforge.database.from("workspace_members")
          .update({ display_name: form.display_name.trim(), role: form.role })
          .eq("id", editTarget.id)
          .eq("workspace_id", workspace.id)
        if (e) { setError(e.message); setSaving(false); return }
      } else {
        const { data: existing } = await insforge.database.from("workspace_members")
          .select("id").eq("workspace_id", workspace.id).eq("email", form.email.trim()).maybeSingle()
        if (existing) { setError(fr ? "Cet email est déjà utilisé" : "This email is already in use"); setSaving(false); return }

        const password = form.password.trim() || generatePassword(form.display_name)

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000)

        let res: Response
        try {
          res = await fetch(`${import.meta.env.VITE_INSFORGE_URL}/api/auth/users`, {
            method: "POST",
            headers: {
              apikey: import.meta.env.VITE_INSFORGE_ANON_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_INSFORGE_ANON_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: form.email.trim().toLowerCase(),
              password,
              name: form.display_name.trim(),
            }),
            signal: controller.signal,
          })
        } catch (fetchErr: any) {
          clearTimeout(timeoutId)
          if (fetchErr.name === "AbortError") {
            setError(fr ? "Délai d'attente dépassé. Vérifiez votre connexion." : "Request timed out. Check your connection.")
          } else {
            setError(fr ? "Erreur réseau. Vérifiez votre connexion." : "Network error. Check your connection.")
          }
          setSaving(false)
          return
        }
        clearTimeout(timeoutId)

        const json = await res.json().catch(() => null)

        if (!res.ok) {
          const msg = json?.msg || json?.message || json?.error_description || json?.error || `HTTP ${res.status}`
          if (msg.includes("already")) {
            setError(fr ? "Un compte avec cet email existe déjà" : "An account with this email already exists")
          } else {
            setError(msg)
          }
          setSaving(false)
          return
        }

        const userId = json?.user?.id ?? json?.id ?? null

        if (!userId) {
          setError(fr ? "Réponse invalide du serveur d'authentification" : "Invalid response from auth server")
          setSaving(false)
          return
        }

        const { error: e } = await insforge.database.from("workspace_members").insert([{
          workspace_id: workspace.id,
          owner_id: user.id,
          user_id: userId,
          email: form.email.trim().toLowerCase(),
          display_name: form.display_name.trim(),
          role: form.role,
          status: "active",
          accepted_at: new Date().toISOString(),
        }])
        if (e) { setError(e.message); setSaving(false); return }

        import("@/lib/stats").then(({ invalidateStatsCache }) => invalidateStatsCache())

        setCreatedCredentials({ email: form.email.trim().toLowerCase(), password, name: form.display_name.trim() })
      }

      setShowDlg(false); setEditTarget(null); fetchMembers()

      if (!validateCsrfToken(csrfToken)) {
        setError(fr ? "Erreur de sécurité CSRF" : "CSRF security error")
        setSaving(false)
        return
      }
    } catch (err: any) {
      setError(err?.message || (fr ? "Erreur inattendue" : "Unexpected error"))
    } finally {
      setSaving(false)
    }
  }

  const setStatus = async (id: string, newStatus: string) => {
    const { error } = await insforge.database.from("workspace_members").update({ status: newStatus }).eq("id", id).eq("workspace_id", workspace.id)
    if (error) { alert(fr ? "Erreur lors du changement de statut" : "Status change error"); return }
    fetchMembers()
  }

  const copyCredentials = async () => {
    if (!createdCredentials) return
    const text = `SaveMali - Identifiants de connexion\n\nNom : ${createdCredentials.name}\nEmail : ${createdCredentials.email}\nMot de passe : ${createdCredentials.password}\n\nConnectez-vous sur www.savemali.online`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const ta = document.createElement("textarea")
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand("copy")
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const deleteMember = async (id: string) => {
    if (!confirm(fr ? "Retirer ce membre ?" : "Remove this member?")) return
    const { error } = await insforge.database.from("workspace_members").delete().eq("id", id).eq("workspace_id", workspace.id)
    if (error) { alert(fr ? "Erreur lors de la suppression" : "Delete error"); return }
    fetchMembers()
  }

  const stats = [
    { label: fr ? "Total membres" : "Total members", value: members.length },
    { label: fr ? "Actifs" : "Active", value: members.filter((m) => m.status === "active").length },
    { label: fr ? "En attente" : "Pending", value: members.filter((m) => m.status === "pending").length },
    { label: fr ? "Suspendus" : "Suspended", value: members.filter((m) => m.status === "suspended").length },
  ]

  if (!workspace || !user) return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <Users className="size-12 text-muted-foreground" />
      <p className="text-muted-foreground">{fr ? "Accès réservé au propriétaire du workspace." : "Access restricted to workspace owner."}</p>
      <Button onClick={() => onNavigate("signin")}>{fr ? "Se connecter" : "Sign in"}</Button>
    </div>
  )

  if (workspace.owner_id !== user.id && role !== "admin") return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <Shield className="size-12 text-muted-foreground" />
      <p className="text-muted-foreground">{fr ? "Seul le propriétaire ou un administrateur peut gérer les membres." : "Only the owner or an administrator can manage members."}</p>
      <Button variant="outline" onClick={() => onNavigate("dashboard")}>{fr ? "Retour" : "Back"}</Button>
    </div>
  )

  return (
    <div className="min-h-svh bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-primary/70 px-4 py-4 text-primary-foreground">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-primary-foreground/60 text-sm mb-1">
                <button onClick={() => onNavigate("dashboard")} className="hover:text-primary-foreground hover:underline">
                  {fr ? "Tableau de bord" : "Dashboard"}
                </button>
                <span>/</span>
                <span className="text-primary-foreground">{fr ? "Équipe" : "Team"}</span>
              </div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Users className="size-6" />
                {fr ? "Gestion de l'équipe" : "Team Management"}
              </h1>
              <p className="text-primary-foreground/70 text-sm mt-0.5">{workspace.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 gap-1.5" onClick={fetchMembers}>
                <RefreshCw className="size-3.5" />
              </Button>
              <Button size="sm" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 gap-1.5" onClick={openAdd}>
                <Plus className="size-4" />{fr ? "Créer" : "Create"}
              </Button>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s, i) => (
              <div key={i} className="rounded-xl bg-primary-foreground/10 p-3 backdrop-blur-sm">
                <p className="text-primary-foreground/60 text-xs">{s.label}</p>
                <p className="text-xl font-bold text-primary-foreground">{loading ? "..." : s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {/* Info banner */}
        <Alert className="mb-6 border-border bg-muted/30">
          <Crown className="size-4 text-warning" />
          <AlertDescription className="text-muted-foreground text-sm">
            {fr
              ? "Créez un compte pour chaque employé. Ils se connecteront avec l'email et le mot de passe affichés. Toutes leurs actions seront enregistrées."
              : "Create an account for each employee. They'll sign in with the shown email and password. All their actions are recorded."}
          </AlertDescription>
        </Alert>

        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : members.length === 0 ? (
          <EmptyState
            icon={<Users className="size-12" />}
            title={fr ? "Aucun membre" : "No members yet"}
            description={fr ? "Commencez par créer un compte employé." : "Start by creating an employee account."}
            action={<Button onClick={openAdd} className="gap-1.5 mt-2"><Plus className="size-4" />{fr ? "Créer un employé" : "Create employee"}</Button>}
          />
        ) : (
          <div className="space-y-3">
            {members.map((m) => {
              const roleInfo = roles.find((r) => r.key === m.role)
              const isCurrentUser = m.email.toLowerCase() === user.email?.toLowerCase()
              return (
                <div key={m.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
                    <UserAvatar
                      avatarUrl={m.avatar_url}
                      name={m.display_name}
                      email={m.email}
                      size="default"
                      className="size-10"
                      roleColor={cn("text-sm font-semibold", roleInfo?.color)}
                    />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground truncate">{m.display_name}</p>
                      {isCurrentUser && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{fr ? "vous" : "you"}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{m.email}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className={cn("text-xs gap-1 px-2", roleInfo?.color)}>
                        {roleInfo?.icon}{roleInfo?.label ?? m.role}
                      </Badge>
                      <span className={cn("text-[11px] border rounded-full px-2 py-0.5 font-medium", STATUS_COLORS[m.status])}>
                        {m.status === "pending" ? (fr ? "En attente" : "Pending") :
                         m.status === "active" ? (fr ? "Actif" : "Active") : (fr ? "Suspendu" : "Suspended")}
                      </span>
                      {m.accepted_at && (
                        <span className="text-[11px] text-muted-foreground">
                          {fr ? "Rejoint le" : "Joined"} {new Date(m.accepted_at).toLocaleDateString(fr ? "fr-FR" : "en-US")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {m.status === "active" && (
                      <Button size="icon" variant="ghost" className="size-8 text-warning hover:text-warning hover:bg-warning/10" title={fr ? "Suspendre" : "Suspend"} onClick={() => setStatus(m.id, "suspended")}>
                        <UserX className="size-4" />
                      </Button>
                    )}
                    {m.status === "suspended" && (
                      <Button size="icon" variant="ghost" className="size-8 text-success hover:text-success hover:bg-success/10" title={fr ? "Réactiver" : "Reactivate"} onClick={() => setStatus(m.id, "active")}>
                        <UserCheck className="size-4" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="size-8" onClick={() => openEdit(m)}>
                      <Edit2 className="size-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => deleteMember(m.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* How it works */}
        <div className="mt-8 rounded-xl border border-border bg-muted/30 p-5">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Shield className="size-4 text-accent" />
            {fr ? "Comment ça fonctionne" : "How it works"}
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { step: "1", title: fr ? "Créer" : "Create", desc: fr ? "Saisissez l'email, le nom et le rôle de votre employé." : "Enter the employee's email, name and role." },
              { step: "2", title: fr ? "Partager" : "Share", desc: fr ? "Transmettez les identifiants de connexion à l'employé." : "Share the login credentials with the employee." },
              { step: "3", title: fr ? "Contrôle" : "Control", desc: fr ? "L'employé se connecte et travaille. Toutes ses actions apparaissent dans les Rapports." : "The employee signs in and works. All their actions appear in Reports." },
            ].map((s) => (
              <div key={s.step} className="flex gap-3">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-bold">{s.step}</div>
                <div>
                  <p className="text-sm font-medium text-foreground">{s.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={showDlg} onOpenChange={(o) => { setShowDlg(o); if (!o) setEditTarget(null) }}>
        <DialogContent className="ag-dialog max-w-lg p-0">
          <DialogHeader className="px-6 pt-5 pb-0">
            <DialogTitle className="text-foreground">
              {editTarget ? (fr ? "Modifier le membre" : "Edit member") : (fr ? "Créer un employé" : "Create employee")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 py-4">
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="m-name" className="text-sm font-medium text-foreground">{fr ? "Nom complet" : "Full name"} <span className="text-destructive">*</span></Label>
                <Input id="m-name" value={form.display_name} onChange={(e) => setForm((p) => ({ ...p, display_name: e.target.value }))} placeholder={fr ? "Jean Mutombo" : "Jean Mutombo"} className="h-10 rounded-lg text-foreground" />
                {memberErrors.display_name && <p className="text-xs text-destructive">{memberErrors.display_name}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="m-email" className="text-sm font-medium text-foreground">{fr ? "Email" : "Email"} <span className="text-destructive">*</span></Label>
                <Input id="m-email" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="employe@exemple.com" className="h-10 rounded-lg text-foreground" disabled={!!editTarget} />
                {memberErrors.email && <p className="text-xs text-destructive">{memberErrors.email}</p>}
              </div>
            </div>
            {!editTarget && (
              <div className="space-y-1.5">
                <Label htmlFor="m-password" className="text-sm font-medium text-foreground">{fr ? "Mot de passe" : "Password"}</Label>
                <Input id="m-password" type="text" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} placeholder={fr ? "Auto-généré si vide" : "Auto-generated if empty"} className="h-10 rounded-lg text-foreground" />
                <p className="text-[11px] text-muted-foreground">{fr ? "Laissez vide pour un mot de passe automatique" : "Leave empty for auto-generated password"}</p>
                {memberErrors.password && <p className="text-xs text-destructive">{memberErrors.password}</p>}
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">{fr ? "Rôle" : "Role"}</Label>
              <div className="grid grid-cols-2 gap-2">
                {roles.map((r) => (
                  <button key={r.key} type="button" onClick={() => setForm((p) => ({ ...p, role: r.key }))} className={cn("flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs text-left transition-all", form.role === r.key ? "border-accent bg-accent/10 text-accent font-medium" : "border-border text-muted-foreground hover:bg-muted")}>
                    {r.icon}<span>{r.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border/50">
            <Button variant="outline" onClick={() => { setShowDlg(false); setEditTarget(null) }}>{fr ? "Annuler" : "Cancel"}</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90">
              {saving && <Loader2 className="size-4 animate-spin" />}
              {editTarget ? (fr ? "Mettre à jour" : "Update") : (fr ? "Créer" : "Create")}
            </Button>
          </DialogFooter>
          <DialogFooterBrand />
        </DialogContent>
      </Dialog>

      {/* Credentials dialog */}
      <Dialog open={!!createdCredentials} onOpenChange={() => { setCreatedCredentials(null); setCopied(false) }}>
        <DialogContent className="ag-dialog max-w-sm p-0">
          <div className="flex flex-col items-center px-6 pt-6 pb-2">
            <img src="/SaveMali_Logo.png" alt="SaveMali" className="size-14 rounded-xl object-cover shadow-lg mb-3" onError={(e) => { e.currentTarget.style.display = "none" }} />
            <div className="flex size-10 items-center justify-center rounded-full bg-success/10 mb-2">
              <UserCheck className="size-5 text-success" />
            </div>
            <h2 className="text-lg font-bold text-foreground text-center">
              {fr ? "Félicitations !" : "Congratulations!"}
            </h2>
            <p className="text-sm text-muted-foreground text-center mt-1">
              {fr
                ? `L'employé « ${createdCredentials?.name} » a été créé avec succès.`
                : `Employee "${createdCredentials?.name}" has been created successfully.`}
            </p>
          </div>
          <div className="space-y-3 px-6 py-4">
            <Alert className="border-success/30 bg-success/5">
              <AlertDescription className="text-sm">
                {fr ? "Identifiants de connexion à transmettre :" : "Login credentials to share:"}
              </AlertDescription>
            </Alert>
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">{fr ? "Email" : "Email"}</p>
                <p className="text-sm font-mono font-medium text-foreground">{createdCredentials?.email}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">{fr ? "Mot de passe" : "Password"}</p>
                <p className="text-sm font-mono font-medium text-foreground">{createdCredentials?.password}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {fr ? "Transmettez ces identifiants de manière sécurisée." : "Share these credentials securely."}
            </p>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border/50 flex flex-col gap-2">
            <Button onClick={copyCredentials} variant="outline" className="w-full gap-2">
              {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
              {copied ? (fr ? "Copié !" : "Copied!") : (fr ? "Copier les identifiants" : "Copy credentials")}
            </Button>
            <Button onClick={() => setCreatedCredentials(null)} className="bg-brand text-brand-foreground hover:bg-brand/90 w-full">
              {fr ? "Fermer" : "Close"}
            </Button>
          </DialogFooter>
          <div className="px-6 pb-4 text-center">
            <p className="text-[10px] text-muted-foreground/50">© {new Date().getFullYear()} SaveMali. Tous droits réservés.</p>
          </div>
        </DialogContent>
      </Dialog>
      <PageFooter onNavigate={onNavigate} />
    </div>
  )
}
