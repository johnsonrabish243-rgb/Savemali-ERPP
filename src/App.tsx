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
import { useAbuseProtection, useRequestTracking } from "@/hooks/use-abuse-protection"
import { SecurityBlockPage } from "@/pages/SecurityBlockPage"
import { Button } from "@/components/ui/button"
import { Mail } from "lucide-react"

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
  const { user, workspace, loading, signOut, emailVerified, resendVerification } = useAuth()
  const { setCurrentPage } = usePredictiveContext()
  const { lang } = useLanguage()
  const [showLoading, setShowLoading] = React.useState(() => {
    return !sessionStorage.getItem("savemali_loaded")
  })
  const [lockedOut, setLockedOut] = React.useState(() => isUserLockedOut())
  const { isBlocked, remainingMs, status, resetProtection } = useAbuseProtection()
  useRequestTracking()

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

  // Abuse protection screen
  if (isBlocked) {
    return (
      <SecurityBlockPage
        remainingMs={remainingMs}
        reason={status.reason}
        lockoutLevel={status.lockoutLevel}
        onBack={resetProtection}
      />
    )
  }

  // Email verification gate - BLOCK access until email verified
  if (user && !emailVerified && page !== "signin" && page !== "signup") {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-accent/10">
            <Mail className="size-8 text-accent" />
          </div>
          <h1 className="text-xl font-bold text-foreground">{lang === "fr" ? "Verification de votre email" : "Verify your email"}</h1>
          <p className="text-sm text-muted-foreground">
            {lang === "fr"
              ? "Un code de verification a ete envoye a " + user.email + ". Veuillez saisir le code pour activer votre compte."
              : "A verification code was sent to " + user.email + ". Please enter the code to activate your account."}
          </p>
          <Button onClick={() => resendVerification()} variant="outline" className="gap-2">
            <Mail className="size-4" />
            {lang === "fr" ? "Renvoyer le code" : "Resend code"}
          </Button>
          <Button onClick={() => signOut()} variant="ghost" className="text-sm">
            {lang === "fr" ? "Se deconnecter" : "Sign out"}
          </Button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
        style={{ background: "linear-gradient(160deg, #0a0a0a 0%, #1a1025 50%, #0a0a0a 100%)" }}
      >
        <div className="absolute w-[300px] h-[300px] rounded-full blur-[120px] opacity-20" style={{ background: "radial-gradient(circle, #c8399c 0%, transparent 70%)" }} />
        <div className="relative z-10 flex flex-col items-center">
          <img
            src="/SaveMali_Logo.png"
            alt="SaveMali"
            className="w-20 h-20 rounded-2xl object-cover shadow-2xl mb-6"
            style={{ animation: "splash-logo-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}
            onError={(e) => {
              const img = e.currentTarget
              img.style.display = "none"
              const fallback = document.createElement("div")
              fallback.className = "w-20 h-20 rounded-2xl bg-gradient-to-br from-[#c8399c] to-[#7c3aed] flex items-center justify-center shadow-2xl mb-6"
              fallback.innerHTML = '<span class="text-3xl font-bold text-white">S</span>'
              img.parentNode?.insertBefore(fallback, img)
            }}
          />
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
