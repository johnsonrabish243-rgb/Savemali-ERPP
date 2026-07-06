const STORAGE_KEY = "savemali_context_events"
const MAX_EVENTS = 500
const RETENTION_DAYS = 30

export type EventType =
  | "page_view"
  | "action_create"
  | "action_edit"
  | "action_delete"
  | "action_search"
  | "action_export"
  | "module_open"
  | "feature_use"

export interface ContextEvent {
  id: string
  type: EventType
  page: string
  module?: string
  feature?: string
  timestamp: number
  hour: number
  dayOfWeek: number
  metadata?: Record<string, unknown>
}

let cachedEvents: ContextEvent[] | null = null
let saveTimeout: ReturnType<typeof setTimeout> | null = null

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function loadEvents(): ContextEvent[] {
  if (cachedEvents) return cachedEvents
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) { cachedEvents = []; return cachedEvents }
    const events: ContextEvent[] = JSON.parse(raw)
    const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000
    cachedEvents = events.filter((e) => e.timestamp > cutoff)
    return cachedEvents
  } catch {
    cachedEvents = []
    return cachedEvents
  }
}

function saveEventsDebounced(): void {
  if (saveTimeout) return
  saveTimeout = setTimeout(() => {
    if (cachedEvents) {
      const trimmed = cachedEvents.slice(-MAX_EVENTS)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
    }
    saveTimeout = null
  }, 500)
}

export function trackEvent(
  type: EventType,
  page: string,
  options?: { module?: string; feature?: string; metadata?: Record<string, unknown> }
): void {
  const now = new Date()
  const event: ContextEvent = {
    id: generateId(),
    type,
    page,
    module: options?.module,
    feature: options?.feature,
    timestamp: now.getTime(),
    hour: now.getHours(),
    dayOfWeek: now.getDay(),
    metadata: options?.metadata,
  }

  const events = loadEvents()
  events.push(event)
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS)
  saveEventsDebounced()
}

export function trackPageView(page: string, module?: string): void {
  trackEvent("page_view", page, { module })
}

export function trackAction(
  type: "action_create" | "action_edit" | "action_delete" | "action_search" | "action_export",
  page: string,
  feature?: string,
  module?: string
): void {
  trackEvent(type, page, { feature, module })
}

export function trackModuleOpen(module: string): void {
  trackEvent("module_open", module, { module })
}

export function trackFeatureUse(feature: string, page: string, module?: string): void {
  trackEvent("feature_use", page, { feature, module })
}

export function getEvents(): ContextEvent[] {
  return loadEvents()
}

export function getEventsForPage(page: string): ContextEvent[] {
  return loadEvents().filter((e) => e.page === page)
}

export function getEventsForModule(module: string): ContextEvent[] {
  return loadEvents().filter((e) => e.module === module)
}

export function getEventsInTimeRange(startMs: number, endMs: number): ContextEvent[] {
  return loadEvents().filter((e) => e.timestamp >= startMs && e.timestamp <= endMs)
}

export function clearEvents(): void {
  cachedEvents = null
  localStorage.removeItem(STORAGE_KEY)
}
