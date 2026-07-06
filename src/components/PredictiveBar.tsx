import * as React from "react"
import {
  Clock, Zap, BarChart3, TrendingUp, X, ChevronRight,
  Sparkles, Activity, Flame
} from "lucide-react"
import { cn } from "@/lib/utils"
import { usePredictiveContext } from "@/hooks/use-predictive-context"
import { useLanguage } from "@/lib/i18n"
import type { Page } from "@/App"

const ICONS: Record<string, typeof Clock> = {
  clock: Clock,
  zap: Zap,
  "bar-chart": BarChart3,
  "trending-up": TrendingUp,
  activity: Activity,
}

const TYPE_STYLES: Record<string, string> = {
  shortcut: "border-primary/20 bg-primary/5",
  insight: "border-accent/20 bg-accent/5",
  reminder: "border-warning/20 bg-warning/5",
  tip: "border-success/20 bg-success/5",
}

const TYPE_LABELS: Record<string, Record<string, string>> = {
  shortcut: { fr: "Raccourci", en: "Shortcut" },
  insight: { fr: "Aperçu", en: "Insight" },
  reminder: { fr: "Rappel", en: "Reminder" },
  tip: { fr: "Conseil", en: "Tip" },
}

interface Props {
  onNavigate: (page: Page) => void
}

export const PredictiveBar = React.memo(function PredictiveBar({ onNavigate }: Props) {
  const { suggestions, visible, setVisible, setDismissed, stats } = usePredictiveContext()
  const { lang } = useLanguage()
  const fr = lang === "fr"
  const [expanded, setExpanded] = React.useState(false)
  const barRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!visible) setExpanded(false)
  }, [visible])

  if (!visible || suggestions.length === 0) return null

  const displayed = expanded ? suggestions : suggestions.slice(0, 2)

  return (
    <div
      ref={barRef}
      className={cn(
        "mx-auto w-full max-w-5xl px-4 transition-all duration-500",
        visible ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0 pointer-events-none"
      )}
    >
      <div className="relative overflow-hidden rounded-xl border border-border/50 bg-surface/80 backdrop-blur-md shadow-sm">
        {/* Subtle gradient accent */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/3 via-accent/3 to-primary/3 pointer-events-none" />

        {/* Header */}
        <div className="relative flex items-center justify-between px-4 py-2.5 border-b border-border/30">
          <div className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded-md bg-primary/10">
              <Sparkles className="size-3.5 text-primary" />
            </div>
            <span className="text-xs font-semibold text-text-heading tracking-wide uppercase">
              {fr ? "Contexte Prédictif" : "Predictive Context"}
            </span>
            {stats.streak > 1 && (
              <div className="flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5">
                <Flame className="size-3 text-warning" />
                <span className="text-[10px] font-bold text-warning">
                  {stats.streak}{fr ? "j" : "d"}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {suggestions.length > 2 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="rounded-md px-2 py-1 text-[10px] font-medium text-text-body hover:bg-muted/50 transition-colors"
              >
                {expanded
                  ? fr ? "Moins" : "Less"
                  : fr ? `+${suggestions.length - 2}` : `+${suggestions.length - 2}`}
              </button>
            )}
            <button
              onClick={() => setDismissed()}
              className="flex size-5 items-center justify-center rounded-md text-text-subtle hover:bg-muted/50 hover:text-text-heading transition-colors"
              aria-label={fr ? "Fermer" : "Close"}
            >
              <X className="size-3" />
            </button>
          </div>
        </div>

        {/* Suggestions grid */}
        <div className="relative grid gap-2 p-3 sm:grid-cols-2">
          {displayed.map((suggestion) => {
            const Icon = ICONS[suggestion.icon] ?? Zap
            return (
              <button
                key={suggestion.id}
                onClick={() => {
                  onNavigate(suggestion.page as Page)
                  setDismissed()
                }}
                className={cn(
                  "group flex items-start gap-3 rounded-lg border p-3 text-left transition-all hover:shadow-sm",
                  TYPE_STYLES[suggestion.type] ?? "border-border/30 bg-surface/50"
                )}
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface/80 border border-border/30 group-hover:scale-105 transition-transform">
                  <Icon className="size-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="inline-block rounded-full bg-primary/10 px-1.5 py-px text-[9px] font-bold text-primary uppercase tracking-wider">
                      {TYPE_LABELS[suggestion.type]?.[lang] ?? suggestion.type}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-text-heading truncate">
                    {suggestion.title}
                  </p>
                  <p className="text-xs text-text-body truncate mt-0.5">
                    {suggestion.description}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 mt-1 text-text-subtle group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </button>
            )
          })}
        </div>

        {/* Stats footer */}
        {stats.totalActions > 0 && (
          <div className="relative border-t border-border/30 px-4 py-2 flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Activity className="size-3 text-text-subtle" />
              <span className="text-[10px] text-text-body">
                {stats.totalActions} {fr ? "actions" : "actions"}
              </span>
            </div>
            {stats.topModule && (
              <div className="flex items-center gap-1.5">
                <BarChart3 className="size-3 text-text-subtle" />
                <span className="text-[10px] text-text-body capitalize">{stats.topModule}</span>
              </div>
            )}
            {stats.peakHour !== null && (
              <div className="flex items-center gap-1.5">
                <Clock className="size-3 text-text-subtle" />
                <span className="text-[10px] text-text-body">
                  {fr ? "Pic à" : "Peak at"} {stats.peakHour}h
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
})
