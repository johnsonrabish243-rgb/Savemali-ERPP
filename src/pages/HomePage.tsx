import * as React from "react"
import {
  BookOpen, FlaskConical, ShoppingCart, BarChart3, Users,
  CheckCircle2, Wifi, Shield, Headphones, Languages, Banknote,
  ArrowRight, ChevronDown, Star, Building2, TrendingUp, Zap, ChevronRight, ChevronLeft
} from "lucide-react"
import { useLanguage } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { Logo } from "@/components/Logo"

type Page = "home" | "education" | "pharmacy" | "commerce" | "gestion" | "hr" | "dashboard" | "signin" | "signup" | "privacy" | "terms" | "restricted"

const moduleIcons = [BookOpen, FlaskConical, ShoppingCart, BarChart3, Users]

const moduleConfig = [
  {
    gradientClasses: "from-[#C8399C] to-[#7C3AED]",
    iconBg: "bg-[#FDF2F9]",
    iconText: "text-[#A52D80]",
    border: "border-[#F0C4DE] hover:border-[#D94FB0]",
    titleText: "text-[#A52D80]",
    pageKey: "education" as Page,
    accent: "#C8399C",
  },
  {
    gradientClasses: "from-[#007A55] to-[#006045]",
    iconBg: "bg-[#ECFDF5]",
    iconText: "text-[#007A55]",
    border: "border-[#A7F3D0] hover:border-[#009966]",
    titleText: "text-[#007A55]",
    pageKey: "pharmacy" as Page,
    accent: "#007A55",
  },
  {
    gradientClasses: "from-[#F97316] to-[#C2410C]",
    iconBg: "bg-[#FFF7ED]",
    iconText: "text-[#EA580C]",
    border: "border-[#FED7AA] hover:border-[#F97316]",
    titleText: "text-[#EA580C]",
    pageKey: "commerce" as Page,
    accent: "#F97316",
  },
  {
    gradientClasses: "from-[#8B5CF6] to-[#6D28D9]",
    iconBg: "bg-[#F5F3FF]",
    iconText: "text-[#7C3AED]",
    border: "border-[#DDD6FE] hover:border-[#8B5CF6]",
    titleText: "text-[#7C3AED]",
    pageKey: "gestion" as Page,
    accent: "#8B5CF6",
  },
  {
    gradientClasses: "from-[#0284C7] to-[#0369A1]",
    iconBg: "bg-[#F0F9FF]",
    iconText: "text-[#0284C7]",
    border: "border-[#BAE6FD] hover:border-[#0284C7]",
    titleText: "text-[#0284C7]",
    pageKey: "hr" as Page,
    accent: "#0284C7",
  },
]

interface HomePageProps {
  onNavigate: (page: Page) => void
}

