import * as React from "react"
import { gsap } from "gsap"
import { BookOpen, FlaskConical, ShoppingCart, BarChart3, CheckCircle2, ArrowRight, ChevronDown } from "lucide-react"
import { Logo } from "@/components/Logo"
import { useLanguage } from "@/lib/i18n"
import type { Page } from "@/App"

interface Props {
  moduleKey: "education" | "pharmacy" | "commerce" | "gestion"
  onNavigate: (page: Page) => void
}

const MODULE_CONFIG = {
  education: { icon: BookOpen, gradientClasses: "from-[#3B82F6] to-[#06B6D4]", iconBg: "bg-[#EFF6FF]", iconText: "text-[#2563EB]", color: "blue" },
  pharmacy: { icon: FlaskConical, gradientClasses: "from-[#10B981] to-[#14B8A6]", iconBg: "bg-[#ECFDF5]", iconText: "text-[#059669]", color: "emerald" },
  commerce: { icon: ShoppingCart, gradientClasses: "from-[#F59E0B] to-[#F97316]", iconBg: "bg-[#FFFBEB]", iconText: "text-[#D97706]", color: "amber" },
  gestion: { icon: BarChart3, gradientClasses: "from-[#8B5CF6] to-[#A855F7]", iconBg: "bg-[#F5F3FF]", iconText: "text-[#7C3AED]", color: "violet" },
} as const

const MODULE_BENEFITS: Record<string, Record<string, { label: string; desc: string }[]>> = {
  fr: {
    education: [
      { label: "Centralisation", desc: "Toutes les données scolaires au même endroit, accessibles en temps réel." },
      { label: "Gain de temps", desc: "Automatisez les bulletins, présences et communications parents." },
      { label: "Fiabilité", desc: "Plus de notes perdues — sauvegarde cloud automatique." },
    ],
    pharmacy: [
      { label: "Catalogue intégré", desc: "Médicaments préchargés, ajout en un clic à votre stock." },
      { label: "Alertes intelligentes", desc: "Notifications de péremption et seuils minimum de stock." },
      { label: "Rapports financiers", desc: "Suivez vos ventes, marges et bénéfices en temps réel." },
    ],
    commerce: [
      { label: "Caisse rapide", desc: "Interface de vente intuitive avec gestion des paiements." },
      { label: "Fidélisation", desc: "Programme de fidélité intégré pour vos meilleurs clients." },
      { label: "Stock optimisé", desc: "Inventaire en temps réel avec alertes de réapprovisionnement." },
    ],
    gestion: [
      { label: "Vision globale", desc: "Tableaux de bord consolidés pour toute votre entreprise." },
      { label: "RH simplifiée", desc: "Paie, contrats et congés gérés depuis une interface unique." },
      { label: "Conformité", desc: "Comptabilité aux normes OHADA, exportations fiscales prêtes." },
    ],
  },
  en: {
    education: [
      { label: "Centralization", desc: "All school data in one place, accessible in real time." },
      { label: "Time saving", desc: "Automate report cards, attendance and parent communications." },
      { label: "Reliability", desc: "No more lost grades — automatic cloud backup." },
    ],
    pharmacy: [
      { label: "Built-in catalog", desc: "Pre-loaded medicines, add to stock with one click." },
      { label: "Smart alerts", desc: "Expiry notifications and minimum stock threshold alerts." },
      { label: "Financial reports", desc: "Track sales, margins and profits in real time." },
    ],
    commerce: [
      { label: "Fast checkout", desc: "Intuitive sales interface with payment management." },
      { label: "Loyalty", desc: "Built-in loyalty program for your best customers." },
      { label: "Optimized stock", desc: "Real-time inventory with reorder alerts." },
    ],
    gestion: [
      { label: "Global vision", desc: "Consolidated dashboards for your entire business." },
      { label: "Simplified HR", desc: "Payroll, contracts and leave managed from one interface." },
      { label: "Compliance", desc: "OHADA-standard accounting, tax-ready exports." },
    ],
  },
}

