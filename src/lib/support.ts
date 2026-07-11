import { insforge } from "@/lib/supabase"
import { sendEmail } from "@/lib/email"
import { logAudit } from "@/lib/audit"

export interface SupportTicketInput {
  workspace_id?: string
  user_id?: string
  category: string
  subject: string
  message: string
  priority?: "low" | "normal" | "high" | "urgent"
  created_by_email: string
  created_by_name: string
}

export interface DpoRequestInput {
  workspace_id?: string
  user_id?: string
  request_type: "access" | "rectification" | "erasure" | "restriction" | "objection" | "portability" | "withdraw_consent" | "complaint" | "other"
  subject: string
  description: string
  created_by_email: string
  created_by_name: string
}

const INSFORGE_URL = import.meta.env.VITE_INSFORGE_URL || ""

function getFunctionsUrl(): string {
  try {
    const { hostname } = new URL(INSFORGE_URL)
    if (!hostname.endsWith(".insforge.app")) return `${INSFORGE_URL}/functions`
    const appKey = hostname.split(".")[0]
    return `https://${appKey}.function2.insforge.app`
  } catch {
    return `${INSFORGE_URL}/functions`
  }
}

export async function createSupportTicket(input: SupportTicketInput): Promise<{ ticketNumber?: string; error?: string }> {
  try {
    const ticketNumber = `TKT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    const payload = {
      workspace_id: input.workspace_id || null,
      user_id: input.user_id || null,
      ticket_number: ticketNumber,
      category: input.category,
      subject: input.subject,
      message: input.message,
      priority: input.priority || "normal",
      status: "open",
      created_by_email: input.created_by_email,
      created_by_name: input.created_by_name,
    }
    const { error: dbError } = await insforge.database.from("support_tickets").insert([payload])
    if (dbError) return { error: dbError.message }

    // Send email to support team
    await sendEmail({
      to: "support@savemali.online",
      from: "SaveMali Support <support@savemali.online>",
      replyTo: input.created_by_email,
      template: "support-ticket",
      templateData: {
        ticketNumber,
        name: input.created_by_name,
        email: input.created_by_email,
        category: input.category,
        subject: input.subject,
        message: input.message,
        priority: input.priority || "normal",
      },
    })

    // Send auto-reply to user
    await sendEmail({
      to: input.created_by_email,
      from: "SaveMali Support <support@savemali.online>",
      template: "support-auto-reply",
      templateData: {
        ticketNumber,
        name: input.created_by_name,
        subject: input.subject,
      },
    })

    await logAudit({
      action: "support_ticket_created",
      workspace_id: input.workspace_id,
      actor_email: input.created_by_email,
      target_id: ticketNumber,
      target_type: "support_ticket",
      metadata: { category: input.category, priority: input.priority || "normal", subject: input.subject },
    })

    return { ticketNumber }
  } catch (err: any) {
    return { error: err?.message || "Failed to create support ticket" }
  }
}

export async function createDpoRequest(input: DpoRequestInput): Promise<{ requestNumber?: string; error?: string }> {
  try {
    const requestNumber = `DPO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    const payload = {
      workspace_id: input.workspace_id || null,
      user_id: input.user_id || null,
      request_number: requestNumber,
      request_type: input.request_type,
      subject: input.subject,
      description: input.description,
      status: "pending",
      created_by_email: input.created_by_email,
      created_by_name: input.created_by_name,
    }
    const { error: dbError } = await insforge.database.from("dpo_requests").insert([payload])
    if (dbError) return { error: dbError.message }

    // Send email to DPO
    await sendEmail({
      to: "dpo@savemali.online",
      from: "DPO SaveMali <dpo@savemali.online>",
      replyTo: input.created_by_email,
      template: "dpo-request",
      templateData: {
        requestNumber,
        name: input.created_by_name,
        email: input.created_by_email,
        requestType: input.request_type,
        subject: input.subject,
        description: input.description,
      },
    })

    // Send auto-reply to user
    await sendEmail({
      to: input.created_by_email,
      from: "DPO SaveMali <dpo@savemali.online>",
      template: "dpo-auto-reply",
      templateData: {
        requestNumber,
        name: input.created_by_name,
        subject: input.subject,
      },
    })

    await logAudit({
      action: "dpo_request_created",
      workspace_id: input.workspace_id,
      actor_email: input.created_by_email,
      target_id: requestNumber,
      target_type: "dpo_request",
      metadata: { request_type: input.request_type, subject: input.subject },
    })

    return { requestNumber }
  } catch (err: any) {
    return { error: err?.message || "Failed to create DPO request" }
  }
}
