import * as React from "react"
import { useAuth } from "@/hooks/use-auth"
import { useLanguage } from "@/lib/i18n"

const MAX_ATTEMPTS = 2
const STORAGE_KEY = "savemali_access_violations"
const LOCKOUT_KEY = "savemali_lockout_until"

interface ViolationData {
  count: number
  firstAt: number
}

function getViolationData(): ViolationData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { count: 0, firstAt: 0 }
    return JSON.parse(raw)
  } catch {
    return { count: 0, firstAt: 0 }
  }
}

function setViolationData(data: ViolationData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function getLockoutUntil(): number {
  try {
    return Number(localStorage.getItem(LOCKOUT_KEY)) || 0
  } catch {
    return 0
  }
}

function setLockoutUntil(ts: number) {
  localStorage.setItem(LOCKOUT_KEY, String(ts))
}

function getEndOfToday(): number {
  const now = new Date()
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  return end.getTime()
}

function isLockedOut(): boolean {
  const until = getLockoutUntil()
  if (!until) return false
  if (Date.now() >= until) {
    // Lockout expired — auto-reactivate
    localStorage.removeItem(LOCKOUT_KEY)
    localStorage.removeItem(STORAGE_KEY)
    return false
  }
  return true
}

export function recordViolation(): boolean {
  const data = getViolationData()
  const now = Date.now()

  // Reset if last violation was more than 30 min ago
  if (now - data.firstAt > 30 * 60 * 1000) {
    data.count = 1
    data.firstAt = now
  } else {
    data.count += 1
  }

  setViolationData(data)

  if (data.count > MAX_ATTEMPTS) {
    const lockoutEnd = getEndOfToday()
    setLockoutUntil(lockoutEnd)
    return true // locked out
  }
  return false // not yet locked out
}

export function isUserLockedOut(): boolean {
  return isLockedOut()
}

export function clearViolations() {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(LOCKOUT_KEY)
}

export function useWorkspaceIsolation() {
  const { user, workspace } = useAuth()
  const { lang } = useLanguage()
  const fr = lang === "fr"

  const checkAccess = React.useCallback((targetWorkspaceId?: string | null): boolean => {
    if (!workspace || !user) return false
    if (targetWorkspaceId && targetWorkspaceId !== workspace.id) {
      return false
    }
    return true
  }, [workspace, user])

  const getLockoutMessage = React.useCallback((): string => {
    return fr
      ? "Déconnecté du serveur suite aux violations de droits d'accès. Compte réactivé à 00h00."
      : "Disconnected from server due to access rights violations. Account reactivated at 00:00."
  }, [fr])

  const getAccessDeniedMessage = React.useCallback((): string => {
    return fr
      ? "Accès refusé. Vous n'avez pas les droits pour accéder à cette ressource."
      : "Access denied. You don't have permission to access this resource."
  }, [fr])

  const lockoutUntil = getLockoutUntil()
  const remainingMs = lockoutUntil > Date.now() ? lockoutUntil - Date.now() : 0
  const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60))

  return {
    checkAccess,
    getLockoutMessage,
    getAccessDeniedMessage,
    isLockedOut: isUserLockedOut(),
    remainingHours,
    lockoutUntil,
  }
}