const MODULE_FAQ: Record<string, Record<string, { q: string; a: string }[]>> = {
  fr: {
    education: [
      { q: "Puis-je importer les données de mon ancien système ?", a: "Oui, nous proposons un outil d'import CSV pour les élèves, notes et paiements." },
      { q: "Les parents peuvent-ils suivre les notes en ligne ?", a: "Absolument. Chaque parent reçoit un accès sécurisé au portail parent." },
      { q: "Le module est-il adapté aux crèches et universités ?", a: "Oui, du préscolaire au supérieur, le module s'adapte à tous les niveaux." },
    ],
    pharmacy: [
      { q: "Le catalogue est-il préchargé ?", a: "Oui, des milliers de médicaments avec DCI, dosage et forme sont déjà présents." },
      { q: "Puis-je gérer plusieurs pharmacies ?", a: "Oui, le mode multi-sites est disponible pour tous les utilisateurs." },
      { q: "Comment fonctionnent les alertes de péremption ?", a: "Une notification est envoyée 30 jours avant la date de péremption." },
    ],
    commerce: [
      { q: "Que faire si mon stock est bas ?", a: "Le système envoie une alerte automatique et peut générer un bon de commande." },
      { q: "Puis-je suivre mes clients ?", a: "Oui, historique d'achats, préférences et programme de fidélité inclus." },
      { q: "Le module gère-t-il les devises ?", a: "Oui, support multi-devises avec conversion automatique." },
    ],
    gestion: [
      { q: "Le module est-il conforme aux normes OHADA ?", a: "Oui, la comptabilité suit le plan comptable OHADA avec exports prêts pour le fisc." },
      { q: "Puis-je générer des rapports personnalisés ?", a: "Oui, un créateur de rapports vous permet de personnaliser chaque indicateur." },
      { q: "Combien d'employés puis-je gérer ?", a: "Aucune limite. Le module RH gère efficacement des centaines d'employés." },
    ],
  },
  en: {
    education: [
      { q: "Can I import data from my old system?", a: "Yes, we offer a CSV import tool for students, grades and payments." },
      { q: "Can parents track grades online?", a: "Absolutely. Each parent receives a secure parent portal login." },
      { q: "Is the module suitable for daycare and universities?", a: "Yes, from preschool to higher education, the module adapts to all levels." },
    ],
    pharmacy: [
      { q: "Is the catalog pre-loaded?", a: "Yes, thousands of medicines with INN, dosage and form are already present." },
      { q: "Can I manage multiple pharmacies?", a: "Yes, multi-site mode is available for all users." },
      { q: "How do expiry alerts work?", a: "A notification is sent 30 days before the expiry date." },
    ],
    commerce: [
      { q: "What if my stock is low?", a: "The system sends an automatic alert and can generate a purchase order." },
      { q: "Can I track my customers?", a: "Yes, purchase history, preferences and loyalty program included." },
      { q: "Does the module handle currencies?", a: "Yes, multi-currency support with automatic conversion." },
    ],
    gestion: [
      { q: "Is the module OHADA compliant?", a: "Yes, accounting follows the OHADA chart of accounts with tax-ready exports." },
      { q: "Can I generate custom reports?", a: "Yes, a report builder lets you customize every indicator." },
      { q: "How many employees can I manage?", a: "No limit. The HR module efficiently handles hundreds of employees." },
    ],
  },
}

