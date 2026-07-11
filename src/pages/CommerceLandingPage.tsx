import * as React from "react"
import { ShoppingCart, CreditCard, Package, BarChart3, Star, Users, Receipt } from "lucide-react"
import { useLanguage } from "@/lib/i18n"
import { SeoHead } from "@/lib/seo"
import { Logo } from "@/components/Logo"
import { SpiralButton } from "@/components/SpiralButton"

type Page = "home" | "education" | "pharmacy" | "commerce" | "gestion" | "dashboard" | "signin" | "signup"
interface Props { onNavigate: (page: Page) => void }

export function CommerceLandingPage({ onNavigate }: Props) {
  const { lang, t } = useLanguage()
  const fr = lang === "fr"

  const features = [
    { icon: CreditCard, title: fr ? "Caisse enregistreuse" : "Cash Register", desc: fr ? "Interface de vente rapide avec lecture de codes-barres, gestion des remises et encaissement multi-modes." : "Fast sales interface with barcode reading, discount management and multi-mode payment." },
    { icon: Package, title: fr ? "Inventaire intelligent" : "Smart Inventory", desc: fr ? "Suivi des stocks en temps réel, alertes de stock bas, gestion des fournisseurs et commandes automatiques." : "Real-time stock tracking, low stock alerts, supplier management and automatic orders." },
    { icon: BarChart3, title: fr ? "Tableau de bord ventes" : "Sales Dashboard", desc: fr ? "Analysez vos ventes par produit, période et catégorie. Graphiques visuels et tendances en temps réel." : "Analyze your sales by product, period and category. Visual charts and real-time trends." },
    { icon: Users, title: fr ? "Gestion clients" : "Customer Management", desc: fr ? "Fiches clients, historique d'achats, comptes et gestion des dettes." : "Customer profiles, purchase history, accounts and debt management." },
    { icon: Receipt, title: fr ? "Facturation complète" : "Complete Invoicing", desc: fr ? "Générez des factures professionnelles, suivez les paiements et gérez la comptabilité." : "Generate professional invoices, track payments and manage accounting." },
    { icon: Star, title: fr ? "Programme fidélité" : "Loyalty Program", desc: fr ? "Système de points, récompenses automatiques et fidélisation des clients réguliers." : "Point system, automatic rewards and retention of regular customers." },
  ]

  return (
    <div className="flex flex-col min-h-svh bg-background">
      <SeoHead page="landing-commerce" lang={lang} />

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 pb-16 pt-20 sm:pb-20 sm:pt-28 lg:pb-28 lg:pt-36">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/4 w-[800px] h-[800px] rounded-full bg-white/5 blur-[120px]" />
          <div className="absolute -bottom-1/3 -right-1/4 w-[600px] h-[600px] rounded-full bg-white/5 blur-[100px]" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm">
            <ShoppingCart className="size-3" />
            {t.modules.commerce.title}
          </div>
          <h1 className="mx-auto max-w-4xl text-4xl font-bold leading-[1] tracking-[-0.8px] text-white text-balance sm:text-5xl md:text-6xl">
            {fr ? "Vendez plus, gagnez plus" : "Sell more, earn more"}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-[1.7] text-white/80 sm:text-xl">
            {fr ? "Gérez votre commerce avec des outils professionnels : caisse, inventaire, facturation et analyse des ventes." : "Manage your business with professional tools: cash register, inventory, invoicing and sales analysis."}
          </p>
          <div className="mt-10">
            <SpiralButton onClick={() => onNavigate("signup")} label={fr ? "Commencer gratuitement" : "Start free"} />
          </div>
        </div>
      </section>

      {/* ═══════════ MODULE EXPLANATION ═══════════ */}
      <section className="py-16 sm:py-24 lg:py-[96px]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center sm:mb-16">
            <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-orange-500/20 bg-orange-50 dark:bg-orange-950 px-4 py-1.5 text-xs font-medium text-orange-600 dark:text-orange-400">
              {fr ? "À propos du module" : "About this module"}
            </div>
            <h2 className="text-3xl font-bold tracking-[-0.8px] text-foreground text-balance sm:text-4xl lg:text-[44px] lg:leading-[1.15]">
              {fr ? "Pilotez votre commerce" : "Run your business"}
            </h2>
            <p className="mx-auto mt-5 max-w-3xl text-lg leading-[1.7] text-muted-foreground sm:text-xl">
              {fr ? "SaveMali Commerce offre une suite complète d'outils pour gérer vos ventes, inventaire, clients et finances depuis une seule interface." : "SaveMali Commerce offers a complete suite of tools to manage your sales, inventory, customers and finances from a single interface."}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feat, i) => (
              <div key={i} className="group rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:border-orange-500/30 hover:shadow-md">
                <div className="mb-5 flex size-10 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-950">
                  <feat.icon className="size-5 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="mb-2 text-base font-semibold text-foreground">{feat.title}</h3>
                <p className="text-sm leading-[1.6] text-muted-foreground">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ CTA ═══════════ */}
      <section className="bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold tracking-[-0.8px] text-white text-balance sm:text-4xl lg:text-[44px] lg:leading-[1.15]">
            {fr ? "Boostez vos ventes dès aujourd'hui" : "Boost your sales today"}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-[1.7] text-white/80 sm:text-xl">
            {fr ? "Rejoignez des commerçants en RDC." : "Join merchants in the DRC."}
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
          <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} SaveMali — {fr ? "Développé par John Mocket" : "Developed by John Mocket"}</p>
        </div>
      </footer>
    </div>
  )
}
