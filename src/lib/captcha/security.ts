import type { BehavioralData, RiskAssessment, RiskSignal } from "./types"

const SIGNALS: RiskSignal[] = [
  { name: "mouse_human", weight: 0.2, value: 0, description: "Mouse movement human-likeness" },
  { name: "click_natural", weight: 0.15, value: 0, description: "Click pattern naturalness" },
  { name: "timing", weight: 0.12, value: 0, description: "Response timing analysis" },
  { name: "keystroke", weight: 0.08, value: 0, description: "Keystroke dynamics" },
  { name: "viewport", weight: 0.08, value: 0, description: "Viewport consistency" },
  { name: "touch_human", weight: 0.08, value: 0, description: "Touch gesture human-likeness" },
  { name: "repetition", weight: 0.1, value: 0, description: "Repetitive behavior detection" },
  { name: "cursor_pressure", weight: 0.08, value: 0, description: "Cursor movement pressure" },
  { name: "scroll_pattern", weight: 0.06, value: 0, description: "Scroll behavior analysis" },
  { name: "device_consistency", weight: 0.05, value: 0, description: "Device fingerprint consistency" },
]

function analyzeMouseMovements(data: BehavioralData): number {
  const moves = data.mouseMovements
  if (moves.length < 5) return 0.5

  let score = 0
  const dx: number[] = []
  const dy: number[] = []
  const dt: number[] = []

  for (let i = 1; i < moves.length; i++) {
    dx.push(moves[i].x - moves[i - 1].x)
    dy.push(moves[i].y - moves[i - 1].y)
    dt.push(moves[i].t - moves[i - 1].t)
  }

  const absDx = dx.map(Math.abs)
  const absDy = dy.map(Math.abs)
  const avgDx = absDx.reduce((a, b) => a + b, 0) / absDx.length
  const avgDy = absDy.reduce((a, b) => a + b, 0) / absDy.length
  const avgDt = dt.reduce((a, b) => a + b, 0) / dt.length

  if (avgDx > 1 && avgDx < 300) score += 0.25
  if (avgDy > 1 && avgDy < 300) score += 0.15
  if (avgDt > 5 && avgDt < 600) score += 0.2

  const varianceX = absDx.reduce((a, d) => a + (d - avgDx) ** 2, 0) / absDx.length
  const varianceY = absDy.reduce((a, d) => a + (d - avgDy) ** 2, 0) / absDy.length
  if (varianceX > 5 && varianceX < 15000) score += 0.15
  if (varianceY > 5 && varianceY < 15000) score += 0.15

  let curviness = 0
  for (let i = 2; i < moves.length; i++) {
    const dx1 = moves[i - 1].x - moves[i - 2].x
    const dy1 = moves[i - 1].y - moves[i - 2].y
    const dx2 = moves[i].x - moves[i - 1].x
    const dy2 = moves[i].y - moves[i - 1].y
    const cross = Math.abs(dx1 * dy2 - dy1 * dx2)
    if (cross > 0.1) curviness++
  }
  const curvinessRatio = curviness / Math.max(1, moves.length - 2)
  if (curvinessRatio > 0.1 && curvinessRatio < 0.8) score += 0.1

  return Math.min(score, 1)
}

function analyzeClickPatterns(data: BehavioralData): number {
  const clicks = data.clickEvents
  if (clicks.length < 2) return 0.5

  let score = 0
  const intervals: number[] = []

  for (let i = 1; i < clicks.length; i++) {
    intervals.push(clicks[i].t - clicks[i - 1].t)
  }

  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
  if (avgInterval > 60 && avgInterval < 3000) score += 0.3

  const variance = intervals.reduce((a, i) => a + (i - avgInterval) ** 2, 0) / intervals.length
  if (variance > 50) score += 0.3

  const distances: number[] = []
  for (let i = 1; i < clicks.length; i++) {
    const d = Math.sqrt(
      (clicks[i].x - clicks[i - 1].x) ** 2 + (clicks[i].y - clicks[i - 1].y) ** 2
    )
    distances.push(d)
  }
  const avgDist = distances.reduce((a, b) => a + b, 0) / distances.length
  if (avgDist > 10 && avgDist < 800) score += 0.2

  return Math.min(score, 1)
}

function analyzeResponseTiming(data: BehavioralData): number {
  const totalTime = data.timeSinceLoad
  if (totalTime < 300) return 0
  if (totalTime < 800) return 0.2
  if (totalTime < 2000) return 0.5
  if (totalTime < 5000) return 0.7
  if (totalTime < 60000) return 0.9
  return 0.8
}

