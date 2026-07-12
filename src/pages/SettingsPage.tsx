import * as React from "react"
import {
  Settings, Monitor, Sun, Moon, Trash2, Lock, Database, Bell,
  ChevronLeft, Check, RefreshCw, Palette, Mail, Phone, Shield,
  Smartphone, Loader2, User, Camera, Globe, KeyRound,
  Building2, CreditCard, ChevronRight, Languages, Clock, Eye,
  EyeOff, Copy, Plus, X, AlertTriangle, Search, LogOut,
  ExternalLink, Fingerprint, Wifi, Download, Upload, Server,
  Webhook, Sliders, Hash, Calendar, Menu, Package, Wallet,
  BarChart3, Zap, Gift, HelpCircle, Sparkles, BadgeCheck,
  Users, CircleUser, Paintbrush, Activity, Radio, HardDrive,
  ShieldAlert, FileJson, Laptop, MessageSquare, ClipboardList,
  Bug, UserCog, TicketCheck, Filter, ArrowUpDown, CalendarDays, CalendarX
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLanguage } from "@/lib/i18n"
import { useAuth } from "@/hooks/use-auth"
import { useRole } from "@/hooks/use-role"
import { useTheme } from "@/components/theme-provider"
import { UserAvatar } from "@/components/UserAvatar"
import { AvatarUpload } from "@/components/AvatarUpload"
import { cn } from "@/lib/utils"
import { insforge } from "@/lib/supabase"
import type { Page } from "@/App"
import { toast } from "sonner"
import { PageFooter } from "@/components/PageFooter"
import { createSupportTicket } from "@/lib/support"
import { logAudit } from "@/lib/audit"
import { sanitizeStrict, detectInjection, checkApiRateLimit } from "@/lib/security"
import { SettingsSection, SettingsRow, SettingsDivider } from "@/components/settings/SettingsSection"

interface MemberData {
  avatar_url: string | null
  email_notifications: boolean
  whatsapp_notifications: boolean
  product_updates: boolean
  security_alerts: boolean
  timezone: string
  compact_mode: string | boolean
  locale: string
  display_name: string | null
  phone: string | null
}

interface UserSettingsData {
  timezone: string
  compact_mode: string | boolean
  reduced_motion: boolean
}

interface ApiKeyData {
  id: string
  name: string
  key_value: string
  is_active: boolean
  created_at: string
  last_used_at: string | null
}

interface TeamMemberData {
  id: string
  user_id: string
  email?: string
  role: string
  avatar_url?: string
  status: string
  created_at: string
}

interface NotifConfig {
  key: NotifKey
  label: string
  desc: string
  icon: typeof Bell
}

interface Props { onNavigate: (p: Page) => void }

const FONT_SIZES = ["small", "medium", "large"] as const
type FontSize = typeof FONT_SIZES[number]

const NOTIF_KEYS = [
  "email_notifications",
  "whatsapp_notifications",
  "product_updates",
  "security_alerts",
] as const

type NotifKey = typeof NOTIF_KEYS[number]

const TZ_OPTIONS = [
  "Africa/Lubumbashi", "Africa/Kinshasa", "Africa/Cairo",
  "Africa/Johannesburg", "Africa/Lagos", "Africa/Nairobi",
  "Europe/Paris", "Europe/London", "America/New_York",
  "Asia/Dubai", "Asia/Shanghai", "Pacific/Auckland",
] as const

const CURRENCY_OPTIONS = [
  { code: "CDF", symbol: "FC", label: "Franc Congolais" },
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "XAF", symbol: "FCFA", label: "Franc CFA" },
  { code: "NGN", symbol: "₦", label: "Nigerian Naira" },
  { code: "KES", symbol: "KSh", label: "Kenyan Shilling" },
] as const

const COMPACT_MODES = ["off", "partial", "full"] as const
type CompactMode = typeof COMPACT_MODES[number]

function getStoredFontSize(): FontSize {
  const stored = document.documentElement.getAttribute("data-font-size")
  if (stored && FONT_SIZES.includes(stored as FontSize)) return stored as FontSize
  return "medium"
}

function getStoredNotif(key: NotifKey): boolean {
  return localStorage.getItem(`savemali_notif_${key}`) !== "false"
}

function getLastBackup(): string | null {
  return localStorage.getItem("savemali_last_backup")
}

function formatRelativeTime(dateStr: string, fr: boolean): string {
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffMins < 1) return fr ? "À l'instant" : "Just now"
    if (diffMins < 60) return fr ? `Il y a ${diffMins} min` : `${diffMins}m ago`
    if (diffHours < 24) return fr ? `Il y a ${diffHours}h` : `${diffHours}h ago`
    if (diffDays < 7) return fr ? `Il y a ${diffDays}j` : `${diffDays}d ago`
    return date.toLocaleDateString(fr ? "fr-FR" : "en-US", { dateStyle: "medium" })
  } catch {
    return "—"
  }
}

const sidebarGroups = (fr: boolean, role: string, isOwner: boolean) => {
  const allRoles = ["admin", "manager", "hr", "employee", "teacher", "cashier", "pharmacist", "seller", "viewer", "payroll", "stock_manager", "accountant", "supervisor"]
  const groups = [
    {
      label: fr ? "Mon compte" : "My Account",
      items: [
        { id: "profile", label: fr ? "Profil" : "Profile", icon: CircleUser, roles: allRoles },
        { id: "language", label: fr ? "Langue & Région" : "Language & Region", icon: Globe, roles: allRoles },
      ],
    },
    {
      label: fr ? "Préférences" : "Preferences",
      items: [
        { id: "appearance", label: fr ? "Apparence" : "Appearance", icon: Paintbrush, roles: allRoles },
        { id: "notifications", label: fr ? "Notifications" : "Notifications", icon: Bell, roles: allRoles },
      ],
    },
    {
      label: fr ? "Sécurité" : "Security",
      items: [
        { id: "security", label: fr ? "Sécurité" : "Security", icon: Shield, roles: allRoles },
        { id: "privacy", label: fr ? "Confidentialité" : "Privacy", icon: ShieldAlert, roles: allRoles },
      ],
    },
    {
      label: fr ? "Organisation" : "Organization",
      items: [
        { id: "workspace", label: fr ? "Espace de travail" : "Workspace", icon: Building2, roles: ["admin", "manager"] },
        { id: "team", label: fr ? "Équipe" : "Team", icon: Users, roles: ["admin"] },
        { id: "api", label: "API & Intégrations", icon: KeyRound, roles: ["admin"] },
        { id: "backups", label: fr ? "Sauvegardes" : "Backups", icon: Database, roles: ["admin", "manager"] },
        { id: "billing", label: fr ? "Facturation" : "Billing", icon: CreditCard, roles: isOwner ? ["admin"] : [] },
      ],
    },
    {
      label: fr ? "Support" : "Support",
      items: [
        { id: "tickets", label: fr ? "Tickets" : "Tickets", icon: MessageSquare, roles: ["admin", "manager"] },
        { id: "dpo", label: "DPO", icon: Shield, roles: ["admin", "manager"] },
        { id: "contact-messages", label: fr ? "Messages" : "Messages", icon: Mail, roles: ["admin", "manager"] },
        { id: "rdv-admin", label: fr ? "Rendez-vous" : "Appointments", icon: CalendarDays, roles: ["admin", "manager"] },
      ],
    },
    {
      label: fr ? "Système" : "System",
      items: [
        { id: "activity", label: fr ? "Journal d'activité" : "Activity Log", icon: Activity, roles: ["admin", "manager"] },
        { id: "system", label: fr ? "État du service" : "Service Health", icon: Radio, roles: ["admin"] },
      ],
    },
  ]
  return groups.map(g => ({
    ...g,
    items: g.items.filter(item => item.roles.includes(role)),
  })).filter(g => g.items.length > 0)
}

