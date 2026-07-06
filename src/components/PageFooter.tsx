import { Logo } from "@/components/Logo"
import { useLanguage } from "@/lib/i18n"
import { ArrowLeft } from "lucide-react"

interface PageFooterProps {
  onNavigate?: (page: string) => void
}

export function PageFooter({ onNavigate }: PageFooterProps) {
  const { lang } = useLanguage()
  const fr = lang === "fr"

  return (
    <footer className="border-t border-border bg-background py-8 mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-4">
            {onNavigate && (
              <button
                onClick={() => onNavigate("home")}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="size-3" />
                {fr ? "Retour à l'accueil" : "Back to home"}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Logo imgClassName="h-7" />
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} SaveMali — {fr ? "Développé par John Mocket" : "Developed by John Mocket"}
          </p>
        </div>
      </div>
    </footer>
  )
}
