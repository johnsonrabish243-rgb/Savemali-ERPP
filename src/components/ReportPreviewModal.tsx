import * as React from "react"
import {
  X, FileDown, FileText, FileSpreadsheet, Loader2,
  CheckCircle, XCircle, Clock, Eye, Send,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/i18n"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import { insforge } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import {
  generatePDF,
  generateDOCX,
  generateXLSX,
  MODULE_LABELS,
  type ReportData,
  type ModuleType,
} from "@/lib/report-generator"

interface ReportPreviewModalProps {
  open: boolean
  onClose: () => void
  report: {
    id: string
    title: string
    description: string | null
    sender_name: string
    module_type: string
    status: string
    admin_comment: string | null
    report_data: ReportData | null
    created_at: string
    reviewed_at: string | null
  }
  onStatusChange: (id: string, newStatus: string, comment?: string) => void
}

const STATUS_CONFIG: Record<string, { fr: string; en: string; icon: React.ReactNode; className: string }> = {
  pending: {
    fr: "En attente",
    en: "Pending",
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
    fr: "Validé et accepté",
    en: "Validated and accepted",
    icon: <CheckCircle className="size-4" />,
    className: "bg-green-500/10 text-green-600 border-green-500/30",
  },
  rejected: {
    fr: "Refusé",
    en: "Rejected",
    icon: <XCircle className="size-4" />,
    className: "bg-red-500/10 text-red-600 border-red-500/30",
  },
}

