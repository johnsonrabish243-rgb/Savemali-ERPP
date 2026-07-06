import * as React from "react"
import { Shield, ShieldCheck, Timer, AlertCircle, Loader2, CheckCircle2, Sparkles, PartyPopper, RotateCw } from "lucide-react"
import { useLanguage } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { CaptchaBadge } from "@/components/captcha/CaptchaBadge"
import { ShapeChallenge } from "@/components/captcha/ShapeChallenge"
import { ImageChallenge } from "@/components/captcha/ImageChallenge"
import { PuzzleChallenge } from "@/components/captcha/PuzzleChallenge"
import { SequentialChallenge } from "@/components/captcha/SequentialChallenge"
import { AudioChallenge } from "@/components/captcha/AudioChallenge"
import { CaptchaEngine, createEngine } from "@/lib/captcha/engine"
import { assessRisk, recordRiskScore, detectBot } from "@/lib/captcha/security"
import { getMediaLibrary } from "@/lib/captcha/media"
import { useCaptchaLang } from "@/lib/captcha/i18n"
import type { CaptchaPhase, ChallengeType, WidgetSize, WidgetTheme, WidgetMode, Language, BehavioralData } from "@/lib/captcha/types"

interface Props {
  onVerify: () => void
  size?: WidgetSize
  theme?: WidgetTheme
  mode?: WidgetMode
  lang?: Language
  challengeTypes?: ChallengeType[]
}

const MAX_ATTEMPTS = 3
const LOCKOUT_SECONDS = 20

const CHALLENGE_ICONS: Record<ChallengeType, string> = {
  shapes: "⬡",
  images: "🖼",
  puzzle: "🧩",
  sequential: "🔢",
  audio: "🔊",
}

const CONGRATS_MESSAGES = {
  fr: [
    "Félicitations ! Vous avez réussi !",
    "Bravo ! Vérification réussie !",
    "Excellent ! Vous n'êtes pas un robot !",
    "Parfait ! Accès autorisé !",
    "Super ! Vérification complète !",
  ],
  en: [
    "Congratulations! You passed!",
    "Bravo! Verification successful!",
    "Excellent! You're not a robot!",
    "Perfect! Access granted!",
    "Great! Verification complete!",
  ],
}