function analyzeKeystrokes(data: BehavioralData): number {
  const keys = data.keystrokes
  if (!keys || keys.length < 3) return 0.5

  let score = 0
  const intervals: number[] = []

  for (let i = 1; i < keys.length; i++) {
    if (keys[i].interval !== undefined) intervals.push(keys[i].interval!)
  }

  if (intervals.length < 2) return 0.5

  const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length
  if (avg > 30 && avg < 600) score += 0.3

  const variance = intervals.reduce((a, i) => a + (i - avg) ** 2, 0) / intervals.length
  if (variance > 30) score += 0.3

  const holds = keys.filter((k) => k.interval !== undefined).map((k) => k.interval!)
  if (holds.length > 0) {
    const avgHold = holds.reduce((a, b) => a + b, 0) / holds.length
    if (avgHold > 20 && avgHold < 400) score += 0.2
  }

  return Math.min(score, 1)
}

function analyzeViewport(data: BehavioralData): number {
  if (!data.viewport.width || !data.viewport.height) return 0.5

  const isMobile = /Mobile|Android|iPhone|iPad/i.test(data.userAgent)
  const isTablet = /iPad|Tablet/i.test(data.userAgent)

  if (isMobile && data.viewport.width > 2000) return 0
  if (!isMobile && data.viewport.width < 320) return 0
  if (isTablet && data.viewport.width < 600) return 0.3

  const ratio = data.viewport.width / data.viewport.height
  if (ratio > 0.3 && ratio < 3) return 0.9

  return 0.7
}

function analyzeTouchGestures(data: BehavioralData): number {
  const touches = data.touchEvents
  if (!touches || touches.length < 3) return 0.5

  let score = 0
  for (let i = 1; i < touches.length; i++) {
    const dx = Math.abs(touches[i].x - touches[i - 1].x)
    const dy = Math.abs(touches[i].y - touches[i - 1].y)
    const dt = touches[i].t - touches[i - 1].t

    if (dx < 400 && dy < 400 && dt > 8 && dt < 1500) score += 0.2
    else return Math.min(score, 1)
  }

  return Math.min(score, 1)
}

function detectRepetition(data: BehavioralData): number {
  const moves = data.mouseMovements
  if (moves.length < 15) return 0.5

  let straightLines = 0
  let perfectGrid = 0
  for (let i = 2; i < moves.length; i++) {
    const dx1 = moves[i - 1].x - moves[i - 2].x
    const dy1 = moves[i - 1].y - moves[i - 2].y
    const dx2 = moves[i].x - moves[i - 1].x
    const dy2 = moves[i].y - moves[i - 1].y

    const angle1 = Math.atan2(dy1, dx1)
    const angle2 = Math.atan2(dy2, dx2)

    if (Math.abs(angle1 - angle2) < 0.03) straightLines++
    if (Math.abs(dx1) === Math.abs(dx2) && Math.abs(dy1) === Math.abs(dy2)) perfectGrid++
  }

  const straightRatio = straightLines / (moves.length - 2)
  const gridRatio = perfectGrid / (moves.length - 2)

  if (straightRatio > 0.8 || gridRatio > 0.6) return 0.1
  if (straightRatio > 0.6 || gridRatio > 0.4) return 0.3
  if (straightRatio > 0.4) return 0.6
  return 0.85
}

function analyzeCursorPressure(data: BehavioralData): number {
  const moves = data.mouseMovements
  if (moves.length < 10) return 0.5

  let score = 0

  const speeds: number[] = []
  for (let i = 1; i < moves.length; i++) {
    const dx = moves[i].x - moves[i - 1].x
    const dy = moves[i].y - moves[i - 1].y
    const dt = moves[i].t - moves[i - 1].t
    if (dt > 0) {
      speeds.push(Math.sqrt(dx * dx + dy * dy) / dt)
    }
  }

  if (speeds.length > 0) {
    const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length
    if (avgSpeed > 0.1 && avgSpeed < 2) score += 0.4

    const speedVariance = speeds.reduce((a, s) => a + (s - avgSpeed) ** 2, 0) / speeds.length
    if (speedVariance > 0.01) score += 0.3

    const hasAcceleration = speeds.some((s, i) => i > 0 && Math.abs(s - speeds[i - 1]) > 0.3)
    if (hasAcceleration) score += 0.3
  }

  return Math.min(score, 1)
}

