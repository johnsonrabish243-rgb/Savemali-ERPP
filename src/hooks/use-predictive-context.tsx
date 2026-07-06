import * as React from "react"
import { analyzeContext, getQuickStats, type Suggestion, type Pattern } from "@/lib/context-engine"
import { getEvents } from "@/lib/context-tracker"
import { useLanguage } from "@/lib/i18n"

interface PredictiveContext {
  suggestions: Suggestion[]
  patterns: Pattern[]
  stats: {
    totalActions: number
    topModule: string | null
    peakHour: number | null
    streak: number
  }
  visible: boolean
  setVisible: (v: boolean) => void
  dismissed: boolean
  setDismissed: (v: boolean) => void
  refresh: () => void
  setCurrentPage: (page: string) => void
}

const PredictiveCtx = React.createContext<PredictiveContext | undefined>(undefined)

export function PredictiveProvider({ children }: { children: React.ReactNode }) {
  const { lang } = useLanguage()
  const [suggestions, setSuggestions] = React.useState<Suggestion[]>([])
  const [patterns, setPatterns] = React.useState<Pattern[]>([])
  const [stats, setStats] = React.useState({ totalActions: 0, topModule: null, peakHour: null, streak: 0 })
  const [visible, setVisible] = React.useState(false)
  const [dismissed, setDismissed] = React.useState(false)
  const [currentPage, setCurrentPage] = React.useState("home")
  const timerRef = React.useRef<ReturnType<typeof setTimeout>>()
  const autoHideRef = React.useRef<ReturnType<typeof setTimeout>>()

  const refresh = React.useCallback(() => {
    const ctx = analyzeContext(currentPage, lang)
    const events = getEvents()
    const quickStats = getQuickStats(events)
    setSuggestions(ctx.suggestions)
    setPatterns(ctx.patterns)
    setStats(quickStats)
  }, [currentPage, lang])

  React.useEffect(() => {
    refresh()
  }, [refresh])

  React.useEffect(() => {
    if (dismissed) {
      setVisible(false)
      return
    }

    if (timerRef.current) clearTimeout(timerRef.current)
    if (autoHideRef.current) clearTimeout(autoHideRef.current)

    timerRef.current = setTimeout(() => {
      const events = getEvents()
      if (events.length >= 2) {
        setVisible(true)
        autoHideRef.current = setTimeout(() => {
          setVisible(false)
        }, 15000)
      }
    }, 30000)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (autoHideRef.current) clearTimeout(autoHideRef.current)
    }
  }, [currentPage, dismissed])

  const handleDismiss = React.useCallback(() => {
    setDismissed(true)
    setVisible(false)
  }, [])

  const handleSetCurrentPage = React.useCallback((page: string) => {
    setCurrentPage(page)
  }, [])

  React.useEffect(() => {
    if (dismissed) {
      const resetTimer = setTimeout(() => setDismissed(false), 5 * 60 * 1000)
      return () => clearTimeout(resetTimer)
    }
  }, [dismissed])

  return (
    <PredictiveCtx.Provider
      value={{
        suggestions,
        patterns,
        stats,
        visible,
        setVisible,
        dismissed,
        setDismissed: handleDismiss,
        refresh,
        setCurrentPage: handleSetCurrentPage,
      }}
    >
      {children}
    </PredictiveCtx.Provider>
  )
}

export function usePredictiveContext() {
  const ctx = React.useContext(PredictiveCtx)
  if (!ctx) throw new Error("usePredictiveContext must be used within PredictiveProvider")
  return ctx
}
