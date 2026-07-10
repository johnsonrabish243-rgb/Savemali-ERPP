import * as React from "react"
import { Menu, Globe, LogOut, LayoutDashboard, Settings } from "lucide-react"
import { useLanguage } from "@/lib/i18n"
import { insforge } from "@/lib/supabase"
import { ModeToggle } from "@/components/mode-toggle"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Logo } from "@/components/Logo"
import { UserAvatar } from "@/components/UserAvatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
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
      "sticky top-0 z-50 w-full transition-all duration-300",
      isPublic
        ? "border-b border-white/[0.06] bg-[#0b1120]/90 backdrop-blur-xl"
        : "border-b border-border bg-card/90 backdrop-blur-xl"
    )}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        <button onClick={() => handleNav("home")} className="flex shrink-0 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg" aria-label="SaveMali home">
          <Logo />
        </button>

        <div className="flex items-center gap-1.5">
          {/* Language */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-all duration-200",
                isPublic ? "text-white/60 hover:text-white hover:bg-white/[0.06]" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}>
                <Globe className="size-4" />
                <span className="hidden font-semibold uppercase sm:inline text-xs tracking-wider">{lang}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[140px]">
              <DropdownMenuItem onClick={() => setLang("fr")} className="gap-2">
                <span className="text-base">🇫🇷</span>
                <span>Français</span>
                {lang === "fr" && <span className="ml-auto text-xs font-medium text-brand">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLang("en")} className="gap-2">
                <span className="text-base">🇬🇧</span>
                <span>English</span>
                {lang === "en" && <span className="ml-auto text-xs font-medium text-brand">✓</span>}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <ModeToggle isPublic={isPublic} />

          {/* Auth — desktop */}
          <div className="hidden items-center gap-2 md:flex">
            {isPublic && <div className="mx-1 h-5 w-px bg-white/[0.08]" />}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-all duration-200",
                    isPublic ? "text-white/60 hover:text-white hover:bg-white/[0.06]" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}>
                    <UserAvatar
                      avatarUrl={avatarUrl}
                      name={user?.email?.split("@")[0] ?? ""}
                      email={user?.email ?? ""}
                      size="sm"
                      className="size-6 ring-1 ring-border"
                    />
                    <span className="text-xs font-medium max-w-[120px] truncate hidden sm:block">{user.email?.split("@")[0]}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => handleNav("dashboard")} className="gap-2">
                    <LayoutDashboard className="size-4" />
                    {lang === "fr" ? "Tableau de bord" : "Dashboard"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleNav("settings")} className="gap-2">
                    <Settings className="size-4" />
                    {lang === "fr" ? "Paramètres" : "Settings"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="gap-2 text-destructive focus:text-destructive">
                    <LogOut className="size-4" />
                    {lang === "fr" ? "Se déconnecter" : "Sign out"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "rounded-full",
                    isPublic ? "text-white/70 hover:text-white hover:bg-white/[0.06]" : ""
                  )}
                  onClick={() => handleNav("signin")}
                >
                  {t.nav.login}
                </Button>
                <Button
                  size="sm"
                  className="rounded-full shadow-sm"
                  onClick={() => handleNav("signup")}
                >
                  {t.nav.signup}
                </Button>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button className={cn(
                "inline-flex items-center justify-center rounded-lg p-2 transition-colors md:hidden",
                isPublic ? "text-white/60 hover:text-white hover:bg-white/[0.06]" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )} aria-label="Open menu">
                <Menu className="size-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-[#0b1120] p-0 border-white/[0.06]">
              <div className="flex flex-col h-full">
                <div className="flex items-center px-5 py-4 border-b border-white/[0.06]">
                  <Logo />
                </div>
                <div className="flex-1" />
                <div className="border-t border-white/[0.06] p-4 flex flex-col gap-2">
                  {user ? (
                    <>
                      <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
                        <UserAvatar
                          avatarUrl={avatarUrl}
                          name={user?.email?.split("@")[0] ?? ""}
                          email={user?.email ?? ""}
                          size="sm"
                          className="size-8 ring-1 ring-white/10"
                        />
                        <div>
                          <p className="text-sm font-medium text-white">{user.email?.split("@")[0]}</p>
                          <p className="text-xs text-white/40">{user.email}</p>
                        </div>
                      </div>
                      <Button variant="ghost" className="w-full justify-start text-white/60 hover:text-white hover:bg-white/[0.06]" onClick={() => handleNav("dashboard")}>
                        <LayoutDashboard className="size-4" />
                        {lang === "fr" ? "Tableau de bord" : "Dashboard"}
                      </Button>
                      <Button variant="ghost" className="w-full justify-start text-white/60 hover:text-white hover:bg-white/[0.06]" onClick={() => handleNav("settings")}>
                        <Settings className="size-4" />
                        {lang === "fr" ? "Paramètres" : "Settings"}
                      </Button>
                      <div className="h-px bg-white/[0.06] my-1" />
                      <Button variant="ghost" className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={handleSignOut}>
                        <LogOut className="size-4" />
                        {lang === "fr" ? "Se déconnecter" : "Sign out"}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="ghost" className="w-full rounded-full text-white/60 hover:text-white hover:bg-white/[0.06]" onClick={() => handleNav("signin")}>
                        {t.nav.login}
                      </Button>
                      <Button className="w-full rounded-full" onClick={() => handleNav("signup")}>
                        {t.nav.signup}
                      </Button>
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
