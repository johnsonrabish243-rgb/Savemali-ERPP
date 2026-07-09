import * as React from "react"
import { useAuth } from "@/hooks/use-auth"
import { useLanguage } from "@/lib/i18n"
import { insforge, type WorkspaceType } from "@/lib/supabase"
import { trackModuleOpen } from "@/lib/context-tracker"
import { Logo } from "@/components/Logo"

interface Props {
  onNavigate: (p: string) => void
}

const WORKSPACE_TYPES: { key: WorkspaceType; icon: string }[] = [
  { key: "pharmacy", icon: "💊" },
  { key: "commerce", icon: "🛒" },
  { key: "education", icon: "🎓" },
  { key: "gestion", icon: "📊" },
  { key: "hr", icon: "👥" },
]

export function CreateWorkspacePage({ onNavigate }: Props) {
  const { user, checkAuth } = useAuth()
  const { lang } = useLanguage()
  const fr = lang === "fr"

  const [name, setName] = React.useState("")
  const [type, setType] = React.useState<WorkspaceType>("pharmacy")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const workspaceTypeLabels: Record<WorkspaceType, string> = {
    pharmacy: fr ? "Pharmacie" : "Pharmacy",
    commerce: fr ? "Commerce / Boutique" : "Commerce / Shop",
    education: fr ? "Établissement scolaire" : "School / Education",
    gestion: fr ? "Gestion d'entreprise" : "Business Management",
    hr: fr ? "Ressources Humaines" : "Human Resources",
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !user) return
    setLoading(true)
    setError(null)
    try {
      const { error: wsError } = await insforge.database
        .from("workspaces")
        .insert([{ owner_id: user.id, name: name.trim(), type }])
      if (wsError) throw wsError

      trackModuleOpen(type)
      await checkAuth()

      const target = type === "pharmacy" ? "pharmacy" : "dashboard"
      onNavigate(target)
    } catch (err: any) {
      setError(err.message || (fr ? "Erreur lors de la création" : "Creation error"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-svh flex flex-col bg-background">
      <div className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-sm sm:max-w-md">
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[#c8399c] to-[#7c3aed] flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-xl sm:text-2xl font-bold text-white">S</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
              {fr ? "Créez votre espace" : "Create your workspace"}
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              {fr
                ? "Aucun espace de travail trouvé. Créez-en un pour commencer."
                : "No workspace found. Create one to get started."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {fr ? "Nom de l'espace" : "Workspace name"}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={fr ? "Ex : Pharmacie Centrale Kinshasa" : "E.g. Central Pharmacy Kinshasa"}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#c8399c]/50 focus:border-[#c8399c] transition-all text-sm sm:text-base"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                {fr ? "Type d'activité" : "Business type"}
              </label>
              <div className="grid grid-cols-1 gap-2">
                {WORKSPACE_TYPES.map((wt) => (
                  <button
                    key={wt.key}
                    type="button"
                    onClick={() => setType(wt.key)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                      type === wt.key
                        ? "border-[#c8399c] bg-[#c8399c]/5 text-foreground shadow-sm"
                        : "border-border bg-background text-muted-foreground hover:border-muted-foreground/50"
                    }`}
                  >
                    <span className="text-lg">{wt.icon}</span>
                    <span className="font-medium text-sm">{workspaceTypeLabels[wt.key]}</span>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#c8399c] to-[#7c3aed] text-white font-semibold shadow-lg hover:shadow-xl hover:opacity-90 transition-all disabled:opacity-50 text-sm sm:text-base"
            >
              {loading
                ? (fr ? "Création..." : "Creating...")
                : (fr ? "Créer mon espace" : "Create workspace")}
            </button>
          </form>
        </div>
      </div>

      <footer className="border-t border-border bg-background py-6 sm:py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-3">
              <Logo imgClassName="h-6 sm:h-7" />
            </div>
            <p className="text-xs text-muted-foreground text-center sm:text-right">
              &copy; {new Date().getFullYear()} SaveMali — {fr ? "Développé par John Mocket" : "Developed by John Mocket"}
            </p>
          </div>
          <p className="text-[10px] text-muted-foreground/60 text-center mt-3 sm:mt-4">
            {fr ? "Tous droits réservés." : "All rights reserved."} — {fr ? "Fait en RDC 🇨🇩" : "Made in DRC 🇨🇩"}
          </p>
        </div>
      </footer>
    </div>
  )
}
