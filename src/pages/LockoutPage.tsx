import { useLanguage } from "@/lib/i18n"
import { Logo } from "@/components/Logo"
import { ShieldOff, Clock } from "lucide-react"

interface Props {
  until: number
  remainingHours: number
}

export function LockoutPage({ until, remainingHours }: Props) {
  const { lang } = useLanguage()
  const fr = lang === "fr"
  const unlockTime = new Date(until).toLocaleTimeString(fr ? "fr-FR" : "en-US", { hour: "2-digit", minute: "2-digit" })

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-5 text-center max-w-sm">
        <img
          src="/SaveMali_Logo.png"
          alt="SaveMali"
          className="size-16 rounded-xl object-cover shadow-lg"
          onError={(e) => { e.currentTarget.style.display = "none" }}
        />
        <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
          <ShieldOff className="size-7 text-destructive" />
        </div>
        <h1 className="text-xl font-bold text-foreground">
          {fr ? "Compte désactivé" : "Account disabled"}
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {fr
            ? "Déconnecté du serveur suite aux violations de droits d'accès. Votre compte sera réactivé automatiquement."
            : "Disconnected from server due to access rights violations. Your account will be automatically reactivated."}
        </p>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-3">
          <Clock className="size-4 text-muted-foreground" />
          <p className="text-sm text-foreground font-medium">
            {fr ? `Réactivation à ${unlockTime}` : `Reactivation at ${unlockTime}`}
          </p>
        </div>
        <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-muted-foreground/50">
          <Logo imgClassName="h-3 opacity-50" />
          <span>© {new Date().getFullYear()} {fr ? "Tous droits réservés." : "All rights reserved."}</span>
        </div>
      </div>
    </div>
  )
}