function analyzeScrollPattern(data: BehavioralData): number {
  const scrolls = data.scrollEvents
  if (!scrolls || scrolls.length < 3) return 0.5

  let score = 0
  const intervals: number[] = []
  const deltas: number[] = []

  for (let i = 1; i < scrolls.length; i++) {
    intervals.push(scrolls[i].t - scrolls[i - 1].t)
    deltas.push(Math.abs(scrolls[i].y - scrolls[i - 1].y))
  }

  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
  const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length

  if (avgInterval > 50 && avgInterval < 1000) score += 0.4
  if (avgDelta > 5 && avgDelta < 500) score += 0.3

  const hasDirectionChange = deltas.some((d, i) => i > 0 && (scrolls[i].y - scrolls[i - 1].y) * (scrolls[i - 1].y - scrolls[i > 1 ? i - 2 : 0].y) < 0)
  if (hasDirectionChange) score += 0.3

  return Math.min(score, 1)
}

function analyzeDeviceConsistency(data: BehavioralData): number {
  const ua = data.userAgent
  if (!ua) return 0.5

  let score = 0.7

  const hasGPU = /WebGL|GPU|NVIDIA|AMD|Intel/i.test(ua) || true
  if (hasGPU) score += 0.1

  const hasTouchSupport = 'ontouchstart' in window
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua)
  if ((isMobile && hasTouchSupport) || (!isMobile && !hasTouchSupport)) {
    score += 0.2
  }

  return Math.min(score, 1)
}

export function assessRisk(data: BehavioralData): RiskAssessment {
  const signals: RiskSignal[] = SIGNALS.map((s) => {
    let value = 0.5
    switch (s.name) {
      case "mouse_human": value = analyzeMouseMovements(data); break
      case "click_natural": value = analyzeClickPatterns(data); break
      case "timing": value = analyzeResponseTiming(data); break
      case "keystroke": value = analyzeKeystrokes(data); break
      case "viewport": value = analyzeViewport(data); break
      case "touch_human": value = analyzeTouchGestures(data); break
      case "repetition": value = detectRepetition(data); break
      case "cursor_pressure": value = analyzeCursorPressure(data); break
      case "scroll_pattern": value = analyzeScrollPattern(data); break
      case "device_consistency": value = analyzeDeviceConsistency(data); break
    }
    return { ...s, value }
  })

  const totalWeight = signals.reduce((a, s) => a + s.weight, 0)
  const weightedScore = signals.reduce((a, s) => a + s.value * s.weight, 0) / totalWeight

  const score = Math.round(weightedScore * 100)
  const isAutomated = score < 35
  const confidence = Math.round(signals.reduce((a, s) => a + Math.abs(s.value - 0.5) * s.weight, 0) / totalWeight * 100)

  return { score, isAutomated, confidence, signals }
}

export function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(36).padStart(2, "0")).join("")
}

export function signToken(token: string, secret: string): string {
  return btoa(`${token}.${btoa(secret)}`)
}

export function verifyToken(signed: string, secret: string): boolean {
  try {
    const decoded = atob(signed)
    const [token, hash] = decoded.split(".")
    if (!token || !hash) return false
    return atob(hash) === secret
  } catch { return false }
}

const TRACKER_KEY = "savemali_captcha_risk"

export interface RiskHistoryEntry {
  score: number
  time: number
  type: string
}

export function recordRiskScore(score: number, type: string): void {
  try {
    const raw = localStorage.getItem(TRACKER_KEY)
    const history: RiskHistoryEntry[] = raw ? JSON.parse(raw) : []
    history.push({ score, time: Date.now(), type })
    if (history.length > 100) history.splice(0, history.length - 100)
    localStorage.setItem(TRACKER_KEY, JSON.stringify(history))
  } catch { }
}

export function getRiskHistory(): RiskHistoryEntry[] {
  try {
    const raw = localStorage.getItem(TRACKER_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export type BotDetector = "selenium" | "puppeteer" | "playwright" | "headless" | "webdriver"

export function detectBot(): BotDetector[] {
  const ua = navigator.userAgent
  const detected: BotDetector[] = []

  if (/selenium/i.test(ua)) detected.push("selenium")
  if (/puppeteer/i.test(ua)) detected.push("puppeteer")
  if (/playwright/i.test(ua)) detected.push("playwright")
  if (/Headless/i.test(ua)) detected.push("headless")
  if ((navigator as any).webdriver === true) detected.push("webdriver")

  return detected
}
