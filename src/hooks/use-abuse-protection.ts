import * as React from "react"
import {
  getAbuseStatus,
  trackClick,
  trackRefresh,
  trackRequest,
  detectBot,
  detectScan,
  performAbuseCheck,
  resetAbuseProtection,
  type AbuseStatus,
} from "@/lib/abuse-protection"

interface UseAbuseProtectionReturn {
  status: AbuseStatus
  isBlocked: boolean
  remainingMs: number
  checkPath: (path: string) => boolean
  resetProtection: () => void
}

export function useAbuseProtection(): UseAbuseProtectionReturn {
  const [status, setStatus] = React.useState<AbuseStatus>(() => getAbuseStatus())

  // Periodic check for lockout expiry
  React.useEffect(() => {
    const interval = setInterval(() => {
      const current = getAbuseStatus()
      setStatus(current)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // Track page refreshes on mount
  React.useEffect(() => {
    trackRefresh()
  }, [])

  // Click tracking (document-level)
  React.useEffect(() => {
    const handler = () => {
      const result = trackClick()
      if (result.isAbuse) {
        setStatus(getAbuseStatus())
      }
    }
    document.addEventListener("click", handler, { passive: true })
    return () => document.removeEventListener("click", handler)
  }, [])

  // Bot detection on mount
  React.useEffect(() => {
    const bot = detectBot()
    if (bot.isBot) {
      setStatus(getAbuseStatus())
    }
  }, [])

  // Path scanning detection
  const checkPath = React.useCallback((path: string): boolean => {
    const scan = detectScan(path)
    if (scan.isScan) {
      setStatus(getAbuseStatus())
      return false
    }
    return true
  }, [])

  const resetProtection = React.useCallback(() => {
    resetAbuseProtection()
    setStatus(getAbuseStatus())
  }, [])

  return {
    status,
    isBlocked: status.blocked,
    remainingMs: status.remainingMs,
    checkPath,
    resetProtection,
  }
}

// Hook for tracking API requests
export function useRequestTracking(): void {
  React.useEffect(() => {
    const originalFetch = window.fetch
    window.fetch = function (...args) {
      const result = trackRequest()
      if (result.isAbuse) {
        console.warn("[Security] Request loop detected")
      }
      return originalFetch.apply(this, args)
    }
    return () => {
      window.fetch = originalFetch
    }
  }, [])
}
