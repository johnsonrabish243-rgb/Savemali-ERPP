import * as React from "react"
import { FileDown, FileText, FileSpreadsheet, Loader2, Send, CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/i18n"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import { insforge } from "@/lib/supabase"
import { publishNotification } from "@/lib/notifications"
import {
  generatePDF,
  generateDOCX,
  generateXLSX,
  buildEducationReport,
  buildPharmacyReport,
  buildCommerceReport,
  buildGestionReport,
  buildHRReport,
  type ModuleType,
  type ReportData,
} from "@/lib/report-generator"

interface ReportGeneratorProps {
  moduleType: ModuleType
  workspace: { id: string; name: string; type: string; country?: string; created_at?: string }
  data: Record<string, any>
  /** If true, this is the admin view — never show "Send to admin" */
  isAdmin?: boolean
}

interface SubmittedReport {
  id: string
  status: string
  admin_comment: string | null
  reviewed_at: string | null
}

const STATUS_CONFIG: Record<string, { fr: string; en: string; icon: React.ReactNode; className: string }> = {
  pending: {
    fr: "En cours de révision",
    en: "Under review",
    icon: <Clock className="size-4" />,
    className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  },
  in_review: {
    fr: "En cours de révision",
    en: "Under review",
    icon: <Clock className="size-4" />,
    className: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  },
  accepted: {
    fr: "Rapport validé et accepté",
    en: "Report validated and accepted",
    icon: <CheckCircle className="size-4" />,
    className: "bg-green-500/10 text-green-600 border-green-500/30",
  },
  rejected: {
    fr: "Rapport refusé. Merci d'apporter les corrections demandées.",
    en: "Report rejected. Please make the requested corrections.",
    icon: <XCircle className="size-4" />,
    className: "bg-red-500/10 text-red-600 border-red-500/30",
  },
}

const MODULE_LABELS: Record<string, { fr: string; en: string }> = {
  education: { fr: "Éducation", en: "Education" },
  pharmacy: { fr: "Pharmacie", en: "Pharmacy" },
  commerce: { fr: "Commerce", en: "Commerce" },
  gestion: { fr: "Gestion", en: "Management" },
  hr: { fr: "Ressources Humaines", en: "Human Resources" },
}

export function ReportGenerator({ moduleType, workspace, data, isAdmin = false }: ReportGeneratorProps) {
  const { lang } = useLanguage()
  const { user } = useAuth()
  const fr = lang === "fr"
  const [generating, setGenerating] = React.useState<"pdf" | "docx" | "xlsx" | null>(null)
  const [sending, setSending] = React.useState(false)
  const [submitted, setSubmitted] = React.useState<SubmittedReport | null>(null)
  const [loadingStatus, setLoadingStatus] = React.useState(true)

  const exporterName = React.useMemo(() => {
    if (!user?.email) return "—"
    return user.email.split("@")[0]
  }, [user])

  // Check if user already submitted a report for this module
  React.useEffect(() => {
    if (!user || !workspace?.id) return
    let cancelled = false
    async function checkStatus() {
      try {
        const { data: reports } = await insforge.database
          .from("shared_reports")
          .select("id, status, admin_comment, reviewed_at")
          .eq("workspace_id", workspace.id)
          .eq("sender_id", user!.id)
          .eq("module_type", moduleType)
          .order("created_at", { ascending: false })
          .limit(1)
        if (!cancelled && reports && reports.length > 0) {
          setSubmitted(reports[0] as SubmittedReport)
        }
      } catch {}
      if (!cancelled) setLoadingStatus(false)
    }
    checkStatus()
    return () => { cancelled = true }
  }, [user, workspace?.id, moduleType])

  // Poll for status changes every 15s
  React.useEffect(() => {
    if (!submitted || !user || !workspace?.id) return
    if (submitted.status === "accepted" || submitted.status === "archived") return
    const interval = setInterval(async () => {
      try {
        const { data: reports } = await insforge.database
          .from("shared_reports")
          .select("id, status, admin_comment, reviewed_at")
          .eq("id", submitted.id)
          .single()
        if (reports && (reports as any).status !== submitted.status) {
          setSubmitted(reports as SubmittedReport)
          const cfg = STATUS_CONFIG[(reports as any).status]
          if (cfg) {
            toast.info(fr ? cfg.fr : cfg.en)
          }
        }
      } catch {}
    }, 15_000)
    return () => clearInterval(interval)
  }, [submitted?.id, submitted?.status, user, workspace?.id, fr])

  const buildReport = React.useCallback(() => {
    const members = data.members ?? []
    const base = { exporterName }
    switch (moduleType) {
      case "education":
        return { ...buildEducationReport(workspace, {
          students: data.students ?? [],
          teachers: data.teachers ?? [],
          classes: data.classes ?? [],
          attendance: data.attendance ?? [],
          feePayments: data.feePayments ?? [],
          members,
        }, fr), ...base }
      case "pharmacy":
        return { ...buildPharmacyReport(workspace, {
          medicines: data.medicines ?? [],
          sales: data.sales ?? [],
          orders: data.orders ?? [],
          members,
        }, fr), ...base }
      case "commerce":
        return { ...buildCommerceReport(workspace, {
          products: data.products ?? [],
          customers: data.customers ?? [],
          sales: data.sales ?? [],
          invoices: data.invoices ?? [],
          members,
        }, fr), ...base }
      case "gestion":
        return { ...buildGestionReport(workspace, {
          employees: data.employees ?? [],
          accounting: data.accounting ?? [],
          members,
        }, fr), ...base }
      case "hr":
        return { ...buildHRReport(workspace, {
          employees: data.employees ?? [],
          departments: data.departments ?? [],
          contracts: data.contracts ?? [],
          leaves: data.leaves ?? [],
          members,
        }, fr), ...base }
      default:
        return null
    }
  }, [moduleType, workspace, data, fr, exporterName])

  const handlePDF = React.useCallback(async () => {
    setGenerating("pdf")
    try {
      const report = buildReport()
      if (!report) return
      await generatePDF(report, fr)
    } catch (err) {
      console.error("PDF generation failed:", err)
    } finally {
      setGenerating(null)
    }
  }, [buildReport, fr])

  const handleDOCX = React.useCallback(async () => {
    setGenerating("docx")
    try {
      const report = buildReport()
      if (!report) return
      await generateDOCX(report, fr)
    } catch (err) {
      console.error("DOCX generation failed:", err)
    } finally {
      setGenerating(null)
    }
  }, [buildReport, fr])

  const handleXLSX = React.useCallback(async () => {
    setGenerating("xlsx")
    try {
      const report = buildReport()
      if (!report) return
      generateXLSX(report, fr)
    } catch (err) {
      console.error("XLSX generation failed:", err)
    } finally {
      setGenerating(null)
    }
  }, [buildReport, fr])

  const handleSendToAdmin = React.useCallback(async () => {
    if (!user || !workspace?.id) return
    setSending(true)
    try {
      const ml = MODULE_LABELS[moduleType] ?? { fr: moduleType, en: moduleType }
      const now = new Date()
      const title = `${fr ? "Rapport" : "Report"} ${ml[fr ? "fr" : "en"]} — ${workspace.name}`
      const description = fr
        ? `Rapport généré le ${now.toLocaleDateString("fr-FR")} à ${now.toLocaleTimeString("fr-FR")} par ${exporterName}`
        : `Report generated on ${now.toLocaleDateString("en-US")} at ${now.toLocaleTimeString("en-US")} by ${exporterName}`

      const reportData = buildReport()

      const { data: newReport, error } = await insforge.database.from("shared_reports").insert([{
        workspace_id: workspace.id,
        sender_id: user.id,
        sender_name: exporterName,
        module_type: moduleType,
        title,
        description,
        report_data: reportData as any,
        status: "pending",
      }]).select("id, status, admin_comment, reviewed_at").single()
      if (error) throw error

      // Notify workspace admin
      const { data: ws } = await insforge.database.from("workspaces").select("owner_id").eq("id", workspace.id).single()
      if (ws?.owner_id && ws.owner_id !== user.id) {
        await publishNotification({
          workspace_id: workspace.id,
          user_id: ws.owner_id,
          type: "report",
          title: fr ? "Nouveau rapport reçu" : "New report received",
          message: fr
            ? `${exporterName} a envoyé un rapport ${ml.fr} pour ${workspace.name}`
            : `${exporterName} sent a ${ml.en} report for ${workspace.name}`,
          module: moduleType,
          actor_name: exporterName,
        })
      }

      setSubmitted(newReport as SubmittedReport)
      toast.success(fr ? "Rapport soumis — en cours de révision par l'administrateur." : "Report submitted — under review by administrator.")
    } catch (err: any) {
      toast.error(err?.message || (fr ? "Erreur lors de l'envoi" : "Error sending report"))
    } finally {
      setSending(false)
    }
  }, [user, workspace, moduleType, fr, exporterName])

  // Determine if send button should show
  const canSend = !isAdmin && (!submitted || submitted.status === "rejected")
  const statusCfg = submitted ? STATUS_CONFIG[submitted.status] ?? STATUS_CONFIG.pending : null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handlePDF}
          disabled={generating !== null}
          className="gap-1.5"
        >
          {generating === "pdf" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <FileDown className="size-3.5" />
          )}
          PDF
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleDOCX}
          disabled={generating !== null}
          className="gap-1.5"
        >
          {generating === "docx" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <FileText className="size-3.5" />
          )}
          Word
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleXLSX}
          disabled={generating !== null}
          className="gap-1.5"
        >
          {generating === "xlsx" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <FileSpreadsheet className="size-3.5" />
          )}
          Excel
        </Button>
        {canSend && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleSendToAdmin}
            disabled={sending}
            className="gap-1.5"
          >
            {sending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Send className="size-3.5" />
            )}
            {fr ? "Envoyer à l'admin" : "Send to admin"}
          </Button>
        )}
      </div>

      {/* Status badge for submitted reports (employee view only) */}
      {!isAdmin && !loadingStatus && statusCfg && (
        <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${statusCfg.className}`}>
          {statusCfg.icon}
          <span className="font-medium">{fr ? statusCfg.fr : statusCfg.en}</span>
          {submitted?.admin_comment && (
            <span className="text-xs opacity-80 ml-2">— {submitted.admin_comment}</span>
          )}
        </div>
      )}
    </div>
  )
}