export function HomePage({ onNavigate }: HomePageProps) {
  const { t, lang } = useLanguage()
  const fr = lang === "fr"
  const [activeSlide, setActiveSlide] = React.useState(0)

  const modules = [
    { data: t.modules.education, config: moduleConfig[0] },
    { data: t.modules.pharmacy, config: moduleConfig[1] },
    { data: t.modules.commerce, config: moduleConfig[2] },
    { data: t.modules.gestion, config: moduleConfig[3] },
    { data: t.modules.hr, config: moduleConfig[4] },
  ]

  const [stats, setStats] = React.useState([
    { value: "—", label: t.stats.schools, icon: Building2 },
    { value: "—", label: t.stats.pharmacies, icon: FlaskConical },
    { value: "—", label: t.stats.users, icon: Users },
    { value: "—", label: t.stats.uptime, icon: TrendingUp },
  ])

  React.useEffect(() => {
    import("@/lib/stats").then(({ fetchPlatformStats }) => {
      fetchPlatformStats().then((s) => {
        setStats([
          { value: s.totalWorkspaces > 0 ? `${s.totalWorkspaces}+` : "—", label: t.stats.schools, icon: Building2 },
          { value: s.totalMedicines > 0 ? `${s.totalMedicines}+` : "—", label: t.stats.pharmacies, icon: FlaskConical },
          { value: s.totalUsers > 0 ? `${s.totalUsers.toLocaleString()}+` : "—", label: t.stats.users, icon: Users },
          { value: "24H/7", label: t.stats.uptime, icon: TrendingUp },
        ])
      })
    })
  }, [])

  React.useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % modules.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [modules.length])

  return (
    <div className="flex flex-col">

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative overflow-hidden pb-16 pt-20 sm:pb-20 sm:pt-28 lg:pb-28 lg:pt-36">
        {/* Stitch-inspired organic background */}
        <div className="absolute inset-0">
          {/* Light mode: soft rose/blue/slate gradients */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#f0e4ec] via-[#e8e0f0] to-[#d4dce8] dark:hidden" />
          {/* Dark mode: deep dark base */}
          <div className="absolute inset-0 bg-[#09090b] hidden dark:block" />
          {/* Rose blob */}
          <div className="absolute -top-1/4 -left-1/6 w-[700px] h-[700px] rounded-full bg-[#C8399C]/25 blur-[100px] dark:bg-[#C8399C]/12" />
          <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full bg-[#d4829e]/30 blur-[90px] dark:bg-[#C8399C]/8" />
          {/* Deep blue blob */}
          <div className="absolute -top-1/3 right-1/6 w-[600px] h-[600px] rounded-full bg-[#2d4a6f]/25 blur-[100px] dark:bg-[#1e3a5f]/15" />
          <div className="absolute top-1/2 right-1/3 w-[400px] h-[400px] rounded-full bg-[#3a5a7f]/20 blur-[80px] dark:bg-[#1e3a5f]/10" />
          {/* Slate grey blob */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-[#8a9ab0]/20 blur-[100px] dark:bg-[#374151]/10" />
          {/* Rose-pink wave accent */}
          <div className="absolute top-1/2 -left-1/4 w-[600px] h-[300px] rounded-full bg-[#e8a0b8]/25 blur-[80px] rotate-12 dark:bg-[#C8399C]/6" />
          {/* Subtle light overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-t from-white/40 via-transparent to-white/20 dark:from-transparent dark:via-transparent dark:to-transparent" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-[#C8399C]/20 via-[#7C3AED]/20 to-[#1e3a5f]/20 blur-xl" />
              <img
                src="/SaveMali_Logo.png"
                alt="SaveMali"
                className="relative size-16 rounded-2xl object-cover shadow-2xl sm:size-20"
                onError={(e) => {
                  const img = e.currentTarget
                  img.style.display = "none"
                  const fallback = img.nextElementSibling as HTMLElement
                  if (fallback) fallback.style.display = "flex"
                }}
              />
              <div className="hidden size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#C8399C] to-[#7C3AED] shadow-2xl sm:size-20">
                <span className="text-2xl font-extrabold text-white">S</span>
              </div>
            </div>
          </div>

          <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-[#C8399C]/20 bg-[#C8399C]/5 px-4 py-1.5 text-xs font-medium text-[#A52D80] dark:border-white/10 dark:bg-white/5 dark:text-white/80 backdrop-blur-sm">
            <Star className="size-3 fill-current text-[#FACC15]" />
            {t.hero.badge}
          </div>

          <h1 className="mx-auto max-w-5xl text-4xl font-bold leading-[1] tracking-[-0.8px] text-[#111827] dark:text-white text-balance sm:text-5xl md:text-6xl lg:text-[60px]">
            {t.hero.tagline}
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-[1.7] text-[#6b7280] sm:text-xl lg:text-[20px]">
            {t.hero.subtitle}
          </p>

          <div className="mt-10 flex justify-center">
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#C8399C] to-[#7C3AED] px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#C8399C]/25 transition-all hover:shadow-xl hover:shadow-[#C8399C]/30 hover:brightness-110 sm:w-auto"
              onClick={() => onNavigate("signup")}
            >
              {t.hero.cta}
              <ArrowRight className="size-4" />
            </button>
          </div>

          {/* Slide-based module cards */}
          <div className="mt-14 relative">
            <div className="overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white/80 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
              <div className="relative h-[280px] sm:h-[320px]">
                {modules.map(({ data, config }, i) => {
                  const Icon = moduleIcons[i]
                  const isActive = activeSlide === i
                  return (
                    <div
                      key={i}
                      className={cn(
                        "absolute inset-0 flex flex-col items-center justify-center p-8 transition-all duration-700 ease-in-out",
                        isActive ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full pointer-events-none"
                      )}
                    >
                      <div className={`flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br ${config.gradientClasses} shadow-lg mb-5`}>
                        <Icon className="size-8 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-[#111827] dark:text-white mb-2">{data.title}</h3>
                      <p className="max-w-md text-sm text-[#6b7280] leading-relaxed mb-6">{data.description}</p>
                      <button
                        className="inline-flex items-center gap-2 rounded-lg border border-[#e5e7eb] bg-white px-6 py-2.5 text-sm font-medium text-[#374151] transition-all hover:bg-[#f9fafb] dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                        onClick={() => onNavigate(config.pageKey)}
                      >
                        {fr ? "Explorer" : "Explore"}
                        <ArrowRight className="size-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Slide controls */}
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                onClick={() => setActiveSlide((prev) => (prev - 1 + modules.length) % modules.length)}
                className="flex size-8 items-center justify-center rounded-full border border-[#e5e7eb] bg-white text-[#6b7280] transition-all hover:bg-[#f9fafb] hover:text-[#374151] dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <ChevronLeft className="size-4" />
              </button>
              <div className="flex gap-2">
                {modules.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveSlide(i)}
                    className={cn(
                      "h-2 rounded-full transition-all duration-300",
                      activeSlide === i ? "w-8 bg-gradient-to-r from-[#C8399C] to-[#7C3AED]" : "w-2 bg-[#e5e7eb] hover:bg-[#d1d5db] dark:bg-white/20 dark:hover:bg-white/40"
                    )}
                  />
                ))}
              </div>
              <button
                onClick={() => setActiveSlide((prev) => (prev + 1) % modules.length)}
                className="flex size-8 items-center justify-center rounded-full border border-[#e5e7eb] bg-white text-[#6b7280] transition-all hover:bg-[#f9fafb] hover:text-[#374151] dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ STATS ═══════════ */}
      <section className="bg-[#f9fafb] dark:bg-[#0f0f12] py-12 sm:py-16 border-y border-[#e5e7eb] dark:border-white/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {stats.map((stat, i) => {
              const Icon = stat.icon
              return (
                <div key={i} className="flex flex-col items-center gap-2 text-center">
                  <div className="flex size-10 items-center justify-center rounded-full bg-[#C8399C]/10 border border-[#C8399C]/20 dark:bg-white/5 dark:border-white/10">
                    <Icon className="size-5 text-[#C8399C]" />
                  </div>
                  <span className="text-3xl font-bold tracking-[-0.8px] text-[#111827] dark:text-white sm:text-4xl">{stat.value}</span>
                  <span className="text-sm text-[#6b7280] dark:text-[#a1a1aa]">{stat.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══════════ MODULE CARDS ═══════════ */}
      <section className="bg-white dark:bg-[#09090b] py-16 sm:py-24 lg:py-[96px]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center sm:mb-16 lg:mb-20">
            <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-[#C8399C]/20 bg-[#C8399C]/5 px-4 py-1.5 text-xs font-medium text-[#A52D80] dark:border-white/10 dark:bg-white/5 dark:text-white/70">
              {t.modules.title}
            </div>
            <h2 className="text-3xl font-bold tracking-[-0.8px] text-[#111827] dark:text-white text-balance sm:text-4xl lg:text-[44px] lg:leading-[1.15]">
              {t.modules.title}
            </h2>
            <p className="mx-auto mt-5 max-w-3xl text-lg leading-[1.7] text-[#6b7280] sm:text-xl">
              {t.modules.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {modules.map(({ data, config }, i) => {
              const Icon = moduleIcons[i]
              return (
                <div
                  key={i}
                  className={cn(
                    "group relative overflow-hidden rounded-xl border transition-all duration-300",
                    "border-[#e5e7eb] bg-white hover:border-[#d1d5db] hover:shadow-md",
                    "dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:bg-white/[0.06]"
                  )}
                >
                  {/* Gradient header */}
                  <div className={`relative overflow-hidden bg-gradient-to-br ${config.gradientClasses} p-6 sm:p-8`}>
                    <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />
                    <div className="relative flex size-14 items-center justify-center rounded-lg bg-white/20 shadow-lg backdrop-blur-sm transition-transform duration-300 group-hover:scale-110 sm:size-16">
                      <Icon className="size-7 text-white sm:size-8" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <h3 className={cn("mb-2 text-lg font-bold sm:text-xl", config.titleText)}>{data.title}</h3>
                    <p className="mb-4 flex-1 text-sm leading-[1.6] text-[#6b7280] dark:text-[#a1a1aa]">{data.description}</p>

                    <ul className="mb-5 space-y-2.5">
                      {data.features.slice(0, 3).map((feat, j) => (
                        <li key={j} className="flex items-center gap-2 text-sm text-[#374151] dark:text-white/80">
                          <CheckCircle2 className={cn("size-3.5 shrink-0", config.iconText)} />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="flex flex-col gap-2">
                      <button
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#C8399C] to-[#7C3AED] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:brightness-110"
                        onClick={() => onNavigate("signup")}
                      >
                        {fr ? "Créer un compte" : "Create account"}
                        <ArrowRight className="size-3.5" />
                      </button>
                      <button
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] px-4 py-2.5 text-sm font-medium text-[#374151] transition-all hover:bg-[#f3f4f6] dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
                        onClick={() => onNavigate(`landing-${config.pageKey}` as Page)}
                      >
                        {fr ? "Explorer ce module" : "Explore module"}
                        <ChevronRight className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══════════ WHY SAVEMALI ═══════════ */}
      <section className="bg-[#f9fafb] dark:bg-[#0f0f12] py-16 sm:py-24 lg:py-[96px]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center sm:mb-16 lg:mb-20">
            <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-[#C8399C]/20 bg-[#C8399C]/5 px-4 py-1.5 text-xs font-medium text-[#A52D80] dark:border-white/10 dark:bg-white/5 dark:text-white/70">
              {fr ? "Pourquoi nous ?" : "Why us?"}
            </div>
            <h2 className="text-3xl font-bold tracking-[-0.8px] text-[#111827] dark:text-white text-balance sm:text-4xl lg:text-[44px] lg:leading-[1.15]">
              {t.features.title}
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-[1.7] text-[#6b7280]">
              {t.features.subtitle}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {t.features.items.map((feat, i) => {
              const icons = [Zap, Wifi, Shield, Headphones, Languages, Banknote]
              const Icon = icons[i]
              return (
                <div
                  key={i}
                  className={cn(
                    "group rounded-xl border p-6 transition-all duration-300",
                    "border-[#e5e7eb] bg-white hover:border-[#d1d5db] hover:shadow-md",
                    "dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:bg-white/[0.06]"
                  )}
                >
                  <div className="mb-5 flex size-10 items-center justify-center rounded-full bg-[#C8399C]/10 border border-[#C8399C]/20 dark:bg-white/5 dark:border-white/10">
                    <Icon className="size-5 text-[#C8399C]" />
                  </div>
                  <h3 className="mb-2 text-base font-semibold text-[#111827] dark:text-white">{feat.title}</h3>
                  <p className="text-sm leading-[1.6] text-[#6b7280] dark:text-[#a1a1aa]">{feat.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══════════ CTA BOTTOM ═══════════ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white to-[#fdf2f8] dark:from-[#09090b] dark:to-[#0a0a0a] py-16 sm:py-24 lg:py-[96px]">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -bottom-1/2 -left-1/4 w-[600px] h-[600px] rounded-full bg-[#C8399C]/5 blur-[100px]" />
          <div className="absolute -bottom-1/3 -right-1/4 w-[500px] h-[500px] rounded-full bg-[#7C3AED]/5 blur-[80px]" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold tracking-[-0.8px] text-[#111827] dark:text-white text-balance sm:text-4xl lg:text-[44px] lg:leading-[1.15]">
            {t.cta.title}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-[1.7] text-[#6b7280] sm:text-xl">
            {t.cta.subtitle}
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#C8399C] to-[#7C3AED] px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#C8399C]/25 transition-all hover:shadow-xl hover:shadow-[#C8399C]/30 hover:brightness-110 sm:w-auto"
              onClick={() => onNavigate("signup")}
            >
              {t.cta.button}
              <ArrowRight className="size-4" />
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-[#e5e7eb] bg-white px-8 py-3.5 text-sm font-medium text-[#374151] transition-all hover:bg-[#f9fafb] sm:w-auto dark:border-white/20 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
              onClick={() => onNavigate("signin")}
            >
              {t.cta.buttonSecondary}
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════ FAQ ═══════════ */}
      <section className="bg-[#f9fafb] dark:bg-[#0f0f12] py-16 sm:py-24 lg:py-[96px]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center sm:mb-16">
            <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-[#C8399C]/20 bg-[#C8399C]/5 px-4 py-1.5 text-xs font-medium text-[#A52D80] dark:border-white/10 dark:bg-white/5 dark:text-white/70">
              FAQ
            </div>
            <h2 className="text-3xl font-bold tracking-[-0.8px] text-[#111827] dark:text-white sm:text-4xl">
              {fr ? "Questions Fréquentes" : "Frequently Asked Questions"}
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-[#6b7280]">
              {fr ? "Tout ce que vous devez savoir sur SaveMali" : "Everything you need to know about SaveMali"}
            </p>
          </div>
          <div className="space-y-4">
            {[
              { q: fr ? "Qu'est-ce que SaveMali ?" : "What is SaveMali?", a: fr ? "SaveMali est une plateforme ERP tout-en-un conçue pour les entreprises en RDC et Afrique centrale. Elle intègre la gestion de pharmacie, commerce, éducation et gestion d'entreprise dans une seule interface." : "SaveMali is an all-in-one ERP platform designed for businesses in the DRC and Central Africa. It integrates pharmacy, commerce, education, and business management in a single interface." },
              { q: fr ? "Combien coûte SaveMali ?" : "How much does SaveMali cost?", a: fr ? "SaveMali est gratuit pour démarrer. Pas de frais cachés, pas d'engagement." : "SaveMali is free to start. No hidden fees, no commitment." },
              { q: fr ? "Mes données sont-elles sécurisées ?" : "Is your data secure?", a: fr ? "Absolument. Toutes vos données sont chiffrées en transit et au repos. Nous effectuons des sauvegardes régulières et respectons les meilleures pratiques de sécurité." : "Absolutely. All your data is encrypted in transit and at rest. We perform regular backups and follow security best practices." },
              { q: fr ? "Puis-je utiliser SaveMali hors ligne ?" : "Can I use SaveMali offline?", a: fr ? "Oui, SaveMali est conçu pour fonctionner même sans connexion internet stable. Vos données sont synchronisées automatiquement lorsque la connexion est rétablie." : "Yes, SaveMali is designed to work even without a stable internet connection. Your data syncs automatically when the connection is restored." },
              { q: fr ? "Quels modes de paiement acceptez-vous ?" : "What payment methods do you accept?", a: fr ? "Nous acceptons les paiements en FC (Franc Congolais) par mobile money (M-Pesa, Airtel Money, Orange Money) et par carte bancaire." : "We accept payments in FC (Congolese Franc) via mobile money (M-Pesa, Airtel Money, Orange Money) and bank cards." },
              { q: fr ? "Proposez-vous un support technique ?" : "Do you offer technical support?", a: fr ? "Oui, un support technique est disponible par email (support@savemali.com) et WhatsApp (+243 857 599 332)." : "Yes, technical support is available via email (support@savemali.com) and WhatsApp (+243 857 599 332)." },
            ].map((faq, i) => (
              <details key={i} className="group rounded-xl border border-[#e5e7eb] bg-white dark:border-white/10 dark:bg-white/[0.03]">
                <summary className="flex cursor-pointer items-center justify-between p-5 text-sm font-medium text-[#111827] dark:text-white list-none">
                  {faq.q}
                  <ChevronDown className="size-4 shrink-0 text-[#6b7280] dark:text-[#a1a1aa] transition-transform duration-150 group-open:rotate-180" />
                </summary>
                <div className="border-t border-[#e5e7eb] dark:border-white/5">
                  <div className="p-5 text-sm leading-[1.7] text-[#6b7280] dark:text-[#a1a1aa]">
                    {faq.a}
                  </div>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="border-t border-[#e5e7eb] dark:border-white/5 bg-white dark:bg-[#09090b] py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-4">
              <Logo imgClassName="h-10 sm:h-11" />
              <p className="mt-4 text-sm leading-[1.7] text-[#6b7280] dark:text-[#a1a1aa]">{t.footer.tagline}</p>
            </div>
            <div className="lg:col-span-2">
              <h4 className="mb-4 text-xs font-medium uppercase tracking-[0.4px] text-[#9ca3af] dark:text-[#71717a]">{t.footer.modules}</h4>
              <ul className="space-y-3">
                <li className="text-sm text-[#6b7280] hover:text-[#111827] dark:text-[#a1a1aa] dark:hover:text-white cursor-pointer transition-colors" onClick={() => onNavigate("landing-education")}>{t.nav.education}</li>
                <li className="text-sm text-[#6b7280] hover:text-[#111827] dark:text-[#a1a1aa] dark:hover:text-white cursor-pointer transition-colors" onClick={() => onNavigate("landing-pharmacy")}>{t.nav.pharmacy}</li>
                <li className="text-sm text-[#6b7280] hover:text-[#111827] dark:text-[#a1a1aa] dark:hover:text-white cursor-pointer transition-colors" onClick={() => onNavigate("landing-commerce")}>{t.nav.commerce}</li>
                <li className="text-sm text-[#6b7280] hover:text-[#111827] dark:text-[#a1a1aa] dark:hover:text-white cursor-pointer transition-colors" onClick={() => onNavigate("landing-gestion")}>{t.nav.gestion}</li>
              </ul>
            </div>
            <div className="lg:col-span-2">
              <h4 className="mb-4 text-xs font-medium uppercase tracking-[0.4px] text-[#9ca3af] dark:text-[#71717a]">{t.footer.company}</h4>
              <ul className="space-y-3">
                <li className="text-sm text-[#6b7280] hover:text-[#111827] dark:text-[#a1a1aa] dark:hover:text-white cursor-pointer transition-colors" onClick={() => onNavigate("about")}>{t.footer.about}</li>
                <li className="text-sm text-[#6b7280] hover:text-[#111827] dark:text-[#a1a1aa] dark:hover:text-white cursor-pointer transition-colors" onClick={() => onNavigate("contact")}>{t.footer.contact}</li>
              </ul>
            </div>
            <div className="lg:col-span-2">
              <h4 className="mb-4 text-xs font-medium uppercase tracking-[0.4px] text-[#9ca3af] dark:text-[#71717a]">{t.footer.legal}</h4>
              <ul className="space-y-3">
                <li className="text-sm text-[#6b7280] hover:text-[#111827] dark:text-[#a1a1aa] dark:hover:text-white cursor-pointer transition-colors" onClick={() => onNavigate("privacy")}>{t.footer.privacy}</li>
                <li className="text-sm text-[#6b7280] hover:text-[#111827] dark:text-[#a1a1aa] dark:hover:text-white cursor-pointer transition-colors" onClick={() => onNavigate("terms")}>{t.footer.terms}</li>
              </ul>
            </div>
            <div className="lg:col-span-2">
              <h4 className="mb-4 text-xs font-medium uppercase tracking-[0.4px] text-[#9ca3af] dark:text-[#71717a]">{fr ? "Contact" : "Contact"}</h4>
              <ul className="space-y-3">
                <li>
                  <a href="https://wa.me/243857599332" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-[#6b7280] hover:text-[#111827] dark:text-[#a1a1aa] dark:hover:text-white transition-colors no-underline">
                    <svg className="size-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    WhatsApp
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="my-10 h-px bg-[#e5e7eb] dark:bg-white/5" />
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-xs text-[#9ca3af] dark:text-[#71717a]">
              &copy; {new Date().getFullYear()} SaveMali {fr ? "SARL" : "LLC"} — {fr ? "Développé par John Mocket" : "Developed by John Mocket"}
            </p>
            <div className="flex items-center gap-4">
              <span className="text-xs text-[#9ca3af] dark:text-[#71717a]">{fr ? "Besoin d'aide ?" : "Need help?"}</span>
              <a href="https://wa.me/243857599332" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-sm border border-[#e5e7eb] bg-[#f9fafb] px-4 py-2 text-xs font-medium text-[#6b7280] hover:text-[#111827] hover:bg-[#f3f4f6] transition-all no-underline dark:border-white/10 dark:bg-white/5 dark:text-[#a1a1aa] dark:hover:text-white dark:hover:bg-white/10">
                <svg className="size-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                {fr ? "Support WhatsApp" : "WhatsApp Support"}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
