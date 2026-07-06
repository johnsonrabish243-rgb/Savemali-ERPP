import * as React from "react"
import { RotateCw, AlertCircle, Volume2, VolumeX, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCaptchaLang } from "@/lib/captcha/i18n"
import type { Language } from "@/lib/captcha/types"

interface Props {
  lang: Language
  onVerify: (success: boolean) => void
  onReload?: () => void
  difficulty?: number
}

const WORDS_BY_LANG: Record<string, string[]> = {
  fr: ["avion", "chat", "arbre", "maison", "voiture", "soleil", "fleur", "pierre", "route", "école", "bateau", "lune", "pluie", "feu", "pain"],
  en: ["apple", "river", "house", "cloud", "train", "ocean", "garden", "bridge", "winter", "rocket", "forest", "island", "thunder", "candle", "planet"],
}

function speakWord(word: string, lang: string) {
  const speech = new SpeechSynthesisUtterance(word)
  speech.lang = lang === "fr" ? "fr-FR" : "en-US"
  speech.rate = 0.9
  speech.pitch = 1
  speech.volume = 1

  const voices = window.speechSynthesis.getVoices()
  const targetVoice = lang === "fr"
    ? voices.find((v) => v.lang.startsWith("fr"))
    : voices.find((v) => v.lang.startsWith("en"))
  if (targetVoice) speech.voice = targetVoice

  window.speechSynthesis.speak(speech)
}

export function AudioChallenge({ lang, onVerify, onReload, difficulty = 5 }: Props) {
  const t = useCaptchaLang(lang)
  const fr = lang === "fr"

  const [word, setWord] = React.useState("")
  const [options, setOptions] = React.useState<string[]>([])
  const [selected, setSelected] = React.useState<string | null>(null)
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [error, setError] = React.useState(false)
  const [attempts, setAttempts] = React.useState(0)
  const [verifying, setVerifying] = React.useState(false)

  React.useEffect(() => {
    window.speechSynthesis?.getVoices()
    generate()
  }, [difficulty, lang])

  function generate() {
    const pool = WORDS_BY_LANG[lang] ?? WORDS_BY_LANG["fr"]
    const correct = pool[Math.floor(Math.random() * pool.length)]
    const distractors = pool.filter((w) => w !== correct).sort(() => Math.random() - 0.5).slice(0, 3)
    const all = [correct, ...distractors].sort(() => Math.random() - 0.5)
    setWord(correct)
    setOptions(all)
    setSelected(null)
    setError(false)
    setVerifying(false)
  }

  function playWord() {
    if (isPlaying) return
    setIsPlaying(true)
    try {
      speakWord(word, lang)
    } catch {}
    setTimeout(() => setIsPlaying(false), 1200)
  }

  function handleVerify() {
    if (verifying || !selected) return
    setVerifying(true)

    setTimeout(() => {
      if (selected === word) {
        onVerify(true)
      } else {
        const newCount = attempts + 1
        setAttempts(newCount)
        if (newCount >= 3) { onVerify(false); return }
        setError(true)
        setVerifying(false)
        setSelected(null)
      }
    }, 100)
  }

  return (
    <div className="animate-in fade-in duration-150">
      <p className="mb-2 text-[13px] font-medium text-foreground text-center">
        {fr ? "Écoutez et sélectionnez le mot" : "Listen and select the word"}
      </p>

      {error && (
        <div className="mb-2 flex items-center gap-1.5 rounded bg-destructive/5 px-2.5 py-1.5 text-[11px] text-destructive">
          <AlertCircle className="size-3 shrink-0" />
          <span>{t("error.incorrect")} ({3 - attempts})</span>
        </div>
      )}

      <div className="mb-3 flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={playWord}
          disabled={isPlaying}
          className={cn(
            "flex size-14 items-center justify-center rounded-full transition-all duration-150",
            isPlaying
              ? "bg-accent/20 text-accent animate-pulse"
              : "bg-accent text-accent-foreground shadow-sm hover:shadow hover:scale-105 active:scale-95"
          )}
        >
          {isPlaying ? <Volume2 className="size-6" /> : <VolumeX className="size-6" />}
        </button>
        <p className="text-[10px] text-muted-foreground">
          {isPlaying ? (fr ? "Écoutez..." : "Listening...") : (fr ? "Cliquer pour écouter" : "Click to listen")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-1.5 mb-3">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => { setSelected(opt); setError(false) }}
            className={cn(
              "rounded-lg border-2 px-3 py-2.5 text-[12px] font-medium transition-all duration-100",
              selected === opt
                ? "border-accent bg-accent/10 text-accent shadow-sm"
                : "border-border/40 bg-card hover:border-accent/40 text-foreground active:scale-[0.98]",
              verifying && "pointer-events-none"
            )}
          >
            {opt}
          </button>
        ))}
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
        <button
          type="button"
          onClick={handleVerify}
          disabled={!selected || verifying}
          className="ml-auto flex items-center gap-1 rounded bg-accent px-4 py-1.5 text-[11px] font-semibold text-accent-foreground shadow-sm transition-all hover:shadow active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {verifying ? <div className="size-3 rounded-full border-2 border-accent-foreground/30 border-t-accent-foreground animate-spin" /> : t("verify")}
        </button>
      </div>
    </div>
  )
}
