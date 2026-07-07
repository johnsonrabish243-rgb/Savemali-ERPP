import * as React from "react"
import { insforge, type Workspace } from "@/lib/supabase"
import { useSession } from "@/hooks/use-session"
import { logAudit } from "@/lib/audit"
import { getDeviceInfo, initSession, clearSession, startActivityTracking, isSessionExpired } from "@/lib/security"

interface AuthUser {
  id: string
  email?: string
  last_sign_in_at?: string
}

interface AuthState {
  user: AuthUser | null
  workspace: Workspace | null
  loading: boolean
  isOwner: boolean
}

interface AuthContext extends AuthState {
  signOut: () => Promise<void>
  refreshWorkspace: () => Promise<void>
  checkAuth: () => Promise<void>
}

const AuthCtx = React.createContext<AuthContext | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthState>({
    user: null,
    workspace: null,
    loading: true,
    isOwner: false,
  })

  const signOut = React.useCallback(async () => {
    if (state.user) {
      try {
        await logAudit({ action: "logout", workspace_id: state.workspace?.id, actor_id: state.user.id, actor_email: state.user.email })
      } catch {}
    }
    try { await insforge.auth.signOut() } catch {}
    clearSession()
    setState({ user: null, workspace: null, loading: false, isOwner: false })
  }, [state.user])

  useSession(signOut)

  const fetchWorkspace = React.useCallback(async (userId: string) => {
    try {
      const { data: owned } = await insforge.database
        .from("workspaces")
        .select("*")
        .eq("owner_id", userId)
        .maybeSingle()

      if (owned) {
        return { workspace: owned as Workspace, isOwner: true }
      }

      const { data: membership } = await insforge.database
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle()

      if (membership) {
        const { data: ws } = await insforge.database
          .from("workspaces")
          .select("*")
          .eq("id", (membership as any).workspace_id)
          .maybeSingle()

        if (ws) {
          return { workspace: ws as Workspace, isOwner: false }
        }
      }
    } catch (err) {
      console.error("fetchWorkspace error:", err)
    }

    return { workspace: null, isOwner: false }
  }, [])

  const refreshWorkspace = React.useCallback(async () => {
    if (!state.user) return
    const { workspace, isOwner } = await fetchWorkspace(state.user.id)
    setState((prev) => ({ ...prev, workspace, isOwner }))
  }, [state.user, fetchWorkspace])

  React.useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const { data, error } = await insforge.auth.getCurrentUser()
        if (cancelled) return

        if (error || !data?.user) {
          setState({ user: null, workspace: null, loading: false, isOwner: false })
          return
        }

        const result = await fetchWorkspace(data.user.id)
        if (cancelled) return

        const user = data.user as AuthUser
        setState({ user, workspace: result.workspace, loading: false, isOwner: result.isOwner })

        initSession()

        const wasJustLoggedIn = sessionStorage.getItem("savemali_just_logged_in")
        if (wasJustLoggedIn) {
          sessionStorage.removeItem("savemali_just_logged_in")
          try {
            const { device, browser } = getDeviceInfo()
            await logAudit({
              action: "login",
              workspace_id: result.workspace?.id,
              actor_id: user.id,
              actor_email: user.email,
              metadata: { device, browser },
            })
          } catch {}
        }
      } catch (err) {
        if (!cancelled) {
          setState({ user: null, workspace: null, loading: false, isOwner: false })
        }
      }
    }

    init()
    return () => { cancelled = true }
  }, [fetchWorkspace])

  // Session enforcement: track activity + auto-logout on expiry
  React.useEffect(() => {
    if (!state.user) return
    const stopTracking = startActivityTracking()
    const interval = setInterval(() => {
      if (isSessionExpired()) {
        signOut()
      }
    }, 60_000)
    return () => { stopTracking(); clearInterval(interval) }
  }, [state.user, signOut])

  const checkAuth = React.useCallback(async () => {
    try {
      const { data, error } = await insforge.auth.getCurrentUser()
      if (error || !data?.user) {
        setState({ user: null, workspace: null, loading: false, isOwner: false })
        return
      }
      const result = await fetchWorkspace(data.user.id)
      setState({ user: data.user as AuthUser, workspace: result.workspace, loading: false, isOwner: result.isOwner })
    } catch (err) {
      setState({ user: null, workspace: null, loading: false, isOwner: false })
    }
  }, [fetchWorkspace])

  return (
    <AuthCtx.Provider value={{ ...state, signOut, refreshWorkspace, checkAuth }}>
      {children}
    </AuthCtx.Provider>
  )
}

export function useAuth() {
  const ctx = React.useContext(AuthCtx)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
