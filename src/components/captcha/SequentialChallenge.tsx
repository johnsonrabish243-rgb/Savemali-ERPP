import * as React from "react"
import { RotateCw, AlertCircle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCaptchaLang } from "@/lib/captcha/i18n"
import type { Language } from "@/lib/captcha/types"

interface Props {
  lang: Language
  onVerify: (success: boolean) => void
  onReload?: () => void
  difficulty?: number
}

const EMOJI_ICONS = ["✈️", "🚗", "🚌", "🏍️", "🚲", "🐱", "🐶", "🦜", "🐴", "🐘", "🦁", "🐟", "🌸", "🌳", "⛰️", "🌊", "🏠", "🏫"]

export function SequentialChallenge({ lang, onVerify, onReload, difficulty = 5 }: Props) {
  const t = useCaptchaLang(lang)
  const fr = lang === "fr"

  const [items, setItems] = React.useState<string[]>([])
  const [correctOrder, setCorrectOrder] = React.useState<string[]>([])
  const [clickOrder, setClickOrder] = React.useState<string[]>([])
  const [error, setError] = React.useState(false)
  const [attempts, setAttempts] = React.useState(0)
  const [phase, setPhase] = React.useState<"memorize" | "recall">("memorize")
  const [countdown, setCountdown] = React.useState(3)

  React.useEffect(() => { generate() }, [difficulty])

  function generate() {
    const count = Math.min(3 + Math.floor(difficulty / 3), 6)
    const shuffled = [...EMOJI_ICONS].sort(() => Math.random() - 0.5).slice(0, count)
    setItems(shuffled)
    setCorrectOrder(shuffled)
    setClickOrder([])
    setError(false)
    setAttempts(0)
    setPhase("memorize")
    setCountdown(3)
  }

  React.useEffect(() => {
    if (phase !== "memorize") return
    if (countdown <= 0) { setPhase("recall"); return }
    const id = setTimeout(() => setCountdown((p) => p - 1), 1000)
    return () => clearTimeout(id)
  }, [phase, countdown])

  function handleClick(emoji: string) {
    if (phase !== "recall") return
    if (clickOrder.includes(emoji)) return

    const nextOrder = [...clickOrder, emoji]
    setClickOrder(nextOrder)
    setError(false)

    if (nextOrder.length === correctOrder.length) {
      const isCorrect = nextOrder.every((v, i) => v === correctOrder[i])
      if (isCorrect) {
        setTimeout(() => onVerify(true), 150)
      } else {
        handleFail()
      }
    }
  }

  function handleFail() {
    const newCount = attempts + 1
    setAttempts(newCount)
    if (newCount >= 3) { onVerify(false); return }
    setError(true)
    setClickOrder([])
    setPhase("memorize")
    setCountdown(3)
    const shuffled = [...items].sort(() => Math.random() - 0.5)
    setItems(shuffled)
    setCorrectOrder(shuffled)
  }

  return (
    <div className="animate-in fade-in duration-150">
      <p className="mb-2 text-[13px] font-medium text-foreground text-center">
        {phase === "memorize"
          ? (fr ? `Mémorisez l'ordre (${countdown}s)` : `Memorize order (${countdown}s)`)
          : (fr ? `Cliquez dans l'ordre (${clickOrder.length}/${correctOrder.length})` : `Click in order (${clickOrder.length}/${correctOrder.length})`)}
      </p>

      {error && (
        <div className="mb-2 flex items-center gap-1.5 rounded bg-destructive/5 px-2.5 py-1.5 text-[11px] text-destructive">
          <AlertCircle className="size-3 shrink-0" />
          <span>{t("error.incorrect")} ({3 - attempts})</span>
        </div>
      )}

      <div className="mb-2 flex flex-wrap justify-center gap-1.5">
        {items.map((emoji, idx) => {
          const clicked = clickOrder.includes(emoji)
          const clickIdx = clickOrder.indexOf(emoji)
          return (
            <button
              key={emoji + idx}
              type="button"
              onClick={() => handleClick(emoji)}
              disabled={phase !== "recall" || clicked}
              className={cn(
                "flex size-12 sm:size-14 items-center justify-center rounded-lg border-2 text-2xl transition-all duration-100",
                clicked
                  ? "border-accent bg-accent/10 shadow-sm"
                  : phase === "recall"
                    ? "border-border/40 bg-card hover:border-accent/50 hover:shadow-sm cursor-pointer active:scale-95"
                    : "border-warning/30 bg-warning/5",
                phase === "memorize" && "animate-pulse"
              )}
            >
              {clicked ? (
                <div className="flex flex-col items-center">
                  <span>{emoji}</span>
                  <span className="text-[8px] font-bold text-accent">{clickIdx + 1}</span>
                </div>
              ) : (
                <span>{emoji}</span>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => { generate(); onReload?.() }}
          className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted/30 transition-colors"
        >
          <RotateCw className="size-2.5" />
          {t("reload")}
        </button>
        <span className="ml-auto text-[10px] text-muted-foreground/40">
          {phase === "recall" && `${clickOrder.length}/${correctOrder.length}`}
        </span>
      </div>
    </div>
  )
}
