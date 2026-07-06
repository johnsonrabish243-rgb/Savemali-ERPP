/* ── Enterprise Abuse Protection System for SaveMali ERP ── */

// ── Configuration ──
const CONFIG = {
  // Click speed detection
  maxClicksPerSecond: 8,
  clickWindowMs: 3000,
  clickViolationThreshold: 3,

  // Page refresh detection
  maxRefreshesPerMinute: 15,
  refreshViolationThreshold: 3,

  // Request loop detection
  maxRequestsPerSecond: 10,
  requestWindowMs: 5000,
  requestViolationThreshold: 3,

  // Bot detection
  botPatterns: [
    /bot/i, /spider/i, /crawler/i, /scraper/i, /curl/i, /wget/i,
    /python-requests/i, /python-urllib/i, /go-http-client/i,
    /java\//i, /perl/i, /ruby/i, /php\//i, /headless/i,
    /phantomjs/i, /selenium/i, /puppeteer/i, /playwright/i,
    /chrome-headless/i, /chrome-launcher/i, /devtools/i,
  ],

  // Lockout durations (progressive)
  lockoutDurations: [
    30 * 1000,       // 30 seconds
    2 * 60 * 1000,   // 2 minutes
    5 * 60 * 1000,   // 5 minutes
    15 * 60 * 1000,  // 15 minutes
    30 * 60 * 1000,  // 30 minutes
    60 * 60 * 1000,  // 1 hour
  ],

  // Storage keys
  storagePrefix: "savemali_abuse_",
  maxLogEntries: 200,
} as const

// ── Types ──
export interface AbuseViolation {
  type: "click_speed" | "page_refresh" | "request_loop" | "bot_detected" | "brute_force" | "scan_detected"
  timestamp: number
  details: string
  ip?: string
}

export interface AbuseRecord {
  violations: AbuseViolation[]
  lockoutUntil: number
  lockoutLevel: number
  totalViolations: number
}

export interface AbuseStatus {
  blocked: boolean
  lockoutUntil: number
  remainingMs: number
  lockoutLevel: number
  reason: string
}

// ── Storage Helpers ──
function getStorageKey(suffix: string): string {
  return `${CONFIG.storagePrefix}${suffix}`
}

function loadRecord(): AbuseRecord {
  try {
    const raw = localStorage.getItem(getStorageKey("record"))
    if (raw) return JSON.parse(raw)
  } catch {}
  return {
    violations: [],
    lockoutUntil: 0,
    lockoutLevel: 0,
    totalViolations: 0,
  }
}

function saveRecord(record: AbuseRecord): void {
  try {
    // Keep only recent violations (last 24h)
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    record.violations = record.violations.filter((v) => v.timestamp > cutoff)
    if (record.violations.length > CONFIG.maxLogEntries) {
      record.violations = record.violations.slice(-CONFIG.maxLogEntries)
    }
    localStorage.setItem(getStorageKey("record"), JSON.stringify(record))
  } catch {}
}

// ── Abuse Event Logger ──
export function logAbuseEvent(event: Omit<AbuseViolation, "timestamp">): void {
  const record = loadRecord()
  record.violations.push({ ...event, timestamp: Date.now() })
  saveRecord(record)
}

export function getAbuseLogs(): AbuseViolation[] {
  return loadRecord().violations
}

export function clearAbuseLogs(): void {
  const record = loadRecord()
  record.violations = []
  saveRecord(record)
}

// ── Lockout System ──
function applyLockout(record: AbuseRecord): AbuseRecord {
  const durationIndex = Math.min(
    record.lockoutLevel,
    CONFIG.lockoutDurations.length - 1
  )
  record.lockoutUntil = Date.now() + CONFIG.lockoutDurations[durationIndex]
  record.lockoutLevel++
  saveRecord(record)
  return record
}

export function getAbuseStatus(): AbuseStatus {
  const record = loadRecord()
  const now = Date.now()

  if (record.lockoutUntil > now) {
    return {
      blocked: true,
      lockoutUntil: record.lockoutUntil,
      remainingMs: record.lockoutUntil - now,
      lockoutLevel: record.lockoutLevel,
      reason: "Activité suspecte détectée. Accès temporairement limité.",
    }
  }

  // Auto-reset lockout if expired
  if (record.lockoutUntil > 0 && now >= record.lockoutUntil) {
    record.lockoutUntil = 0
    saveRecord(record)
  }

  return {
    blocked: false,
    lockoutUntil: 0,
    remainingMs: 0,
    lockoutLevel: record.lockoutLevel,
    reason: "",
  }
}

export function clearAbuseLockout(): void {
  const record = loadRecord()
  record.lockoutUntil = 0
  record.lockoutLevel = 0
  saveRecord(record)
}

// ── Click Speed Detection ──
const clickTimestamps: number[] = []
let clickViolationCount = 0

export function trackClick(): { allowed: boolean; isAbuse: boolean } {
  const now = Date.now()
  clickTimestamps.push(now)

  // Remove old timestamps outside window
  while (clickTimestamps.length > 0 && now - clickTimestamps[0] > CONFIG.clickWindowMs) {
    clickTimestamps.shift()
  }

  const clicksPerSecond = clickTimestamps.length / (CONFIG.clickWindowMs / 1000)

  if (clicksPerSecond > CONFIG.maxClicksPerSecond) {
    clickViolationCount++
    logAbuseEvent({
      type: "click_speed",
      details: `${clicksPerSecond.toFixed(1)} clics/seuil (${CONFIG.maxClicksPerSecond} max)`,
    })

    if (clickViolationCount >= CONFIG.clickViolationThreshold) {
      const record = loadRecord()
      applyLockout(record)
      return { allowed: false, isAbuse: true }
    }
    return { allowed: true, isAbuse: true }
  }

  // Reset violation count if normal behavior
  if (clickTimestamps.length < 3) {
    clickViolationCount = Math.max(0, clickViolationCount - 1)
  }

  return { allowed: true, isAbuse: false }
}

