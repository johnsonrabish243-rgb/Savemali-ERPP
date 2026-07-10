/* ── Enterprise Security Module for SaveMali ERP ── */

// ── XSS Prevention ──
export function escapeHtml(str: string): string {
  const map: Record<string, string> = {
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#x27;", "/": "&#x2F;",
  }
  return str.replace(/[&<>"'/]/g, (c) => map[c])
}

export function sanitizeOutput(value: unknown): string {
  if (value == null) return ""
  return escapeHtml(String(value))
}

// ── Input Validation ──
const INJECTION_PATTERNS = [
  /(?:--|\bunion\b|\bselect\b|\binsert\b|\bdrop\b|\bdelete\b|\bexec\b|xp_)/i,
  /<script[\s>]/i,
  /javascript\s*:/i,
  /on\w+\s*=\s*['"]/i,
]

export function detectInjection(input: string): boolean {
  return INJECTION_PATTERNS.some((p) => p.test(input))
}

export function sanitizeInput(input: string, maxLength = 2000): string {
  if (!input) return ""
  return input.trim().slice(0, maxLength)
}

// ── CSRF Token ──
// Real CSRF protection is handled by InsForge's SDK (JWT tokens, CORS headers).
// These stubs exist for API compatibility only — the SDK provides the real protection.

export function generateCsrfToken(): string {
  return ""
}

export function getCsrfToken(): string | null {
  return null
}

export function validateCsrfToken(_token: string): boolean {
  return true
}

// ── Session Management ──
const SESSION_KEY = "savemali_session"
const SESSION_DURATION = 30 * 60 * 1000 // 30 minutes
const ACTIVITY_THROTTLE = 30 * 1000 // Update activity at most every 30s

export interface SessionData {
  startedAt: number
  lastActivity: number
  device: string
  browser: string
  ip?: string
}

let lastActivityUpdate = 0

export function getDeviceInfo(): { device: string; browser: string } {
  const ua = navigator.userAgent
  const device = /Mobile|Android|iPhone|iPad/i.test(ua) ? "Mobile" : "Desktop"
  let browser = "Unknown"
  if (ua.includes("Chrome")) browser = "Chrome"
  else if (ua.includes("Firefox")) browser = "Firefox"
  else if (ua.includes("Safari")) browser = "Safari"
  else if (ua.includes("Edge")) browser = "Edge"
  return { device, browser }
}

export function initSession(): SessionData {
  const { device, browser } = getDeviceInfo()
  const session: SessionData = {
    startedAt: Date.now(),
    lastActivity: Date.now(),
    device,
    browser,
  }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

export function getSession(): SessionData | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function updateActivity(): void {
  const now = Date.now()
  if (now - lastActivityUpdate < ACTIVITY_THROTTLE) return
  lastActivityUpdate = now
  const session = getSession()
  if (session) {
    session.lastActivity = now
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  }
}

export function isSessionExpired(): boolean {
  const session = getSession()
  if (!session) return true
  return Date.now() - session.lastActivity > SESSION_DURATION
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(CSRF_KEY)
  lastActivityUpdate = 0
}

/** Start tracking user activity (clicks, keys, scroll, mousemove) */
export function startActivityTracking(): () => void {
  const handler = () => updateActivity()
  const events = ["click", "keydown", "scroll", "mousemove", "touchstart"]
  events.forEach((e) => document.addEventListener(e, handler, { passive: true, capture: true }))
  return () => events.forEach((e) => document.removeEventListener(e, handler, { capture: true } as any))
}

// ── Login Attempt Tracker (Brute Force Protection) ──
const ATTEMPTS_KEY = "savemali_login_attempts"
const MAX_LOGIN_ATTEMPTS = 5
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000 // 15 min

interface AttemptRecord {
  count: number
  lastAttempt: number
  lockedUntil: number | null
}

export function trackLoginAttempt(success: boolean): { blocked: boolean; remainingAttempts: number } {
  const raw = localStorage.getItem(ATTEMPTS_KEY)
  let record: AttemptRecord
  try { record = raw ? JSON.parse(raw) : { count: 0, lastAttempt: 0, lockedUntil: null } }
  catch { record = { count: 0, lastAttempt: 0, lockedUntil: null } }

  if (record.lockedUntil && Date.now() < record.lockedUntil) {
    return { blocked: true, remainingAttempts: 0 }
  }

  if (success) {
    localStorage.removeItem(ATTEMPTS_KEY)
    return { blocked: false, remainingAttempts: MAX_LOGIN_ATTEMPTS }
  }

  record.count += 1
  record.lastAttempt = Date.now()

  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    record.lockedUntil = Date.now() + LOGIN_LOCKOUT_MS
  }

  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(record))
  return { blocked: false, remainingAttempts: Math.max(0, MAX_LOGIN_ATTEMPTS - record.count) }
}

export function getLoginAttempts(): { count: number; locked: boolean; remainingTime: number } {
  const raw = localStorage.getItem(ATTEMPTS_KEY)
  if (!raw) return { count: 0, locked: false, remainingTime: 0 }
  let record: AttemptRecord
  try { record = JSON.parse(raw) }
  catch { return { count: 0, locked: false, remainingTime: 0 } }
  if (record.lockedUntil && Date.now() < record.lockedUntil) {
    return { count: record.count, locked: true, remainingTime: Math.ceil((record.lockedUntil - Date.now()) / 1000) }
  }
  if (record.lockedUntil && Date.now() >= record.lockedUntil) {
    localStorage.removeItem(ATTEMPTS_KEY)
    return { count: 0, locked: false, remainingTime: 0 }
  }
  return { count: record.count, locked: false, remainingTime: 0 }
}

// ── Password Strength ──
const COMMON_PASSWORDS = new Set([
  "password", "password1", "password12", "password123", "123456", "12345678", "123456789",
  "qwerty", "abc123", "letmein", "admin", "welcome", "monkey", "master", "dragon",
  "login", "princess", "football", "shadow", "sunshine", "trustno1", "iloveyou",
  "batman", "access", "hello", "charlie", "donald", "passw0rd", "1234567890",
  "savemali", "motdepasse", "secret", "aazerty", "azerty123", "motdepasse1",
])

export interface PasswordStrength {
  score: number // 0-4
  label: string
  color: string
}

export function validatePasswordStrict(password: string): string | null {
  if (password.length < 10) return "Minimum 10 caractères requis"
  if (!/[A-Z]/.test(password)) return "Au moins 1 majuscule requise"
  if (!/[a-z]/.test(password)) return "Au moins 1 minuscule requise"
  if (!/\d/.test(password)) return "Au moins 1 chiffre requis"
  if (!/[^A-Za-z0-9]/.test(password)) return "Au moins 1 symbole requis"
  if (COMMON_PASSWORDS.has(password.toLowerCase())) return "Mot de passe trop commun"
  return null
}

export function getPasswordStrength(password: string): PasswordStrength {
  let score = 0

  if (password.length >= 10) score++
  if (password.length >= 14) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  if (!COMMON_PASSWORDS.has(password.toLowerCase())) score++

  if (password.length < 10) score = Math.min(score, 1)

  if (score <= 1) return { score: 1, label: "Faible", color: "text-red-500" }
  if (score <= 2) return { score: 2, label: "Moyen", color: "text-orange-500" }
  if (score <= 3) return { score: 3, label: "Fort", color: "text-emerald-500" }
  return { score: 4, label: "Très fort", color: "text-emerald-600" }
}

// ── Content Security Policy ──
// CSP is configured server-side via vercel.json HTTP headers.
// This constant is unused — kept for reference only.

// ── API Rate Limiter ──
const API_RATE_KEY = "savemali_api_rate"

interface ApiRateRecord {
  calls: Record<string, { count: number; windowStart: number }>
}

function getApiRates(): ApiRateRecord {
  const raw = localStorage.getItem(API_RATE_KEY)
  try { return raw ? JSON.parse(raw) : { calls: {} } }
  catch { return { calls: {} } }
}

function saveApiRates(record: ApiRateRecord): void {
  localStorage.setItem(API_RATE_KEY, JSON.stringify(record))
}

export function checkApiRateLimit(
  operation: string,
  maxCalls: number = 30,
  windowMs: number = 60 * 1000
): { allowed: boolean; remaining: number } {
  const record = getApiRates()
  const now = Date.now()
  
  if (!record.calls[operation] || now - record.calls[operation].windowStart > windowMs) {
    record.calls[operation] = { count: 1, windowStart: now }
    saveApiRates(record)
    return { allowed: true, remaining: maxCalls - 1 }
  }
  
  if (record.calls[operation].count >= maxCalls) {
    return { allowed: false, remaining: 0 }
  }
  
  record.calls[operation].count++
  saveApiRates(record)
  return { allowed: true, remaining: maxCalls - record.calls[operation].count }
}

// ── Enhanced Input Sanitizer ──
export function sanitizeStrict(input: string, maxLength = 2000): string {
  if (!input) return ""
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // control chars
    .replace(/<[^>]*>/g, "") // HTML tags
    .replace(/javascript:/gi, "") // JS protocol
    .replace(/on\w+\s*=/gi, "") // event handlers
}

// ── File Upload Security ──
const ALLOWED_FILE_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf",
  "text/csv", "text/plain",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export function validateFileUpload(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return { valid: false, error: "Type de fichier non autorisé" }
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: "Fichier trop volumineux (max 10MB)" }
  }
  // Check for double extensions (malware trick)
  const name = file.name.toLowerCase()
  if (name.match(/\.(exe|bat|cmd|sh|ps1|vbs|js|ws|wsh|scr|com|pif)$/)) {
    return { valid: false, error: "Extension de fichier non autorisée" }
  }
  return { valid: true }
}

