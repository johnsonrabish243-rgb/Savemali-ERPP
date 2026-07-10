import * as React from "react"
import { LanguageProvider, useLanguage } from "@/lib/i18n"
import { AuthProvider, useAuth } from "@/hooks/use-auth"
import { PharmacyProvider } from "@/hooks/use-pharmacy"
import { Navbar } from "@/components/Navbar"
import { PredictiveBar } from "@/components/PredictiveBar"
import { PredictiveProvider, usePredictiveContext } from "@/hooks/use-predictive-context"
import { trackPageView } from "@/lib/context-tracker"
import { Toaster } from "@/components/ui/sonner"
import { fetchExchangeRate } from "@/lib/currency"
import { LoadingScreen } from "@/components/LoadingScreen"
import { isUserLockedOut } from "@/hooks/use-security"
import { useAbuseProtection } from "@/hooks/use-abuse-protection"
import { SecurityBlockPage } from "@/pages/SecurityBlockPage"

const HomePage = React.lazy(() => import("@/pages/HomePage").then(m => ({ default: m.HomePage })))
const EducationPage = React.lazy(() => import("@/pages/EducationPage").then(m => ({ default: m.EducationPage })))
const PharmacyPage = React.lazy(() => import("@/pages/PharmacyPage").then(m => ({ default: m.PharmacyPage })))
const CommercePage = React.lazy(() => import("@/pages/CommercePage").then(m => ({ default: m.CommercePage })))
const GestionPage = React.lazy(() => import("@/pages/GestionPage").then(m => ({ default: m.GestionPage })))
const HRPage = React.lazy(() => import("@/pages/HRPage").then(m => ({ default: m.HRPage })))
const DashboardPage = React.lazy(() => import("@/pages/DashboardPage").then(m => ({ default: m.DashboardPage })))
const WorkspaceMembersPage = React.lazy(() => import("@/pages/WorkspaceMembersPage").then(m => ({ default: m.WorkspaceMembersPage })))
const ReportsPage = React.lazy(() => import("@/pages/ReportsPage").then(m => ({ default: m.ReportsPage })))
const SignInPage = React.lazy(() => import("@/pages/SignInPage").then(m => ({ default: m.SignInPage })))
const SignUpPage = React.lazy(() => import("@/pages/SignUpPage").then(m => ({ default: m.SignUpPage })))
const PrivacyPage = React.lazy(() => import("@/pages/PrivacyPage").then(m => ({ default: m.PrivacyPage })))
const TermsPage = React.lazy(() => import("@/pages/TermsPage").then(m => ({ default: m.TermsPage })))
const RestrictedPage = React.lazy(() => import("@/pages/RestrictedPage").then(m => ({ default: m.RestrictedPage })))
const EducationLandingPage = React.lazy(() => import("@/pages/EducationLandingPage").then(m => ({ default: m.EducationLandingPage })))
const PharmacyLandingPage = React.lazy(() => import("@/pages/PharmacyLandingPage").then(m => ({ default: m.PharmacyLandingPage })))
const CommerceLandingPage = React.lazy(() => import("@/pages/CommerceLandingPage").then(m => ({ default: m.CommerceLandingPage })))
const GestionLandingPage = React.lazy(() => import("@/pages/GestionLandingPage").then(m => ({ default: m.GestionLandingPage })))
const HRLandingPage = React.lazy(() => import("@/pages/HRLandingPage").then(m => ({ default: m.HRLandingPage })))
const AboutPage = React.lazy(() => import("@/pages/AboutPage").then(m => ({ default: m.AboutPage })))
const ContactPage = React.lazy(() => import("@/pages/ContactPage").then(m => ({ default: m.ContactPage })))
const SettingsPage = React.lazy(() => import("@/pages/SettingsPage").then(m => ({ default: m.SettingsPage })))
const SecurityDashboardPage = React.lazy(() => import("@/pages/SecurityDashboardPage").then(m => ({ default: m.SecurityDashboardPage })))
const HabitTrackerPage = React.lazy(() => import("@/pages/HabitTrackerPage").then(m => ({ default: m.HabitTrackerPage })))
const LockoutPage = React.lazy(() => import("@/pages/LockoutPage").then(m => ({ default: m.LockoutPage })))
const AccessDeniedPage = React.lazy(() => import("@/pages/AccessDeniedPage").then(m => ({ default: m.AccessDeniedPage })))
const ResetPasswordPage = React.lazy(() => import("@/pages/ResetPasswordPage").then(m => ({ default: m.ResetPasswordPage })))
const CreateWorkspacePage = React.lazy(() => import("@/pages/CreateWorkspacePage").then(m => ({ default: m.CreateWorkspacePage })))

const SavemaliWidget = React.lazy(() => import("@/components/SavemaliWidget").then(m => ({ default: m.SavemaliWidget })))

