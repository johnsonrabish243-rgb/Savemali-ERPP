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
  const { lang } = useLanguage()
  const fr = lang === "fr"
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const [notifOpen, setNotifOpen] = React.useState(false)
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null)

  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications()

  // Fetch current user's avatar
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
  ])

  const handleNav = (itemId: string) => {
    if (itemId === "members") {
      onNavigate("members")
    } else if (itemId === "settings") {
      onNavigate("settings")
    } else if (itemId === "security") {
      onNavigate("security")
    } else if (itemId === "habits") {
      onNavigate("habits")
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
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-64 flex-col transition-transform duration-200 lg:static lg:translate-x-0",
        "bg-[#1e293b] text-[#e2e8f0]",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-5 border-b border-white/10">
          <div className="flex size-9 items-center justify-center rounded-lg bg-[#f97316]">
            <span className="text-sm font-extrabold text-white">S</span>
          </div>
          <span className="text-lg font-extrabold tracking-tight text-white">
            Save<span className="text-[#f97316]">Mali</span>
          </span>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden ml-auto text-[#94a3b8] hover:text-white">
            <X className="size-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {(() => {
            // Group menu items by category
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
              <div key={gi} className="mb-4">
                {group.label && (
                  <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#64748b]">
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
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                          isActive
                            ? "bg-[#f97316]/15 text-[#f97316]"
                            : "text-[#94a3b8] hover:bg-white/5 hover:text-white"
                        )}
                      >
                        <Icon className={cn("size-4 shrink-0", isActive && "text-[#f97316]")} />
                        <span className="flex-1 text-left">{item.label[lang]}</span>
                        {isActive && <ChevronRight className="size-3.5 shrink-0 text-[#f97316]" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          })()}
        </nav>

        {/* User + Logout */}
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <UserAvatar
              avatarUrl={avatarUrl}
              name={user?.email?.split("@")[0] ?? ""}
              email={user?.email ?? ""}
              size="sm"
              className="ring-2 ring-[#f97316]/30"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.email?.split("@")[0] ?? user?.email}</p>
              <p className="text-xs text-[#64748b]">{config.label[lang]}/{WORKSPACE_TYPE_LABELS[workspace.type][lang]}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[#94a3b8] hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut className="size-4" />
            {fr ? "Déconnexion" : "Sign out"}
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-16 items-center gap-4 border-b border-border bg-[#1e293b] px-4 lg:px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-[#94a3b8] hover:text-white">
            <Menu className="size-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-[#f97316]">
              <span className="text-xs font-extrabold text-white">S</span>
            </div>
            <span className="text-base font-extrabold tracking-tight text-white hidden sm:block">
              Save<span className="text-[#f97316]">Mali</span>
            </span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative rounded-lg p-2 text-[#94a3b8] hover:bg-white/10 hover:text-white transition-colors"
                aria-label={fr ? "Notifications" : "Notifications"}
              >
                <Bell className="size-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f97316] text-[10px] font-medium text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50 animate-in fade-in-0 zoom-in-95">
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <h3 className="text-sm font-semibold text-foreground">
                      {fr ? "Notifications" : "Notifications"}
                    </h3>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button onClick={markAllAsRead} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                          {fr ? "Tout marquer lu" : "Mark all read"}
                        </button>
                      )}
                      <button onClick={() => setNotifOpen(false)} className="p-1 rounded hover:bg-muted transition-colors" aria-label={fr ? "Fermer" : "Close"}>
                        <XIcon className="size-4" />
                      </button>
                    </div>
                  </div>

                  <div className="max-h-[400px] overflow-y-auto">
                    {loading ? (
                      <div className="flex h-32 items-center justify-center">
                        <div className="size-6 animate-spin rounded-full border-2 border-border border-t-primary" />
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                        <Bell className="size-10 text-muted-foreground/50 mb-2" />
                        <p className="text-sm text-muted-foreground">{fr ? "Aucune notification" : "No notifications"}</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {notifications.map((notif) => (
                          <button key={notif.id} onClick={() => handleNotificationClick(notif)} className={cn("w-full px-4 py-3 text-left transition-colors hover:bg-muted/50", !notif.read && "bg-muted/30")}>
                            <div className="flex items-start gap-3">
                              <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg",
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
                                <p className={cn("text-sm font-medium", !notif.read && "font-semibold")}>{notif.title}</p>
                                <p className="text-xs text-muted-foreground truncate mt-0.5">{notif.message}</p>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <span className="text-[10px] text-muted-foreground">{formatTime(notif.created_at)}</span>
                                  {notif.actor_name && <span className="text-[10px] text-muted-foreground/70">· {notif.actor_name}</span>}
                                </div>
                              </div>
                              {!notif.read && <div className="size-2 rounded-full bg-primary flex-shrink-0 mt-1" />}
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
            <div className="flex items-center gap-2.5 pl-3 border-l border-white/10">
              <UserAvatar
                avatarUrl={avatarUrl}
                name={user?.email?.split("@")[0] ?? ""}
                email={user?.email ?? ""}
                size="sm"
                className="ring-2 ring-[#f97316]/30"
              />
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-white">{user?.email?.split("@")[0] ?? workspace.name}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
