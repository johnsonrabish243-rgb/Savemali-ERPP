import { insforge } from "@/lib/supabase"
import { formatCurrency } from "@/lib/currency"

export interface WorkspaceNotification {
  id: string
  workspace_id: string
  user_id: string | null
  type: string
  title: string
  message: string
  module: string
  created_by: string | null
  link?: string
  read: boolean
  actor_name: string | null
  metadata?: Record<string, any>
  created_at: string
}

export interface NotificationPayload {
  workspace_id: string
  user_id?: string
  type: string
  title: string
  message: string
  module: string
  link?: string
  actor_name?: string
}

const NOTIFICATION_TABLE = "workspace_notifications"

export async function publishNotification(payload: NotificationPayload): Promise<WorkspaceNotification | null> {
  try {
    const { data: user } = await insforge.auth.getCurrentUser()
    if (!user?.user?.id) return null

    const { data, error } = await insforge.database
      .from(NOTIFICATION_TABLE)
      .insert([{
        workspace_id: payload.workspace_id,
        user_id: payload.user_id ?? null,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        module: payload.module,
        created_by: user.user.id,
        link: payload.link,
        read: false,
        actor_name: payload.actor_name ?? user.user.user_metadata?.full_name ?? user.user.email?.split("@")[0] ?? "Quelqu'un",
      }])
      .select()
      .single()

    if (error) {
      console.error("Failed to publish notification:", error)
      return null
    }

    return data as WorkspaceNotification
  } catch (err) {
    console.error("Error publishing notification:", err)
    return null
  }
}

export async function getNotifications(workspaceId: string, limit = 50): Promise<WorkspaceNotification[]> {
  const { data, error } = await insforge.database
    .from(NOTIFICATION_TABLE)
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("Failed to fetch notifications:", error)
    return []
  }

  return (data ?? []) as WorkspaceNotification[]
}

export async function markAsRead(notificationId: string, workspaceId: string): Promise<boolean> {
  try {
    const { error } = await insforge.database
      .from(NOTIFICATION_TABLE)
      .update({ read: true })
      .eq("id", notificationId)
      .eq("workspace_id", workspaceId)

    if (error) {
      console.error("Failed to mark as read:", error)
      return false
    }

    return true
  } catch (err) {
    console.error("Error marking notification as read:", err)
    return false
  }
}

export async function markAllAsRead(workspaceId: string): Promise<boolean> {
  try {
    const { error } = await insforge.database
      .from(NOTIFICATION_TABLE)
      .update({ read: true })
      .eq("workspace_id", workspaceId)
      .eq("read", false)

    if (error) {
      console.error("Failed to mark all as read:", error)
      return false
    }

    return true
  } catch (err) {
    console.error("Error marking all as read:", err)
    return false
  }
}

const NOTIFICATION_TYPES = {
  SALE: "sale",
  PAYMENT: "payment",
  STOCK_ALERT: "stock_alert",
  MEMBER: "member",
  INVOICE: "invoice",
  ACCOUNTING: "accounting",
  ORDER: "order",
  GRADE: "grade",
  ATTENDANCE: "attendance",
  EXPENSE: "expense",
  REPORT: "report",
} as const

export const NotificationType = NOTIFICATION_TYPES

export function createSaleNotification(
  workspaceId: string,
  actorName: string,
  amount: number,
  currency = "FC",
  module: string,
  link?: string
): NotificationPayload {
  return {
    workspace_id: workspaceId,
    type: NOTIFICATION_TYPES.SALE,
    title: "Nouvelle vente",
    message: `${actorName} a enregistré une vente de ${formatCurrency(amount)}`,
    module,
    link: link ?? "sales",
    actor_name: actorName,
  }
}

export function createPaymentNotification(
  workspaceId: string,
  actorName: string,
  amount: number,
  currency = "FC",
  module: string,
  link?: string
): NotificationPayload {
  return {
    workspace_id: workspaceId,
    type: NOTIFICATION_TYPES.PAYMENT,
    title: "Nouveau paiement",
    message: `${actorName} a enregistré un paiement de ${formatCurrency(amount)}`,
    module,
    link: link ?? "payments",
    actor_name: actorName,
  }
}