export function SavemaliCaptcha({
  onVerify,
  size = "default",
  theme: _theme,
  mode = "visible",
  lang: propLang,
  challengeTypes = ["shapes", "images", "puzzle", "sequential", "audio"],
}: Props) {
  const { lang: appLang } = useLanguage()
  const lang = propLang ?? appLang as Language
  const fr = lang === "fr"
  const t = useCaptchaLang(lang)

  const [phase, setPhase] = React.useState<CaptchaPhase>("idle")
  const [challengeType, setChallengeType] = React.useState<ChallengeType>("shapes")
  const [failCount, setFailCount] = React.useState(0)
  const [lockedUntil, setLockedUntil] = React.useState<number | null>(null)
  const [timeLeft, setTimeLeft] = React.useState(0)
  const [challengeKey, setChallengeKey] = React.useState(0)
  const [congratsMessage, setCongratsMessage] = React.useState("")
  const [showConfetti, setShowConfetti] = React.useState(false)

  const engineRef = React.useRef<CaptchaEngine>(createEngine())
  const startTimeRef = React.useRef(Date.now())
  const behavioralRef = React.useRef<BehavioralData>({
    mouseMovements: [], clickEvents: [], viewport: { width: window.innerWidth, height: window.innerHeight },
    userAgent: navigator.userAgent, timeSinceLoad: 0,
  })

  React.useEffect(() => {
    const mediaLib = getMediaLibrary()
    engineRef.current.setMediaLibrary(mediaLib.getItems())
  }, [])

  React.useEffect(() => {
    if (!lockedUntil) return
    const tick = () => {
      const left = Math.ceil((lockedUntil - Date.now()) / 1000)
      if (left <= 0) { setLockedUntil(null); setFailCount(0); setTimeLeft(0); return }
      setTimeLeft(left)
    }
    tick()
    const id = setInterval(tick, 100)
    return () => clearInterval(id)
  }, [lockedUntil])

  React.useEffect(() => {
    if (phase !== "idle") return
    const handleMouse = (e: MouseEvent) => {
      behavioralRef.current.mouseMovements.push({ x: e.clientX, y: e.clientY, t: Date.now() })
      if (behavioralRef.current.mouseMovements.length > 150) behavioralRef.current.mouseMovements.splice(0, 30)
    }
    const handleClick = (e: MouseEvent) => {
      behavioralRef.current.clickEvents.push({ x: e.clientX, y: e.clientY, t: Date.now() })
      if (behavioralRef.current.clickEvents.length > 75) behavioralRef.current.clickEvents.splice(0, 15)
    }
    window.addEventListener("mousemove", handleMouse, { passive: true })
    window.addEventListener("click", handleClick, { passive: true })
    return () => {
      window.removeEventListener("mousemove", handleMouse)
      window.removeEventListener("click", handleClick)
    }
  }, [phase])

  function handleBadgeClick() {
    const bots = detectBot()
    if (bots.length > 0) {
      setPhase("error")
      setTimeout(() => setPhase("idle"), 1500)
      return
    }

    startTimeRef.current = Date.now()
    const risk = assessRisk(behavioralRef.current)
    const type = engineRef.current.selectChallengeType(risk)
    setChallengeType(type)
    setChallengeKey((k) => k + 1)
    setPhase("challenge")
  }

  function handleChallengeResult(success: boolean) {
    const risk = assessRisk(behavioralRef.current)

    if (success) {
      engineRef.current.recordSuccess(risk)
      recordRiskScore(risk.score, challengeType)
      setPhase("verifying")
      setTimeout(() => {
        const messages = fr ? CONGRATS_MESSAGES.fr : CONGRATS_MESSAGES.en
        setCongratsMessage(messages[Math.floor(Math.random() * messages.length)])
        setShowConfetti(true)
        setPhase("verified")
        setTimeout(() => {
          setShowConfetti(false)
          onVerify()
        }, 1200)
      }, 250)
    } else {
      const locked = engineRef.current.recordFailure()
      setFailCount((p) => p + 1)
      if (locked) {
        setLockedUntil(Date.now() + LOCKOUT_SECONDS * 1000)
        setFailCount(0)
      } else {
        const risk2 = assessRisk(behavioralRef.current)
        const newType = engineRef.current.selectChallengeType(risk2)
        setChallengeType(newType)
        setChallengeKey((k) => k + 1)
      }
    }
  }

  function handleReload() {
    const risk = assessRisk(behavioralRef.current)
    const newType = engineRef.current.selectChallengeType(risk)
    setChallengeType(newType)
    setChallengeKey((k) => k + 1)
  }

  const isLocked = lockedUntil && Date.now() < lockedUntil

  return (
    <div className={cn(
      "w-full overflow-hidden rounded-lg transition-all duration-300 relative",
      phase === "verified" ? "border-success/40 bg-success/[0.03]" : "border-border bg-card",
      "border shadow-sm"
    )}>
      {mode === "invisible" && phase === "idle" && (
        <div className="opacity-0 absolute inset-0" onClick={handleBadgeClick} />
      )}

      {mode !== "invisible" && phase === "idle" && (
        <CaptchaBadge lang={lang} size={size} theme={_theme ?? "auto"} onClick={handleBadgeClick} phase="idle" />
      )}

      {phase === "challenge" && (
        <div className="animate-in fade-in duration-200">
          {isLocked ? (
            <div className="flex flex-col items-center gap-2 py-5 px-4">
              <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10">
                <Timer className="size-5 text-destructive" />
              </div>
              <p className="text-xs font-medium text-destructive text-center">
                {t("lockout.message")} {timeLeft}{t("lockout.seconds")}
              </p>
              <div className="h-1 w-28 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-destructive transition-all duration-100" style={{ width: `${(timeLeft / LOCKOUT_SECONDS) * 100}%` }} />
              </div>
            </div>
          ) : (
            <div className="p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{CHALLENGE_ICONS[challengeType]}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {challengeType === "shapes" ? (fr ? "Formes" : "Shapes")
                      : challengeType === "images" ? (fr ? "Images" : "Images")
                        : challengeType === "puzzle" ? (fr ? "Puzzle" : "Puzzle")
                          : challengeType === "sequential" ? (fr ? "Ordre" : "Order")
                            : (fr ? "Audio" : "Audio")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleReload}
                    className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted/50 transition-colors"
                  >
                    <RotateCw className="size-2.5" />
                    {fr ? "Autre" : "Other"}
                  </button>
                  <span className="text-[10px] text-muted-foreground/50">
                    {failCount + 1}/{MAX_ATTEMPTS}
                  </span>
                </div>
              </div>

              {challengeType === "shapes" && (
                <ShapeChallenge key={challengeKey} lang={lang} onVerify={handleChallengeResult} onReload={handleReload} difficulty={engineRef.current.getDifficulty()} />
              )}
              {challengeType === "images" && (
                <ImageChallenge key={challengeKey} lang={lang} onVerify={handleChallengeResult} onReload={handleReload} difficulty={engineRef.current.getDifficulty()} />
              )}
              {challengeType === "puzzle" && (
                <PuzzleChallenge key={challengeKey} lang={lang} onVerify={handleChallengeResult} onReload={handleReload} difficulty={engineRef.current.getDifficulty()} />
              )}
              {challengeType === "sequential" && (
                <SequentialChallenge key={challengeKey} lang={lang} onVerify={handleChallengeResult} onReload={handleReload} difficulty={engineRef.current.getDifficulty()} />
              )}
              {challengeType === "audio" && (
                <AudioChallenge key={challengeKey} lang={lang} onVerify={handleChallengeResult} onReload={handleReload} difficulty={engineRef.current.getDifficulty()} />
              )}
            </div>
          )}
        </div>
      )}

      {phase === "verifying" && (
        <div className="flex items-center gap-3 px-4 py-3 animate-in fade-in duration-150">
          <Loader2 className="size-4 animate-spin text-accent" />
          <p className="text-xs text-muted-foreground">{t("verifying")}</p>
          <div className="ml-auto h-1 w-16 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-accent animate-[loading-bar_0.6s_ease-in-out_infinite]" />
          </div>
        </div>
      )}

      {phase === "verified" && (
        <div className="relative overflow-hidden">
          {showConfetti && (
            <div className="absolute inset-0 pointer-events-none z-10">
              {[...Array(20)].map((_, i) => {
                const colors = ["#22c55e", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4", "#f97316"]
                const shapes = ["rounded-full", "rounded-sm", "rounded-full", "rounded-sm"]
                const size = 6 + Math.random() * 6
                return (
                  <div
                    key={i}
                    className={cn(
                      "absolute animate-[confetti-fall_1.2s_ease-out_forwards]",
                      shapes[i % 4]
                    )}
                    style={{
                      left: `${8 + Math.random() * 84}%`,
                      top: "-8%",
                      width: `${size}px`,
                      height: `${size}px`,
                      backgroundColor: colors[i % colors.length],
                      animationDelay: `${i * 0.04}s`,
                      animationDuration: `${1 + Math.random() * 0.5}s`,
                    }}
                  />
                )
              })}
            </div>
          )}
          <div className="flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 animate-in fade-in zoom-in-95 duration-300">
            <div className="relative shrink-0">
              <div className="flex size-7 sm:size-8 items-center justify-center rounded-full bg-success shadow-sm shadow-success/30 animate-[pop-in_0.3s_ease-out]">
                <CheckCircle2 className="size-3.5 sm:size-4 text-white" />
              </div>
              <Sparkles className="absolute -right-0.5 -top-0.5 size-2.5 sm:size-3 text-warning animate-[sparkle_0.6s_ease-in-out_infinite_alternate]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] sm:text-[12px] font-semibold text-success truncate">{congratsMessage}</p>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground">
                {fr ? "Vous pouvez continuer" : "You can continue"}
              </p>
            </div>
            <ShieldCheck className="size-3.5 sm:size-4 text-success/60 shrink-0" />
          </div>
        </div>
      )}

      {phase === "error" && (
        <div className="flex items-center gap-2 px-4 py-3 bg-destructive/5 animate-in fade-in duration-150">
          <AlertCircle className="size-3.5 text-destructive shrink-0" />
          <p className="text-[11px] text-destructive">{fr ? "Robot détecté" : "Bot detected"}</p>
        </div>
      )}
    </div>
  )
}
