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

const HomePage = React.lazy(() => import("@/pages/HomePage").then(m => ({ default: m.HomePage })))
const EducationPage = React.lazy(() => import("@/pages/EducationPage").then(m => ({ default: m.EducationPage })))
const PharmacyPage = React.lazy(() => import("@/pages/PharmacyPage").then(m => ({ default: m.PharmacyPage })))
const CommercePage = React.lazy(() => import("@/pages/CommercePage").then(m => ({ default: m.CommercePage })))
const GestionPage = React.lazy(() => import("@/pages/GestionPage").then(m => ({ default: m.GestionPage })))
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
const AboutPage = React.lazy(() => import("@/pages/AboutPage").then(m => ({ default: m.AboutPage })))
const ContactPage = React.lazy(() => import("@/pages/ContactPage").then(m => ({ default: m.ContactPage })))
const SettingsPage = React.lazy(() => import("@/pages/SettingsPage").then(m => ({ default: m.SettingsPage })))
const SecurityDashboardPage = React.lazy(() => import("@/pages/SecurityDashboardPage").then(m => ({ default: m.SecurityDashboardPage })))
const HabitTrackerPage = React.lazy(() => import("@/pages/HabitTrackerPage").then(m => ({ default: m.HabitTrackerPage })))
const LockoutPage = React.lazy(() => import("@/pages/LockoutPage").then(m => ({ default: m.LockoutPage })))
const AccessDeniedPage = React.lazy(() => import("@/pages/AccessDeniedPage").then(m => ({ default: m.AccessDeniedPage })))
const ResetPasswordPage = React.lazy(() => import("@/pages/ResetPasswordPage").then(m => ({ default: m.ResetPasswordPage })))

const SavemaliWidget = React.lazy(() => import("@/components/SavemaliWidget").then(m => ({ default: m.SavemaliWidget })))

export type Page =
  | "home" | "education" | "pharmacy" | "commerce" | "gestion"
  | "dashboard" | "signin" | "signup" | "members" | "reports"
  | "privacy" | "terms" | "restricted" | "settings"
  | "landing-education" | "landing-pharmacy" | "landing-commerce" | "landing-gestion"
  | "about" | "contact" | "security" | "habits" | "access-denied" | "reset-password"

const NO_NAV_PAGES: Page[] = ["dashboard", "signin", "signup", "members", "reports", "restricted", "settings", "security", "habits", "access-denied", "reset-password"]

const WS_PAGE_MAP: Record<string, Page> = {
  education: "education",
  pharmacy: "pharmacy",
  commerce: "commerce",
  gestion: "gestion",
}

function AppContent() {
  const [page, setPage] = React.useState<Page>(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("invite")) {
      window.history.replaceState({}, "", window.location.pathname)
      return "signup"
    }
    return "home"
  })
  const { user, workspace, loading, signOut } = useAuth()
  const { setCurrentPage } = usePredictiveContext()
  const { lang } = useLanguage()
  const [showLoading, setShowLoading] = React.useState(() => {
    return !sessionStorage.getItem("savemali_loaded")
  })
  const [lockedOut, setLockedOut] = React.useState(() => isUserLockedOut())

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
    sessionStorage.setItem("savemali_loaded", "1")
  }, [])

  React.useEffect(() => {
    if (!loading && user && (page === "signin" || page === "signup")) {
      setPage("dashboard")
    }
  }, [user, loading, page])

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

  if (loading) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-background gap-6">
        <img
          src="/SaveMali_Logo.png"
          alt="SaveMali"
          className="size-16 rounded-xl object-cover shadow-lg"
          onError={(e) => {
            e.currentTarget.style.display = "none"
          }}
        />
        <div className="w-48 flex flex-col items-center gap-3">
          <div className="relative w-full h-[3px] overflow-hidden rounded-full bg-muted">
            <div className="absolute top-0 left-0 h-full w-[40%] rounded-full bg-gradient-to-r from-transparent via-brand to-transparent" style={{ animation: "loading-sweep-auth 1.4s ease-in-out infinite" }} />
          </div>
          <p className="text-[11px] text-muted-foreground/70" style={{ animation: "pulse 2s ease-in-out infinite" }}>
            {lang === "fr" ? "Connexion..." : "Connecting..."}
          </p>
        </div>
        <style>{`
          @keyframes loading-sweep-auth {
            0% { left: -40%; }
            100% { left: 100%; }
          }
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
          <div className="w-48 flex flex-col items-center gap-3">
            <div className="relative w-full h-[3px] overflow-hidden rounded-full bg-muted">
              <div className="absolute top-0 left-0 h-full w-[40%] rounded-full bg-gradient-to-r from-transparent via-brand to-transparent" style={{ animation: "loading-sweep-suspense 1.4s ease-in-out infinite" }} />
            </div>
          </div>
          <style>{`@keyframes loading-sweep-suspense { 0% { left: -40%; } 100% { left: 100%; } }`}</style>
        </div>
      }>
        {page === "home" && <HomePage onNavigate={handleNavigate} />}
        {page === "education" && <EducationPage onNavigate={handleNavigate} />}
        {page === "pharmacy" && <PharmacyProvider><PharmacyPage onNavigate={handleNavigate} /></PharmacyProvider>}
        {page === "commerce" && <CommercePage onNavigate={handleNavigate} />}
        {page === "gestion" && <GestionPage onNavigate={handleNavigate} />}
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
        {page === "about" && <AboutPage onNavigate={handleNavigate} />}
        {page === "contact" && <ContactPage onNavigate={handleNavigate} />}
        {page === "settings" && <SettingsPage onNavigate={handleNavigate} />}
        {page === "security" && <SecurityDashboardPage onNavigate={handleNavigate} />}
        {page === "habits" && <HabitTrackerPage onNavigate={handleNavigate} />}
        {page === "access-denied" && <AccessDeniedPage onNavigate={handleNavigate} />}
        {page === "reset-password" && <ResetPasswordPage onNavigate={handleNavigate} />}
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
