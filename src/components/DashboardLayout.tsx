import * as React from "react"
import { useAuth } from "@/hooks/use-auth"
import { useRole } from "@/hooks/use-role"
import { useLanguage } from "@/lib/i18n"
import { insforge } from "@/lib/supabase"
import { ROLE_CONFIGS, WORKSPACE_TYPE_LABELS } from "@/lib/role-config"
import { UserAvatar } from "@/components/UserAvatar"
import { LogOut, Menu, X, ChevronRight, Bell, Check, X as XIcon, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Page } from "@/App"
import { useNotifications } from "@/hooks/use-notifications"
import { format } from "date-fns"
import { fr as frLocale, enUS } from "date-fns/locale"

interface DashboardLayoutProps {
  children: React.ReactNode
  onNavigate: (p: Page) => void
  activeTab: string
  setActiveTab: (tab: string) => void
}

export function DashboardLayout({ children, onNavigate, activeTab, setActiveTab }: DashboardLayoutProps) {
  const { user, workspace, signOut } = useAuth()
  const role = useRole()
  const { lang, t } = useLanguage()
  const fr = lang === "fr"
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const [notifOpen, setNotifOpen] = React.useState(false)
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null)

  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications()

  React.useEffect(() => {
    if (!user || !workspace) return
    insforge.database
      .from("workspace_members")
      .select("avatar_url")
      .eq("workspace_id", workspace.id)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setAvatarUrl((data as any)?.avatar_url ?? null))
      .catch(() => {})
  }, [user, workspace])

  if (!role || !workspace) return null

  const config = ROLE_CONFIGS[workspace.type]?.[role.role]
  if (!config) return null

  const menu = config.menu

  const WS_MODULE_IDS = new Set([
    "students", "teachers", "attendance", "payments", "reportCards", "classes", "exams",
    "personnel", "schedule", "grades", "discipline", "incidents",
    "inventory", "sales", "stocks", "orders", "users", "prescriptions", "accounting", "expenses",
    "clients", "factures", "produits", "ventes", "comptabilite",
    "employees", "history", "reports",
    "hr_dashboard", "hr_employees", "hr_recruitment", "hr_attendance", "hr_leave", "hr_absences",
    "hr_contracts", "hr_departments", "hr_orgchart", "hr_training", "hr_evaluations",
    "hr_skills", "hr_promotions", "hr_discipline", "hr_health_safety", "hr_documents",
    "hr_communication", "hr_reports", "hr_audit_log", "hr_settings",
  ])

  const handleNav = (itemId: string) => {
    if (itemId === "members") {
      onNavigate("members")
    } else if (itemId === "settings") {
      onNavigate("settings")
    } else if (itemId === "security") {
      onNavigate("security")
    } else if (itemId === "dashboard" || WS_MODULE_IDS.has(itemId)) {
      setActiveTab(itemId)
    } else {
      setActiveTab(itemId)
    }
    setSidebarOpen(false)
  }

  const handleNotificationClick = (notif: typeof notifications[0]) => {
    if (notif.link) {
      setActiveTab(notif.link)
      markAsRead(notif.id)
    }
    setNotifOpen(false)
  }

  const formatTime = (dateStr: string) => {
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
      return format(date, fr ? "dd/MM/yyyy" : "MM/dd/yyyy", { locale: fr ? frLocale : enUS })
    } catch {
      return ""
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-in fade-in-0" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-64 flex-col transition-all duration-300 ease-out lg:static lg:translate-x-0",
        "bg-sidebar-bg text-sidebar-fg border-r border-sidebar-border",
        sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-5 border-b border-sidebar-border">
          <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-brand-strong shadow-sm">
            <span className="text-sm font-extrabold text-white">S</span>
          </div>
          <span className="text-lg font-extrabold tracking-tight text-white">
            Save<span className="text-brand">Mali</span>
          </span>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden ml-auto text-sidebar-muted hover:text-white transition-colors">
            <X className="size-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-thin">
          {(() => {
            const groups: { label: string; items: typeof menu }[] = []
            let currentGroup: typeof menu = []
            menu.forEach((item, idx) => {
              if (idx === 0 || item.id === "dashboard") {
                if (currentGroup.length > 0) groups.push({ label: "", items: currentGroup })
                currentGroup = [item]
              } else {
                currentGroup.push(item)
              }
            })
            if (currentGroup.length > 0) groups.push({ label: "", items: currentGroup })

            return groups.map((group, gi) => (
              <div key={gi} className="mb-3">
                {group.label && (
                  <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-widest text-sidebar-muted">
                    {group.label}
                  </p>
                )}
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon
                    const isDashActive = activeTab === "dashboard" && item.id === "dashboard"
                    const isModuleActive = activeTab !== "dashboard" && activeTab === item.id
                    const isActive = isDashActive || isModuleActive
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNav(item.id)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                          isActive
                            ? "bg-sidebar-active-bg text-sidebar-active"
                            : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-fg"
                        )}
                      >
                        <Icon className={cn("size-4 shrink-0 transition-colors", isActive && "text-sidebar-active")} />
                        <span className="flex-1 text-left">{item.label[lang]}</span>
                        {isActive && (
                          <span className="flex size-1.5 rounded-full bg-sidebar-active" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          })()}
        </nav>

        {/* User + Logout */}
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
            <UserAvatar
              avatarUrl={avatarUrl}
              name={user?.email?.split("@")[0] ?? ""}
              email={user?.email ?? ""}
              size="sm"
              className="ring-2 ring-brand/30"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-fg truncate">{user?.email?.split("@")[0] ?? user?.email}</p>
              <p className="text-xs text-sidebar-muted">{config.label[lang]}/{WORKSPACE_TYPE_LABELS[workspace.type][lang]}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="mt-1.5 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-muted hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
          >
            <LogOut className="size-4" />
            {fr ? "Déconnexion" : "Sign out"}
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-16 items-center gap-4 border-b border-border bg-card/80 backdrop-blur-md px-4 lg:px-6 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-muted-foreground hover:text-foreground transition-colors">
            <Menu className="size-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-brand-strong shadow-xs">
              <span className="text-xs font-extrabold text-white">S</span>
            </div>
            <span className="text-base font-bold tracking-tight text-foreground hidden sm:block">
              Save<span className="text-brand">Mali</span>
            </span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
                aria-label={fr ? "Notifications" : "Notifications"}
              >
                <Bell className="size-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white shadow-sm">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2">
                  <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/30">
                    <h3 className="text-sm font-semibold text-foreground">
                      {fr ? "Notifications" : "Notifications"}
                    </h3>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button onClick={markAllAsRead} className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium">
                          {fr ? "Tout marquer lu" : "Mark all read"}
                        </button>
                      )}
                      <button onClick={() => setNotifOpen(false)} className="p-1 rounded-md hover:bg-muted transition-colors" aria-label={fr ? "Fermer" : "Close"}>
                        <XIcon className="size-4" />
                      </button>
                    </div>
                  </div>

                  <div className="max-h-[400px] overflow-y-auto">
                    {loading ? (
                      <div className="flex h-32 items-center justify-center">
                        <div className="size-6 animate-spin rounded-full border-2 border-muted border-t-brand" />
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                        <div className="flex size-12 items-center justify-center rounded-full bg-muted mb-3">
                          <Bell className="size-6 text-muted-foreground/50" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">{fr ? "Aucune notification" : "No notifications"}</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">{fr ? "Vous serez notifié des activités importantes" : "You'll be notified of important activities"}</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border/50">
                        {notifications.map((notif) => (
                          <button key={notif.id} onClick={() => handleNotificationClick(notif)} className={cn("w-full px-4 py-3.5 text-left transition-colors hover:bg-muted/30", !notif.read && "bg-muted/20")}>
                            <div className="flex items-start gap-3">
                              <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg",
                                notif.type === "sale" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                                notif.type === "payment" && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                                notif.type === "stock_alert" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                                notif.type === "member" && "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
                                notif.type === "invoice" && "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
                                notif.type === "accounting" && "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
                                notif.type === "order" && "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
                                notif.type === "grade" && "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
                                notif.type === "attendance" && "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
                                notif.type === "expense" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                                notif.type === "report" && "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
                                !["sale","payment","stock_alert","member","invoice","accounting","order","grade","attendance","expense","report"].includes(notif.type) && "bg-muted text-muted-foreground"
                              )}>
                                {notif.type === "sale" && <ExternalLink className="size-4" />}
                                {notif.type === "payment" && <Bell className="size-4" />}
                                {notif.type === "stock_alert" && <XIcon className="size-4" />}
                                {notif.type === "member" && <Check className="size-4" />}
                                {notif.type === "invoice" && <Check className="size-4" />}
                                {notif.type === "accounting" && <Bell className="size-4" />}
                                {notif.type === "order" && <ExternalLink className="size-4" />}
                                {notif.type === "grade" && <Check className="size-4" />}
                                {notif.type === "attendance" && <Check className="size-4" />}
                                {notif.type === "expense" && <XIcon className="size-4" />}
                                {notif.type === "report" && <Bell className="size-4" />}
                                {!["sale","payment","stock_alert","member","invoice","accounting","order","grade","attendance","expense","report"].includes(notif.type) && <Bell className="size-4" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={cn("text-sm", !notif.read ? "font-semibold text-foreground" : "font-medium text-foreground/90")}>{notif.title}</p>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <span className="text-[10px] text-muted-foreground">{formatTime(notif.created_at)}</span>
                                  {notif.actor_name && <span className="text-[10px] text-muted-foreground/60">· {notif.actor_name}</span>}
                                </div>
                              </div>
                              {!notif.read && <span className="size-2 rounded-full bg-brand shrink-0 mt-1.5 shadow-sm" />}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            {/* User profile in header */}
            <div className="flex items-center gap-2.5 pl-3 border-l border-border">
              <UserAvatar
                avatarUrl={avatarUrl}
                name={user?.email?.split("@")[0] ?? ""}
                email={user?.email ?? ""}
                size="sm"
                className="ring-2 ring-brand/30"
              />
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-foreground">{user?.email?.split("@")[0] ?? workspace.name}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Welcome Banner */}
        <div className="border-b border-border bg-gradient-to-r from-brand/5 via-brand/[0.07] to-transparent px-4 lg:px-6 py-4">
          <h1 className="text-lg font-bold text-foreground tracking-tight">
            {t.dashboard.welcomeTitle.replace("{name}", user?.email?.split("@")[0] ?? "")}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {(() => {
              const wsType = workspace?.type
              const greetings: Record<string, { fr: string; en: string }> = {
                pharmacy: { fr: "Gérez votre pharmacie en toute sérénité", en: "Manage your pharmacy with confidence" },
                commerce: { fr: "Gérez votre commerce facilement", en: "Manage your shop with ease" },
                education: { fr: "Gérez votre établissement scolaire", en: "Manage your school efficiently" },
                gestion: { fr: "Gérez votre entreprise intelligemment", en: "Manage your business smartly" },
                hr: { fr: "Gérez vos ressources humaines", en: "Manage your human resources" },
              }
              const msg = wsType ? greetings[wsType] : { fr: "Bienvenue sur SaveMali", en: "Welcome to SaveMali" }
              return msg[lang]
            })()} — {format(new Date(), "d MMMM yyyy", { locale: fr ? frLocale : enUS })}
          </p>
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="animate-fade-in-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
