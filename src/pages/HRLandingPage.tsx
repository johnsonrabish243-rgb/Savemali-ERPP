import * as React from "react"
import { Users, ClipboardCheck, Plane, Building2, GraduationCap, Star, TrendingUp, FileText } from "lucide-react"
import { useLanguage } from "@/lib/i18n"
import { SeoHead } from "@/lib/seo"
import { Logo } from "@/components/Logo"
import { SpiralButton } from "@/components/SpiralButton"

type Page = "home" | "education" | "pharmacy" | "commerce" | "gestion" | "hr" | "dashboard" | "signin" | "signup"
interface Props { onNavigate: (page: Page) => void }

export function HRLandingPage({ onNavigate }: Props) {
  const { lang, t } = useLanguage()
  const fr = lang === "fr"

  const features = [
    { icon: Users, title: fr ? "Gestion des employés" : "Employee Management", desc: fr ? "Gérez les profils, contrats, salaires et documents de chaque employé en un seul endroit." : "Manage each employee's profiles, contracts, salaries and documents in one place." },
    { icon: Plane, title: fr ? "Congés & absences" : "Leave & Absences", desc: fr ? "Demandes de congé en ligne, validation hiérarchique, suivi des soldes et historique complet." : "Online leave requests, hierarchical approval, balance tracking and full history." },
    { icon: ClipboardCheck, title: fr ? "Présences" : "Attendance", desc: fr ? "Suivi quotidien des présences, retards et absences avec rapports automatiques." : "Daily tracking of attendances, late arrivals and absences with automatic reports." },
    { icon: Building2, title: fr ? "Départements" : "Departments", desc: fr ? "Organisez votre entreprise en départements avec hiérarchie et organigramme." : "Organize your company into departments with hierarchy and org chart." },
    { icon: GraduationCap, title: fr ? "Formations" : "Training", desc: fr ? "Planifiez, organisez et suivez les formations de vos employés." : "Plan, organize and track your employees' training." },
    { icon: Star, title: fr ? "Évaluations" : "Evaluations", desc: fr ? "Évaluez les performances de vos employés avec des grilles personnalisables." : "Evaluate your employees' performance with customizable grids." },
    { icon: TrendingUp, title: fr ? "Promotions & carrière" : "Promotions & Career", desc: fr ? "Gérez les promotions, évolution de carrière et historique des postes." : "Manage promotions, career evolution and position history." },
    { icon: FileText, title: fr ? "Rapports RH" : "HR Reports", desc: fr ? "Générez des rapports détaillés sur vos effectifs, congés, évaluations et plus." : "Generate detailed reports on your workforce, leave, evaluations and more." },
  ]

  return (
    <div className="flex flex-col min-h-svh bg-background">
      <SeoHead page="landing-hr" lang={lang} />

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-700 pb-16 pt-20 sm:pb-20 sm:pt-28 lg:pb-28 lg:pt-36">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/4 w-[800px] h-[800px] rounded-full bg-white/5 blur-[120px]" />
          <div className="absolute -bottom-1/3 -right-1/4 w-[600px] h-[600px] rounded-full bg-white/5 blur-[100px]" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm">
            <Users className="size-3" />
            {t.hr.title}
          </div>
          <h1 className="mx-auto max-w-4xl text-4xl font-bold leading-[1] tracking-[-0.8px] text-white text-balance sm:text-5xl md:text-6xl">
            {fr ? "Gérez vos ressources humaines" : "Manage your human resources"}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-[1.7] text-white/80 sm:text-xl">
            {fr ? "Module complet de gestion RH : employés, contrats, congés, formations, évaluations et rapports." : "Complete HR management module: employees, contracts, leave, training, evaluations and reports."}
          </p>
          <div className="mt-10">
            <SpiralButton onClick={() => onNavigate("home")} label={fr ? "Commencer gratuitement" : "Start free"} />
          </div>
        </div>
      </section>

      {/* ═══════════ FEATURES ═══════════ */}
      <section className="py-16 sm:py-24 lg:py-[96px]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center sm:mb-16">
            <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/5 px-4 py-1.5 text-xs font-medium text-blue-600">
              {fr ? "À propos du module" : "About this module"}
            </div>
            <h2 className="text-3xl font-bold tracking-[-0.8px] text-foreground text-balance sm:text-4xl lg:text-[44px] lg:leading-[1.15]">
              {fr ? "Tout pour gérer votre équipe" : "Everything to manage your team"}
            </h2>
            <p className="mx-auto mt-5 max-w-3xl text-lg leading-[1.7] text-muted-foreground sm:text-xl">
              {fr ? "SaveMali RH centralise la gestion des employés, les congés, les formations et les évaluations dans une interface intuitive." : "SaveMali HR centralizes employee management, leave, training and evaluations in an intuitive interface."}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feat, i) => (
              <div key={i} className="group rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:border-blue-500/30 hover:shadow-md">
                <div className="mb-5 flex size-10 items-center justify-center rounded-full bg-blue-500/10">
                  <feat.icon className="size-5 text-blue-600" />
                </div>
                <h3 className="mb-2 text-base font-semibold text-foreground">{feat.title}</h3>
                <p className="text-sm leading-[1.6] text-muted-foreground">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ CTA ═══════════ */}
      <section className="bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-700 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold tracking-[-0.8px] text-white text-balance sm:text-4xl lg:text-[44px] lg:leading-[1.15]">
            {fr ? "Optimisez la gestion de votre équipe" : "Optimize your team management"}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-[1.7] text-white/80 sm:text-xl">
            {fr ? "Rejoignez des entreprises en RDC." : "Join businesses in the DRC."}
          </p>
          <div className="mt-10">
            <SpiralButton onClick={() => onNavigate("signup")} label={fr ? "Commencer maintenant" : "Start now"} />
          </div>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="border-t border-border bg-background py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-4 flex justify-center">
            <Logo imgClassName="h-10" />
          </div>
          <p className="text-xs text-muted-foreground">&copy; 2026 SaveMali — {fr ? "Développé par John Mocket" : "Developed by John Mocket"}</p>
        </div>
      </footer>
    </div>
  )
}
