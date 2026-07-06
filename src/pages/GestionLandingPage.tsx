import * as React from "react"
import { BarChart3, Calculator, Users, PieChart, Briefcase, TrendingUp, ArrowUpCircle, ArrowDownCircle, FileText } from "lucide-react"
import { useLanguage } from "@/lib/i18n"
import { Logo } from "@/components/Logo"
import { SpiralButton } from "@/components/SpiralButton"

type Page = "home" | "education" | "pharmacy" | "commerce" | "gestion" | "dashboard" | "signin" | "signup"
interface Props { onNavigate: (page: Page) => void }

export function GestionLandingPage({ onNavigate }: Props) {
  const { lang, t } = useLanguage()
  const fr = lang === "fr"

  const features = [
    { icon: Calculator, title: fr ? "Comptabilité intelligente" : "Smart Accounting", desc: fr ? "Suivez vos revenus, dépenses et bénéfices en temps réel. Rapports financiers automatisés et analyse de rentabilité." : "Track your income, expenses and profits in real time. Automated financial reports and profitability analysis." },
    { icon: Users, title: fr ? "Gestion RH complète" : "Complete HR Management", desc: fr ? "Gérez vos employés, contrats, paies et congés. Suivi des présences et calcul automatique des salaires." : "Manage your employees, contracts, payroll and leave. Attendance tracking and automatic salary calculation." },
    { icon: PieChart, title: fr ? "Rapports stratégiques" : "Strategic Reports", desc: fr ? "Tableaux de bord visuels avec graphiques. Analysez la performance de votre entreprise par département." : "Visual dashboards with charts. Analyze your business performance by department." },
    { icon: Briefcase, title: fr ? "Gestion d'entreprise" : "Business Management", desc: fr ? "Centralisez toutes vos opérations : finances, ressources humaines, inventaire et reporting dans une seule interface." : "Centralize all your operations: finances, HR, inventory and reporting in a single interface." },
    { icon: TrendingUp, title: fr ? "Analyses & prévisions" : "Analytics & Forecasting", desc: fr ? "Anticipez les tendances avec des analyses prédictives. Prenez des décisions basées sur les données." : "Anticipate trends with predictive analytics. Make data-driven decisions." },
    { icon: FileText, title: fr ? " Documents & conformité" : "Documents & Compliance", desc: fr ? "Générez automatiquement bulletins de paie, fiches de paie et rapports fiscaux conformes à la réglementation." : "Automatically generate pay stubs, payslips and tax reports compliant with regulations." },
  ]

  return (
    <div className="flex flex-col min-h-svh bg-background">

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-purple via-purple/90 to-indigo-600 pb-16 pt-20 sm:pb-20 sm:pt-28 lg:pb-28 lg:pt-36">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/4 w-[800px] h-[800px] rounded-full bg-white/5 blur-[120px]" />
          <div className="absolute -bottom-1/3 -right-1/4 w-[600px] h-[600px] rounded-full bg-white/5 blur-[100px]" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm">
            <BarChart3 className="size-3" />
            {t.modules.gestion.title}
          </div>
          <h1 className="mx-auto max-w-4xl text-4xl font-bold leading-[1] tracking-[-0.8px] text-white text-balance sm:text-5xl md:text-6xl">
            {fr ? "Gérez comme un pro" : "Manage like a pro"}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-[1.7] text-white/80 sm:text-xl">
            {fr ? "Outils avancés de gestion d'entreprise : comptabilité, RH, reporting et analyses stratégiques." : "Advanced business management tools: accounting, HR, reporting and strategic analytics."}
          </p>
          <div className="mt-10">
            <SpiralButton onClick={() => onNavigate("home")} label={fr ? "Commencer gratuitement" : "Start free"} />
          </div>
        </div>
      </section>

      {/* ═══════════ MODULE EXPLANATION ═══════════ */}
      <section className="py-16 sm:py-24 lg:py-[96px]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center sm:mb-16">
            <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-purple/20 bg-purple/5 px-4 py-1.5 text-xs font-medium text-purple">
              {fr ? "À propos du module" : "About this module"}
            </div>
            <h2 className="text-3xl font-bold tracking-[-0.8px] text-foreground text-balance sm:text-4xl lg:text-[44px] lg:leading-[1.15]">
              {fr ? "Tout pour gérer votre entreprise" : "Everything to manage your business"}
            </h2>
            <p className="mx-auto mt-5 max-w-3xl text-lg leading-[1.7] text-muted-foreground sm:text-xl">
              {fr ? "SaveMali Gestion centralise la comptabilité, les ressources humaines, la paie et le reporting dans une interface intuitive et puissante." : "SaveMali Management centralizes accounting, HR, payroll and reporting in an intuitive and powerful interface."}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feat, i) => (
              <div key={i} className="group rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:border-purple/30 hover:shadow-md">
                <div className="mb-5 flex size-10 items-center justify-center rounded-full bg-purple/10">
                  <feat.icon className="size-5 text-purple" />
                </div>
                <h3 className="mb-2 text-base font-semibold text-foreground">{feat.title}</h3>
                <p className="text-sm leading-[1.6] text-muted-foreground">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ CTA ═══════════ */}
      <section className="bg-gradient-to-br from-purple via-purple/90 to-indigo-600 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold tracking-[-0.8px] text-white text-balance sm:text-4xl lg:text-[44px] lg:leading-[1.15]">
            {fr ? "Prenez le contrôle de votre entreprise" : "Take control of your business"}
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