export function SettingsPage({ onNavigate }: Props) {
  const { lang, t } = useLanguage()
  const { user, workspace, signOut, isOwner } = useAuth()
  const { role } = useRole()
  const { theme, setTheme } = useTheme()
  const fr = lang === "fr"

  const [activeSection, setActiveSection] = React.useState("profile")
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  // Existing state
  const [fontSize, setFontSize] = React.useState<FontSize>(getStoredFontSize)
  const [avatarOpen, setAvatarOpen] = React.useState(false)
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null)
  const [notifs, setNotifs] = React.useState<Record<NotifKey, boolean>>(() => {
    const obj: Record<string, boolean> = {}
    for (const k of NOTIF_KEYS) obj[k] = getStoredNotif(k)
    return obj as Record<NotifKey, boolean>
  })
  const [clearing, setClearing] = React.useState(false)
  const [sendingPwd, setSendingPwd] = React.useState(false)
  const [backingUp, setBackingUp] = React.useState(false)
  const [lastBackupDate, setLastBackupDate] = React.useState<string | null>(getLastBackup())

  // New state
  const [compactMode, setCompactMode] = React.useState<CompactMode>("off")
  const [timezone, setTimezone] = React.useState("Africa/Lubumbashi")
  const [currency, setCurrency] = React.useState("CDF")
  const [reducedMotion, setReducedMotion] = React.useState(false)
  const [memberName, setMemberName] = React.useState("")
  const [memberPhone, setMemberPhone] = React.useState("")
  const [settingsLoading, setSettingsLoading] = React.useState(true)

  // API Keys
  const [apiKeys, setApiKeys] = React.useState<Array<{ id: string; name: string; key_value: string; is_active: boolean; created_at: string; last_used_at: string | null }>>([])
  const [apiKeyLoading, setApiKeyLoading] = React.useState(false)
  const [newKeyName, setNewKeyName] = React.useState("")
  const [showNewKey, setShowNewKey] = React.useState(false)
  const [revealedKey, setRevealedKey] = React.useState<string | null>(null)
  const [newlyCreatedKey, setNewlyCreatedKey] = React.useState<string | null>(null)

  // Team members
  const [teamMembers, setTeamMembers] = React.useState<Array<{ id: string; user_id: string; email?: string; role: string; avatar_url?: string; status: string; created_at: string }>>([])
  const [teamLoading, setTeamLoading] = React.useState(false)

  const lastBackup = lastBackupDate
  const groups = sidebarGroups(fr, role, isOwner)
  const allNavItems = groups.flatMap(g => g.items)
  const filteredGroups = searchQuery.trim()
    ? groups.map(g => ({
        ...g,
        items: g.items.filter(item =>
          item.label.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter(g => g.items.length > 0)
    : groups

  // Fetch settings
  React.useEffect(() => {
    if (!user || !workspace) return

    async function fetchAll() {
      setSettingsLoading(true)
      await Promise.all([
        // Avatar + notif prefs from workspace_members
        insforge.database
          .from("workspace_members")
          .select("avatar_url, email_notifications, whatsapp_notifications, product_updates, security_alerts, timezone, compact_mode, locale, display_name, phone")
          .eq("workspace_id", workspace.id)
          .eq("user_id", user.id)
          .maybeSingle()
          .then(({ data }) => {
            const d = data as MemberData | null
            if (d) {
              setAvatarUrl(d.avatar_url ?? null)
              setNotifs({
                email_notifications: d.email_notifications !== false,
                whatsapp_notifications: d.whatsapp_notifications !== false,
                product_updates: d.product_updates !== false,
                security_alerts: d.security_alerts !== false,
              })
              setTimezone(d.timezone || "Africa/Lubumbashi")
              setCompactMode(d.compact_mode === true ? "full" : d.compact_mode === "partial" ? "partial" : "off")
              if (d.display_name) setMemberName(d.display_name)
              if (d.phone) setMemberPhone(d.phone)
              if (d.locale) {
                const found = CURRENCY_OPTIONS.find(c => c.code.toLowerCase() === d.locale.toUpperCase() || d.locale === "fr" && c.code === "CDF")
                if (!found) setCurrency("CDF")
              }
            }
          }),

        // User settings from user_settings table
        insforge.database
          .from("user_settings")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle()
          .then(({ data }) => {
            const d = data as UserSettingsData | null
            if (d) {
              setTimezone(d.timezone || "Africa/Lubumbashi")
              setCompactMode(d.compact_mode === true ? "full" : "off")
              setReducedMotion(d.reduced_motion || false)
            }
          }),
      ])
      setSettingsLoading(false)
    }

    fetchAll()
  }, [user, workspace])

  // Fetch team members (admin only)
  React.useEffect(() => {
    if (!workspace || role !== "admin") return
    setTeamLoading(true)
    insforge.database
      .from("workspace_members")
      .select("id, user_id, role, status, created_at")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) {
          setTeamMembers(data as TeamMemberData[])
        }
        setTeamLoading(false)
      })
  }, [workspace, role])

  // Fetch API keys (admin only)
  React.useEffect(() => {
    if (!workspace || role !== "admin") return
    setApiKeyLoading(true)
    insforge.database
      .from("api_keys")
      .select("id, name, key_value, is_active, created_at, last_used_at")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          setApiKeys(data as ApiKeyData[])
        }
        setApiKeyLoading(false)
      })
  }, [workspace, role])

  // Apply font size
  const applyFontSize = (size: FontSize) => {
    setFontSize(size)
    document.documentElement.setAttribute("data-font-size", size)
    localStorage.setItem("savemali_font_size", size)
  }

  // Toggle notification
  const toggleNotif = (key: NotifKey, val: boolean) => {
    setNotifs((prev) => ({ ...prev, [key]: val }))
    localStorage.setItem(`savemali_notif_${key}`, String(val))
    if (user?.id && workspace?.id) {
      insforge.database
        .from("workspace_members")
        .update({ [key]: val })
        .eq("workspace_id", workspace.id)
        .eq("user_id", user.id)
        .then(({ error }) => { if (error) toast.error(fr ? "Erreur de notification" : "Notification error") })
    }
  }

  // Save timezone & compact mode to DB
  const savePreference = React.useCallback(async (field: string, value: string | boolean) => {
    if (!user?.id || !workspace?.id) return
    // Some fields live on user_settings, others on workspace_members
    const USER_ONLY = new Set(["reduced_motion", "sidebar_collapsed"])
    const table = USER_ONLY.has(field) ? "user_settings" : "workspace_members"
    const { error } = table === "user_settings"
      ? await insforge.database.from("user_settings").upsert({ user_id: user.id, [field]: value }, { onConflict: "user_id" })
      : await insforge.database.from("workspace_members").update({ [field]: value }).eq("workspace_id", workspace.id).eq("user_id", user.id)
    if (error) toast.error(fr ? `Erreur: ${field}` : `Error saving ${field}`)
  }, [user, workspace])

  // Save display_name and phone
  const saveMemberProfile = async () => {
    if (!user?.id || !workspace?.id) return
    const { error } = await insforge.database
      .from("workspace_members")
      .update({ display_name: memberName || null, phone: memberPhone || null })
      .eq("workspace_id", workspace.id)
      .eq("user_id", user.id)
    if (error) toast.error(error.message)
    else toast.success(fr ? "Profil mis à jour" : "Profile updated")
  }

  // Clear cache
  const handleClearCache = async () => {
    setClearing(true)
    const keep = new Set([
      "vite-ui-theme", "savemali-lang", "savemali_font_size",
      "savemali_access_violations", "savemali_lockout_until",
      "savemali-currency", "savemali_captcha_media", "savemali_context_events",
    ])
    for (const key of Object.keys(localStorage)) {
      if (!keep.has(key) && !key.startsWith("savemali_notif_") && key !== "savemali_last_backup") {
        localStorage.removeItem(key)
      }
    }
    try { await caches?.keys().then((names) => names.forEach((n) => caches.delete(n))) } catch (e) { console.error("Cache clear error:", e) }
    setClearing(false)
    toast.success(fr ? "Cache vidé avec succès" : "Cache cleared successfully")
  }

  // Change password
  const handleChangePassword = async () => {
    if (!user?.email) return
    setSendingPwd(true)
    const { error } = await insforge.auth.sendResetPasswordEmail({ email: user.email })
    setSendingPwd(false)
    if (error) {
      toast.error(fr ? "Erreur d'envoi" : "Send error")
    } else {
      toast.success(fr ? "Email de réinitialisation envoyé" : "Reset email sent")
    }
  }

  // Backup
  const handleBackup = async () => {
    setBackingUp(true)
    if (!workspace) { setBackingUp(false); return }
    try {
      const wid = workspace.id
      const tables = [
        "pharmacies", "pharmacy_products", "pharmacy_sales", "pharmacy_alerts",
        "commerce_clients", "commerce_invoices", "commerce_invoice_items", "commerce_payments", "commerce_products",
        "edu_students", "edu_teachers", "edu_classes", "edu_grades", "edu_fees", "edu_fee_payments", "edu_accounting",
        "staff_employees", "staff_leave_requests", "staff_payroll", "staff_contracts", "staff_recruitments",
        "hr_employees", "hr_departments", "hr_contracts", "hr_leave_requests", "hr_recruitments",
        "hr_evaluations", "hr_trainings", "hr_attendance", "hr_absences", "hr_skills",
        "hr_promotions", "hr_discipline", "hr_health_safety", "hr_documents", "hr_communication",
        "gestion_suppliers", "gestion_purchase_orders", "gestion_purchase_items", "gestion_products", "gestion_alerts", "gestion_accounting",
        "pharmacy_accounting",
      ]
      const backup: Record<string, unknown[]> = {}
      await Promise.all(tables.map(async (tbl) => {
        try {
          const { data } = await insforge.database.from(tbl).select("*").eq("workspace_id", wid)
          backup[tbl] = (data as unknown[]) || []
        } catch (e) { console.error("Backup fetch error:", e); backup[tbl] = [] }
      }))
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `savemali-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      const now = new Date().toISOString()
      localStorage.setItem("savemali_last_backup", now)
      setLastBackupDate(now)
      toast.success(fr ? "Sauvegarde téléchargée" : "Backup downloaded")
    } catch (err) {
      toast.error(fr ? "Erreur de sauvegarde" : "Backup failed")
    }
    setBackingUp(false)
  }

  // Generate API key
  const generateApiKey = async () => {
    if (!workspace || !user || !newKeyName.trim()) return
    const keyValue = `sm_${Array.from({ length: 40 }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]).join("")}`
    const { error, data } = await insforge.database
      .from("api_keys")
      .insert([{ workspace_id: workspace.id, name: newKeyName.trim(), key_value: keyValue, created_by: user.id }])
      .select()
      .single()
    if (error) {
      toast.error(error.message)
      return
    }
    const newKey = data as ApiKeyData
    setApiKeys(prev => [newKey, ...prev])
    setNewlyCreatedKey(keyValue)
    setNewKeyName("")
    setShowNewKey(false)
    toast.success(fr ? "Clé API créée" : "API key created")
  }

  // Revoke API key
  const revokeApiKey = async (id: string) => {
    const { error } = await insforge.database.from("api_keys").update({ is_active: false }).eq("id", id).eq("workspace_id", workspace?.id)
    if (error) { toast.error(error.message); return }
    setApiKeys(prev => prev.map(k => k.id === id ? { ...k, is_active: false } : k))
    toast.success(fr ? "Clé révoquée" : "Key revoked")
  }

  // Delete API key
  const deleteApiKey = async (id: string) => {
    const { error } = await insforge.database.from("api_keys").delete().eq("id", id).eq("workspace_id", workspace?.id)
    if (error) { toast.error(error.message); return }
    setApiKeys(prev => prev.filter(k => k.id !== id))
    toast.success(fr ? "Clé supprimée" : "Key deleted")
  }

  const typeLabel: Record<string, { fr: string; en: string }> = {
    pharmacy: { fr: "Pharmacie", en: "Pharmacy" },
    commerce: { fr: "Commerce", en: "Commerce" },
    education: { fr: "Éducation", en: "Education" },
    gestion: { fr: "Gestion", en: "Management" },
    hr: { fr: "Ressources Humaines", en: "Human Resources" },
  }

  const fontSizeLabels: Record<FontSize, { fr: string; en: string }> = {
    small: { fr: "Petite", en: "Small" },
    medium: { fr: "Moyenne", en: "Medium" },
    large: { fr: "Grande", en: "Large" },
  }

  const notifConfig: NotifConfig[] = [
    { key: "email_notifications", label: t.settings.emailNotif, desc: t.settings.emailNotifDesc, icon: Mail },
    { key: "whatsapp_notifications", label: t.settings.whatsappNotif, desc: t.settings.whatsappNotifDesc, icon: Phone },
    { key: "product_updates", label: t.settings.productUpdates, desc: t.settings.productUpdatesDesc, icon: RefreshCw },
    { key: "security_alerts", label: t.settings.securityAlerts, desc: t.settings.securityAlertsDesc, icon: Shield },
  ]

  if (settingsLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="size-10 rounded-xl bg-muted animate-pulse" />
          <div className="space-y-1.5">
            <div className="h-5 w-32 bg-muted rounded animate-pulse" />
            <div className="h-3 w-48 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="flex gap-6">
          <div className="hidden md:flex w-52 flex-col gap-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-9 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
          <div className="flex-1 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="size-9 shrink-0" onClick={() => onNavigate("dashboard")}>
          <ChevronLeft className="size-5" />
        </Button>
        <div className="flex size-10 items-center justify-center rounded-xl bg-accent/10">
          <Settings className="size-5 text-accent" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">{t.settings.title}</h1>
          <p className="text-sm text-muted-foreground">{fr ? "Gérez vos préférences et votre compte" : "Manage your preferences and account"}</p>
        </div>
        <div className="flex-1" />
        {/* Mobile sidebar toggle */}
        <Button variant="outline" size="icon" className="md:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <Menu className="size-4" />
        </Button>
      </div>

      {/* Search bar */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={t.settings.searchPlaceholder}
          className="pl-9 h-10 bg-card text-sm border-border/60 focus-visible:ring-accent/30"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="flex gap-6 relative">
        {/* Sidebar */}
        <>
          {sidebarOpen && (
            <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />
          )}
          <aside className={cn(
            "md:sticky md:top-20 md:self-start md:block md:w-52 md:shrink-0",
            "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 ease-out md:transform-none md:bg-transparent md:border-0",
            sidebarOpen ? "translate-x-0 shadow-xl" : "-translate-x-full md:translate-x-0"
          )}>
            <div className="flex items-center justify-between p-4 md:hidden border-b border-border">
              <span className="text-sm font-semibold text-foreground">{fr ? "Menu" : "Menu"}</span>
              <Button variant="ghost" size="icon" className="size-8" onClick={() => setSidebarOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>
            <nav className="flex flex-col p-3 md:p-0">
              {filteredGroups.map((group, gi) => (
                <div key={gi} className="mb-2 last:mb-0">
                  <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    {group.label}
                  </p>
                  <div className="flex flex-col gap-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon
                      return (
                        <button
                          key={item.id}
                          onClick={() => { setActiveSection(item.id); setSidebarOpen(false) }}
                          className={cn(
                            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 text-left",
                            activeSection === item.id
                              ? "bg-accent/10 text-accent shadow-xs"
                              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                          )}
                        >
                          <Icon className="size-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
                          {activeSection === item.id && (
                            <ChevronRight className="size-3.5 ml-auto text-accent/60" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </aside>
        </>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-6 pb-8">

          {/* ===== PROFILE ===== */}
          {activeSection === "profile" && (
            <>
              <SettingsSection
                title={fr ? "Photo de profil" : "Profile photo"}
                description={fr ? "Visible par votre équipe dans toute l'application." : "Visible to your team across the app."}
                icon={<Camera className="size-4" />}
              >
                <div className="flex items-center gap-4 pt-2">
                  <UserAvatar
                    avatarUrl={avatarUrl}
                    name={memberName || user?.email?.split("@")[0] || ""}
                    email={user?.email ?? ""}
                    size="lg"
                    className="size-16 ring-2 ring-accent/20"
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">{memberName || user?.email?.split("@")[0] || ""}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setAvatarOpen(true)}>
                        <Camera className="size-3.5" />
                        {avatarUrl ? (fr ? "Modifier" : "Change") : (fr ? "Ajouter" : "Add")}
                      </Button>
                    </div>
                  </div>
                </div>
              </SettingsSection>

              <SettingsSection
                title={fr ? "Informations personnelles" : "Personal information"}
                description={fr ? "Nom affiché et coordonnées." : "Display name and contact details."}
                icon={<CircleUser className="size-4" />}
              >
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">{fr ? "Nom d'affichage" : "Display name"}</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                          value={memberName}
                          onChange={e => setMemberName(e.target.value)}
                          placeholder={user?.email?.split("@")[0] || ""}
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">{fr ? "Téléphone" : "Phone"}</Label>
                      <div className="relative">
                        <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                          value={memberPhone}
                          onChange={e => setMemberPhone(e.target.value)}
                          placeholder="+243 ..."
                          className="pl-9"
                        />
                      </div>
                    </div>
                  </div>
                  <Button size="sm" onClick={saveMemberProfile}>{fr ? "Enregistrer" : "Save"}</Button>
                </div>
              </SettingsSection>

              <SettingsSection
                title={fr ? "Compte" : "Account"}
                description={fr ? "État de votre connexion et informations." : "Your sign-in status and details."}
                icon={<Mail className="size-4" />}
              >
                <div className="space-y-3 pt-2">
                  <SettingsRow label={fr ? "Email" : "Email"}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{user?.email}</span>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        <BadgeCheck className="size-3 mr-0.5 text-success" />
                        {fr ? "Connecté" : "Connected"}
                      </Badge>
                    </div>
                  </SettingsRow>
                  <SettingsRow label={fr ? "Rôle" : "Role"}>
                    <Badge variant="outline" className="capitalize text-[10px]">{role}</Badge>
                  </SettingsRow>
                </div>
              </SettingsSection>
            </>
          )}

          {/* ===== NOTIFICATIONS ===== */}
          {activeSection === "notifications" && (
            <SettingsSection
              title={t.settings.notifications}
              description={t.settings.notificationsDesc}
              icon={<Bell className="size-4" />}
            >
              <div className="pt-2">
                <div className="space-y-1">
                  {notifConfig.map((n) => {
                    const Icon = n.icon
                    return (
                      <SettingsRow key={n.key} label={n.label} description={n.desc}>
                        <Switch
                          checked={notifs[n.key]}
                          onCheckedChange={(v) => toggleNotif(n.key, v)}
                        />
                      </SettingsRow>
                    )
                  })}
                </div>
              </div>
            </SettingsSection>
          )}

          {/* ===== APPEARANCE ===== */}
          {activeSection === "appearance" && (
            <>
              <SettingsSection
                title={t.settings.theme}
                icon={<Palette className="size-4" />}
              >
                <div className="flex gap-2 pt-2">
                  {[
                    { value: "light" as const, label: t.settings.themeLight, icon: Sun },
                    { value: "dark" as const, label: t.settings.themeDark, icon: Moon },
                    { value: "system" as const, label: t.settings.themeSystem, icon: Monitor },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTheme(opt.value)}
                      className={cn(
                        "flex flex-1 flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 transition-all",
                        theme === opt.value
                          ? "border-accent bg-accent/5"
                          : "border-border/60 hover:border-muted-foreground/30 hover:bg-muted/20"
                      )}
                    >
                      <opt.icon className={cn(
                        "size-5 transition-colors",
                        theme === opt.value ? "text-accent" : "text-muted-foreground"
                      )} />
                      <span className="text-xs text-muted-foreground">{opt.label}</span>
                      {theme === opt.value && <Check className="size-3.5 text-accent" />}
                    </button>
                  ))}
                </div>
              </SettingsSection>

              <SettingsSection
                title={t.settings.fontSize}
                description={t.settings.displayDesc}
                icon={<Search className="size-4" />}
              >
                <div className="flex gap-2 pt-2">
                  {FONT_SIZES.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => applyFontSize(size)}
                      className={cn(
                        "flex flex-1 flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 transition-all",
                        fontSize === size
                          ? "border-accent bg-accent/5"
                          : "border-border/60 hover:border-muted-foreground/30 hover:bg-muted/20"
                      )}
                    >
                      <span className={cn(
                        "font-bold text-foreground transition-all",
                        size === "small" && "text-sm",
                        size === "medium" && "text-base",
                        size === "large" && "text-lg",
                      )}>A</span>
                      <span className="text-xs text-muted-foreground">{fontSizeLabels[size][lang]}</span>
                      {fontSize === size && <Check className="size-3.5 text-accent" />}
                    </button>
                  ))}
                </div>
              </SettingsSection>

              <SettingsSection
                title={fr ? "Préférences d'affichage" : "Display preferences"}
                icon={<Sliders className="size-4" />}
              >
                <div className="pt-2 space-y-1">
                  <SettingsRow
                    label={fr ? "Mode compact" : "Compact mode"}
                    description={fr ? "Réduit les espacements pour afficher plus de contenu" : "Reduces spacing to show more content"}
                  >
                    <Select value={compactMode} onValueChange={(v: CompactMode) => { setCompactMode(v); savePreference("compact_mode", v === "full" ? true : v === "partial" ? "partial" : false) }}>
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="off">{fr ? "Désactivé" : "Off"}</SelectItem>
                        <SelectItem value="partial">{fr ? "Partiel" : "Partial"}</SelectItem>
                        <SelectItem value="full">{fr ? "Complet" : "Full"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingsRow>
                  <SettingsRow
                    label={fr ? "Mouvements réduits" : "Reduced motion"}
                    description={fr ? "Diminue les animations" : "Reduces animations throughout the app"}
                  >
                    <Switch
                      checked={reducedMotion}
                      onCheckedChange={(v) => { setReducedMotion(v); savePreference("reduced_motion", v) }}
                    />
                  </SettingsRow>
                </div>
              </SettingsSection>

              <SettingsSection
                title={t.settings.clearCache}
                description={t.settings.clearCacheDesc}
                icon={<Trash2 className="size-4" />}
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearCache}
                  disabled={clearing}
                  className="gap-2 mt-2"
                >
                  {clearing ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                  {clearing ? (fr ? "Nettoyage..." : "Clearing...") : (fr ? "Vider le cache" : "Clear cache")}
                </Button>
              </SettingsSection>
            </>
          )}

          {/* ===== LANGUAGE & REGION ===== */}
          {activeSection === "language" && (
            <SettingsSection
              title={fr ? "Langue & Région" : "Language & Region"}
              description={fr ? "Langue, fuseau horaire et devise par défaut." : "Language, timezone and default currency."}
              icon={<Globe className="size-4" />}
            >
              <div className="pt-2 space-y-4">
                <SettingsRow
                  label={fr ? "Langue de l'interface" : "Interface language"}
                  description={fr ? "Français ou anglais" : "French or English"}
                >
                  <Select value={lang} onValueChange={(v) => {
                    localStorage.setItem("savemali-lang", v)
                    window.location.reload()
                  }}>
                    <SelectTrigger className="w-36 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fr">
                        <span className="flex items-center gap-2">🇫🇷 Français</span>
                      </SelectItem>
                      <SelectItem value="en">
                        <span className="flex items-center gap-2">🇬🇧 English</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </SettingsRow>
                <SettingsRow
                  label={fr ? "Fuseau horaire" : "Timezone"}
                  description={fr ? "Affiché dans les dates et rapports" : "Used for dates and reports"}
                >
                  <Select value={timezone} onValueChange={(v) => { setTimezone(v); savePreference("timezone", v) }}>
                    <SelectTrigger className="w-48 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TZ_OPTIONS.map(tz => (
                        <SelectItem key={tz} value={tz}>{tz.replace("_", " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </SettingsRow>
                <SettingsRow
                  label={fr ? "Devise par défaut" : "Default currency"}
                  description={fr ? "Utilisée dans les rapports financiers" : "Used in financial reports"}
                >
                  <Select value={currency} onValueChange={(v) => setCurrency(v)}>
                    <SelectTrigger className="w-36 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCY_OPTIONS.map(c => (
                        <SelectItem key={c.code} value={c.code}>{c.symbol} — {c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </SettingsRow>
              </div>
            </SettingsSection>
          )}

          {/* ===== SECURITY ===== */}
          {activeSection === "security" && (
            <>
              <SettingsSection
                title={t.settings.security}
                description={t.settings.securityDesc}
                icon={<Shield className="size-4" />}
              >
                <div className="pt-2 space-y-3">
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-full bg-accent/10">
                        <Mail className="size-4 text-accent" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">{t.settings.email}</p>
                        <p className="text-sm font-medium text-foreground truncate">{user?.email ?? "—"}</p>
                      </div>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        <BadgeCheck className="size-3 mr-0.5 text-success" />
                        {fr ? "Connecté" : "Connected"}
                      </Badge>
                    </div>
                  </div>

                  {workspace && (
                    <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-full bg-accent/10">
                          <Building2 className="size-4 text-accent" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-muted-foreground">{t.settings.workspace}</p>
                          <p className="text-sm font-medium text-foreground truncate">{workspace.name}</p>
                        </div>
                        <Badge variant="secondary" className="text-[10px] shrink-0 capitalize">
                          {typeLabel[workspace.type]?.[lang] ?? workspace.type}
                        </Badge>
                      </div>
                    </div>
                  )}

                  <SettingsDivider />

                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">{t.settings.changePassword}</p>
                    <p className="text-xs text-muted-foreground mb-3">{t.settings.changePasswordDesc}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleChangePassword}
                      disabled={sendingPwd}
                      className="gap-2"
                    >
                      {sendingPwd ? <Loader2 className="size-3.5 animate-spin" /> : <Lock className="size-3.5" />}
                      {sendingPwd ? (fr ? "Envoi..." : "Sending...") : (fr ? "Changer le mot de passe" : "Change password")}
                    </Button>
                  </div>

                  <SettingsDivider />

                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">{fr ? "Session & Appareils" : "Session & Devices"}</p>
                    <p className="text-xs text-muted-foreground mb-3">{fr ? "Gérez vos sessions actives et appareils connectés" : "Manage your active sessions and connected devices"}</p>
                    <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 p-3">
                      <div className="flex size-8 items-center justify-center rounded-full bg-accent/10">
                        <Smartphone className="size-4 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{fr ? "Session actuelle" : "Current session"}</p>
                        <p className="text-xs text-muted-foreground">{fr ? "Appareil actuel" : "Current device"}</p>
                      </div>
                      <Badge variant="secondary" className="text-[10px] shrink-0 bg-success/10 text-success">{fr ? "Active" : "Active"}</Badge>
                    </div>
                  </div>

                  <SettingsDivider />

                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">{fr ? "Tableau de bord sécurité" : "Security Dashboard"}</p>
                    <p className="text-xs text-muted-foreground mb-3">{fr ? "Surveillance complète" : "Full security monitoring"}</p>
                    <Button variant="outline" size="sm" onClick={() => onNavigate("security")} className="gap-2">
                      <Shield className="size-3.5" />
                      {fr ? "Ouvrir le tableau de bord" : "Open dashboard"}
                    </Button>
                  </div>
                </div>
              </SettingsSection>
            </>
          )}

          {/* ===== WORKSPACE ===== */}
          {activeSection === "workspace" && (
            <SettingsSection
              title={fr ? "Espace de travail" : "Workspace"}
              description={fr ? "Informations générales sur votre espace de travail." : "General information about your workspace."}
              icon={<Building2 className="size-4" />}
            >
              <div className="pt-2 space-y-3">
                <SettingsRow label={fr ? "Nom" : "Name"}>
                  <span className="text-sm font-medium text-foreground">{workspace?.name}</span>
                </SettingsRow>
                <SettingsRow label={fr ? "Type" : "Type"}>
                  <Badge variant="outline" className="capitalize text-[10px]">{typeLabel[workspace?.type || ""]?.[lang] || workspace?.type}</Badge>
                </SettingsRow>
                <SettingsRow label={fr ? "Pays" : "Country"}>
                  <span className="text-sm text-foreground">{workspace?.country || "RDC"}</span>
                </SettingsRow>
                <SettingsRow label={fr ? "Créé le" : "Created on"}>
                  <span className="text-sm text-foreground">{workspace?.created_at ? new Date(workspace.created_at).toLocaleDateString(fr ? "fr-FR" : "en-US", { dateStyle: "medium" }) : "—"}</span>
                </SettingsRow>
                {isOwner && (
                  <SettingsRow label={fr ? "Propriétaire" : "Owner"}>
                    <Badge variant="secondary" className="text-[10px]">
                      <BadgeCheck className="size-3 mr-0.5 text-success" />
                      {fr ? "Vous" : "You"}
                    </Badge>
                  </SettingsRow>
                )}
              </div>
            </SettingsSection>
          )}

          {/* ===== TEAM ===== */}
          {activeSection === "team" && (
            <SettingsSection
              title={fr ? "Membres de l'équipe" : "Team members"}
              description={fr ? "Gérez les accès à votre espace de travail." : "Manage access to your workspace."}
              icon={<Users className="size-4" />}
              action={
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onNavigate("members")}>
                  <ExternalLink className="size-3.5" />
                  {fr ? "Gérer" : "Manage"}
                </Button>
              }
            >
              <div className="pt-2 space-y-2">
                {teamLoading ? (
                  <div className="flex items-center justify-center py-6"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
                ) : teamMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">{fr ? "Aucun membre" : "No members"}</p>
                ) : (
                  teamMembers.map((m, i) => (
                    <div key={m.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/30 transition-colors">
                      <div className="flex size-8 items-center justify-center rounded-full bg-accent/10 text-sm font-medium text-accent shrink-0">
                        {m.email?.[0]?.toUpperCase() || "U"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{m.email || fr ? "Membre" : "Member"} {i + 1}</p>
                        <p className="text-xs text-muted-foreground capitalize">{m.role}</p>
                      </div>
                      <Badge variant={m.status === "active" ? "secondary" : "outline"} className="text-[10px]">
                        {m.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </SettingsSection>
          )}

          {/* ===== API KEYS ===== */}
          {activeSection === "api" && (
            <SettingsSection
              title="API & intégrations"
              description={fr ? "Clés d'API pour connecter des applications tierces." : "API keys to connect third-party applications."}
              icon={<KeyRound className="size-4" />}
              action={
                <Button size="sm" className="gap-1.5" onClick={() => setShowNewKey(true)} disabled={showNewKey}>
                  <Plus className="size-3.5" />
                  {fr ? "Nouvelle clé" : "New key"}
                </Button>
              }
            >
              <div className="pt-2 space-y-3">
                {showNewKey && (
                  <div className="rounded-lg border border-accent/30 bg-accent/[0.03] p-4 space-y-3">
                    <p className="text-sm font-medium text-foreground">{fr ? "Créer une nouvelle clé API" : "Create a new API key"}</p>
                    <div className="flex gap-2">
                      <Input
                        value={newKeyName}
                        onChange={e => setNewKeyName(e.target.value)}
                        placeholder={fr ? "Nom de la clé (ex: Intégration Shopify)" : "Key name (e.g. Shopify integration)"}
                        className="flex-1"
                      />
                      <Button size="sm" onClick={generateApiKey} disabled={!newKeyName.trim()}>
                        <Plus className="size-3.5 mr-1" />
                        {fr ? "Créer" : "Create"}
                      </Button>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setShowNewKey(false)} className="text-xs text-muted-foreground">
                      {fr ? "Annuler" : "Cancel"}
                    </Button>
                  </div>
                )}

                {newlyCreatedKey && (
                  <div className="rounded-lg border border-brand/30 bg-brand/[0.03] p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="size-4 text-amber-500" />
                      <p className="text-sm font-medium text-foreground">{fr ? "Clé créée — copiez-la maintenant" : "Key created — copy it now"}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{fr ? "Vous ne pourrez plus la voir après avoir quitté cette page." : "You won't be able to see it again after leaving this page."}</p>
                    <div className="flex gap-2">
                      <code className="flex-1 rounded bg-muted px-3 py-2 text-xs font-mono break-all select-all">{newlyCreatedKey}</code>
                      <Button size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={() => { navigator.clipboard.writeText(newlyCreatedKey); toast.success(fr ? "Copiée" : "Copied") }}>
                        <Copy className="size-3.5" />
                      </Button>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setNewlyCreatedKey(null)} className="text-xs">
                      {fr ? "Fermer" : "Close"}
                    </Button>
                  </div>
                )}

                {apiKeyLoading ? (
                  <div className="flex items-center justify-center py-6"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
                ) : apiKeys.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <KeyRound className="size-8 text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">{fr ? "Aucune clé API" : "No API keys"}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">{fr ? "Créez une clé pour intégrer des applications tierces" : "Create a key to integrate third-party apps"}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {apiKeys.map(key => (
                      <div key={key.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-3 hover:bg-muted/20 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn("flex size-8 items-center justify-center rounded-full shrink-0", key.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>
                            <KeyRound className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{key.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <code className="text-xs text-muted-foreground font-mono">
                                {key.is_active ? `${key.key_value.slice(0, 12)}...` : fr ? "Révoquée" : "Revoked"}
                              </code>
                              {key.last_used_at && (
                                <span className="text-[10px] text-muted-foreground/60">
                                  · {fr ? "Dernier usage" : "Last used"} {formatRelativeTime(key.last_used_at, fr)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {key.is_active ? (
                            <>
                              <Button size="sm" variant="ghost" className="size-8" onClick={() => { navigator.clipboard.writeText(key.key_value); toast.success(fr ? "Copiée" : "Copied") }}>
                                <Copy className="size-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="size-8 text-destructive hover:text-destructive" onClick={() => revokeApiKey(key.id)}>
                                <X className="size-3.5" />
                              </Button>
                            </>
                          ) : (
                            <Button size="sm" variant="ghost" className="size-8 text-destructive" onClick={() => deleteApiKey(key.id)}>
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </SettingsSection>
          )}

          {/* ===== BACKUPS ===== */}
          {activeSection === "backups" && (
            <SettingsSection
              title={t.settings.backups}
              description={t.settings.backupsDesc}
              icon={<Database className="size-4" />}
            >
              <div className="pt-2 space-y-4">
                <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{t.settings.lastBackup}</p>
                      <p className="text-sm font-medium text-foreground mt-0.5">
                        {lastBackup
                          ? new Date(lastBackup).toLocaleString(lang === "fr" ? "fr-FR" : "en-US", {
                              dateStyle: "medium", timeStyle: "short",
                            })
                          : (fr ? "Jamais" : "Never")}
                      </p>
                    </div>
                    {lastBackup && (
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        <Check className="size-3 mr-1 text-success" />
                        {fr ? "Complété" : "Done"}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleBackup}
                    disabled={backingUp}
                    className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
                  >
                    {backingUp ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Download className="size-3.5" />
                    )}
                    {backingUp ? t.settings.backupInProgress : t.settings.triggerBackup}
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => onNavigate("reports")}>
                    <Upload className="size-3.5" />
                    {fr ? "Exporter les rapports" : "Export reports"}
                  </Button>
                </div>
              </div>
            </SettingsSection>
          )}

          {/* ===== BILLING ===== */}
          {activeSection === "billing" && (
            <SettingsSection
              title={fr ? "Facturation" : "Billing"}
              description={fr ? "Informations sur votre abonnement et utilisation." : "Subscription and usage information."}
              icon={<CreditCard className="size-4" />}
            >
              <div className="pt-2 space-y-4">
                <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-brand/10">
                      <Zap className="size-5 text-brand" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{fr ? "Plan gratuit" : "Free Plan"}</p>
                      <p className="text-xs text-muted-foreground">{fr ? "Fonctionnalités de base incluses" : "Basic features included"}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] bg-success/10 text-success">
                      <Check className="size-3 mr-0.5" />
                      {fr ? "Actif" : "Active"}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { icon: Package, label: fr ? "Stockage" : "Storage", value: "—" },
                    { icon: Users, label: fr ? "Utilisateurs" : "Users", value: String(teamMembers.length || 1) },
                    { icon: BarChart3, label: fr ? "Rapports/mois" : "Reports/month", value: "—" },
                  ].map((s, i) => (
                    <div key={i} className="rounded-lg border border-border/60 p-3 text-center">
                      <s.icon className="size-4 mx-auto mb-1.5 text-muted-foreground" />
                      <p className="text-lg font-bold text-foreground">{s.value}</p>
                      <p className="text-[10px] text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  {fr ? "La facturation détaillée sera disponible prochainement." : "Detailed billing will be available soon."}
                </p>
              </div>
            </SettingsSection>
          )}

          {/* ===== PRIVACY ===== */}
          {activeSection === "privacy" && (
            <SettingsSection
              title={t.settings.privacy}
              description={t.settings.privacyDesc}
              icon={<ShieldAlert className="size-4" />}
            >
              <div className="pt-2 space-y-4">
                <div className="rounded-lg border border-border/60 hover:border-border transition-colors p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-brand/10">
                        <Download className="size-5 text-brand" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{t.settings.exportData}</p>
                        <p className="text-xs text-muted-foreground">{t.settings.exportDataDesc}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="gap-1.5 shrink-0">
                      <FileJson className="size-3.5" />
                      {fr ? "Exporter" : "Export"}
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border border-border/60 hover:border-border transition-colors p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-destructive/10">
                        <Trash2 className="size-5 text-destructive" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{t.settings.deleteAccount}</p>
                        <p className="text-xs text-muted-foreground">{t.settings.deleteAccountDesc}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="gap-1.5 shrink-0 text-destructive border-destructive/30 hover:bg-destructive/10">
                      <Trash2 className="size-3.5" />
                      {fr ? "Supprimer" : "Delete"}
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border border-border/60 hover:border-border transition-colors p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                        <Laptop className="size-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{t.settings.connectedDevices}</p>
                        <p className="text-xs text-muted-foreground">{t.settings.connectedDevicesDesc}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      {fr ? "Session active" : "Active session"}
                    </Badge>
                  </div>
                </div>
              </div>
            </SettingsSection>
          )}

          {/* ===== ACTIVITY LOG ===== */}
          {activeSection === "activity" && (
            <SettingsSection
              title={t.settings.activityLog}
              description={t.settings.activityLogDesc}
              icon={<Activity className="size-4" />}
            >
              <div className="pt-2 space-y-3">
                {[
                  { action: fr ? "Connexion au tableau de bord" : "Dashboard login", time: fr ? "Il y a 2h" : "2h ago", user: user?.email },
                  { action: fr ? "Rapport mensuel généré" : "Monthly report generated", time: fr ? "Il y a 1j" : "1d ago", user: user?.email },
                  { action: fr ? "Paramètres modifiés" : "Settings updated", time: fr ? "Il y a 3j" : "3d ago", user: user?.email },
                ].map((entry, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                        <Activity className="size-3.5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{entry.action}</p>
                        <p className="text-xs text-muted-foreground">{entry.user}</p>
                      </div>
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">{entry.time}</span>
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground gap-1.5">
                  <ExternalLink className="size-3" />
                  {fr ? "Voir tout l'historique" : "View full history"}
                </Button>
              </div>
            </SettingsSection>
          )}

          {/* ===== SYSTEM / SERVICE HEALTH ===== */}
          {activeSection === "system" && (
            <SettingsSection
              title={t.settings.serviceHealth}
              description={t.settings.serviceHealthDesc}
              icon={<Radio className="size-4" />}
            >
              <div className="pt-2 space-y-3">
                {[
                  { name: fr ? "Base de données" : "Database", status: "operational", uptime: "99.9%" },
                  { name: fr ? "API" : "API", status: "operational", uptime: "99.8%" },
                  { name: fr ? "Stockage" : "Storage", status: "operational", uptime: "99.9%" },
                  { name: fr ? "Authentification" : "Authentication", status: "operational", uptime: "100%" },
                  { name: fr ? "Notifications" : "Notifications", status: "operational", uptime: "99.7%" },
                ].map((svc, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success/10">
                        <Check className="size-3.5 text-success" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{svc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {fr ? "Opérationnel" : "Operational"} · {svc.uptime} {fr ? "disponibilité" : "uptime"}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-success/10 text-success text-[10px]">
                      <Check className="size-3 mr-0.5" />
                      {fr ? "OK" : "OK"}
                    </Badge>
                  </div>
                ))}
              </div>
            </SettingsSection>
          )}

          {/* ===== SUPPORT TICKETS ===== */}
          {activeSection === "tickets" && (
            <SettingsSection
              title={fr ? "Tickets de support" : "Support Tickets"}
              description={fr ? "Gerer les demandes d'assistance" : "Manage support requests"}
              icon={<MessageSquare className="size-4" />}
            >
              <SupportTicketsView fr={fr} workspace={workspace} />
            </SettingsSection>
          )}

          {/* ===== DPO REQUESTS ===== */}
          {activeSection === "dpo" && (
            <SettingsSection
              title={fr ? "Demandes DPO" : "DPO Requests"}
              description={fr ? "Gerer les demandes de protection des donnees" : "Manage data protection requests"}
              icon={<Shield className="size-4" />}
            >
              <DpoRequestsView fr={fr} workspace={workspace} />
            </SettingsSection>
          )}

          {/* ===== CONTACT MESSAGES ===== */}
          {activeSection === "contact-messages" && (
            <SettingsSection
              title={fr ? "Messages de contact" : "Contact Messages"}
              description={fr ? "Gerer les messages recus via le formulaire de contact" : "Manage messages received via contact form"}
              icon={<Mail className="size-4" />}
            >
              <ContactMessagesView fr={fr} workspace={workspace} />
            </SettingsSection>
          )}

          {/* ===== RDV APPOINTMENTS ===== */}
          {activeSection === "rdv-admin" && (
            <SettingsSection
              title={fr ? "Rendez-vous" : "Appointments"}
              description={fr ? "Gerer les demandes de rendez-vous" : "Manage appointment requests"}
              icon={<CalendarDays className="size-4" />}
            >
              <AppointmentsAdminView fr={fr} workspace={workspace} />
            </SettingsSection>
          )}

        </div>
      </div>
      <PageFooter onNavigate={onNavigate} />
      <AvatarUpload
        userId={user?.id ?? ""}
        workspaceId={workspace?.id ?? ""}
        name={memberName || user?.email?.split("@")[0] || ""}
        email={user?.email ?? ""}
        currentAvatarUrl={avatarUrl}
        open={avatarOpen}
        onOpenChange={setAvatarOpen}
        onAvatarChange={setAvatarUrl}
      />
    </div>
  )
}

// ── Support Tickets Admin View ──
function SupportTicketsView({ fr, workspace }: { fr: boolean; workspace: any }) {
  const [tickets, setTickets] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [filter, setFilter] = React.useState("all")
  const [selected, setSelected] = React.useState<any>(null)

  React.useEffect(() => {
    if (!workspace) return
    setLoading(true)
    insforge.database
      .from("support_tickets")
      .select("*")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => { setTickets((data as any[]) ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [workspace])

  const statusColors: Record<string, string> = {
    open: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    waiting_on_customer: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    resolved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    closed: "bg-muted text-muted-foreground",
  }
  const statusLabels: Record<string, string> = {
    open: fr ? "Ouvert" : "Open",
    in_progress: fr ? "En cours" : "In Progress",
    waiting_on_customer: fr ? "En attente" : "Waiting",
    resolved: fr ? "Resolu" : "Resolved",
    closed: fr ? "Ferme" : "Closed",
  }
  const priorityColors: Record<string, string> = {
    low: "bg-muted text-muted-foreground",
    normal: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  }

  const filtered = filter === "all" ? tickets : tickets.filter((t) => t.status === filter)

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>

  if (selected) {
    return (
      <div className="pt-2">
        <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="mb-4 gap-1.5">
          <ChevronLeft className="size-4" />{fr ? "Retour" : "Back"}
        </Button>
        <div className="rounded-lg border border-border/60 p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-xs text-muted-foreground">{fr ? "Ticket" : "Ticket"}</p>
              <p className="text-sm font-mono font-bold text-foreground">{selected.ticket_number}</p>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium ${statusColors[selected.status] || ""}`}>{statusLabels[selected.status] || selected.status}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-muted-foreground">{fr ? "Auteur" : "Author"}</p><p className="font-medium">{selected.created_by_name || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground">Email</p><p className="font-medium">{selected.created_by_email || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground">{fr ? "Categorie" : "Category"}</p><p className="font-medium capitalize">{selected.category}</p></div>
            <div><p className="text-xs text-muted-foreground">{fr ? "Priorite" : "Priority"}</p><span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${priorityColors[selected.priority] || ""}`}>{selected.priority}</span></div>
            <div className="col-span-2"><p className="text-xs text-muted-foreground">{fr ? "Date" : "Date"}</p><p className="font-medium">{new Date(selected.created_at).toLocaleString(fr ? "fr-FR" : "en-US")}</p></div>
          </div>
          <div className="pt-2 border-t border-border/40">
            <p className="text-xs text-muted-foreground mb-1">{fr ? "Sujet" : "Subject"}</p>
            <p className="text-sm font-medium text-foreground mb-2">{selected.subject}</p>
            <p className="text-xs text-muted-foreground mb-1">{fr ? "Message" : "Message"}</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selected.message}</p>
          </div>
          <div className="flex gap-2 pt-2 border-t border-border/40">
            {selected.status !== "resolved" && (
              <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={async () => {
                await insforge.database.from("support_tickets").update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("id", selected.id)
                logAudit({ action: "support_ticket_resolved", target_id: selected.ticket_number, target_type: "support_ticket", metadata: { status: "resolved" } })
                setSelected((p: any) => ({ ...p, status: "resolved" }))
              }}>
                <Check className="size-3.5" />{fr ? "Marquer resolu" : "Mark resolved"}
              </Button>
            )}
            <Button size="sm" variant="ghost" className="gap-1.5 text-xs" onClick={async () => {
              await insforge.database.from("support_tickets").update({ status: "closed" }).eq("id", selected.id)
              logAudit({ action: "support_ticket_closed", target_id: selected.ticket_number, target_type: "support_ticket" })
              setSelected((p: any) => ({ ...p, status: "closed" }))
            }}>
              <X className="size-3.5" />{fr ? "Fermer" : "Close"}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-2 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {["all", "open", "in_progress", "resolved", "closed"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${filter === s ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
            {s === "all" ? (fr ? "Tous" : "All") : statusLabels[s] || s}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <MessageSquare className="size-8 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">{fr ? "Aucun ticket" : "No tickets"}</p>
        </div>
      ) : (
        filtered.map((t) => (
          <div key={t.id} className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => setSelected(t)}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <MessageSquare className="size-3.5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{t.subject}</p>
                <p className="text-xs text-muted-foreground">{t.ticket_number} · {t.created_by_name || t.created_by_email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {t.priority === "urgent" && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{fr ? "Urgent" : "Urgent"}</span>}
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[t.status] || ""}`}>{statusLabels[t.status] || t.status}</span>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// ── DPO Requests Admin View ──
function DpoRequestsView({ fr, workspace }: { fr: boolean; workspace: any }) {
  const [requests, setRequests] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [filter, setFilter] = React.useState("all")
  const [selected, setSelected] = React.useState<any>(null)

  React.useEffect(() => {
    if (!workspace) return
    setLoading(true)
    insforge.database
      .from("dpo_requests")
      .select("*")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => { setRequests((data as any[]) ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [workspace])

  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    in_review: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    completed: "bg-muted text-muted-foreground",
  }
  const statusLabels: Record<string, string> = {
    pending: fr ? "En attente" : "Pending",
    in_review: fr ? "En examen" : "In Review",
    approved: fr ? "Approuve" : "Approved",
    rejected: fr ? "Refuse" : "Rejected",
    completed: fr ? "Termine" : "Completed",
  }
  const typeLabels: Record<string, string> = {
    access: fr ? "Acces" : "Access",
    rectification: fr ? "Rectification" : "Rectification",
    erasure: fr ? "Effacement" : "Erasure",
    restriction: fr ? "Limitation" : "Restriction",
    objection: fr ? "Opposition" : "Objection",
    portability: fr ? "Portabilite" : "Portability",
    withdraw_consent: fr ? "Retrait consentement" : "Withdraw consent",
    complaint: fr ? "Reclamation" : "Complaint",
    other: fr ? "Autre" : "Other",
  }

  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter)

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>

  if (selected) {
    return (
      <div className="pt-2">
        <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="mb-4 gap-1.5">
          <ChevronLeft className="size-4" />{fr ? "Retour" : "Back"}
        </Button>
        <div className="rounded-lg border border-border/60 p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-xs text-muted-foreground">{fr ? "Requete" : "Request"}</p>
              <p className="text-sm font-mono font-bold text-foreground">{selected.request_number}</p>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium ${statusColors[selected.status] || ""}`}>{statusLabels[selected.status] || selected.status}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-muted-foreground">{fr ? "Auteur" : "Author"}</p><p className="font-medium">{selected.created_by_name || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground">Email</p><p className="font-medium">{selected.created_by_email || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground">{fr ? "Type" : "Type"}</p><p className="font-medium capitalize">{typeLabels[selected.request_type] || selected.request_type}</p></div>
            <div><p className="text-xs text-muted-foreground">{fr ? "Date" : "Date"}</p><p className="font-medium">{new Date(selected.created_at).toLocaleString(fr ? "fr-FR" : "en-US")}</p></div>
          </div>
          <div className="pt-2 border-t border-border/40">
            <p className="text-xs text-muted-foreground mb-1">{fr ? "Sujet" : "Subject"}</p>
            <p className="text-sm font-medium text-foreground mb-2">{selected.subject}</p>
            <p className="text-xs text-muted-foreground mb-1">{fr ? "Description" : "Description"}</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selected.description}</p>
          </div>
          <div className="flex gap-2 pt-2 border-t border-border/40">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={async () => {
              await insforge.database.from("dpo_requests").update({ status: "in_review" }).eq("id", selected.id)
              logAudit({ action: "dpo_request_reviewed", target_id: selected.request_number, target_type: "dpo_request", metadata: { status: "in_review" } })
              setSelected((p: any) => ({ ...p, status: "in_review" }))
            }}>
              {fr ? "Prendre en charge" : "Take in charge"}
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={async () => {
              await insforge.database.from("dpo_requests").update({ status: "completed" }).eq("id", selected.id)
              logAudit({ action: "dpo_request_completed", target_id: selected.request_number, target_type: "dpo_request", metadata: { status: "completed" } })
              setSelected((p: any) => ({ ...p, status: "completed" }))
            }}>
              <Check className="size-3.5" />{fr ? "Marquer termine" : "Mark completed"}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-2 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {["all", "pending", "in_review", "approved", "rejected", "completed"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${filter === s ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
            {s === "all" ? (fr ? "Tous" : "All") : statusLabels[s] || s}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <Shield className="size-8 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">{fr ? "Aucune demande" : "No requests"}</p>
        </div>
      ) : (
        filtered.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => setSelected(r)}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <Shield className="size-3.5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{r.subject}</p>
                <p className="text-xs text-muted-foreground">{r.request_number} · {typeLabels[r.request_type] || r.request_type}</p>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[r.status] || ""}`}>{statusLabels[r.status] || r.status}</span>
          </div>
        ))
      )}
    </div>
  )
}

