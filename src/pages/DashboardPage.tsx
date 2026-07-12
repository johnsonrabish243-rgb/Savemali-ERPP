import * as React from "react"
import { useAuth } from "@/hooks/use-auth"
import { useRole } from "@/hooks/use-role"
import { useLanguage } from "@/lib/i18n"
import { insforge } from "@/lib/supabase"
import { trackModuleOpen } from "@/lib/context-tracker"
import { DashboardLayout } from "@/components/DashboardLayout"
import { RoleDashboard } from "@/components/RoleDashboard"
import { EmployeeDashboard } from "@/components/EmployeeDashboard"
import { SuperAdminDashboard } from "@/components/SuperAdminDashboard"
import { PageFooter } from "@/components/PageFooter"
import { PharmacyProvider } from "@/hooks/use-pharmacy"
import { ReportsPage } from "@/pages/ReportsPage"
import type { Page } from "@/App"

const EducationPage = React.lazy(() => import("@/pages/EducationPage").then(m => ({ default: m.EducationPage })))
const PharmacyPage = React.lazy(() => import("@/pages/PharmacyPage").then(m => ({ default: m.PharmacyPage })))
const CommercePage = React.lazy(() => import("@/pages/CommercePage").then(m => ({ default: m.CommercePage })))
const GestionPage = React.lazy(() => import("@/pages/GestionPage").then(m => ({ default: m.GestionPage })))
const HRPage = React.lazy(() => import("@/pages/HRPage").then(m => ({ default: m.HRPage })))

const WS_MODULE: Record<string, React.LazyExoticComponent<any>> = {
  education: EducationPage,
  pharmacy: PharmacyPage,
  commerce: CommercePage,
  gestion: GestionPage,
  hr: HRPage,
}

interface Props {
  onNavigate: (p: Page) => void
}

export function DashboardPage({ onNavigate }: Props) {
  const { workspace, user, isOwner, signOut, loading: authLoading } = useAuth()
  const role = useRole()
  const { lang } = useLanguage()
  const fr = lang === "fr"
  const [activeTab, setActiveTab] = React.useState("dashboard")

  const isAdmin = role.role === "admin"
  const isSuperAdmin = user?.email === "johnmoket5@gmail.com"

  React.useEffect(() => {
    if (!workspace) return
    trackModuleOpen("dashboard")
    if (workspace.type) {
      trackModuleOpen(workspace.type)
    }
  }, [workspace])

  // Periodic suspension check — every 30s, verify member is still active
  React.useEffect(() => {
    if (!workspace || isOwner || !user) return
    const checkStatus = async () => {
      try {
        const { data } = await insforge.database
          .from("workspace_members")
          .select("status")
          .eq("workspace_id", workspace.id)
          .eq("user_id", user.id)
          .maybeSingle()
        if (data && (data as any).status !== "active") {
          await signOut()
          window.location.href = "/"
        }
      } catch { /* ignore transient errors */ }
    }
    checkStatus()
    const interval = setInterval(checkStatus, 30_000)
    return () => clearInterval(interval)
  }, [workspace, user, isOwner, signOut])

  if (authLoading || role.loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="size-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
          <p className="text-sm text-muted-foreground font-medium">{fr ? "Chargement..." : "Loading..."}</p>
        </div>
      </div>
    )
  }

  if (!workspace) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-muted-foreground font-medium">{fr ? "Aucun espace de travail trouvé. Redirection..." : "No workspace found. Redirecting..."}</p>
        </div>
      </div>
    )
  }

  const ModulePage = workspace ? WS_MODULE[workspace.type] : null
  const isHRTab = activeTab.startsWith("hr_")
  const isModuleTab = activeTab !== "dashboard" && activeTab !== "reports" && !isHRTab && ModulePage
  const isReportsTab = activeTab === "reports"

  return (
    <div className="flex min-h-svh flex-col">
      <DashboardLayout onNavigate={onNavigate} activeTab={activeTab} setActiveTab={setActiveTab}>
        {activeTab === "dashboard" && (
          isSuperAdmin ? <SuperAdminDashboard onNavigate={onNavigate} /> :
          isAdmin ? <RoleDashboard /> : <EmployeeDashboard workspaceType={workspace?.type ?? "gestion"} role={role.role} onNavigateToTab={setActiveTab} />
        )}
        {isReportsTab && (
          <ReportsPage onNavigate={onNavigate} />
        )}
        {isModuleTab && (
          <React.Suspense fallback={
            <div className="flex h-64 items-center justify-center">
              <div className="size-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
            </div>
          }>
            {workspace?.type === "pharmacy" ? (
              <PharmacyProvider>
                <ModulePage onNavigate={onNavigate} initialTab={activeTab} />
              </PharmacyProvider>
            ) : (
              <ModulePage onNavigate={onNavigate} initialTab={activeTab} />
            )}
          </React.Suspense>
        )}
        {isHRTab && (
          <React.Suspense fallback={
            <div className="flex h-64 items-center justify-center">
              <div className="size-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
            </div>
          }>
            <HRPage onNavigate={onNavigate} initialTab={activeTab} />
          </React.Suspense>
        )}
      </DashboardLayout>
      <PageFooter onNavigate={onNavigate} />
    </div>
  )
}
