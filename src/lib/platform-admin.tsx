import * as React from "react"
import { insforge } from "@/lib/supabase"

// ── Types ──

export interface PlatformDashboardStats {
  totalUsers: number
  totalWorkspaces: number
  activeWorkspaces: number
  inactiveWorkspaces: number
  totalEmployees: number
  totalAdmins: number
  totalManagers: number
  totalCashiers: number
  totalAccountants: number
  totalSupportTickets: number
  totalAppointments: number
  totalNotifications: number
  totalReports: number
}

export interface PlatformNotification {
  id: string
  type: string
  title: string
  message: string
  severity: "info" | "warning" | "error" | "critical"
  data: Record<string, unknown>
  is_read: boolean
  created_at: string
}

export interface PlatformSetting {
  id: string
  key: string
  value: unknown
  updated_at: string
  updated_by: string | null
}

// ── Context ──

interface PlatformAdminContext {
  isPlatformAdmin: boolean
  loading: boolean
  checkAdminStatus: () => Promise<void>
}

const PlatformAdminCtx = React.createContext<PlatformAdminContext | undefined>(undefined)

export function PlatformAdminProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = React.useState(true)
  const [isPlatformAdmin, setIsPlatformAdmin] = React.useState(false)

  const checkAdminStatus = React.useCallback(async () => {
    try {
      const { data, error } = await insforge.database.rpc("is_platform_admin")
      setIsPlatformAdmin(data === true && !error)
    } catch {
      setIsPlatformAdmin(false)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { checkAdminStatus() }, [checkAdminStatus])

  return (
    <PlatformAdminCtx.Provider value={{ isPlatformAdmin, loading, checkAdminStatus }}>
      {children}
    </PlatformAdminCtx.Provider>
  )
}

export function usePlatformAdmin() {
  const ctx = React.useContext(PlatformAdminCtx)
  if (!ctx) throw new Error("usePlatformAdmin must be used within PlatformAdminProvider")
  return ctx
}

// ── First-user check ──

export async function tryClaimPlatformAdmin(userId: string): Promise<boolean> {
  try {
    const { data, error } = await insforge.database.rpc("try_assign_platform_admin", { p_user_id: userId })
    return data === true && !error
  } catch {
    return false
  }
}

export async function hasAnyPlatformAdmin(): Promise<boolean> {
  try {
    const { data, error } = await insforge.database.rpc("has_platform_admin")
    return data === true && !error
  } catch {
    return false
  }
}

// ── Dashboard stats ──

export async function fetchPlatformDashboardStats(): Promise<PlatformDashboardStats> {
  try {
    const { data, error } = await insforge.database.rpc("platform_dashboard_stats")
    return (data ?? {}) as PlatformDashboardStats
  } catch {
    return {
      totalUsers: 0, totalWorkspaces: 0, activeWorkspaces: 0, inactiveWorkspaces: 0,
      totalEmployees: 0, totalAdmins: 0, totalManagers: 0, totalCashiers: 0, totalAccountants: 0,
      totalSupportTickets: 0, totalAppointments: 0, totalNotifications: 0, totalReports: 0,
    }
  }
}

// ── Platform notifications ──

export async function fetchPlatformNotifications(): Promise<PlatformNotification[]> {
  try {
    const { data } = await insforge.database
      .from("platform_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)
    return (data ?? []) as PlatformNotification[]
  } catch {
    return []
  }
}

export async function markPlatformNotificationRead(id: string): Promise<void> {
  try {
    await insforge.database.from("platform_notifications").update({ is_read: true }).eq("id", id)
  } catch {}
}

export async function createPlatformNotification(notification: {
  type: string
  title: string
  message: string
  severity: "info" | "warning" | "error" | "critical"
  data?: Record<string, unknown>
}): Promise<void> {
  try {
    await insforge.database.from("platform_notifications").insert([{
      type: notification.type,
      title: notification.title,
      message: notification.message,
      severity: notification.severity,
      data: notification.data ?? {},
    }])
  } catch {}
}

// ── Platform settings ──

export async function fetchPlatformSettings(): Promise<PlatformSetting[]> {
  try {
    const { data } = await insforge.database.from("platform_settings").select("*")
    return (data ?? []) as PlatformSetting[]
  } catch {
    return []
  }
}

export async function updatePlatformSetting(key: string, value: unknown): Promise<void> {
  try {
    await insforge.database
      .from("platform_settings")
      .update({ value, updated_at: new Date().toISOString() })
      .eq("key", key)
  } catch {}
}

// ── Workspace management ──

export async function fetchAllWorkspaces() {
  try {
    const { data } = await insforge.database.rpc("platform_list_workspaces")
    return data ?? []
  } catch {
    return []
  }
}

export async function suspendWorkspace(workspaceId: string): Promise<void> {
  try {
    await insforge.database.rpc("platform_update_workspace_members_status", {
      p_workspace_id: workspaceId,
      p_status: "suspended",
    })
  } catch {}
}

export async function reactivateWorkspace(workspaceId: string): Promise<void> {
  try {
    await insforge.database.rpc("platform_update_workspace_members_status", {
      p_workspace_id: workspaceId,
      p_status: "active",
    })
  } catch {}
}

// ── User management ──

export async function fetchAllUsers() {
  try {
    const { data } = await insforge.database.rpc("platform_list_users")
    return data ?? []
  } catch {
    return []
  }
}

export async function suspendUser(memberId: string): Promise<void> {
  try {
    await insforge.database.rpc("platform_update_member_status", {
      p_member_id: memberId,
      p_status: "suspended",
    })
  } catch {}
}

export async function reactivateUser(memberId: string): Promise<void> {
  try {
    await insforge.database.rpc("platform_update_member_status", {
      p_member_id: memberId,
      p_status: "active",
    })
  } catch {}
}

// ── Platform admin management ──

export interface PlatformAdmin {
  user_id: string
  email: string | null
  created_at: string
}

export async function fetchPlatformAdmins(): Promise<PlatformAdmin[]> {
  try {
    const { data } = await insforge.database.rpc("list_platform_admins")
    return (data ?? []) as PlatformAdmin[]
  } catch {
    return []
  }
}

export async function addPlatformAdmin(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await insforge.database.rpc("add_platform_admin", { p_user_id: userId })
    if (error) return { success: false, error: error.message }
    return { success: data === true }
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to add platform admin" }
  }
}

export async function removePlatformAdmin(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await insforge.database.rpc("remove_platform_admin", { p_user_id: userId })
    if (error) return { success: false, error: error.message }
    return { success: data === true }
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to remove platform admin" }
  }
}

// ── Platform audit logs ──

export async function platformGetAuditLogs(limit = 50, offset = 0) {
  try {
    const { data } = await insforge.database.rpc("platform_get_audit_logs", {
      p_limit: limit,
      p_offset: offset,
    })
    return data ?? []
  } catch {
    return []
  }
}
