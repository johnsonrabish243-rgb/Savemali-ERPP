import * as React from "react"
import { FlaskConical, Package, AlertTriangle, ShoppingCart, BarChart3, TrendingUp, ShieldCheck } from "lucide-react"
import { useLanguage } from "@/lib/i18n"
import { Logo } from "@/components/Logo"
import { SpiralButton } from "@/components/SpiralButton"

type Page = "home" | "education" | "pharmacy" | "commerce" | "gestion" | "dashboard" | "signin" | "signup"
interface Props { onNavigate: (page: Page) => void }

export function PharmacyLandingPage({ onNavigate }: Props) {
  const { lang, t } = useLanguage()
  const fr = lang === "fr"

  const features = [
    { icon: Package, title: fr ? "Catalogue médicaments" : "Medicine Catalog", desc: fr ? "Base de données complète avec descriptions, dosages, prix et catégories. Recherche instantanée par nom ou code." : "Complete database with descriptions, dosages, prices and categories. Instant search by name or code." },
    { icon: AlertTriangle, title: fr ? "Alertes péremption" : "Expiry Alerts", desc: fr ? "Suivi automatique des dates de péremption. Alertes par email et SMS avant expiration pour éviter les pertes." : "Automatic expiry date tracking. Email and SMS alerts before expiration to avoid losses." },
    { icon: ShoppingCart, title: fr ? "Point de vente (POS)" : "Point of Sale (POS)", desc: fr ? "Interface de caisse rapide et intuitive. Encaissements, retours, remises et historique des ventes." : "Fast and intuitive checkout interface. Payments, returns, discounts and sales history." },
    { icon: BarChart3, title: fr ? "Rapports financiers" : "Financial Reports", desc: fr ? "Chiffre d'affaires, marges, rotation de stock et analyse de rentabilité par catégorie de médicaments." : "Revenue, margins, stock turnover and profitability analysis by medicine category." },
    { icon: ShieldCheck, title: fr ? "Traçabilité complète" : "Full Traceability", desc: fr ? "Historique complet de chaque mouvement de stock. Suivi des ventes, pertes et ajustements avec timestamps." : "Complete history of every stock movement. Track sales, losses and adjustments with timestamps." },
    { icon: TrendingUp, title: fr ? "Gestion des commandes" : "Order Management", desc: fr ? "Passez des commandes fournisseurs, suivez les livraisons et gérez les stocks automatiquement." : "Place supplier orders, track deliveries and manage stock automatically." },
  ]

  return (
    <div className="flex flex-col min-h-svh bg-background">

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-green-700 pb-16 pt-20 sm:pb-20 sm:pt-28 lg:pb-28 lg:pt-36">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/4 w-[800px] h-[800px] rounded-full bg-white/5 blur-[120px]" />
          <div className="absolute -bottom-1/3 -right-1/4 w-[600px] h-[600px] rounded-full bg-white/5 blur-[100px]" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm">
            <FlaskConical className="size-3" />
            {t.modules.pharmacy.title}
          </div>
          <h1 className="mx-auto max-w-4xl text-4xl font-bold leading-[1] tracking-[-0.8px] text-white text-balance sm:text-5xl md:text-6xl">
            {fr ? "Pharmacie : zéro péremption manquée" : "Pharmacy: zero missed expiries"}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-[1.7] text-white/80 sm:text-xl">
            {fr ? "Gérez votre pharmacie avec confiance. Inventaire, ventes, alertes péremption et rapports financiers." : "Manage your pharmacy with confidence. Inventory, sales, expiry alerts and financial reports."}
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
            <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-emerald-600/20 bg-emerald-50 dark:bg-emerald-950 px-4 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {fr ? "À propos du module" : "About this module"}
            </div>
            <h2 className="text-3xl font-bold tracking-[-0.8px] text-foreground text-balance sm:text-4xl lg:text-[44px] lg:leading-[1.15]">
              {fr ? "Zéro péremption manquée, zéro stress" : "Zero missed expiries, zero stress"}
            </h2>
            <p className="mx-auto mt-5 max-w-3xl text-lg leading-[1.7] text-muted-foreground sm:text-xl">
              {fr ? "SaveMali Pharmacie vous aide à gérer votre stock de médicaments, éviter les péremptions et maximiser vos ventes avec des outils intelligents." : "SaveMali Pharmacy helps you manage your medicine stock, avoid expirations and maximize sales with smart tools."}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feat, i) => (
              <div key={i} className="group rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:border-emerald-600/30 hover:shadow-md">
                <div className="mb-5 flex size-10 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950">
                  <feat.icon className="size-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="mb-2 text-base font-semibold text-foreground">{feat.title}</h3>
                <p className="text-sm leading-[1.6] text-muted-foreground">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ CTA ═══════════ */}
      <section className="bg-gradient-to-br from-emerald-600 via-teal-600 to-green-700 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold tracking-[-0.8px] text-white text-balance sm:text-4xl lg:text-[44px] lg:leading-[1.15]">
            {fr ? "Zéro péremption manquée, zéro stress" : "Zero missed expiries, zero stress"}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-[1.7] text-white/80 sm:text-xl">
            {fr ? "Gérez votre pharmacie avec confiance." : "Manage your pharmacy with confidence."}
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
