import { insforge } from "@/lib/supabase"

export interface DeviceInfo {
  platform: string
  isMobile: boolean
}

function getDeviceInfo(): DeviceInfo {
  const ua = navigator.userAgent.toLowerCase()
  return {
    platform: navigator.platform,
    isMobile: ua.includes("mobile") || ua.includes("android") || ua.includes("iphone"),
  }
}

export interface LogPayload {
  workspaceId: string
  ownerId: string
  actorUserId: string
  actorEmail: string
  actorName: string
  actionType: string
  module: "pharmacy" | "commerce" | "education" | "gestion" | "hr" | "system"
  description: string
  amountUsd?: number | null
  referenceId?: string | null
}

export async function logActivity(payload: LogPayload): Promise<void> {
  const { error } = await insforge.database.from("activity_logs").insert([{
    workspace_id: payload.workspaceId,
    owner_id: payload.ownerId,
    actor_user_id: payload.actorUserId,
    actor_email: payload.actorEmail,
    actor_name: payload.actorName || payload.actorEmail,
    action_type: payload.actionType,
    module: payload.module,
    description: payload.description,
    amount_usd: payload.amountUsd ?? null,
    reference_id: payload.referenceId ?? null,
    device_info: getDeviceInfo(),
    performed_at: new Date().toISOString(),
  }])
  if (error) console.error("[logActivity]", error.message)
}