export function ReportPreviewModal({ open, onClose, report, onStatusChange }: ReportPreviewModalProps) {
  const { lang } = useLanguage()
  const { user } = useAuth()
  const fr = lang === "fr"
  const [generating, setGenerating] = React.useState<"pdf" | "docx" | "xlsx" | null>(null)
  const [processing, setProcessing] = React.useState(false)
  const [comment, setComment] = React.useState("")

  const mod = MODULE_LABELS[report.module_type as ModuleType] ?? { fr: report.module_type, en: report.module_type, color: "#64748B" }
  const statusCfg = STATUS_CONFIG[report.status] ?? STATUS_CONFIG.pending
  const rd = report.report_data

  const exporterName = React.useMemo(() => {
    if (!user?.email) return "—"
    return user.email.split("@")[0]
  }, [user])

  // Escape key to close
  React.useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, onClose])

  if (!open) return null

  async function handleDownload(format: "pdf" | "docx" | "xlsx") {
    if (!rd) return
    setGenerating(format)
    try {
      if (format === "pdf") await generatePDF(rd, fr)
      else if (format === "docx") await generateDOCX(rd, fr)
      else generateXLSX(rd, fr)
    } catch (err) {
      console.error(`${format.toUpperCase()} generation failed:`, err)
      toast.error(fr ? "Erreur de téléchargement" : "Download error")
    } finally {
      setGenerating(null)
    }
  }

  async function handleAccept() {
    setProcessing(true)
    try {
      await insforge.database.from("shared_reports").update({
        status: "accepted",
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        admin_comment: comment || null,
      }).eq("id", report.id)
      onStatusChange(report.id, "accepted", comment || undefined)
      toast.success(fr ? "Rapport accepté" : "Report accepted")
      setComment("")
      onClose()
    } catch (err) {
      console.error("Failed to accept report:", err)
      toast.error(fr ? "Erreur lors de l'acceptation" : "Error accepting report")
    } finally {
      setProcessing(false)
    }
  }

  async function handleReject() {
    if (!comment.trim()) {
      toast.error(fr ? "Veuillez saisir un motif de refus" : "Please provide a reason for rejection")
      return
    }
    setProcessing(true)
    try {
      await insforge.database.from("shared_reports").update({
        status: "rejected",
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        admin_comment: comment,
      }).eq("id", report.id)
      onStatusChange(report.id, "rejected", comment)
      toast.success(fr ? "Rapport refusé" : "Report rejected")
      setComment("")
      onClose()
    } catch (err) {
      console.error("Failed to reject report:", err)
      toast.error(fr ? "Erreur lors du refus" : "Error rejecting report")
    } finally {
      setProcessing(false)
    }
  }

  const isFinal = report.status === "accepted" || report.status === "archived"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 flex flex-col max-h-[92vh] w-full max-w-4xl mx-4 rounded-xl border border-border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <div className="flex size-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${mod.color}15` }}>
            <Eye className="size-5" style={{ color: mod.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-foreground truncate">{report.title}</h2>
            <p className="text-xs text-muted-foreground">
              {fr ? "De" : "From"}: {report.sender_name} — {new Date(report.created_at).toLocaleString(fr ? "fr-FR" : "en-US")}
            </p>
          </div>
          <div className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", statusCfg.className)}>
            {statusCfg.icon}
            {fr ? statusCfg.fr : statusCfg.en}
          </div>
          <button onClick={onClose} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors">
            <X className="size-4" />
          </button>
        </div>

        {/* Content — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {rd ? (
            <>
              {/* Workspace & Module Info */}
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: mod.color }} />
                  <span className="text-sm font-semibold text-foreground">{rd.workspaceName}</span>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: `${mod.color}15`, color: mod.color }}>
                    {mod[fr ? "fr" : "en"]}
                  </span>
                </div>
                {rd.workspaceSettings.length > 0 && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {rd.workspaceSettings.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">{s.label}:</span>
                        <span className="font-medium text-foreground">{s.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Stats */}
              {rd.stats.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">{fr ? "Résumé" : "Summary"}</h3>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {rd.stats.map((s, i) => (
                      <div key={i} className="rounded-lg border border-border bg-background p-3">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{fr ? s.label : s.labelEn}</p>
                        <p className="text-lg font-bold text-foreground mt-0.5">{s.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sections / Tables */}
              {rd.sections.map((section, si) => (
                <div key={si}>
                  <h3 className="text-sm font-semibold text-foreground mb-2">{section[fr ? "title" : "titleEn"] || section.title}</h3>
                  {section.rows.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">{fr ? "Aucune donnée disponible" : "No data available"}</p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border bg-muted/50">
                            {section.headers.map((h, hi) => (
                              <th key={hi} className="px-3 py-2 text-left font-semibold text-foreground whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {section.rows.map((row, ri) => (
                            <tr key={ri} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                              {row.map((cell, ci) => (
                                <td key={ci} className="px-3 py-2 text-foreground whitespace-nowrap">{String(cell ?? "—")}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}

              {/* Admin comment if exists */}
              {report.admin_comment && (
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-xs font-semibold text-foreground mb-1">{fr ? "Commentaire de l'administrateur" : "Administrator comment"}</p>
                  <p className="text-sm text-muted-foreground">{report.admin_comment}</p>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="size-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">{fr ? "Aucune donnée de rapport disponible" : "No report data available"}</p>
              <p className="text-xs text-muted-foreground mt-1">{fr ? "Le rapport a été soumis avant l'activation de la sauvegarde des données" : "Report was submitted before data saving was enabled"}</p>
            </div>
          )}
        </div>

        {/* Footer — actions */}
        <div className="border-t border-border px-5 py-4 space-y-3">
          {/* Download buttons — admin only */}
          {rd && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-muted-foreground mr-1">{fr ? "Télécharger :" : "Download:"}</span>
              <Button size="sm" variant="outline" onClick={() => handleDownload("pdf")} disabled={generating !== null} className="gap-1.5">
                {generating === "pdf" ? <Loader2 className="size-3.5 animate-spin" /> : <FileDown className="size-3.5" />}
                PDF
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleDownload("docx")} disabled={generating !== null} className="gap-1.5">
                {generating === "docx" ? <Loader2 className="size-3.5 animate-spin" /> : <FileText className="size-3.5" />}
                Word
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleDownload("xlsx")} disabled={generating !== null} className="gap-1.5">
                {generating === "xlsx" ? <Loader2 className="size-3.5 animate-spin" /> : <FileSpreadsheet className="size-3.5" />}
                Excel
              </Button>
            </div>
          )}

          {/* Accept / Reject — only if not already final */}
          {!isFinal && (
            <div className="space-y-2">
              <input
                type="text"
                placeholder={fr ? "Commentaire (optionnel pour accepter, requis pour refuser)..." : "Comment (optional for accept, required for reject)..."}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/50"
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleAccept}
                  disabled={processing}
                  className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                >
                  {processing ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle className="size-3.5" />}
                  {fr ? "Accepter" : "Accept"}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleReject}
                  disabled={processing || !comment.trim()}
                  className="gap-1.5"
                >
                  {processing ? <Loader2 className="size-3.5 animate-spin" /> : <XCircle className="size-3.5" />}
                  {fr ? "Refuser" : "Reject"}
                </Button>
              </div>
            </div>
          )}

          {/* Already processed message */}
          {isFinal && (
            <div className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-sm", statusCfg.className)}>
              {statusCfg.icon}
              <span className="font-medium">{fr ? statusCfg.fr : statusCfg.en}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
