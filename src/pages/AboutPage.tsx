import * as React from "react"
import { gsap } from "gsap"
import { Building2, Target, Users, Shield, ArrowRight } from "lucide-react"
import { Logo } from "@/components/Logo"
import { useLanguage } from "@/lib/i18n"
import { SeoHead } from "@/lib/seo"
import type { Page } from "@/App"

interface Props { onNavigate: (page: Page) => void }

export function AboutPage({ onNavigate }: Props) {
  const { lang } = useLanguage()
  const fr = lang === "fr"
  const ref = React.useRef<HTMLDivElement>(null)

  React.useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".about-hero", { opacity: 0, y: 30, duration: 0.6, ease: "power3.out" })
      gsap.from(".about-card", { opacity: 0, y: 30, duration: 0.5, stagger: 0.12, ease: "power2.out", scrollTrigger: { trigger: ".about-cards", start: "top 80%" } })
    }, ref)
    return () => ctx.revert()
  }, [])

  const values = [
    { icon: Target, title: fr ? "Notre Mission" : "Our Mission", desc: fr ? "Simplifier la gestion des entreprises et etablissements en Afrique centrale grace a une plateforme tout-en-un accessible et abordable." : "Simplify management for businesses and institutions in Central Africa through an accessible, affordable all-in-one platform." },
    { icon: Users, title: fr ? "Notre Equipe" : "Our Team", desc: fr ? "Une equipe dynamique de developpeurs, designers et experts metier basee a Kalemie, passionnee par l'innovation locale." : "A dynamic team of developers, designers and business experts based in Kalemie, passionate about local innovation." },
    { icon: Shield, title: fr ? "Nos Valeurs" : "Our Values", desc: fr ? "Integrite, innovation, accessibilite et impact social. Nous croyons en une technologie qui sert le developpement de l'Afrique." : "Integrity, innovation, accessibility and social impact. We believe in technology that serves Africa's development." },
  ]

  return (
    <div ref={ref} className="flex flex-col">
      <SeoHead page="about" lang={lang} />
      {/* ═══════════ HERO ═══════════ */}
      <section className="about-hero relative overflow-hidden bg-[#09090b] pb-16 pt-20 sm:pb-20 sm:pt-28">
        <div className="ag-hero-glow absolute inset-0" />
        <div className="ag-container relative z-10 text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-[#FDF2F9]">
              <Building2 className="size-7 text-[#C8399C]" />
            </div>
          </div>
          <div className="ag-badge mb-6 inline-flex">
            {fr ? "A Propos" : "About"}
          </div>
          <h1 className="mx-auto max-w-4xl text-3xl font-bold tracking-[-0.8px] text-white text-balance sm:text-5xl md:text-[60px] md:leading-[1.1]">
            {fr ? "A Propos de SaveMali" : "About SaveMali"}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-[1.7] text-[#a1a1aa]">
            {fr ? "Ne a Kalemie, Province du Tanganyika, RDC - SaveMali est la premiere plateforme ERP tout-en-un concue pour les besoins specifiques des entreprises et institutions d'Afrique centrale." : "Born in Kalemie, Tanganyika Province, DRC - SaveMali is the first all-in-one ERP platform designed for the specific needs of businesses and institutions in Central Africa."}
          </p>
        </div>
      </section>

      {/* ═══════════ VALUES ═══════════ */}
      <section className="about-cards bg-surface py-16 sm:py-24 lg:py-[96px]">
        <div className="ag-container">
          <div className="mb-12 text-center sm:mb-16 lg:mb-20">
            <div className="ag-badge mb-6 inline-flex">
              {fr ? "Nos Valeurs" : "Our Values"}
            </div>
            <h2 className="text-3xl font-bold tracking-[-0.8px] text-text-heading text-balance sm:text-4xl lg:text-[44px] lg:leading-[1.15]">
              {fr ? "Ce qui nous guide" : "What guides us"}
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {values.map((v, i) => (
              <div key={i} className="about-card ag-feature-card group">
                <div className="mb-5 flex size-12 items-center justify-center rounded-full bg-muted">
                  <v.icon className="size-6 text-brand" />
                </div>
                <h3 className="mb-2 text-base font-semibold text-text-heading">{v.title}</h3>
                <p className="text-sm leading-[1.6] text-text-body">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ CTA ═══════════ */}
      <section className="bg-[#09090b] py-16 sm:py-24 lg:py-[96px]">
        <div className="ag-container text-center">
          <h2 className="text-3xl font-bold tracking-[-0.8px] text-white text-balance sm:text-4xl lg:text-[44px] lg:leading-[1.15]">
            {fr ? "Pret a nous rejoindre ?" : "Ready to join us?"}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-[1.7] text-[#a1a1aa]">
            {fr ? "Creez votre compte en quelques minutes." : "Create your account in minutes."}
          </p>
          <div className="mt-10 flex justify-center">
            <button className="ag-btn-brand ag-btn-brand-lg gap-2" onClick={() => onNavigate("signup")}>
              {fr ? "Commencer" : "Get started"} <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="ag-footer">
        <div className="ag-container text-center">
          <div className="mb-4 flex justify-center"><Logo imgClassName="h-10 brightness-0 invert" /></div>
          <p className="text-xs text-[#71717a]">&copy; {new Date().getFullYear()} SaveMali {fr ? "SARL" : "LLC"} — {fr ? "Développé par John Mocket" : "Developed by John Mocket"}</p>
        </div>
      </footer>
    </div>
  )
}