export function ModuleLandingPage({ moduleKey, onNavigate }: Props) {
  const { lang, t } = useLanguage()
  const fr = lang === "fr"
  const config = MODULE_CONFIG[moduleKey]
  const Icon = config.icon
  const data = t.modules[moduleKey]
  const benefits = MODULE_BENEFITS[lang][moduleKey] || []
  const faqs = MODULE_FAQ[lang][moduleKey] || []

  const ref = React.useRef<HTMLDivElement>(null)
  React.useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".ml-hero", { opacity: 0, y: 40, duration: 0.7, ease: "power3.out" })
      gsap.from(".ml-benefit", { opacity: 0, y: 30, duration: 0.5, stagger: 0.15, ease: "power2.out", scrollTrigger: { trigger: ".ml-benefits-section", start: "top 80%" } })
      gsap.from(".ml-faq-item", { opacity: 0, x: -20, duration: 0.4, stagger: 0.08, ease: "power2.out", scrollTrigger: { trigger: ".ml-faq-section", start: "top 80%" } })
    }, ref)
    return () => ctx.revert()
  }, [])

  return (
    <div ref={ref} className="flex flex-col">
      {/* ═══════════ HERO ═══════════ */}
      <section className={`ml-hero relative overflow-hidden bg-gradient-to-br ${config.gradientClasses} pb-16 pt-20 sm:pb-20 sm:pt-28`}>
        <div className="pointer-events-none absolute inset-0 opacity-10" aria-hidden>
          <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-white blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-white blur-3xl" />
        </div>
        <div className="ag-container relative z-10 text-center">
          <div className="ag-badge mb-6 inline-flex border-white/20 bg-white/10 text-white backdrop-blur-sm">
            <Icon className="mr-1 size-3.5" /> {data.title}
          </div>
          <h1 className="mx-auto max-w-3xl text-3xl font-bold tracking-[-0.8px] text-white text-balance sm:text-5xl md:text-[60px] md:leading-[1.1]">
            {data.title} — {fr ? "Simplifié" : "Simplified"}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-[1.7] text-white/80">{data.description}</p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button className="ag-btn-brand ag-btn-brand-lg w-full gap-2 bg-white text-[#111827] hover:bg-white/90 shadow-lg sm:w-auto" onClick={() => onNavigate("signup")}>
              {fr ? "Commencer gratuitement" : "Start free"} <ArrowRight className="size-4" />
            </button>
            <button
              className="ag-btn-ghost ag-btn-ghost-lg w-full gap-2 border-white/25 bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm sm:w-auto"
              onClick={() => {
                document.querySelector(".ml-features-section")?.scrollIntoView({ behavior: "smooth" })
              }}
            >
              {fr ? "En savoir plus" : "Learn more"} <ChevronDown className="size-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════ FEATURES ═══════════ */}
      <section className="ml-features-section bg-surface py-16 sm:py-24 lg:py-[96px]" id="features">
        <div className="ag-container">
          <div className="mb-12 text-center sm:mb-16 lg:mb-20">
            <div className="ag-badge mb-6 inline-flex">
              {fr ? "Fonctionnalités" : "Features"}
            </div>
            <h2 className="text-3xl font-bold tracking-[-0.8px] text-text-heading text-balance sm:text-4xl lg:text-[44px] lg:leading-[1.15]">
              {fr ? "Tout ce dont vous avez besoin" : "Everything you need"}
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.features.map((feat: string, i: number) => (
              <div key={i} className="ag-feature-card group">
                <div className="mb-4 flex size-10 items-center justify-center rounded-full bg-muted">
                  <CheckCircle2 className="size-5 text-brand" />
                </div>
                <span className="text-sm font-medium text-text-heading sm:text-base">{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ BENEFITS ═══════════ */}
      <section className="ml-benefits-section bg-surface-alt py-16 sm:py-24 lg:py-[96px]">
        <div className="ag-container">
          <div className="mb-12 text-center sm:mb-16 lg:mb-20">
            <div className="ag-badge mb-6 inline-flex">
              {fr ? "Avantages" : "Benefits"}
            </div>
            <h2 className="text-3xl font-bold tracking-[-0.8px] text-text-heading text-balance sm:text-4xl lg:text-[44px] lg:leading-[1.15]">
              {fr ? "Pourquoi choisir SaveMali ?" : "Why choose SaveMali?"}
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {benefits.map((b, i) => (
              <div key={i} className="ml-benefit ag-feature-card group text-center">
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
                  <span className="text-lg font-bold text-brand">0{i + 1}</span>
                </div>
                <h3 className="mb-2 text-base font-semibold text-text-heading">{b.label}</h3>
                <p className="text-sm leading-[1.6] text-text-body">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ PREVIEW ═══════════ */}
      <section className="bg-surface py-16 sm:py-24 lg:py-[96px]">
        <div className="ag-container text-center">
          <div className="ag-badge mb-6 inline-flex">
            {fr ? "Aperçu" : "Preview"}
          </div>
          <h2 className="mb-2 text-3xl font-bold tracking-[-0.8px] text-text-heading sm:text-4xl">
            {fr ? "Interface intuitive et moderne" : "Clean, modern interface"}
          </h2>
          <p className="mb-8 text-text-body">{fr ? "Découvrez une expérience utilisateur conçue pour l'efficacité" : "Discover a user experience designed for efficiency"}</p>
          <div className={`ag-card-static rounded-2xl border-2 border-dashed border-border bg-gradient-to-br ${config.gradientClasses} p-12 opacity-20 sm:p-24`}>
            <Icon className="mx-auto size-20 text-white sm:size-32" />
          </div>
          <p className="mt-6 text-xs text-text-subtle">
            {fr ? "Capture d'écran à venir" : "Screenshot coming soon"}
          </p>
        </div>
      </section>

      {/* ═══════════ FAQ ═══════════ */}
      <section className="ml-faq-section bg-surface-alt py-16 sm:py-24 lg:py-[96px]">
        <div className="ag-container mx-auto max-w-4xl">
          <div className="mb-12 text-center sm:mb-16">
            <div className="ag-badge mb-6 inline-flex">FAQ</div>
            <h2 className="text-3xl font-bold tracking-[-0.8px] text-text-heading sm:text-4xl">
              {fr ? "Questions Fréquentes" : "Frequently Asked Questions"}
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-text-body">
              {fr ? "Tout ce que vous devez savoir" : "Everything you need to know"}
            </p>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <details key={i} className="ag-faq-item group">
                <summary className="ag-faq-trigger cursor-pointer list-none">
                  {faq.q}
                  <ChevronDown className="size-4 shrink-0 text-text-body transition-transform duration-150 group-open:rotate-180" />
                </summary>
                <div className="border-t border-border">
                  <div className="ag-faq-panel">{faq.a}</div>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ CTA ═══════════ */}
      <section className="bg-[#09090b] py-16 sm:py-24 lg:py-[96px]">
        <div className="ag-container text-center">
          <h2 className="text-3xl font-bold tracking-[-0.8px] text-white text-balance sm:text-4xl lg:text-[44px] lg:leading-[1.15]">
            {fr ? "Prêt à commencer ?" : "Ready to start?"}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-[1.7] text-[#a1a1aa]">
            {fr ? "Rejoignez des centaines d'entreprises qui font confiance à SaveMali." : "Join hundreds of businesses that trust SaveMali."}
          </p>
          <div className="mt-10 flex justify-center">
            <button className="ag-btn-brand ag-btn-brand-lg gap-2" onClick={() => onNavigate("signup")}>
              {fr ? "Commencer maintenant" : "Start now"} <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="ag-footer">
        <div className="ag-container text-center">
          <div className="mb-4 flex justify-center"><Logo imgClassName="h-10 brightness-0 invert" /></div>
          <p className="text-xs text-[#71717a]">
            &copy; {new Date().getFullYear()} SaveMali {fr ? "SARL" : "LLC"} — {fr ? "Développé par John Mocket" : "Developed by John Mocket"}
          </p>
        </div>
      </footer>
    </div>
  )
}