// ── Page Refresh Detection ──
const refreshTimestamps: number[] = []
let refreshViolationCount = 0

export function trackRefresh(): { allowed: boolean; isAbuse: boolean } {
  const now = Date.now()
  refreshTimestamps.push(now)

  // Remove old timestamps outside window (1 minute)
  while (refreshTimestamps.length > 0 && now - refreshTimestamps[0] > 60 * 1000) {
    refreshTimestamps.shift()
  }

  if (refreshTimestamps.length > CONFIG.maxRefreshesPerMinute) {
    refreshViolationCount++
    logAbuseEvent({
      type: "page_refresh",
      details: `${refreshTimestamps.length} rafraîchissements/minute (${CONFIG.maxRefreshesPerMinute} max)`,
    })

    if (refreshViolationCount >= CONFIG.refreshViolationThreshold) {
      const record = loadRecord()
      applyLockout(record)
      return { allowed: false, isAbuse: true }
    }
    return { allowed: true, isAbuse: true }
  }

  return { allowed: true, isAbuse: false }
}

// ── Request Loop Detection ──
const requestTimestamps: number[] = []
let requestViolationCount = 0

export function trackRequest(): { allowed: boolean; isAbuse: boolean } {
  const now = Date.now()
  requestTimestamps.push(now)

  // Remove old timestamps outside window
  while (requestTimestamps.length > 0 && now - requestTimestamps[0] > CONFIG.requestWindowMs) {
    requestTimestamps.shift()
  }

  const requestsPerSecond = requestTimestamps.length / (CONFIG.requestWindowMs / 1000)

  if (requestsPerSecond > CONFIG.maxRequestsPerSecond) {
    requestViolationCount++
    logAbuseEvent({
      type: "request_loop",
      details: `${requestsPerSecond.toFixed(1)} requêtes/seuil (${CONFIG.maxRequestsPerSecond} max)`,
    })

    if (requestViolationCount >= CONFIG.requestViolationThreshold) {
      const record = loadRecord()
      applyLockout(record)
      return { allowed: false, isAbuse: true }
    }
    return { allowed: true, isAbuse: true }
  }

  return { allowed: true, isAbuse: false }
}

// ── Bot Detection ──
export function detectBot(): { isBot: boolean; botType?: string } {
  const ua = navigator.userAgent

  for (const pattern of CONFIG.botPatterns) {
    if (pattern.test(ua)) {
      logAbuseEvent({
        type: "bot_detected",
        details: `User-Agent: ${ua.slice(0, 200)}`,
      })
      return { isBot: true, botType: pattern.source }
    }
  }

  // Detect headless browser properties
  if (typeof window !== "undefined") {
    const indicators = [
      "webdriver" in navigator && (navigator as any).webdriver,
      "callPhantom" in window,
      "_phantom" in window,
      "Phantom" in window,
      "__nightmare" in window,
      "buffer" in window,
      "emit" in window && !(window as any).emit?.toString?.().includes("[native code]"),
      "domAutomation" in window,
      "domAutomationController" in window,
    ]

    if (indicators.some(Boolean)) {
      logAbuseEvent({
        type: "bot_detected",
        details: "Headless browser indicators detected",
      })
      return { isBot: true, botType: "headless_browser" }
    }
  }

  return { isBot: false }
}

// ── Scan Detection ──
export function detectScan(path: string): { isScan: boolean; type?: string } {
  const scanPatterns = [
    { pattern: /\.env|\.git|\.htaccess|\.htpasswd|wp-admin|wp-login/i, type: "config_scan" },
    { pattern: /phpmyadmin|adminer|mysql|phpinfo/i, type: "admin_scan" },
    { pattern: /\.php|\.asp|\.aspx|\.jsp|\.cgi/i, type: "file_scan" },
    { pattern: /xmlrpc|rpc2|wp-json|feed/i, type: "api_scan" },
    { pattern: /login|register|admin|panel|dashboard/i, type: "auth_scan" },
    { pattern: /select|union|insert|update|delete|drop|exec|xp_/i, type: "sql_injection" },
    { pattern: /<script|javascript:|onerror|onload|eval\(|document\.cookie/i, type: "xss_attempt" },
    { pattern: /\.\.\/|%2e%2e|\.\.%2f|%252e/i, type: "path_traversal" },
  ]

  for (const { pattern, type } of scanPatterns) {
    if (pattern.test(path)) {
      logAbuseEvent({
        type: "scan_detected",
        details: `${type}: ${path.slice(0, 200)}`,
      })
      return { isScan: true, type }
    }
  }

  return { isScan: false }
}

// ── Comprehensive Check ──
export function performAbuseCheck(): AbuseStatus {
  // First check if already locked out
  const status = getAbuseStatus()
  if (status.blocked) return status

  // Detect bots
  const bot = detectBot()
  if (bot.isBot) {
    const record = loadRecord()
    applyLockout(record)
    return {
      blocked: true,
      lockoutUntil: record.lockoutUntil,
      remainingMs: record.lockoutUntil - Date.now(),
      lockoutLevel: record.lockoutLevel,
      reason: "Activité automatisée détectée. Accès bloqué.",
    }
  }

  return status
}

// ── Reset All (for testing/admin) ──
export function resetAbuseProtection(): void {
  clickTimestamps.length = 0
  clickViolationCount = 0
  refreshTimestamps.length = 0
  refreshViolationCount = 0
  requestTimestamps.length = 0
  requestViolationCount = 0
  clearAbuseLogs()
  clearAbuseLockout()
}
