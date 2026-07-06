import { useLanguage } from "@/lib/i18n"
import { ShieldAlert, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Page } from "@/App"

interface Props { onNavigate: (p: Page) => void }

export function AccessDeniedPage({ onNavigate }: Props) {
  const { lang } = useLanguage()
  const fr = lang === "fr"

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
          <ShieldAlert className="size-8 text-destructive" />
        </div>
        <h1 className="text-xl font-bold text-foreground">
          {fr ? "Accès refusé" : "Access Denied"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {fr
            ? "Vous n'avez pas les droits pour accéder à cette ressource. Redirection vers votre tableau de bord..."
            : "You don't have permission to access this resource. Redirecting to your dashboard..."}
        </p>
        <Button onClick={() => onNavigate("dashboard")} className="mt-2 gap-2">
          <ArrowLeft className="size-4" />
          {fr ? "Retour au tableau de bord" : "Back to dashboard"}
        </Button>
      </div>
    </div>
  )
}
