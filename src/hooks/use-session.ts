import { useEffect, useRef, useCallback } from "react"
import { initSession, updateActivity, isSessionExpired, clearSession, getDeviceInfo } from "@/lib/security"

const INACTIVITY_TIMEOUT = 30 * 60 * 1000
const CHECK_INTERVAL = 60 * 1000
const GRACE_PERIOD = 5 * 1000

export function useSession(signOut: () => Promise<void>) {
  const warned = useRef(false)
  const startedAt = useRef(Date.now())

  const handleActivity = useCallback(() => {
    updateActivity()
    warned.current = false
  }, [])

  useEffect(() => {
    initSession()
    startedAt.current = Date.now()

    const events = ["mousedown", "keydown", "touchstart", "scroll", "click"]
    events.forEach((e) => window.addEventListener(e, handleActivity))
    document.addEventListener("visibilitychange", handleActivity)

    const interval = setInterval(async () => {
      const elapsed = Date.now() - startedAt.current
      if (elapsed < GRACE_PERIOD) return

      if (isSessionExpired()) {
        if (!warned.current) {
          warned.current = true
        }
        try { await signOut() } catch {}
      }
    }, CHECK_INTERVAL)

    return () => {
      events.forEach((e) => window.removeEventListener(e, handleActivity))
      document.removeEventListener("visibilitychange", handleActivity)
      clearInterval(interval)
    }
  }, [signOut, handleActivity])
}

export function useDeviceFingerprint() {
  return getDeviceInfo()
}
