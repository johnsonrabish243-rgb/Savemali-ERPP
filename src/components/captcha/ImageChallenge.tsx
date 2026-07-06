import * as React from "react"
import { RotateCw, AlertCircle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCaptchaLang } from "@/lib/captcha/i18n"
import { getMediaLibrary, getCategoryLabel } from "@/lib/captcha/media"
import type { Language, MediaItem } from "@/lib/captcha/types"

interface Props {
  lang: Language
  onVerify: (success: boolean) => void
  onReload?: () => void
  difficulty?: number
  gridSize?: number
  targetCount?: number
}

const CATEGORY_GROUPS = [
  ["cars", "motorcycles", "buses", "bicycles"],
  ["cats", "dogs", "birds", "horses", "elephants", "lions", "fish"],
  ["food", "fruits", "vegetables"],
  ["flowers", "trees", "mountains", "oceans"],
  ["airplanes", "boats", "buildings", "bridges", "roads", "signs"],
  ["phones", "computers", "books", "watches", "shoes", "bags", "clothes"],
  ["people_men", "people_women", "people_children", "people_seniors"],
  ["tools", "pens", "toys", "traffic_lights", "crosswalks"],
]

export function ImageChallenge({ lang, onVerify, onReload, difficulty = 5, gridSize: propGridSize, targetCount: propTargetCount }: Props) {
  const t = useCaptchaLang(lang)
  const fr = lang === "fr"
  const mediaLib = getMediaLibrary()

  const [tiles, setTiles] = React.useState<{ item: MediaItem; isTarget: boolean }[]>([])
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [targetCategory, setTargetCategory] = React.useState("")
  const [targetLabel, setTargetLabel] = React.useState("")
  const [error, setError] = React.useState(false)
  const [attempts, setAttempts] = React.useState(0)
  const [loadedImages, setLoadedImages] = React.useState<Set<string>>(new Set())
  const [verifying, setVerifying] = React.useState(false)

  React.useEffect(() => { generate() }, [difficulty, lang])

  function shuffle<T>(arr: T[]): T[] {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  function generate() {
    const group = CATEGORY_GROUPS[Math.floor(Math.random() * CATEGORY_GROUPS.length)]
    const cat = group[Math.floor(Math.random() * group.length)]
    setTargetCategory(cat)
    setTargetLabel(getCategoryLabel(cat, lang))

    const lib = getMediaLibrary()
    const pool = lib.getByCategory(cat)
    const distractors = lib.getItems().filter((m) => m.category !== cat && !group.includes(m.category as any))

    const targetCount = propTargetCount ?? (difficulty > 7 ? 4 : difficulty > 4 ? 3 : 2)
    const targets = shuffle(pool).slice(0, targetCount)
    const fillerCount = (propGridSize ?? 16) - targets.length
    const filler = shuffle(distractors).slice(0, fillerCount)

    const combined = shuffle([
      ...targets.map((item) => ({ item, isTarget: true })),
      ...filler.map((item) => ({ item, isTarget: false })),
    ])

    setTiles(combined)
    setSelected(new Set())
    setError(false)
    setVerifying(false)
  }

  function toggleTile(id: string) {
    if (verifying) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setError(false)
  }

  function handleVerify() {
    if (verifying) return
    setVerifying(true)

    const correct = tiles.filter((t) => t.isTarget).map((t) => t.item.id)
    const allCorrect = correct.every((id) => selected.has(id))
    const noWrong = tiles.filter((t) => !t.isTarget).every((t) => !selected.has(t.item.id))

    setTimeout(() => {
      if (allCorrect && noWrong && selected.size === correct.length) {
        onVerify(true)
      } else {
        const newCount = attempts + 1
        setAttempts(newCount)
        if (newCount >= 3) { onVerify(false); return }
        setError(true)
        setVerifying(false)
        setTimeout(() => generate(), 300)
      }
    }, 150)
  }

  function handleImageLoad(id: string) {
    setLoadedImages((prev) => new Set(prev).add(id))
  }

  const gridCols = "grid-cols-4"

  return (
    <div className="animate-in fade-in duration-200">
      <p className="mb-1.5 text-[12px] font-medium text-foreground text-center leading-tight">
        {fr
          ? `Sélectionnez les images « ${targetLabel} »`
          : `Select all images with "${targetLabel}"`}
      </p>

      {error && (
        <div className="mb-1.5 flex items-center gap-1.5 rounded bg-destructive/5 px-2 py-1 text-[10px] text-destructive">
          <AlertCircle className="size-3 shrink-0" />
          <span>{t("error.incorrect")} ({3 - attempts})</span>
        </div>
      )}

      <div className={cn("grid gap-0.5", gridCols)}>
        {tiles.map(({ item }) => {
          const isSelected = selected.has(item.id)
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => toggleTile(item.id)}
              className={cn(
                "group relative aspect-square overflow-hidden border-2 transition-all duration-100",
                isSelected
                  ? "border-accent shadow-sm"
                  : "border-transparent hover:border-accent/40 hover:shadow-sm",
                verifying && "pointer-events-none"
              )}
            >
              {!loadedImages.has(item.id) && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                  <div className="size-3 rounded-full border-2 border-muted-foreground/20 border-t-accent animate-spin" />
                </div>
              )}
              <img
                src={item.thumbnailUrl || item.url}
                alt=""
                loading="lazy"
                onLoad={() => handleImageLoad(item.id)}
                className={cn("h-full w-full object-cover transition-opacity duration-150", loadedImages.has(item.id) ? "opacity-100" : "opacity-0")}
              />
              {isSelected && (
                <div className="absolute inset-0 bg-accent/20 flex items-center justify-center">
                  <div className="flex size-4 items-center justify-center rounded-full bg-accent text-white text-[8px] font-bold shadow animate-in zoom-in duration-100">
                    <CheckCircle2 className="size-2.5" />
                  </div>
                </div>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-2 mt-1.5">
        <button
          type="button"
          onClick={() => { generate(); onReload?.() }}
          className="flex items-center gap-1 rounded px-2 py-1 text-[10px] text-muted-foreground hover:bg-muted/30 transition-colors"
        >
          <RotateCw className="size-2.5" />
          {t("reload")}
        </button>
        <button
          type="button"
          onClick={handleVerify}
          disabled={selected.size === 0 || verifying}
          className="ml-auto flex items-center gap-1 rounded bg-accent px-3 py-1 text-[10px] font-semibold text-accent-foreground shadow-sm transition-all hover:shadow active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {verifying ? <div className="size-2.5 rounded-full border-2 border-accent-foreground/30 border-t-accent-foreground animate-spin" /> : t("verify")}
        </button>
      </div>
    </div>
  )
}
