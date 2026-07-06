import * as React from "react"
import { Menu, Globe, LogOut, LayoutDashboard, Settings } from "lucide-react"
import { useLanguage } from "@/lib/i18n"
import { insforge } from "@/lib/supabase"
import { ModeToggle } from "@/components/mode-toggle"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Logo } from "@/components/Logo"
import { UserAvatar } from "@/components/UserAvatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"
import type { Page } from "@/App"

interface NavProps {
  currentPage: Page
  onNavigate: (page: Page) => void
}

const PUBLIC_PAGES: Page[] = ["home", "about", "contact", "landing-education", "landing-pharmacy", "landing-commerce", "landing-gestion", "privacy", "terms"]

export function Navbar({ currentPage, onNavigate }: NavProps) {
  const { t, lang, setLang } = useLanguage()
  const { user, workspace, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null)
  const isPublic = PUBLIC_PAGES.includes(currentPage)

  // Fetch avatar
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

  const handleNav = (page: Page) => {
    onNavigate(page)
    setMobileOpen(false)
  }

  const handleSignOut = async () => {
    await signOut()
    handleNav("home")
  }

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full backdrop-blur-md transition-all duration-300",
      isPublic
        ? "border-b border-white/10 bg-surface-dark/80 supports-[backdrop-filter]:bg-surface-dark/60"
        : "border-b border-border bg-surface/95 supports-[backdrop-filter]:bg-surface/80"
    )}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">

        <button onClick={() => handleNav("home")} className="flex shrink-0 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md" aria-label="SaveMali home">
          <Logo />
        </button>

        <div className="flex items-center gap-1">
          {/* Language */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn(
                "inline-flex items-center gap-1.5 rounded-sm px-2 py-1.5 text-sm font-medium transition-colors",
                isPublic ? "text-white/70 hover:text-white hover:bg-white/10" : "text-foreground hover:bg-muted"
              )}>
                <Globe className="size-4" /><span className="hidden font-semibold uppercase sm:inline">{lang}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLang("fr")} className="gap-2"><span>🇫🇷</span><span>Français</span>{lang === "fr" && <span className="ml-auto text-xs text-accent">actif</span>}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLang("en")} className="gap-2"><span>🇬🇧</span><span>English</span>{lang === "en" && <span className="ml-auto text-xs text-accent">active</span>}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <ModeToggle isPublic={isPublic} />

          {/* Auth — desktop */}
          <div className="hidden items-center gap-2 md:flex">
            {isPublic && <div className="mx-1 h-5 w-px bg-white/20" />}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={cn(
                    "inline-flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm font-medium transition-colors",
                    isPublic ? "text-white/70 hover:text-white hover:bg-white/10" : "text-foreground hover:bg-muted"
                  )}>
                    <UserAvatar
                      avatarUrl={avatarUrl}
                      name={user?.email?.split("@")[0] ?? ""}
                      email={user?.email ?? ""}
                      size="sm"
                      className="size-6"
                    />
                    <span className="text-xs font-medium max-w-[100px] truncate">{user.email}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => handleNav("dashboard")} className="gap-2"><LayoutDashboard className="size-4" />{lang === "fr" ? "Tableau de bord" : "Dashboard"}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleNav("settings")} className="gap-2"><Settings className="size-4" />{lang === "fr" ? "Paramètres" : "Settings"}</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="gap-2 text-destructive focus:text-destructive"><LogOut className="size-4" />{lang === "fr" ? "Se déconnecter" : "Sign out"}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <button
                  className={cn(
                    "inline-flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors",
                    isPublic ? "text-white/70 hover:text-white hover:bg-white/10" : "text-foreground hover:bg-muted"
                  )}
                  onClick={() => handleNav("signin")}
                >
                  {t.nav.login}
                </button>
                <button
                  className="ag-btn-brand px-4 py-1.5 text-sm"
                  onClick={() => handleNav("signup")}
                >
                  {t.nav.signup}
                </button>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button className={cn(
                "inline-flex items-center justify-center rounded-sm p-1.5 transition-colors md:hidden",
                isPublic ? "text-white/70 hover:text-white hover:bg-white/10" : "text-foreground hover:bg-muted"
              )} aria-label="Open menu"><Menu className="size-5" /></button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-surface-dark p-0 border-white/10">
              <div className="flex flex-col h-full">
                <div className="flex items-center px-5 py-4 border-b border-white/10">
                  <Logo />
                </div>
                <div className="flex-1" />
                <div className="border-t border-white/10 p-4 flex flex-col gap-2">
                  {user ? (
                    <>
                      <div className="flex items-center gap-2 px-1 py-1">
                        <UserAvatar
                          avatarUrl={avatarUrl}
                          name={user?.email?.split("@")[0] ?? ""}
                          email={user?.email ?? ""}
                          size="sm"
                          className="size-7"
                        />
                        <span className="text-xs text-white/50 truncate">{user.email}</span>
                      </div>
                      <button className="ag-btn-ghost w-full justify-start border-white/10 text-white hover:bg-white/10" onClick={() => handleNav("dashboard")}><LayoutDashboard className="size-4" />{lang === "fr" ? "Tableau de bord" : "Dashboard"}</button>
                      <button className="ag-btn-ghost w-full justify-start border-white/10 text-white hover:bg-white/10" onClick={() => handleNav("settings")}><Settings className="size-4" />{lang === "fr" ? "Paramètres" : "Settings"}</button>
                      <button className="ag-btn-ghost w-full justify-start border-white/10 text-red-400 hover:bg-red-500/10" onClick={handleSignOut}><LogOut className="size-4" />{lang === "fr" ? "Se déconnecter" : "Sign out"}</button>
                    </>
                  ) : (
                    <>
                      <button className="ag-btn-ghost w-full border-white/10 text-white hover:bg-white/10" onClick={() => handleNav("signin")}>{t.nav.login}</button>
                      <button className="ag-btn-brand w-full" onClick={() => handleNav("signup")}>{t.nav.signup}</button>
                    </>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