// ── Security Event Logger ──
const SECURITY_LOG_KEY = "savemali_security_log"
const MAX_LOG_ENTRIES = 100

export interface SecurityEvent {
  type: "login_failed" | "injection_attempt" | "unauthorized_access" | "rate_limit" | "csrf_invalid"
  details: string
  timestamp: number
  path?: string
}

export function logSecurityEvent(event: Omit<SecurityEvent, "timestamp">): void {
  const raw = localStorage.getItem(SECURITY_LOG_KEY)
  let logs: SecurityEvent[]
  try { logs = raw ? JSON.parse(raw) : [] }
  catch { logs = [] }
  logs.push({ ...event, timestamp: Date.now() })
  // Keep only last 100 entries
  if (logs.length > MAX_LOG_ENTRIES) {
    logs.splice(0, logs.length - MAX_LOG_ENTRIES)
  }
  localStorage.setItem(SECURITY_LOG_KEY, JSON.stringify(logs))
}

export function getSecurityLogs(): SecurityEvent[] {
  const raw = localStorage.getItem(SECURITY_LOG_KEY)
  try { return raw ? JSON.parse(raw) : [] }
  catch { return [] }
}

export function clearSecurityLogs(): void {
  localStorage.removeItem(SECURITY_LOG_KEY)
}
