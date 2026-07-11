import { insforge } from "@/lib/supabase"

export type AuditAction =
  | "login" | "logout" | "login_failed"
  | "user_created" | "user_deleted" | "user_updated"
  | "permission_changed" | "password_changed"
  | "data_export" | "data_import"
  | "file_upload" | "file_download" | "file_deleted"
  | "settings_changed" | "workspace_updated"
  | "member_added" | "member_removed" | "member_role_changed"
  | "backup_created" | "session_revoked"
  | "leave_approved" | "leave_rejected"
  | "support_ticket_created" | "dpo_request_created"
  | "appointment_created" | "appointment_cancelled" | "appointment_confirmed"
  | "contact_message_sent"

interface AuditEntry {
  action: AuditAction
  workspace_id?: string
  actor_id?: string
  actor_email?: string
  target_id?: string
  target_type?: string
  metadata?: Record<string, unknown>
  ip_address?: string
  user_agent?: string
}

function getClientInfo() {
  if (typeof window === "undefined") return { ip: null, ua: null }
  return {
    ip: null,
    ua: navigator.userAgent.slice(0, 500),
  }
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const { ip, ua } = getClientInfo()
    await insforge.database.from("audit_logs").insert([{
      action: entry.action,
      workspace_id: entry.workspace_id ?? null,
      actor_id: entry.actor_id ?? null,
      actor_email: entry.actor_email ?? null,
      target_id: entry.target_id ?? null,
      target_type: entry.target_type ?? null,
      metadata: entry.metadata ?? null,
      ip_address: ip,
      user_agent: ua,
      created_at: new Date().toISOString(),
    }])
  } catch {
    // Silent fail - audit should never block the app
  }
}

export async function getAuditLogs(options: {
  limit?: number
  offset?: number
  action?: AuditAction
  actor_id?: string
  actor_email?: string
  days?: number
  workspace_id: string
} = {} as { workspace_id: string }) {
  const query = insforge.database
    .from("audit_logs")
    .select("*")
    .eq("workspace_id", options.workspace_id)
    .order("created_at", { ascending: false })

  if (options.action) query.eq("action", options.action)
  if (options.actor_id) query.eq("actor_id", options.actor_id)
  if (options.actor_email) query.eq("actor_email", options.actor_email)
  if (options.days) {
    const since = new Date(Date.now() - options.days * 86400000).toISOString()
    query.gte("created_at", since)
  }

  const { data, error } = await query
    .range(options.offset ?? 0, (options.offset ?? 0) + (options.limit ?? 50) - 1)

  if (error) {
    console.error("Audit fetch error:", error.message)
    return []
  }

  return data as Array<{
    id: string
    action: string
    actor_id: string | null
    actor_email: string | null
    target_id: string | null
    target_type: string | null
    metadata: Record<string, unknown> | null
    ip_address: string | null
    user_agent: string | null
    created_at: string
  }>
}

export async function getSecurityStats(workspaceId: string) {
  const now = new Date()
  const last24h = new Date(now.getTime() - 86400000).toISOString()

  function makeCount(action?: string) {
    let q = insforge.database.from("audit_logs").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).gte("created_at", last24h)
    if (action) q = q.eq("action", action)
    return q
  }

  const [failedLogins, newUsers, allLogs] = await Promise.all([
    makeCount("login_failed"),
    makeCount("user_created"),
    makeCount(),
  ])

  return {
    failedLogins24h: failedLogins.count ?? 0,
    newUsers24h: newUsers.count ?? 0,
    totalActions24h: allLogs.count ?? 0,
  }
}
