import * as React from "react"
import { Shield, ShieldCheck, ShieldAlert, Globe, Monitor, Smartphone, BarChart3, Activity, CheckCircle2, XCircle, RefreshCw, Timer } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/lib/i18n"
import { getRiskHistory, type RiskHistoryEntry } from "@/lib/captcha/security"
import { getMediaLibrary } from "@/lib/captcha/media"

interface CaptchaStats {
  totalVerifications: number
  successRate: number
  failRate: number
  avgScore: number
  byType: Record<string, number>
  recentActivity: RiskHistoryEntry[]
}

function computeStats(): CaptchaStats {
  const history = getRiskHistory()
  const total = history.length
  const successes = history.filter((h) => h.score >= 60).length
  const mediaLib = getMediaLibrary()

  const byType: Record<string, number> = {}
  history.forEach((h) => { byType[h.type] = (byType[h.type] || 0) + 1 })

  const avgScore = total > 0 ? history.reduce((s, h) => s + h.score, 0) / total : 0

  return {
    totalVerifications: total,
    successRate: total > 0 ? (successes / total) * 100 : 0,
    failRate: total > 0 ? ((total - successes) / total) * 100 : 0,
    avgScore,
    byType,
    recentActivity: history.slice(-20).reverse(),
  }
}

export function CaptchaDashboard() {
  const { lang } = useLanguage()
  const fr = lang === "fr"
  const [stats, setStats] = React.useState(computeStats())
  const [selectedTab, setSelectedTab] = React.useState<"overview" | "activity" | "media">("overview")

  React.useEffect(() => {
    const id = setInterval(() => { setStats(computeStats()) }, 5000)
    return () => clearInterval(id)
  }, [])

  const mediaLib = getMediaLibrary()
  const categories = mediaLib.getCategories()
  const totalMedia = mediaLib.getCount()

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="size-5 text-accent" />
          <h2 className="text-lg font-bold text-foreground">{fr ? "Tableau de bord CAPTCHA" : "CAPTCHA Dashboard"}</h2>
        </div>
        <button
          type="button"
          onClick={() => setStats(computeStats())}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:bg-muted/30"
        >
          <RefreshCw className="size-3" />
          {fr ? "Actualiser" : "Refresh"}
        </button>
      </div>

      {/* Tab selector */}
      <div className="flex gap-1 rounded-lg bg-muted/30 p-1">
        {(["overview", "activity", "media"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setSelectedTab(tab)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
              selectedTab === tab ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab === "overview" ? (fr ? "Aperçu" : "Overview") : tab === "activity" ? (fr ? "Activité" : "Activity") : (fr ? "Médias" : "Media")}
          </button>
        ))}
      </div>

      {selectedTab === "overview" && (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: fr ? "Vérifications" : "Verifications", value: stats.totalVerifications, icon: Activity, color: "text-info" },
              { label: fr ? "Taux de succès" : "Success rate", value: `${stats.successRate.toFixed(0)}%`, icon: CheckCircle2, color: "text-success" },
              { label: fr ? "Taux d'échec" : "Fail rate", value: `${stats.failRate.toFixed(0)}%`, icon: XCircle, color: "text-destructive" },
              { label: fr ? "Score moyen" : "Avg score", value: stats.avgScore.toFixed(0), icon: BarChart3, color: "text-accent" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border/50 bg-card p-3 transition-all hover:shadow-md">
                <div className={cn("flex size-8 items-center justify-center rounded-lg bg-muted/30 mb-2", s.color)}>
                  <s.icon className="size-4" />
                </div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* By type */}
          {Object.keys(stats.byType).length > 0 && (
            <div className="rounded-xl border border-border/50 bg-card p-4">
              <h3 className="text-xs font-semibold text-foreground mb-3">{fr ? "Par type de défi" : "By challenge type"}</h3>
              <div className="space-y-2">
                {Object.entries(stats.byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                  <div key={type} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-24 capitalize">{type}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted/30 overflow-hidden">
                      <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(count / stats.totalVerifications) * 100}%` }} />
                    </div>
                    <span className="text-xs font-medium text-foreground w-8 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Device representation */}
          <div className="rounded-xl border border-border/50 bg-card p-4">
            <h3 className="text-xs font-semibold text-foreground mb-3">{fr ? "Appareils" : "Devices"}</h3>
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center gap-1 flex-1">
                <Monitor className="size-6 text-info" />
                <span className="text-lg font-bold text-foreground">-</span>
                <span className="text-[10px] text-muted-foreground">{fr ? "Desktop" : "Desktop"}</span>
              </div>
              <div className="flex flex-col items-center gap-1 flex-1">
                <Smartphone className="size-6 text-accent" />
                <span className="text-lg font-bold text-foreground">-</span>
                <span className="text-[10px] text-muted-foreground">{fr ? "Mobile" : "Mobile"}</span>
              </div>
              <div className="flex flex-col items-center gap-1 flex-1">
                <Globe className="size-6 text-warning" />
                <span className="text-lg font-bold text-foreground">-</span>
                <span className="text-[10px] text-muted-foreground">{fr ? "Régions" : "Regions"}</span>
              </div>
            </div>
          </div>
        </>
      )}

      {selectedTab === "activity" && (
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <h3 className="text-xs font-semibold text-foreground mb-3">{fr ? "Activité récente" : "Recent activity"}</h3>
          {stats.recentActivity.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <Activity className="size-8" />
              <p className="text-xs">{fr ? "Aucune activité captcha pour le moment" : "No captcha activity yet"}</p>
            </div>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {stats.recentActivity.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-muted/20 transition-colors">
                  <div className={cn(
                    "flex size-6 items-center justify-center rounded-full",
                    entry.score >= 60 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                  )}>
                    {entry.score >= 60 ? <ShieldCheck className="size-3" /> : <ShieldAlert className="size-3" />}
                  </div>
                  <span className="flex-1 text-foreground capitalize">{entry.type}</span>
                  <span className={cn("font-mono font-bold", entry.score >= 60 ? "text-success" : "text-destructive")}>{entry.score}</span>
                  <span className="text-muted-foreground/60">{new Date(entry.time).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedTab === "media" && (
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <h3 className="text-xs font-semibold text-foreground mb-3">{fr ? "Bibliothèque de médias" : "Media library"}</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-lg bg-muted/20 p-3">
              <p className="text-2xl font-bold text-foreground">{totalMedia}</p>
              <p className="text-[10px] text-muted-foreground">{fr ? "Médias au total" : "Total media"}</p>
            </div>
            <div className="rounded-lg bg-muted/20 p-3">
              <p className="text-2xl font-bold text-foreground">{categories.length}</p>
              <p className="text-[10px] text-muted-foreground">{fr ? "Catégories" : "Categories"}</p>
            </div>
          </div>
          {categories.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <span key={cat} className="rounded-full bg-muted/30 px-2.5 py-1 text-[10px] text-muted-foreground font-medium">{cat}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
