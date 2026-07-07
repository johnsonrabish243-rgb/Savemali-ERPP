import * as React from "react"
import { gsap } from "gsap"
import { Mail, MapPin, MessageSquare, ArrowRight } from "lucide-react"
import { Logo } from "@/components/Logo"
import { useLanguage } from "@/lib/i18n"
import type { Page } from "@/App"

interface Props { onNavigate: (page: Page) => void }

export function ContactPage({ onNavigate }: Props) {
  const { lang } = useLanguage()
  const fr = lang === "fr"
  const ref = React.useRef<HTMLDivElement>(null)

  React.useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".contact-hero", { opacity: 0, y: 30, duration: 0.6, ease: "power3.out" })
      gsap.from(".contact-info", { opacity: 0, x: 30, duration: 0.5, ease: "power2.out", scrollTrigger: { trigger: ".contact-info", start: "top 85%" } })
    }, ref)
    return () => ctx.revert()
  }, [])

  const info = [
    { icon: Mail, label: "Email", value: "support@savemali.com" },
    { icon: MapPin, label: fr ? "Adresse" : "Address", value: fr ? "Quartier Abbatoir, Avenue Cadastre N°321, Kalemie, Tanganyika, RDC" : "Abbatoir Quarter, Cadastre Avenue N°321, Kalemie, Tanganyika, DRC" },
    { icon: MessageSquare, label: "WhatsApp", value: "+243 857 599 332" },
  ]

  return (
    <div ref={ref} className="flex flex-col">
      {/* ═══════════ HERO ═══════════ */}
      <section className="contact-hero relative overflow-hidden bg-[#09090b] pb-16 pt-20 sm:pb-20 sm:pt-28">
        <div className="ag-hero-glow absolute inset-0" />
        <div className="ag-container relative z-10 text-center">
          <div className="ag-badge mb-6 inline-flex">
            {fr ? "Contact" : "Contact"}
          </div>
          <h1 className="mx-auto max-w-4xl text-3xl font-bold tracking-[-0.8px] text-white text-balance sm:text-5xl md:text-[60px] md:leading-[1.1]">
            {fr ? "Contactez-nous" : "Contact Us"}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-[1.7] text-[#a1a1aa]">
            {fr ? "Une question, un projet, une collaboration ? Notre équipe est là pour vous." : "A question, a project, a collaboration? Our team is here for you."}
          </p>
        </div>
      </section>

      {/* ═══════════ INFO ═══════════ */}
      <section className="bg-surface py-16 sm:py-24 lg:py-[96px]">
        <div className="ag-container">
          <div className="mx-auto max-w-xl">
            <div className="contact-info space-y-8">
              <h2 className="text-2xl font-bold tracking-[-0.8px] text-text-heading sm:text-3xl">
                {fr ? "Nos coordonnées" : "Our details"}
              </h2>
              {info.map((item, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    <item.icon className="size-5 text-brand" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-heading">{item.label}</p>
                    <p className="text-sm text-text-body">{item.value}</p>
                  </div>
                </div>
              ))}
              <div className="pt-4">
                <button className="ag-btn-ghost gap-2" onClick={() => onNavigate("home")}>
                  <ArrowRight className="size-4" /> {fr ? "Retour à l'accueil" : "Back to home"}
                </button>
              </div>
            </div>
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
