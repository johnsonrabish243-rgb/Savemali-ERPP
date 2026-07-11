import * as React from "react"
import { useLanguage } from "@/lib/i18n"
import { useAuth } from "@/hooks/use-auth"
import { format } from "date-fns"
import { fr as frLocale, enUS } from "date-fns/locale"
import { Sparkles, TrendingUp, Bell } from "lucide-react"

interface WelcomeMessageProps {
  className?: string
}

const greetings: Record<string, { fr: string; en: string }> = {
  pharmacy: { fr: "Gérez votre pharmacie en toute sérénité", en: "Manage your pharmacy with confidence" },
  commerce: { fr: "Gérez votre commerce facilement", en: "Manage your shop with ease" },
  education: { fr: "Gérez votre établissement scolaire", en: "Manage your school efficiently" },
  gestion: { fr: "Gérez votre entreprise intelligemment", en: "Manage your business smartly" },
  hr: { fr: "Gérez vos ressources humaines", en: "Manage your human resources" },
}

const tips: Record<string, { fr: string; en: string }> = {
  pharmacy: {
    fr: "Pensez à vérifier vos alertes de péremption aujourd'hui",
    en: "Remember to check your expiry alerts today",
  },
  commerce: {
    fr: "Consultez vos ventes du jour dans le tableau de bord",
    en: "Check your daily sales in the dashboard",
  },
  education: {
    fr: "Vérifiez les présences et les paiements en attente",
    en: "Check attendance and pending payments",
  },
  gestion: {
    fr: "Analysez vos indicateurs de performance du mois",
    en: "Review this month's performance indicators",
  },
  hr: {
    fr: "Suivez les demandes de congé en attente",
    en: "Track pending leave requests",
  },
}

export function WelcomeMessage({ className }: WelcomeMessageProps) {
  const { lang, t } = useLanguage()
  const { user, workspace } = useAuth()
  const fr = lang === "fr"

  const wsType = workspace?.type
  const greeting = wsType ? greetings[wsType] : { fr: "Bienvenue sur SaveMali", en: "Welcome to SaveMali" }
  const tip = wsType ? tips[wsType] : null

  return (
    <div className={`border-b border-border bg-gradient-to-r from-brand/5 via-brand/[0.07] to-transparent px-4 lg:px-6 py-4 ${className ?? ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-brand/70 shrink-0" />
            <h1 className="text-lg font-bold text-foreground tracking-tight">
              {t.dashboard.welcomeTitle.replace("{name}", user?.email?.split("@")[0] ?? "")}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {greeting[lang]} — {format(new Date(), "d MMMM yyyy", { locale: fr ? frLocale : enUS })}
          </p>
          {tip && (
            <p className="text-xs text-muted-foreground/70 mt-1.5 flex items-center gap-1.5">
              <TrendingUp className="size-3" />
              {tip[lang]}
            </p>
          )}
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1.5 text-xs font-medium text-brand">
            <Bell className="size-3" />
            {fr ? "3 notifications" : "3 notifications"}
          </div>
        </div>
      </div>
    </div>
  )
}