// ── Contact Messages Admin View ──
function ContactMessagesView({ fr, workspace }: { fr: boolean; workspace: any }) {
  const [messages, setMessages] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [filter, setFilter] = React.useState("all")
  const [selected, setSelected] = React.useState<any>(null)

  React.useEffect(() => {
    if (!workspace) return
    setLoading(true)
    insforge.database
      .from("contact_messages")
      .select("*")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => { setMessages((data as any[]) ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [workspace])

  const statusColors: Record<string, string> = {
    new: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    read: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    replied: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    closed: "bg-muted text-muted-foreground",
  }
  const statusLabels: Record<string, string> = {
    new: fr ? "Nouveau" : "New",
    read: fr ? "Lu" : "Read",
    replied: fr ? "Répondu" : "Replied",
    closed: fr ? "Fermé" : "Closed",
  }

  const filtered = filter === "all" ? messages : messages.filter((m) => m.status === filter)

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>

  if (selected) {
    return (
      <div className="pt-2">
        <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="mb-4 gap-1.5">
          <ChevronLeft className="size-4" />{fr ? "Retour" : "Back"}
        </Button>
        <div className="rounded-lg border border-border/60 p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-xs text-muted-foreground">{fr ? "Message" : "Message"}</p>
              <p className="text-sm font-mono font-bold text-foreground">{selected.contact_number}</p>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium ${statusColors[selected.status] || ""}`}>{statusLabels[selected.status] || selected.status}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-muted-foreground">{fr ? "Nom" : "Name"}</p><p className="font-medium">{selected.full_name || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground">Email</p><p className="font-medium">{selected.email || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground">{fr ? "Catégorie" : "Category"}</p><p className="font-medium capitalize">{selected.category}</p></div>
            <div><p className="text-xs text-muted-foreground">{fr ? "Société" : "Company"}</p><p className="font-medium">{selected.company || "—"}</p></div>
            <div className="col-span-2"><p className="text-xs text-muted-foreground">{fr ? "Date" : "Date"}</p><p className="font-medium">{new Date(selected.created_at).toLocaleString(fr ? "fr-FR" : "en-US")}</p></div>
          </div>
          <div className="pt-2 border-t border-border/40">
            <p className="text-xs text-muted-foreground mb-1">{fr ? "Sujet" : "Subject"}</p>
            <p className="text-sm font-medium text-foreground mb-2">{selected.subject}</p>
            <p className="text-xs text-muted-foreground mb-1">{fr ? "Message" : "Message"}</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selected.message}</p>
          </div>
          <div className="flex gap-2 pt-2 border-t border-border/40">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={async () => {
              await insforge.database.from("contact_messages").update({ status: "read" }).eq("id", selected.id)
              setSelected((p: any) => ({ ...p, status: "read" }))
            }}>
              {fr ? "Marquer lu" : "Mark read"}
            </Button>
            <Button size="sm" variant="ghost" className="gap-1.5 text-xs" onClick={async () => {
              await insforge.database.from("contact_messages").update({ status: "closed" }).eq("id", selected.id)
              setSelected((p: any) => ({ ...p, status: "closed" }))
            }}>
              <X className="size-3.5" />{fr ? "Fermer" : "Close"}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-2 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {["all", "new", "read", "replied", "closed"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${filter === s ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
            {s === "all" ? (fr ? "Tous" : "All") : statusLabels[s] || s}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <Mail className="size-8 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">{fr ? "Aucun message" : "No messages"}</p>
        </div>
      ) : (
        filtered.map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => setSelected(m)}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <Mail className="size-3.5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{m.subject}</p>
                <p className="text-xs text-muted-foreground">{m.contact_number} · {m.full_name || m.email}</p>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[m.status] || ""}`}>{statusLabels[m.status] || m.status}</span>
          </div>
        ))
      )}
    </div>
  )
}