export type Page =
  | "home" | "education" | "pharmacy" | "commerce" | "gestion" | "hr"
  | "dashboard" | "signin" | "signup" | "members" | "reports"
  | "privacy" | "terms" | "restricted" | "settings"
  | "landing-education" | "landing-pharmacy" | "landing-commerce" | "landing-gestion" | "landing-hr"
  | "about" | "contact" | "security" | "habits" | "access-denied" | "reset-password" | "create-workspace"

const NO_NAV_PAGES: Page[] = ["dashboard", "signin", "signup", "members", "reports", "restricted", "settings", "security", "habits", "access-denied", "reset-password", "create-workspace"]

const WS_PAGE_MAP: Record<string, Page> = {
  education: "education",
  pharmacy: "pharmacy",
  commerce: "commerce",
  gestion: "gestion",
  hr: "hr",
}

function AppContent() {
  const [page, setPage] = React.useState<Page>(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("invite")) {
      window.history.replaceState({}, "", window.location.pathname)
      return "signup"
    }
    if (params.get("verify_email")) {
      return "signin"
    }
    const saved = localStorage.getItem("savemali_current_page")
    if (saved && (saved as Page)) return saved as Page
    return "home"
  })
  const { user, workspace, loading, signOut, emailVerified, checkAuth } = useAuth()
  const { setCurrentPage } = usePredictiveContext()
  const { lang } = useLanguage()
  const [showLoading, setShowLoading] = React.useState(true)
  const [lockedOut, setLockedOut] = React.useState(() => isUserLockedOut())
  const { isBlocked, remainingMs, status, resetProtection } = useAbuseProtection()

  // Check lockout periodically (every 30s) for auto-reactivation
  React.useEffect(() => {
    const interval = setInterval(() => {
      const isLocked = isUserLockedOut()
      setLockedOut(isLocked)
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  React.useEffect(() => {
    fetchExchangeRate().catch(() => {})
  }, [])

  const handleNavigate = React.useCallback((target: Page) => {
    // Workspace isolation: block access to other workspace module pages
    if (workspace && user) {
      const targetWsType = Object.entries(WS_PAGE_MAP).find(([, p]) => p === target)?.[0]
      if (targetWsType && targetWsType !== workspace.type) {
        setPage("access-denied")
        setCurrentPage("access-denied")
        trackPageView("access-denied")
        // Auto-redirect to dashboard after 3s
        setTimeout(() => { setPage("dashboard"); setCurrentPage("dashboard") }, 3000)
        return
      }
    }
    setPage(target)
    setCurrentPage(target)
    trackPageView(target)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [setCurrentPage, workspace, user])

  const handleLoadingDone = React.useCallback(() => {
    setShowLoading(false)
  }, [])

  // Save current page to localStorage for session persistence
  React.useEffect(() => {
    if (page !== "signin" && page !== "signup") {
      localStorage.setItem("savemali_current_page", page)
    }
  }, [page])

  React.useEffect(() => {
    if (!loading && user && page === "signin") {
      setPage("dashboard")
    }
    if (!loading && !user && !["home", "signin", "signup", "about", "contact", "privacy", "terms", "reset-password", "landing-education", "landing-pharmacy", "landing-commerce", "landing-gestion", "landing-hr"].includes(page)) {
      setPage("home")
    }
    // If user is logged in but has no workspace, redirect to workspace creation
    if (!loading && user && !workspace && page !== "create-workspace" && page !== "signup" && page !== "signin") {
      setPage("create-workspace")
    }
  }, [user, loading, page, workspace])

  const showNav = !NO_NAV_PAGES.includes(page)

  if (showLoading) {
    return <LoadingScreen onDone={handleLoadingDone} />
  }

  // Lockout screen
  if (lockedOut) {
    return (
      <React.Suspense fallback={null}>
        <LockoutPage
          until={Number(localStorage.getItem("savemali_lockout_until")) || Date.now()}
          remainingHours={Math.ceil(((Number(localStorage.getItem("savemali_lockout_until")) || Date.now()) - Date.now()) / 3600000)}
        />
      </React.Suspense>
    )
  }

  // Abuse protection screen (skip for logged-in users to prevent false lockouts)
  if (isBlocked && !user) {
    return (
      <SecurityBlockPage
        remainingMs={remainingMs}
        reason={status.reason}
        lockoutLevel={status.lockoutLevel}
        onBack={resetProtection}
      />
    )
  }

  // Email verification: handled on SignInPage only (single verification point)

  // If auth resolved but no user and page requires auth, redirect to home (prevents white screen)
  const PUBLIC_PAGES: Page[] = ["home", "signin", "signup", "about", "contact", "privacy", "terms", "reset-password", "landing-education", "landing-pharmacy", "landing-commerce", "landing-gestion", "landing-hr"]
  if (!loading && !user && !PUBLIC_PAGES.includes(page)) {
    setPage("home")
    return null
  }

  if (loading) {
    return (
      <div
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
        style={{ background: "linear-gradient(160deg, #0a0a0a 0%, #1a1025 50%, #0a0a0a 100%)" }}
      >
        <div className="absolute w-[300px] h-[300px] rounded-full blur-[120px] opacity-20" style={{ background: "radial-gradient(circle, #c8399c 0%, transparent 70%)" }} />
        <div className="relative z-10 flex flex-col items-center">
          <div className="mb-6" style={{ animation: "splash-logo-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
            <div className="w-20 h-20 rounded-[32%] overflow-hidden shadow-2xl bg-gradient-to-br from-orange-500 to-orange-700">
              <img src="/SaveMali_Logo.png" alt="SaveMali" className="h-full w-full object-cover" />
            </div>
          </div>
          <div className="w-48 flex flex-col items-center gap-3">
            <div className="relative w-full h-[2px] overflow-hidden rounded-full bg-white/10">
              <div className="absolute top-0 left-0 h-full w-[40%] rounded-full bg-gradient-to-r from-[#c8399c] to-[#7c3aed]" style={{ animation: "loading-sweep-auth 1.4s ease-in-out infinite" }} />
            </div>
            <p className="text-[11px] text-white/30" style={{ animation: "pulse 2s ease-in-out infinite" }}>
              {lang === "fr" ? "Connexion..." : "Connecting..."}
            </p>
          </div>
        </div>
        <style>{`
          @keyframes splash-logo-in { 0% { opacity: 0; transform: scale(0.8) translateY(12px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
          @keyframes loading-sweep-auth { 0% { left: -40%; } 100% { left: 100%; } }
        `}</style>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-background text-foreground">
      {showNav && <Navbar currentPage={page} onNavigate={handleNavigate} />}
      {showNav && <PredictiveBar onNavigate={handleNavigate} />}
      <React.Suspense fallback={
        <div className="flex min-h-svh items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <div className="size-10 animate-spin rounded-full border-[3px] border-muted border-t-brand" />
            <div className="flex flex-col items-center gap-1">
              <p className="text-sm font-medium text-muted-foreground">SaveMali</p>
              <div className="w-32 h-[2px] overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[40%] rounded-full bg-gradient-to-r from-transparent via-brand to-transparent animate-loading-bar" />
              </div>
            </div>
          </div>
        </div>
      }>
        <div key={page} className="animate-fade-in-up">
          {page === "home" && <HomePage onNavigate={handleNavigate} />}
        {page === "education" && <EducationPage onNavigate={handleNavigate} />}
        {page === "pharmacy" && <PharmacyProvider><PharmacyPage onNavigate={handleNavigate} /></PharmacyProvider>}
        {page === "commerce" && <CommercePage onNavigate={handleNavigate} />}
        {page === "gestion" && <GestionPage onNavigate={handleNavigate} />}
        {page === "hr" && <HRPage onNavigate={handleNavigate} />}
        {page === "dashboard" && <DashboardPage onNavigate={handleNavigate} />}
        {page === "members" && <WorkspaceMembersPage onNavigate={handleNavigate} />}
        {page === "reports" && <ReportsPage onNavigate={handleNavigate} />}
        {page === "signin" && <SignInPage onNavigate={handleNavigate} />}
        {page === "signup" && <SignUpPage onNavigate={handleNavigate} />}
        {page === "privacy" && <PrivacyPage onNavigate={handleNavigate} />}
        {page === "terms" && <TermsPage onNavigate={handleNavigate} />}
        {page === "restricted" && <RestrictedPage onNavigate={handleNavigate} />}
        {page === "landing-education" && <EducationLandingPage onNavigate={handleNavigate} />}
        {page === "landing-pharmacy" && <PharmacyLandingPage onNavigate={handleNavigate} />}
        {page === "landing-commerce" && <CommerceLandingPage onNavigate={handleNavigate} />}
        {page === "landing-gestion" && <GestionLandingPage onNavigate={handleNavigate} />}
        {page === "landing-hr" && <HRLandingPage onNavigate={handleNavigate} />}
        {page === "about" && <AboutPage onNavigate={handleNavigate} />}
        {page === "contact" && <ContactPage onNavigate={handleNavigate} />}
        {page === "settings" && <SettingsPage onNavigate={handleNavigate} />}
        {page === "security" && <SecurityDashboardPage onNavigate={handleNavigate} />}
        {page === "habits" && <HabitTrackerPage onNavigate={handleNavigate} />}
        {page === "access-denied" && <AccessDeniedPage onNavigate={handleNavigate} />}
        {page === "reset-password" && <ResetPasswordPage onNavigate={handleNavigate} />}
        {page === "create-workspace" && <CreateWorkspacePage onNavigate={handleNavigate} />}
        </div>
      </React.Suspense>
      <React.Suspense fallback={null}>
        <SavemaliWidget />
      </React.Suspense>
    </div>
  )
}

export function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <PredictiveProvider>
          <AppContent />
          <Toaster />
        </PredictiveProvider>
      </AuthProvider>
    </LanguageProvider>
  )
}

export default App
