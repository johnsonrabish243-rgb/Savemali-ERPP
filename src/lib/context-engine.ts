import { type ContextEvent, getEvents } from "./context-tracker"

export interface Pattern {
  page: string
  module?: string
  feature?: string
  count: number
  hours: number[]
  days: number[]
}

export interface Suggestion {
  id: string
  type: "shortcut" | "insight" | "reminder" | "tip"
  page: string
  module?: string
  feature?: string
  title: string
  description: string
  icon: string
  priority: number
  action?: () => void
}

const HOUR_BRACKET_SIZE = 2

function getHourBracket(hour: number): number {
  return Math.floor(hour / HOUR_BRACKET_SIZE) * HOUR_BRACKET_SIZE
}

function analyzePagePatterns(events: ContextEvent[]): Pattern[] {
  const patternMap = new Map<string, Pattern>()

  for (const event of events) {
    if (event.type !== "page_view") continue

    const key = `${event.page}|${event.module ?? ""}|${event.feature ?? ""}`
    const existing = patternMap.get(key)

    if (existing) {
      existing.count++
      if (!existing.hours.includes(getHourBracket(event.hour))) {
        existing.hours.push(getHourBracket(event.hour))
      }
      if (!existing.days.includes(event.dayOfWeek)) {
        existing.days.push(event.dayOfWeek)
      }
    } else {
      patternMap.set(key, {
        page: event.page,
        module: event.module,
        feature: event.feature,
        count: 1,
        hours: [getHourBracket(event.hour)],
        days: [event.dayOfWeek],
      })
    }
  }

  return Array.from(patternMap.values()).sort((a, b) => b.count - a.count)
}

function analyzeActionPatterns(events: ContextEvent[]): Pattern[] {
  const patternMap = new Map<string, Pattern>()

  for (const event of events) {
    if (!event.type.startsWith("action_")) continue

    const key = `${event.page}|${event.module ?? ""}|${event.feature ?? ""}|${event.type}`
    const existing = patternMap.get(key)

    if (existing) {
      existing.count++
      if (!existing.hours.includes(getHourBracket(event.hour))) {
        existing.hours.push(getHourBracket(event.hour))
      }
      if (!existing.days.includes(event.dayOfWeek)) {
        existing.days.push(event.dayOfWeek)
      }
    } else {
      patternMap.set(key, {
        page: event.page,
        module: event.module,
        feature: event.feature,
        count: 1,
        hours: [getHourBracket(event.hour)],
        days: [event.dayOfWeek],
      })
    }
  }

  return Array.from(patternMap.values()).sort((a, b) => b.count - a.count)
}