export function createStockAlertNotification(
  workspaceId: string,
  productName: string,
  currentStock: number,
  module: string,
  link?: string
): NotificationPayload {
  return {
    workspace_id: workspaceId,
    type: NOTIFICATION_TYPES.STOCK_ALERT,
    title: "Alerte stock faible",
    message: `${productName} : stock critique (${currentStock} restants)`,
    module,
    link: link ?? "inventory",
  }
}

export function createMemberNotification(
  workspaceId: string,
  actorName: string,
  action: "invité" | "activé" | "suspendu" | "supprimé",
  targetName: string,
  module: string,
  link?: string
): NotificationPayload {
  return {
    workspace_id: workspaceId,
    type: NOTIFICATION_TYPES.MEMBER,
    title: "Mise à jour équipe",
    message: `${actorName} a ${action} ${targetName}`,
    module,
    link: link ?? "members",
    actor_name: actorName,
  }
}

export function createInvoiceNotification(
  workspaceId: string,
  actorName: string,
  invoiceNumber: string,
  module: string,
  link?: string
): NotificationPayload {
  return {
    workspace_id: workspaceId,
    type: NOTIFICATION_TYPES.INVOICE,
    title: "Nouvelle facture",
    message: `${actorName} a créé la facture ${invoiceNumber}`,
    module,
    link: link ?? "invoices",
    actor_name: actorName,
  }
}

export function createAccountingNotification(
  workspaceId: string,
  actorName: string,
  description: string,
  amount: number,
  type: "income" | "expense",
  module: string,
  link?: string
): NotificationPayload {
  return {
    workspace_id: workspaceId,
    type: NOTIFICATION_TYPES.ACCOUNTING,
    title: type === "income" ? "Revenu enregistré" : "Dépense enregistrée",
    message: `${actorName} : ${description} (${formatCurrency(amount)})`,
    module,
    link: link ?? "accounting",
    actor_name: actorName,
  }
}

export function createOrderNotification(
  workspaceId: string,
  actorName: string,
  supplierName: string,
  module: string,
  link?: string
): NotificationPayload {
  return {
    workspace_id: workspaceId,
    type: NOTIFICATION_TYPES.ORDER,
    title: "Nouvelle commande",
    message: `${actorName} a passé une commande chez ${supplierName}`,
    module,
    link: link ?? "orders",
    actor_name: actorName,
  }
}

export function createGradeNotification(
  workspaceId: string,
  actorName: string,
  studentName: string,
  subject: string,
  module: string,
  link?: string
): NotificationPayload {
  return {
    workspace_id: workspaceId,
    type: NOTIFICATION_TYPES.GRADE,
    title: "Note ajoutée",
    message: `${actorName} a saisi une note pour ${studentName} en ${subject}`,
    module,
    link: link ?? "grades",
    actor_name: actorName,
  }
}

export function createAttendanceNotification(
  workspaceId: string,
  actorName: string,
  className: string,
  presentCount: number,
  totalCount: number,
  module: string,
  link?: string
): NotificationPayload {
  return {
    workspace_id: workspaceId,
    type: NOTIFICATION_TYPES.ATTENDANCE,
    title: "Prise de présence",
    message: `${actorName} a pris la présence pour ${className} (${presentCount}/${totalCount} présents)`,
    module,
    link: link ?? "attendance",
    actor_name: actorName,
  }
}

export function createExpenseNotification(
  workspaceId: string,
  actorName: string,
  description: string,
  amount: number,
  module: string,
  link?: string
): NotificationPayload {
  return {
    workspace_id: workspaceId,
    type: NOTIFICATION_TYPES.EXPENSE,
    title: "Nouvelle dépense",
    message: `${actorName} a enregistré une dépense : ${description} (${formatCurrency(amount)})`,
    module,
    link: link ?? "expenses",
    actor_name: actorName,
  }
}

export function createReportNotification(
  workspaceId: string,
  actorName: string,
  reportType: string,
  module: string,
  link?: string
): NotificationPayload {
  return {
    workspace_id: workspaceId,
    type: NOTIFICATION_TYPES.REPORT,
    title: "Rapport généré",
    message: `${actorName} a généré un rapport : ${reportType}`,
    module,
    link: link ?? "reports",
    actor_name: actorName,
  }
}
