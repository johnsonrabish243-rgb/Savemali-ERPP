import * as React from "react"
import { useLanguage } from "@/lib/i18n"
import { Shield, ArrowLeft, Clock, AlertTriangle, Lock } from "lucide-react"
import { LogoIcon } from "@/components/Logo"

interface SecurityBlockPageProps {
  remainingMs: number
  reason?: string
  onBack?: () => void
  lockoutLevel?: number
}

const translations = {
  fr: {
    title: "Accès Temporairement Limité",
    subtitle: "Activité Inhabituelle Détectée",
    description:
      "Notre système de sécurité a détecté une activité inhabituelle sur votre session. Pour protéger votre compte et les données de votre entreprise, l'accès a été temporairement limité.",
    details: "Cette mesure est automatique et vise à prévenir les attaques potentielles sur l'application.",
    countdown: "Nouvelle tentative possible dans",
    back: "Retour à l'accueil",
    reason: "Raison détectée",
    whatToDo: "En attendant, vous pouvez :",
    tips: [
      "Vérifier que vous n'avez pas ouvert trop d'onglets simultanément",
      "Attendre la fin du délai avant de réessayer",
      "Contacter le support si le problème persiste",
    ],
    security: "Sécurité",
    protected: "Votre protection est notre priorité",
  },
  en: {
    title: "Access Temporarily Limited",
    subtitle: "Unusual Activity Detected",
    description:
      "Our security system has detected unusual activity on your session. To protect your account and your business data, access has been temporarily limited.",
    details: "This measure is automatic and aims to prevent potential attacks on the application.",
    countdown: "Next attempt available in",
    back: "Back to Home",
    reason: "Detected reason",
    whatToDo: "In the meantime, you can:",
    tips: [
      "Check that you haven't opened too many tabs simultaneously",
      "Wait for the timer before trying again",
      "Contact support if the problem persists",
    ],
    security: "Security",
    protected: "Your protection is our priority",
  },
}

function formatTime(ms: number): { minutes: string; seconds: string } {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return {
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
  }
}

export function SecurityBlockPage({ remainingMs, reason, onBack, lockoutLevel = 0 }: SecurityBlockPageProps) {
  const { lang } = useLanguage()
  const t = translations[lang] || translations.fr
  const [timeLeft, setTimeLeft] = React.useState(remainingMs)

  React.useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev: number) => {
        if (prev <= 1000) {
          clearInterval(interval)
          return 0
        }
        return prev - 1000
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleBack = React.useCallback(() => {
    if (onBack) {
      onBack()
    } else {
      window.location.href = "/"
    }
  }, [onBack])

  const time = formatTime(timeLeft)
  const severity = lockoutLevel >= 3 ? "high" : lockoutLevel >= 1 ? "medium" : "low"

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" style={{ animation: "breathe 4s ease-in-out infinite" }} />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {/* Main Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className={`px-6 py-5 border-b border-white/10 ${
            severity === "high" ? "bg-red-500/10" : severity === "medium" ? "bg-orange-500/10" : "bg-yellow-500/10"
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                severity === "high" ? "bg-red-500/20" : severity === "medium" ? "bg-orange-500/20" : "bg-yellow-500/20"
              }`}>
                <Shield className={`w-5 h-5 ${
                  severity === "high" ? "text-red-400" : severity === "medium" ? "text-orange-400" : "text-yellow-400"
                }`} />
              </div>
              <div>
                <p className="text-white/50 text-xs font-medium uppercase tracking-wider">{t.security}</p>
                <h1 className="text-white text-lg font-bold">{t.subtitle}</h1>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-5">
            {/* Alert Icon */}
            <div className="flex justify-center">
              <div className={`relative w-20 h-20 rounded-full flex items-center justify-center ${
                severity === "high" ? "bg-red-500/10" : severity === "medium" ? "bg-orange-500/10" : "bg-yellow-500/10"
              }`}>
                <Lock className={`w-10 h-10 ${
                  severity === "high" ? "text-red-400" : severity === "medium" ? "text-orange-400" : "text-yellow-400"
                }`} />
                <div className="absolute inset-0 rounded-full border-2 border-current opacity-20" style={{ animation: "ping 2s cubic-bezier(0, 0, 0.2, 1) infinite" }} />
              </div>
            </div>

            {/* Title */}
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold text-white">{t.title}</h2>
              <p className="text-white/60 text-sm leading-relaxed">{t.description}</p>
            </div>

            {/* Reason */}
            {reason && (
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-orange-400" />
                  <span className="text-white/50 text-xs font-medium uppercase">{t.reason}</span>
                </div>
                <p className="text-white/80 text-sm">{reason}</p>
              </div>
            )}

            {/* Countdown */}
            <div className="bg-white/5 border border-white/10 rounded-xl px-6 py-5 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-2">
                <Clock className="w-4 h-4 text-white/40" />
                <span className="text-white/40 text-xs uppercase tracking-wider">{t.countdown}</span>
              </div>
              <div className="flex items-center justify-center gap-3">
                <div className="bg-white/10 rounded-lg px-4 py-2 min-w-[70px]">
                  <span className="text-3xl font-mono font-bold text-white">{time.minutes}</span>
                </div>
                <span className="text-2xl font-bold text-white/40">:</span>
                <div className="bg-white/10 rounded-lg px-4 py-2 min-w-[70px]">
                  <span className="text-3xl font-mono font-bold text-white">{time.seconds}</span>
                </div>
              </div>
              {timeLeft === 0 && (
                <button
                  onClick={handleBack}
                  className="mt-4 px-6 py-2.5 bg-brand hover:bg-brand/80 text-white rounded-xl font-medium transition-all duration-200 hover:scale-105"
                >
                  {t.back}
                </button>
              )}
            </div>

            {/* Tips */}
            <div className="space-y-2">
              <p className="text-white/50 text-xs font-medium uppercase tracking-wider">{t.whatToDo}</p>
              <ul className="space-y-2">
                {t.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-white/60 text-sm">
                    <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5 text-xs font-medium text-white/40">
                      {i + 1}
                    </span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/10 bg-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LogoIcon size={24} />
                <span className="text-white/30 text-xs">SaveMali ERP</span>
              </div>
              <span className="text-white/30 text-xs">{t.protected}</span>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-4 text-center">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.back}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes breathe {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
