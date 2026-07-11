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
    const [
      usersCount, wsCount, activeWsCount,
      members, employees,
      admins, managers, cashiers, accountants,
      tickets, appointments, notifications, reports,
    ] = await Promise.all([
      insforge.database.rpc("platform_total_users"),
      insforge.database.rpc("platform_total_workspaces"),
      insforge.database.from("workspace_members").select("id", { count: "exact", head: true }).eq("status", "active"),
      insforge.database.from("workspace_members").select("id", { count: "exact", head: true }),
      insforge.database.from("employees").select("id", { count: "exact", head: true }),
      insforge.database.from("workspace_members").select("id", { count: "exact", head: true }).eq("role", "admin"),
      insforge.database.from("workspace_members").select("id", { count: "exact", head: true }).eq("role", "manager"),
      insforge.database.from("workspace_members").select("id", { count: "exact", head: true }).eq("role", "cashier"),
      insforge.database.from("workspace_members").select("id", { count: "exact", head: true }).eq("role", "accountant"),
      insforge.database.from("support_tickets").select("id", { count: "exact", head: true }),
      insforge.database.from("appointments").select("id", { count: "exact", head: true }),
      insforge.database.from("workspace_notifications").select("id", { count: "exact", head: true }),
      insforge.database.from("shared_reports").select("id", { count: "exact", head: true }),
    ])

    const totalWs = wsCount.data ?? 0
    const activeWs = activeWsCount.count ?? 0

    return {
      totalUsers: usersCount.data ?? 0,
      totalWorkspaces: totalWs,
      activeWorkspaces: activeWs,
      inactiveWorkspaces: Math.max(0, totalWs - activeWs),
      totalEmployees: employees.count ?? 0,
      totalAdmins: admins.count ?? 0,
      totalManagers: managers.count ?? 0,
      totalCashiers: cashiers.count ?? 0,
      totalAccountants: accountants.count ?? 0,
      totalSupportTickets: tickets.count ?? 0,
      totalAppointments: appointments.count ?? 0,
      totalNotifications: notifications.count ?? 0,
      totalReports: reports.count ?? 0,
    }
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
      .update({ value: JSON.stringify(value), updated_at: new Date().toISOString() })
      .eq("key", key)
  } catch {}
}

// ── Workspace management ──

export async function fetchAllWorkspaces() {
  try {
    const { data } = await insforge.database
      .from("workspaces")
      .select("*, workspace_members!inner(count)")
      .order("created_at", { ascending: false })
    return data ?? []
  } catch {
    return []
  }
}

export async function suspendWorkspace(workspaceId: string): Promise<void> {
  try {
    await insforge.database
      .from("workspace_members")
      .update({ status: "suspended" })
      .eq("workspace_id", workspaceId)
  } catch {}
}

export async function reactivateWorkspace(workspaceId: string): Promise<void> {
  try {
    await insforge.database
      .from("workspace_members")
      .update({ status: "active" })
      .eq("workspace_id", workspaceId)
  } catch {}
}

// ── User management ──

export async function fetchAllUsers() {
  try {
    const { data } = await insforge.database
      .from("workspace_members")
      .select("*, workspaces(name, type)")
      .order("created_at", { ascending: false })
    return data ?? []
  } catch {
    return []
  }
}

export async function suspendUser(memberId: string): Promise<void> {
  try {
    await insforge.database
      .from("workspace_members")
      .update({ status: "suspended" })
      .eq("id", memberId)
  } catch {}
}

export async function reactivateUser(memberId: string): Promise<void> {
  try {
    await insforge.database
      .from("workspace_members")
      .update({ status: "active" })
      .eq("id", memberId)
  } catch {}
}
