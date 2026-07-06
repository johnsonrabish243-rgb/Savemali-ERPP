import * as React from "react"
import { RotateCw, AlertCircle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCaptchaLang } from "@/lib/captcha/i18n"
import type { Language } from "@/lib/captcha/types"

interface Tile {
  id: number; shape: string; color: string
}

interface Props {
  lang: Language
  onVerify: (success: boolean) => void
  onReload?: () => void
  difficulty?: number
}

const SHAPES = ["circle", "square", "triangle", "diamond", "hexagon"] as const
const COLORS = ["#2563eb", "#dc2626", "#16a34a", "#9333ea", "#ea580c"] as const
const COLOR_MAP: Record<string, { fr: string; en: string }> = {
  "#2563eb": { fr: "bleues", en: "blue" },
  "#dc2626": { fr: "rouges", en: "red" },
  "#16a34a": { fr: "vertes", en: "green" },
  "#9333ea": { fr: "violettes", en: "purple" },
  "#ea580c": { fr: "oranges", en: "orange" },
}
const SHAPE_MAP: Record<string, { fr: string; en: string }> = {
  circle: { fr: "cercles", en: "circles" },
  square: { fr: "carrés", en: "squares" },
  triangle: { fr: "triangles", en: "triangles" },
  diamond: { fr: "losanges", en: "diamonds" },
  hexagon: { fr: "hexagones", en: "hexagons" },
}

function ShapeIcon({ shape, color, size = 28 }: { shape: string; color: string; size?: number }) {
  const s = size; const half = s / 2
  if (shape === "circle") return <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><circle cx={half} cy={half} r={half * 0.42} fill={color} /></svg>
  if (shape === "square") return <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><rect x={s * 0.08} y={s * 0.08} width={s * 0.84} height={s * 0.84} rx={2} fill={color} /></svg>
  if (shape === "triangle") return <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><polygon points={`${half},${s * 0.12} ${s * 0.88},${s * 0.88} ${s * 0.12},${s * 0.88}`} fill={color} /></svg>
  if (shape === "diamond") return <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><polygon points={`${half},${s * 0.1} ${s * 0.9},${half} ${half},${s * 0.9} ${s * 0.1},${half}`} fill={color} /></svg>
  if (shape === "hexagon") return <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><polygon points={`${half},${s * 0.04} ${s - s * 0.04},${s * 0.25} ${s - s * 0.04},${s * 0.75} ${half},${s - s * 0.04} ${s * 0.04},${s * 0.75} ${s * 0.04},${s * 0.25}`} fill={color} /></svg>
  return null
}

function shuffle<T>(a: T[]): T[] {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]] }
  return b
}

export function ShapeChallenge({ lang, onVerify, onReload, difficulty = 5 }: Props) {
  const t = useCaptchaLang(lang)
  const fr = lang === "fr"

  const [tiles, setTiles] = React.useState<Tile[]>([])
  const [selected, setSelected] = React.useState<Set<number>>(new Set())
  const [targetColor, setTargetColor] = React.useState("")
  const [targetShape, setTargetShape] = React.useState("")
  const [error, setError] = React.useState(false)
  const [attempts, setAttempts] = React.useState(0)
  const [verifying, setVerifying] = React.useState(false)

  React.useEffect(() => { generate() }, [difficulty])

  function generate() {
    const shapeTarget = SHAPES[Math.floor(Math.random() * SHAPES.length)]
    const colorTarget = COLORS[Math.floor(Math.random() * COLORS.length)]
    setTargetShape(shapeTarget)
    setTargetColor(colorTarget)

    const grid: Tile[] = []
    let id = 0
    const targetCount = Math.min(2 + Math.floor(difficulty / 4), 4)
    for (let i = 0; i < targetCount; i++) grid.push({ id: id++, shape: shapeTarget, color: colorTarget })
    for (let i = grid.length; i < 9; i++) {
      let s: string, c: string
      do { s = SHAPES[Math.floor(Math.random() * SHAPES.length)]; c = COLORS[Math.floor(Math.random() * COLORS.length)] }
      while (s === shapeTarget && c === colorTarget)
      grid.push({ id: id++, shape: s, color: c })
    }
    setTiles(shuffle(grid))
    setSelected(new Set())
    setError(false)
    setVerifying(false)
  }

  function toggleTile(id: number) {
    if (verifying) return
    setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
    setError(false)
  }

  function handleVerify() {
    if (verifying) return
    setVerifying(true)

    const correct = tiles.filter((t) => t.shape === targetShape && t.color === targetColor).map((t) => t.id)
    const allCorrect = correct.every((id) => selected.has(id))
    const noWrong = tiles.filter((t) => t.shape !== targetShape || t.color !== targetColor).every((t) => !selected.has(t.id))

    setTimeout(() => {
      if (allCorrect && noWrong && selected.size === correct.length) {
        onVerify(true)
      } else {
        const newCount = attempts + 1
        setAttempts(newCount)
        if (newCount >= 3) { onVerify(false); return }
        setError(true)
        setVerifying(false)
        setTimeout(() => generate(), 200)
      }
    }, 100)
  }

  const cHint = COLOR_MAP[targetColor]
  const sHint = SHAPE_MAP[targetShape]

  return (
    <div className="animate-in fade-in duration-150">
      <p className="mb-2 text-[13px] font-medium text-foreground text-center">
        {fr ? `Sélectionnez les ${sHint?.fr ?? ""} ${cHint?.fr ?? ""}` : `Select ${cHint?.en ?? ""} ${sHint?.en ?? ""}`}
      </p>

      {error && (
        <div className="mb-2 flex items-center gap-1.5 rounded bg-destructive/5 px-2.5 py-1.5 text-[11px] text-destructive">
          <AlertCircle className="size-3 shrink-0" />
          <span>{t("error.incorrect")} ({3 - attempts})</span>
        </div>
      )}

      <div className="mb-2 grid grid-cols-3 gap-1.5">
        {tiles.map((tile) => {
          const isSelected = selected.has(tile.id)
          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => toggleTile(tile.id)}
              className={cn(
                "relative flex aspect-square items-center justify-center rounded-lg border-2 transition-all duration-100",
                isSelected
                  ? "border-accent bg-accent/5 shadow-sm"
                  : "border-border/40 hover:border-accent/40 hover:bg-muted/20",
                verifying && "pointer-events-none"
              )}
            >
              <ShapeIcon shape={tile.shape} color={tile.color} size={28} />
              {isSelected && (
                <div className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-accent text-[9px] text-accent-foreground shadow animate-in zoom-in duration-100">
                  <CheckCircle2 className="size-2.5" />
                </div>
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
        <button
          type="button"
          onClick={handleVerify}
          disabled={selected.size === 0 || verifying}
          className="ml-auto flex items-center gap-1 rounded bg-accent px-4 py-1.5 text-[11px] font-semibold text-accent-foreground shadow-sm transition-all hover:shadow active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {verifying ? <div className="size-3 rounded-full border-2 border-accent-foreground/30 border-t-accent-foreground animate-spin" /> : t("verify")}
        </button>
      </div>
    </div>
  )
}
