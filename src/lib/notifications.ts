import { insforge } from "@/lib/supabase"
import { formatCurrency } from "@/lib/currency"
import { toast } from "sonner"

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
      toast.error("Échec de la publication de la notification")
      return null
    }

    return data as WorkspaceNotification
  } catch (err) {
    console.error("Error publishing notification:", err)
    toast.error("Erreur lors de la publication de la notification")
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
    toast.error("Échec du chargement des notifications")
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
      toast.error("Échec de la mise à jour")
      return false
    }

    return true
  } catch (err) {
    console.error("Error marking notification as read:", err)
    toast.error("Erreur lors de la mise à jour")
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
      toast.error("Échec de la mise à jour")
      return false
    }

    return true
  } catch (err) {
    console.error("Error marking all as read:", err)
    toast.error("Erreur lors de la mise à jour")
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
  HR_RECRUITMENT: "hr_recruitment",
  HR_LEAVE_REQUEST: "hr_leave_request",
  HR_CONTRACT_EXPIRY: "hr_contract_expiry",
  HR_EVALUATION: "hr_evaluation",
  HR_ABSENCE: "hr_absence",
  HR_TRAINING: "hr_training",
  HR_PROMOTION: "hr_promotion",
  HR_BIRTHDAY: "hr_birthday",
  HR_DOCUMENT_MISSING: "hr_document_missing",
  HR_PAYSLIP: "hr_payslip",
  HR_PAYMENT: "hr_payment",
  HR_PAYROLL_PERIOD: "hr_payroll_period",
  HR_SALARY_ADVANCE: "hr_salary_advance",
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

// ─── HR Notifications ───────────────────────────────────

export function createHRRecruitmentNotification(
  workspaceId: string,
  actorName: string,
  position: string,
  action: "created" | "closed",
  module: string,
  link?: string
): NotificationPayload {
  return {
    workspace_id: workspaceId,
    type: NOTIFICATION_TYPES.HR_RECRUITMENT,
    title: action === "created" ? "Nouveau recrutement" : "Recrutement fermé",
    message: action === "created"
      ? `${actorName} a lancé un recrutement pour : ${position}`
      : `${actorName} a fermé le recrutement : ${position}`,
    module,
    link: link ?? "hr",
    actor_name: actorName,
  }
}

export function createHRLeaveRequestNotification(
  workspaceId: string,
  actorName: string,
  leaveType: string,
  startDate: string,
  status: "pending" | "approved" | "rejected",
  module: string,
  link?: string
): NotificationPayload {
  const titles = { pending: "Demande de congé", approved: "Congé approuvé", rejected: "Congé refusé" }
  return {
    workspace_id: workspaceId,
    type: NOTIFICATION_TYPES.HR_LEAVE_REQUEST,
    title: titles[status],
    message: `${actorName} — ${leaveType} du ${startDate}`,
    module,
    link: link ?? "hr",
    actor_name: actorName,
  }
}

export function createHRContractExpiryNotification(
  workspaceId: string,
  employeeName: string,
  endDate: string,
  module: string,
  link?: string
): NotificationPayload {
  return {
    workspace_id: workspaceId,
    type: NOTIFICATION_TYPES.HR_CONTRACT_EXPIRY,
    title: "Contrat bientôt expiré",
    message: `Le contrat de ${employeeName} expire le ${endDate}`,
    module,
    link: link ?? "hr",
  }
}

export function createHREvaluationNotification(
  workspaceId: string,
  actorName: string,
  employeeName: string,
  period: string,
  module: string,
  link?: string
): NotificationPayload {
  return {
    workspace_id: workspaceId,
    type: NOTIFICATION_TYPES.HR_EVALUATION,
    title: "Évaluation planifiée",
    message: `${actorName} a planifié une évaluation pour ${employeeName} (${period})`,
    module,
    link: link ?? "hr",
    actor_name: actorName,
  }
}

export function createHRAbsenceNotification(
  workspaceId: string,
  employeeName: string,
  date: string,
  module: string,
  link?: string
): NotificationPayload {
  return {
    workspace_id: workspaceId,
    type: NOTIFICATION_TYPES.HR_ABSENCE,
    title: "Absence signalée",
    message: `${employeeName} est absent(e) le ${date}`,
    module,
    link: link ?? "hr",
  }
}

export function createHRTrainingNotification(
  workspaceId: string,
  actorName: string,
  trainingTitle: string,
  action: "scheduled" | "completed" | "cancelled",
  module: string,
  link?: string
): NotificationPayload {
  const titles = { scheduled: "Formation planifiée", completed: "Formation terminée", cancelled: "Formation annulée" }
  return {
    workspace_id: workspaceId,
    type: NOTIFICATION_TYPES.HR_TRAINING,
    title: titles[action],
    message: `${actorName} : ${trainingTitle}`,
    module,
    link: link ?? "hr",
    actor_name: actorName,
  }
}

export function createHRPromotionNotification(
  workspaceId: string,
  actorName: string,
  employeeName: string,
  newPosition: string,
  module: string,
  link?: string
): NotificationPayload {
  return {
    workspace_id: workspaceId,
    type: NOTIFICATION_TYPES.HR_PROMOTION,
    title: "Promotion",
    message: `${employeeName} promu(e) au poste de ${newPosition}`,
    module,
    link: link ?? "hr",
    actor_name: actorName,
  }
}

export function createHRBirthdayNotification(
  workspaceId: string,
  employeeName: string,
  date: string,
  module: string,
  link?: string
): NotificationPayload {
  return {
    workspace_id: workspaceId,
    type: NOTIFICATION_TYPES.HR_BIRTHDAY,
    title: "Anniversaire",
    message: `Joyeux anniversaire à ${employeeName} ! (${date})`,
    module,
    link: link ?? "hr",
  }
}

// ─── Payroll / Payment Notifications ─────────────────────

export function createHRPayslipNotification(
  workspaceId: string,
  employeeName: string,
  payslipNumber: string,
  netPay: number,
  module: string,
  link?: string
): NotificationPayload {
  return {
    workspace_id: workspaceId,
    type: NOTIFICATION_TYPES.HR_PAYSLIP,
    title: "Fiche de paie disponible",
    message: `Fiche de paie ${payslipNumber} — ${employeeName} : ${formatCurrency(netPay)}`,
    module,
    link: link ?? "hr_payroll",
  }
}

export function createHRPaymentNotification(
  workspaceId: string,
  actorName: string,
  employeeName: string,
  amount: number,
  module: string,
  link?: string
): NotificationPayload {
  return {
    workspace_id: workspaceId,
    type: NOTIFICATION_TYPES.HR_PAYMENT,
    title: "Paiement effectué",
    message: `${actorName} a effectué un paiement de ${formatCurrency(amount)} à ${employeeName}`,
    module,
    link: link ?? "hr_payroll",
    actor_name: actorName,
  }
}

export function createHRPayrollPeriodNotification(
  workspaceId: string,
  actorName: string,
  periodLabel: string,
  status: "created" | "completed" | "cancelled",
  module: string,
  link?: string
): NotificationPayload {
  const titles = { created: "Période de paie créée", completed: "Paie finalisée", cancelled: "Période annulée" }
  return {
    workspace_id: workspaceId,
    type: NOTIFICATION_TYPES.HR_PAYROLL_PERIOD,
    title: titles[status],
    message: `${actorName} — ${titles[status]} : ${periodLabel}`,
    module,
    link: link ?? "hr_payroll",
    actor_name: actorName,
  }
}

export function createHRSalaryAdvanceNotification(
  workspaceId: string,
  actorName: string,
  employeeName: string,
  amount: number,
  action: "approved" | "paid" | "cancelled",
  module: string,
  link?: string
): NotificationPayload {
  const titles = { approved: "Avance salariale approuvée", paid: "Avance salariale payée", cancelled: "Avance annulée" }
  return {
    workspace_id: workspaceId,
    type: NOTIFICATION_TYPES.HR_SALARY_ADVANCE,
    title: titles[action],
    message: `${actorName} — ${employeeName} : ${formatCurrency(amount)}`,
    module,
    link: link ?? "hr_payroll",
    actor_name: actorName,
  }
}
