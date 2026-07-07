import * as React from "react"
import { X, Shield, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCaptchaLang } from "@/lib/captcha/i18n"
import type { Language } from "@/lib/captcha/types"

const DATA_CONTROLLER = {
  name: "SaveMali SARL",
  address: "Quartier Abbatoir, Avenue Cadastre N°321, Kalemie, Province du Tanganyika, Republique Democratique du Congo",
  email: "support@savemali.com",
  phone: "+243 857 599 332",
}

const privacySections: Record<string, { title: string; content: string }[]> = {
  fr: [
    { title: "1. Introduction", content: "SaveMali SARL (« SaveMali », « nous », « notre ») s'engage a proteger la confidentialite et la securite des donnees personnelles de ses utilisateurs. La presente Politique de Confidentialite decrit comment nous collectons, utilisons, stockons, partageons et protegeons vos informations lorsque vous utilisez notre plateforme ERP (https://www.savemali.online) et nos services associes." },
    { title: "2. Responsable du Traitement", content: "Le responsable du traitement de vos donnees personnelles est :\n\nSaveMali SARL\nQuartier Abbatoir, Avenue Cadastre N°321, Kalemie, Province du Tanganyika, Republique Democratique du Congo\nEmail : support@savemali.com\nTelephone : +243 857 599 332\n\nPour toute question, contactez notre DPO a l'adresse dpo@savemali.com." },
    { title: "3. Donnees Collectees", content: "(a) Donnees d'identification : nom, prenom, adresse email, numero de telephone.\n\n(b) Donnees de compte : identifiants de connexion, historique, preferences.\n\n(c) Donnees professionnelles : nom de l'entreprise, type d'activite.\n\n(d) Donnees de gestion : informations clients, produits, stocks, ventes.\n\n(e) Donnees financieres : paiements, transactions, factures.\n\n(f) Donnees techniques : adresse IP, navigateur, cookies." },
    { title: "4. Utilisation des Donnees", content: "- Fournir et ameliorer nos services ERP\n- Gerer votre compte et abonnement\n- Traiter les transactions et factures\n- Communiquer avec vous (support, notifications)\n- Assurer la securite de la plateforme\n- Se conformer aux obligations legales" },
    { title: "5. Vos Droits", content: "Conformement a la Loi n° 23-010 relative a la protection des donnees en RDC :\n\n- Droit d'acces a vos donnees\n- Droit de rectification\n- Droit a l'effacement\n- Droit a la limitation du traitement\n- Droit d'opposition\n- Droit a la portabilite\n\nContact : dpo@savemali.com" },
  ],
  en: [
    { title: "1. Introduction", content: "SaveMali SARL is committed to protecting the confidentiality and security of its users' personal data. This Privacy Policy describes how we collect, use, store, share, and protect your information when you use our ERP platform." },
    { title: "2. Data Controller", content: "SaveMali SARL\nAbbatoir Quarter, Cadastre Avenue N°321, Kalemie, Tanganyika Province, DRC\nEmail: support@savemali.com\nPhone: +243 857 599 332\n\nContact our DPO at dpo@savemali.com." },
    { title: "3. Data Collected", content: "(a) Identity: name, email, phone.\n(b) Account: login, history, preferences.\n(c) Professional: company name, business type.\n(d) Management: customers, products, inventory.\n(e) Financial: payments, transactions.\n(f) Technical: IP, browser, cookies." },
    { title: "4. Use of Data", content: "- Provide and improve ERP services\n- Manage account and subscription\n- Process transactions and invoices\n- Communicate (support, notifications)\n- Ensure platform security\n- Comply with legal obligations" },
    { title: "5. Your Rights", content: "Under DRC Law No. 23-010:\n- Right of access\n- Right to rectification\n- Right to erasure\n- Right to restriction\n- Right to object\n- Right to portability\n\nContact: dpo@savemali.com" },
  ],
}

const termsSections: Record<string, { title: string; content: string }[]> = {
  fr: [
    { title: "1. Acceptation", content: "En accedant a SaveMali et en utilisant nos services, vous acceptez d'etre lie par ces Conditions Generales d'Utilisation." },
    { title: "2. Services", content: "SaveMali est une plateforme ERP proposant des modules de gestion pour la pharmacie, le commerce, l'education et la gestion d'entreprise." },
    { title: "3. Compte Utilisateur", content: "Vous etes responsable de la confidentialite de vos identifiants et de toutes les activites sous votre compte." },
    { title: "4. Obligations", content: "Vous vous engagez a utiliser la plateforme conformement aux lois applicables et a ne pas contourner les mesures de securite." },
    { title: "5. Propriete Intellectuelle", content: "La plateforme est protegee par les droits de propriete intellectuelle. Vous conservez la propriete de vos donnees." },
    { title: "6. Responsabilite", content: "SaveMali est fourni « en l'etat ». Notre responsabilite est limitee aux frais payes au cours des 12 mois precedents." },
  ],
  en: [
    { title: "1. Acceptance", content: "By accessing SaveMali and using our services, you agree to be bound by these Terms of Use." },
    { title: "2. Services", content: "SaveMali is an ERP platform offering management modules for pharmacy, commerce, education, and business." },
    { title: "3. User Account", content: "You are responsible for your login credentials and all activities under your account." },
    { title: "4. Obligations", content: "You agree to use the platform in accordance with applicable laws and not to bypass security measures." },
    { title: "5. Intellectual Property", content: "The platform is protected by IP rights. You retain ownership of your data." },
    { title: "6. Liability", content: "SaveMali is provided 'as is'. Our liability is limited to fees paid in the preceding 12 months." },
  ],
}

interface Props {
  type: "privacy" | "terms"
  lang: Language
  onClose: () => void
}

export function CaptchaLegalModal({ type, lang, onClose }: Props) {
  const t = useCaptchaLang(lang)
  const fr = lang === "fr"
  const sections = type === "privacy" ? privacySections[lang] : termsSections[lang]
  const isPrivacy = type === "privacy"

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={cn(
        "relative z-10 w-full max-w-lg max-h-[80vh] mx-4 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden"
      )}>
        <div className={cn(
          "flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-700",
          isPrivacy ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-blue-50 dark:bg-blue-900/20"
        )}>
          <div className="flex items-center gap-2">
            {isPrivacy ? <Shield className="size-4 text-emerald-600" /> : <FileText className="size-4 text-blue-600" />}
            <span className="font-semibold text-sm text-foreground">
              {isPrivacy ? (fr ? "Confidentialite" : "Privacy") : (fr ? "Conditions" : "Terms")}
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
            <X className="size-4 text-muted-foreground" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-60px)] space-y-4">
          {sections.map((sec, i) => (
            <div key={i}>
              <h3 className="font-semibold text-sm text-foreground mb-1">{sec.title}</h3>
              {sec.content.split("\n").map((line, j) => (
                <p key={j} className="text-xs text-muted-foreground leading-relaxed">{line}</p>
              ))}
            </div>
          ))}
          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-700 text-center">
            <p className="text-[10px] text-muted-foreground">
              {fr ? "Contact :" : "Contact :"} {DATA_CONTROLLER.email}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}