// ── Appointments Admin View ──
function AppointmentsAdminView({ fr, workspace }: { fr: boolean; workspace: any }) {
  const [appointments, setAppointments] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [filter, setFilter] = React.useState("all")
  const [selected, setSelected] = React.useState<any>(null)

  React.useEffect(() => {
    if (!workspace) return
    setLoading(true)
    insforge.database
      .from("appointments")
      .select("*")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => { setAppointments((data as any[]) ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [workspace])

  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    confirmed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    completed: "bg-muted text-muted-foreground",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  }
  const statusLabels: Record<string, string> = {
    pending: fr ? "En attente" : "Pending",
    confirmed: fr ? "Confirmé" : "Confirmed",
    completed: fr ? "Terminé" : "Completed",
    cancelled: fr ? "Annulé" : "Cancelled",
  }
  const typeLabels: Record<string, string> = {
    videoconference: "Visioconférence",
    phone: "Téléphone",
    in_person: "Présentiel",
  }

  const filtered = filter === "all" ? appointments : appointments.filter((a) => a.status === filter)

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>

  if (selected) {
    return (
      <div className="pt-2">
        <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="mb-4 gap-1.5">
          <ChevronLeft className="size-4" />{fr ? "Retour" : "Back"}
        </Button>
        <div className="rounded-lg border border-border/60 p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-xs text-muted-foreground">{fr ? "Rendez-vous" : "Appointment"}</p>
              <p className="text-sm font-mono font-bold text-foreground">{selected.appointment_number}</p>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium ${statusColors[selected.status] || ""}`}>{statusLabels[selected.status] || selected.status}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-muted-foreground">{fr ? "Nom" : "Name"}</p><p className="font-medium">{selected.full_name || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground">Email</p><p className="font-medium">{selected.email || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground">{fr ? "Société" : "Company"}</p><p className="font-medium">{selected.company || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground">{fr ? "Téléphone" : "Phone"}</p><p className="font-medium">{selected.phone || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground">{fr ? "Date" : "Date"}</p><p className="font-medium">{new Date(selected.meeting_date + "T" + selected.meeting_time).toLocaleDateString(fr ? "fr-FR" : "en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p></div>
            <div><p className="text-xs text-muted-foreground">{fr ? "Heure" : "Time"}</p><p className="font-medium">{selected.meeting_time?.slice(0, 5)}</p></div>
            <div><p className="text-xs text-muted-foreground">{fr ? "Type" : "Type"}</p><p className="font-medium">{typeLabels[selected.meeting_type] || selected.meeting_type}</p></div>
            <div><p className="text-xs text-muted-foreground">{fr ? "Motif" : "Purpose"}</p><p className="font-medium capitalize">{selected.purpose}</p></div>
            <div className="col-span-2"><p className="text-xs text-muted-foreground">{fr ? "Créé le" : "Created"}</p><p className="font-medium">{new Date(selected.created_at).toLocaleString(fr ? "fr-FR" : "en-US")}</p></div>
          </div>
          {selected.comments && (
            <div className="pt-2 border-t border-border/40">
              <p className="text-xs text-muted-foreground mb-1">{fr ? "Commentaires" : "Comments"}</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selected.comments}</p>
            </div>
          )}
          <div className="flex gap-2 pt-2 border-t border-border/40">
            {selected.status === "pending" && (
              <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={async () => {
                await insforge.database.from("appointments").update({ status: "confirmed" }).eq("id", selected.id)
                logAudit({ action: "appointment_confirmed", target_id: selected.appointment_number, target_type: "appointment" })
                setSelected((p: any) => ({ ...p, status: "confirmed" }))
                toast.success(fr ? "Rendez-vous confirmé" : "Appointment confirmed")
              }}>
                <Check className="size-3.5" />{fr ? "Confirmer" : "Confirm"}
              </Button>
            )}
            {(selected.status === "pending" || selected.status === "confirmed") && (
              <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-destructive hover:text-destructive" onClick={async () => {
                await insforge.database.from("appointments").update({ status: "cancelled" }).eq("id", selected.id)
                logAudit({ action: "appointment_cancelled", target_id: selected.appointment_number, target_type: "appointment" })
                setSelected((p: any) => ({ ...p, status: "cancelled" }))
                toast.success(fr ? "Rendez-vous annulé" : "Appointment cancelled")
              }}>
                <CalendarX className="size-3.5" />{fr ? "Annuler" : "Cancel"}
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-2 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {["all", "pending", "confirmed", "completed", "cancelled"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${filter === s ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
            {s === "all" ? (fr ? "Tous" : "All") : statusLabels[s] || s}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <CalendarDays className="size-8 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">{fr ? "Aucun rendez-vous" : "No appointments"}</p>
        </div>
      ) : (
        filtered.map((a) => (
          <div key={a.id} className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => setSelected(a)}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <CalendarDays className="size-3.5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{a.full_name} — {a.purpose}</p>
                <p className="text-xs text-muted-foreground">{a.appointment_number} · {new Date(a.meeting_date + "T" + a.meeting_time).toLocaleDateString(fr ? "fr-FR" : "en-US")}</p>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[a.status] || ""} shrink-0`}>{statusLabels[a.status] || a.status}</span>
          </div>
        ))
      )}
    </div>
  )
}