function analyzeTimePatterns(events: ContextEvent[]): {
  peakHours: number[]
  peakDays: number[]
  activeModules: string[]
} {
  const hourCounts = new Array(24).fill(0)
  const dayCounts = new Array(7).fill(0)
  const moduleCounts = new Map<string, number>()

  for (const event of events) {
    hourCounts[event.hour]++
    dayCounts[event.dayOfWeek]++
    if (event.module) {
      moduleCounts.set(event.module, (moduleCounts.get(event.module) ?? 0) + 1)
    }
  }

  const avgHourCount = hourCounts.reduce((a, b) => a + b, 0) / 24
  const peakHours = hourCounts
    .map((count, hour) => ({ hour, count }))
    .filter((h) => h.count > avgHourCount * 1.2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((h) => h.hour)

  const avgDayCount = dayCounts.reduce((a, b) => a + b, 0) / 7
  const peakDays = dayCounts
    .map((count, day) => ({ day, count }))
    .filter((d) => d.count > avgDayCount * 1.1)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((d) => d.day)

  const activeModules = Array.from(moduleCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([mod]) => mod)

  return { peakHours, peakDays, activeModules }
}

function generateSuggestions(
  events: ContextEvent[],
  currentPage: string,
  currentHour: number,
  currentDay: number,
  lang: "fr" | "en"
): Suggestion[] {
  const suggestions: Suggestion[] = []
  const pagePatterns = analyzePagePatterns(events)
  const actionPatterns = analyzeActionPatterns(events)
  const timePatterns = analyzeTimePatterns(events)
  const currentBracket = getHourBracket(currentHour)

  const fr = lang === "fr"

  // Time-based suggestions
  const timeRelevant = pagePatterns.filter((p) =>
    p.hours.includes(currentBracket) && p.page !== currentPage
  )

  for (const pattern of timeRelevant.slice(0, 2)) {
    const moduleLabel = pattern.module
      ? fr
        ? { pharmacy: "Pharmacie", commerce: "Commerce", education: "Éducation", gestion: "Gestion", hr: "Ressources Humaines" }[pattern.module] ?? pattern.module
        : { pharmacy: "Pharmacy", commerce: "Commerce", education: "Education", gestion: "Management", hr: "Human Resources" }[pattern.module] ?? pattern.module
      : ""

    suggestions.push({
      id: `time-${pattern.page}`,
      type: "shortcut",
      page: pattern.page,
      module: pattern.module,
      title: fr
        ? `Accéder à ${moduleLabel || pattern.page}`
        : `Go to ${moduleLabel || pattern.page}`,
      description: fr
        ? `Vous visitez souvent cette page à cette heure-ci (${pattern.count} fois)`
        : `You often visit this page at this time (${pattern.count} times)`,
      icon: "clock",
      priority: 80 + pattern.count,
    })
  }

  // Frequent action shortcuts
  const frequentActions = actionPatterns.filter((p) => p.count >= 3)
  for (const pattern of frequentActions.slice(0, 2)) {
    const actionType = pattern.feature ?? pattern.page
    const actionLabel = fr
      ? {
          add_student: "Ajouter un élève",
          add_medicine: "Ajouter un médicament",
          add_product: "Ajouter un produit",
          view_sales: "Consulter les ventes",
          view_reports: "Consulter les rapports",
          search: "Rechercher",
          export: "Exporter les données",
        }[actionType] ?? actionType
      : {
          add_student: "Add student",
          add_medicine: "Add medicine",
          add_product: "Add product",
          view_sales: "View sales",
          view_reports: "View reports",
          search: "Search",
          export: "Export data",
        }[actionType] ?? actionType

    suggestions.push({
      id: `action-${pattern.page}-${pattern.feature}`,
      type: "shortcut",
      page: pattern.page,
      module: pattern.module,
      feature: pattern.feature,
      title: actionLabel,
      description: fr
        ? `Action répétée ${pattern.count} fois`
        : `Repeated ${pattern.count} times`,
      icon: "zap",
      priority: 70 + pattern.count,
    })
  }

  // Weekly insights
  if (events.length >= 10) {
    const totalActions = events.filter((e) => e.type.startsWith("action_")).length
    const uniqueModules = new Set(events.filter((e) => e.module).map((e) => e.module)).size

    if (totalActions > 0) {
      suggestions.push({
        id: "insight-summary",
        type: "insight",
        page: currentPage,
        title: fr ? "Résumé d'activité" : "Activity summary",
        description: fr
          ? `${totalActions} actions cette semaine sur ${uniqueModules} module${uniqueModules > 1 ? "s" : ""}`
          : `${totalActions} actions this week across ${uniqueModules} module${uniqueModules > 1 ? "s" : ""}`,
        icon: "bar-chart",
        priority: 50,
      })
    }
  }

  // Day-specific tips
  const dayNames = fr
    ? ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]
    : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

  if (timePatterns.peakDays.includes(currentDay) && events.length >= 5) {
    suggestions.push({
      id: `tip-day-${currentDay}`,
      type: "tip",
      page: currentPage,
      title: fr ? `${dayNames[currentDay]} productif` : `Productive ${dayNames[currentDay]}`,
      description: fr
        ? `${dayNames[currentDay]} est l'un de vos jours les plus actifs`
        : `${dayNames[currentDay]} is one of your most active days`,
      icon: "trending-up",
      priority: 40,
    })
  }

  return suggestions.sort((a, b) => b.priority - a.priority).slice(0, 4)
}

export function analyzeContext(
  currentPage: string,
  lang: "fr" | "en" = "fr"
): {
  suggestions: Suggestion[]
  patterns: Pattern[]
  timePatterns: ReturnType<typeof analyzeTimePatterns>
} {
  const events = getEvents()
  const now = new Date()
  const currentHour = now.getHours()
  const currentDay = now.getDay()

  return {
    suggestions: generateSuggestions(events, currentPage, currentHour, currentDay, lang),
    patterns: analyzePagePatterns(events),
    timePatterns: analyzeTimePatterns(events),
  }
}

export function getQuickStats(events: ContextEvent[]): {
  totalActions: number
  topModule: string | null
  peakHour: number | null
  streak: number
} {
  if (events.length === 0) {
    return { totalActions: 0, topModule: null, peakHour: null, streak: 0 }
  }

  const actionEvents = events.filter((e) => e.type.startsWith("action_"))

  const moduleCounts = new Map<string, number>()
  for (const e of events) {
    if (e.module) {
      moduleCounts.set(e.module, (moduleCounts.get(e.module) ?? 0) + 1)
    }
  }
  const topModule = Array.from(moduleCounts.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  const hourCounts = new Array(24).fill(0)
  for (const e of events) {
    hourCounts[e.hour]++
  }
  const peakHour = hourCounts.indexOf(Math.max(...hourCounts))

  // Calculate streak (consecutive days with activity)
  const daySet = new Set<string>()
  for (const e of events) {
    const d = new Date(e.timestamp)
    daySet.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`)
  }
  const sortedDays = Array.from(daySet).sort().reverse()
  let streak = 0
  const today = new Date()
  for (let i = 0; i < sortedDays.length; i++) {
    const checkDate = new Date(today)
    checkDate.setDate(checkDate.getDate() - i)
    const key = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`
    if (daySet.has(key)) {
      streak++
    } else {
      break
    }
  }

  return {
    totalActions: actionEvents.length,
    topModule,
    peakHour,
    streak,
  }
}
