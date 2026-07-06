import * as React from "react"
import { Shield, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useLanguage } from "@/lib/i18n"
import { usePageEntrance } from "@/hooks/use-page-entrance"

type Page = "home" | "education" | "pharmacy" | "commerce" | "gestion" | "dashboard" | "signin" | "signup" | "members" | "reports" | "privacy" | "terms"
interface Props { onNavigate: (p: Page) => void }

const DATA_CONTROLLER = {
  name: "SaveMali SARL",
  address: "Kalemie, Province du Tanganyika, Republique Democratique du Congo",
  email: "support@savemali.com",
  phone: "+243 857 599 332",
}

const sections: Record<string, { title: string; content: string }[]> = {
  fr: [
    {
      title: "1. Introduction",
      content: `SaveMali SARL (« SaveMali », « nous », « notre ») s'engage a proteger la confidentialite et la securite des donnees personnelles de ses utilisateurs. La presente Politique de Confidentialite decrit comment nous collectons, utilisons, stockons, partageons et protegeons vos informations lorsque vous utilisez notre plateforme ERP (https://savemali.com) et nos services associes. En utilisant la plateforme, vous consentez aux pratiques decrites dans la presente politique.`,
    },
    {
      title: "2. Responsable du Traitement",
      content: `Le responsable du traitement de vos donnees personnelles est :\n\n${DATA_CONTROLLER.name}\n${DATA_CONTROLLER.address}\nEmail : ${DATA_CONTROLLER.email}\nTelephone : ${DATA_CONTROLLER.phone}\n\nPour toute question relative a la protection de vos donnees, vous pouvez contacter notre Delegue a la Protection des Donnees (DPO) a l'adresse dpo@savemali.com.`,
    },
    {
      title: "3. Donnees Collectees",
      content: `Nous collectons les categories de donnees suivantes :\n\n(a) Donnees d'identification : nom, prenom, adresse email, numero de telephone, adresse physique, piece d'identite (pour certaines fonctionnalites).\n\n(b) Donnees de compte : identifiants de connexion, historique des connexions, preferences linguistiques et thematiques.\n\n(c) Donnees professionnelles : nom de l'entreprise, type d'activite, adresse professionnelle, numero de contribuable / NIF, registre de commerce.\n\n(d) Donnees de gestion : informations sur les clients, produits, stocks, ventes, achats, factures, employes, eleves, notes, paiements et autres donnees saisies dans le cadre de l'utilisation de nos modules.\n\n(e) Donnees financieres : informations de paiement, historique des transactions, factures, abonnements.\n\n(f) Donnees techniques : adresse IP, type de navigateur, systeme d'exploitation, pages visitees, duree de navigation, cookies et technologies similaires.`,
    },
    {
      title: "4. Base Legale du Traitement",
      content: `Nous traitons vos donnees personnelles sur les bases legales suivantes :\n\n(a) Execution du contrat : le traitement est necessaire a l'execution du contrat de service qui vous lie a SaveMali.\n\n(b) Consentement : lorsque vous avez donne votre consentement explicite (ex. : cookies non essentiels, communications marketing).\n\n(c) Obligation legale : lorsque le traitement est requis par la legislation congolaise ou la reglementation OHADA.\n\n(d) Interet legitime : pour ameliorer nos services, assurer la securite de la plateforme et prevenir la fraude.`,
    },
    {
      title: "5. Utilisation des Donnees",
      content: `Vos donnees sont utilisees pour les finalites suivantes :\n\n- Fournir, maintenir et ameliorer nos services ERP\n- Gerer votre compte et votre abonnement\n- Traiter les transactions et emettre les factures\n- Communiquer avec vous (support technique, notifications, mises a jour)\n- Personnaliser votre experience utilisateur\n- Assurer la securite et l'integrite de la plateforme\n- Se conformer aux obligations legales et reglementaires (notamment OHADA et fiscalite congolaise)\n- Analyser les tendances d'utilisation pour developper de nouvelles fonctionnalites\n- Prevenir et detecter les fraudes, les abus et les violations de nos conditions d'utilisation`,
    },
    {
      title: "6. Destinataires des Donnees",
      content: `Nous ne vendons pas vos donnees personnelles a des tiers. Nous pouvons partager vos donnees avec les categories de destinataires suivantes :\n\n(a) Prestataires de services : hebergement (serveurs securises), traitement des paiements, analyses, support technique, tous lies par des contrats de confidentialite conformes au RGPD et a la legislation congolaise.\n\n(b) Autorites legales : lorsque la loi l'exige, pour repondre a une demande judiciaire ou administrative, ou pour proteger nos droits.\n\n(c) Partenaires commerciaux : uniquement avec votre consentement explicite et pour des services strictement en lien avec notre plateforme.`,
    },
    {
      title: "7. Transferts Internationaux de Donnees",
      content: `Vos donnees sont principalement hebergees sur des serveurs situes aux Etats-Unis et en Europe, via des fournisseurs conformes au GDPR et aux cadres de protection des donnees applicables (notamment les clauses contractuelles types de la Commission Europeenne). En utilisant nos services, vous consentez a ce transfert dans le respect des garanties appropriees.`,
    },
    {
      title: "8. Duree de Conservation",
      content: `Nous conservons vos donnees personnelles aussi longtemps que necessaire pour les finalites decrites dans la presente politique, et conformement a nos obligations legales :\n\n- Donnees de compte : pendant toute la duree de votre abonnement et jusqu'a 3 ans apres sa resiliation, sauf obligation legale contraire.\n- Donnees financieres : 10 ans conformement aux exigences comptables et fiscales (OHADA, code general des impots congolais).\n- Donnees de gestion (clients, stocks, ventes) : jusqu'a la resiliation de votre compte, puis 5 ans a des fins probatoires.\n- Donnees techniques (logs, cookies) : 13 mois maximum apres leur collecte.`,
    },
    {
      title: "9. Securite des Donnees",
      content: `Nous mettons en oeuvre des mesures de securite techniques et organisationnelles conformes aux normes internationales :\n\n- Chiffrement des donnees en transit (TLS 1.3) et au repos (AES-256)\n- Controle d'acces base sur les roles (RBAC) avec authentification forte\n- Sauvegardes journalieres chiffrees avec retention 30 jours\n- Surveillance continue des acces et tentatives d'intrusion\n- Tests de penetration reguliers\n- Pare-feu et systemes de detection d'intrusion\n- Formation de notre personnel a la protection des donnees\n\nEn cas de violation de donnees, nous nous engageons a vous notifier dans les 72 heures et a informer l'autorite de protection des donnees competente.`,
    },
    {
      title: "10. Vos Droits",
      content: `Conformement a la Loi n° 23-010 du 5 juillet 2023 relative a la protection des donnees a caractere personnel en Republique Democratique du Congo, et au Reglement General sur la Protection des Donnees (RGPD) pour nos utilisateurs europeens, vous disposez des droits suivants :\n\n- Droit d'acces : obtenir la confirmation que vos donnees sont traitees et en recevoir une copie.\n- Droit de rectification : demander la correction de donnees inexactes ou incomplete.\n- Droit a l'effacement (droit a l'oubli) : demander la suppression de vos donnees, sous reserve des obligations legales de conservation.\n- Droit a la limitation du traitement : restreindre temporairement l'utilisation de vos donnees.\n- Droit d'opposition : vous opposer au traitement de vos donnees pour des motifs legitimes.\n- Droit a la portabilite : recevoir vos donnees dans un format structure, couramment utilise et lisible.\n- Droit de retirer votre consentement a tout moment, sans affecter la licite du traitement anterieur.\n- Droit d'introduire une reclame aupres de l'autorite de controle competente.\n\nPour exercer ces droits, contactez-nous a dpo@savemali.com. Nous repondrons a votre demande dans un delai maximum de 30 jours.`,
    },
    {
      title: "11. Cookies et Technologies Similaires",
      content: `Nous utilisons les categories de cookies suivantes :\n\n(a) Cookies strictement necessaires : essentiels au fonctionnement de la plateforme (session, authentification).\n(b) Cookies de performance : nous permettent d'analyser l'utilisation de la plateforme pour l'ameliorer.\n(c) Cookies fonctionnels : memorisent vos preferences (langue, theme) pour personnaliser votre experience.\n\nVous pouvez configurer votre navigateur pour refuser les cookies. Cependant, le blocage des cookies essentiels pourrait affecter le fonctionnement correct de SaveMali. Pour plus d'informations, consultez notre Politique de Cookies.`,
    },
    {
      title: "12. Conformite OHADA",
      content: `SaveMali s'engage a ce que ses modules comptables et de gestion soient conformes au Plan Comptable General de l'OHADA (Organisation pour l'Harmonisation en Afrique du Droit des Affaires). Les donnees comptables et financieres sont traitees et conservees conformement aux exigences du droit comptable OHADA et du droit fiscal congolais. Il vous incombe de vous assurer que l'utilisation que vous faites de nos modules respecte vos propres obligations legales et reglementaires.`,
    },
    {
      title: "13. Modifications de la Politique",
      content: `Nous pouvons modifier la presente Politique de Confidentialite a tout moment. Les modifications prennent effet des leur publication sur la plateforme. En cas de modification substantielle, nous vous en informerons par email ou via une notification sur la plateforme au moins 30 jours avant l'entree en vigueur. Votre utilisation continue de SaveMali apres les modifications constitue votre acceptation de la politique revisee.`,
    },
    {
      title: "14. Contact",
      content: `Pour toute question, preoccupation ou reclame relative a la presente Politique de Confidentialite ou a nos pratiques en matiere de protection des donnees, veuillez nous contacter :\n\n- Par email : dpo@savemali.com\n- Par WhatsApp : ${DATA_CONTROLLER.phone}\n- Par courrier : ${DATA_CONTROLLER.name}, ${DATA_CONTROLLER.address}\n\nVous avez egalement le droit de saisir l'Autorite de Protection des Donnees Personnelles (APDP) de la Republique Democratique du Congo.`,
    },
  ],
  en: [
    {
      title: "1. Introduction",
      content: `SaveMali SARL ("SaveMali", "we", "us", "our") is committed to protecting the confidentiality and security of its users' personal data. This Privacy Policy describes how we collect, use, store, share, and protect your information when you use our ERP platform (https://savemali.com) and related services. By using the platform, you consent to the practices described in this policy.`,
    },
    {
      title: "2. Data Controller",
      content: `The data controller responsible for your personal data is:\n\n${DATA_CONTROLLER.name}\n${DATA_CONTROLLER.address}\nEmail: ${DATA_CONTROLLER.email}\nPhone: ${DATA_CONTROLLER.phone}\n\nFor any data protection inquiries, you may contact our Data Protection Officer (DPO) at dpo@savemali.com.`,
    },
    {
      title: "3. Data Collected",
      content: `We collect the following categories of data:\n\n(a) Identity data: name, surname, email address, phone number, physical address, identity document (for certain features).\n\n(b) Account data: login credentials, connection history, language and theme preferences.\n\n(c) Professional data: company name, business type, business address, tax ID / NIF, trade register.\n\n(d) Management data: customer information, products, inventory, sales, purchases, invoices, employees, students, grades, payments and other data entered as part of using our modules.\n\n(e) Financial data: payment information, transaction history, invoices, subscriptions.\n\n(f) Technical data: IP address, browser type, operating system, pages visited, browsing duration, cookies and similar technologies.`,
    },
    {
      title: "4. Legal Basis for Processing",
      content: `We process your personal data on the following legal bases:\n\n(a) Contract performance: processing is necessary for the performance of the service contract binding you to SaveMali.\n\n(b) Consent: when you have given explicit consent (e.g., non-essential cookies, marketing communications).\n\n(c) Legal obligation: when processing is required by Congolese law or OHADA regulations.\n\n(d) Legitimate interest: to improve our services, ensure platform security, and prevent fraud.`,
    },
    {
      title: "5. Use of Data",
      content: `Your data is used for the following purposes:\n\n- Provide, maintain, and improve our ERP services\n- Manage your account and subscription\n- Process transactions and issue invoices\n- Communicate with you (technical support, notifications, updates)\n- Personalize your user experience\n- Ensure platform security and integrity\n- Comply with legal and regulatory obligations (notably OHADA and Congolese tax law)\n- Analyze usage trends to develop new features\n- Prevent and detect fraud, abuse, and violations of our terms of use`,
    },
    {
      title: "6. Data Recipients",
      content: `We do not sell your personal data to third parties. We may share your data with the following categories of recipients:\n\n(a) Service providers: hosting (secure servers), payment processing, analytics, technical support, all bound by confidentiality agreements compliant with GDPR and Congolese law.\n\n(b) Legal authorities: when required by law, to respond to a judicial or administrative request, or to protect our rights.\n\n(c) Business partners: only with your explicit consent and for services strictly related to our platform.`,
    },
    {
      title: "7. International Data Transfers",
      content: `Your data is primarily hosted on servers located in the United States and Europe, through providers compliant with GDPR and applicable data protection frameworks (notably the European Commission's Standard Contractual Clauses). By using our services, you consent to this transfer subject to appropriate safeguards.`,
    },
    {
      title: "8. Data Retention",
      content: `We retain your personal data for as long as necessary for the purposes described in this policy, and in accordance with our legal obligations:\n\n- Account data: for the duration of your subscription and up to 3 years after termination, unless otherwise required by law.\n- Financial data: 10 years in accordance with accounting and tax requirements (OHADA, Congolese general tax code).\n- Management data (customers, inventory, sales): until account termination, then 5 years for evidentiary purposes.\n- Technical data (logs, cookies): 13 months maximum after collection.`,
    },
    {
      title: "9. Data Security",
      content: `We implement technical and organizational security measures in accordance with international standards:\n\n- Encryption of data in transit (TLS 1.3) and at rest (AES-256)\n- Role-based access control (RBAC) with strong authentication\n- Daily encrypted backups with 30-day retention\n- Continuous access and intrusion monitoring\n- Regular penetration testing\n- Firewalls and intrusion detection systems\n- Staff training on data protection\n\nIn the event of a data breach, we undertake to notify you within 72 hours and to inform the competent data protection authority.`,
    },
    {
      title: "10. Your Rights",
      content: `In accordance with Law No. 23-010 of July 5, 2023 on the protection of personal data in the Democratic Republic of Congo, and the General Data Protection Regulation (GDPR) for our European users, you have the following rights:\n\n- Right of access: obtain confirmation that your data is processed and receive a copy.\n- Right to rectification: request correction of inaccurate or incomplete data.\n- Right to erasure (right to be forgotten): request deletion of your data, subject to legal retention obligations.\n- Right to restriction of processing: temporarily restrict the use of your data.\n- Right to object: object to the processing of your data for legitimate reasons.\n- Right to data portability: receive your data in a structured, commonly used, machine-readable format.\n- Right to withdraw consent at any time, without affecting the lawfulness of prior processing.\n- Right to lodge a complaint with the competent supervisory authority.\n\nTo exercise these rights, contact us at dpo@savemali.com. We will respond to your request within a maximum of 30 days.`,
    },
    {
      title: "11. Cookies and Similar Technologies",
      content: `We use the following categories of cookies:\n\n(a) Strictly necessary cookies: essential for platform operation (session, authentication).\n(b) Performance cookies: allow us to analyze platform usage for improvement.\n(c) Functional cookies: remember your preferences (language, theme) to personalize your experience.\n\nYou can configure your browser to refuse cookies. However, blocking essential cookies may affect the proper functioning of SaveMali. For more information, see our Cookie Policy.`,
    },
    {
      title: "12. OHADA Compliance",
      content: `SaveMali ensures that its accounting and management modules comply with the OHADA General Accounting Plan (Organisation for the Harmonization of Business Law in Africa). Accounting and financial data are processed and retained in accordance with OHADA accounting law and Congolese tax law. It is your responsibility to ensure that your use of our modules complies with your own legal and regulatory obligations.`,
    },
    {
      title: "13. Policy Changes",
      content: `We may modify this Privacy Policy at any time. Changes take effect upon publication on the platform. In the event of a material change, we will notify you by email or via an in-app notification at least 30 days before the change takes effect. Your continued use of SaveMali after modifications constitutes your acceptance of the revised policy.`,
    },
    {
      title: "14. Contact",
      content: `For any questions, concerns, or complaints regarding this Privacy Policy or our data protection practices, please contact us:\n\n- By email: dpo@savemali.com\n- By WhatsApp: ${DATA_CONTROLLER.phone}\n- By mail: ${DATA_CONTROLLER.name}, ${DATA_CONTROLLER.address}\n\nYou also have the right to lodge a complaint with the Personal Data Protection Authority (APDP) of the Democratic Republic of Congo.`,
    },
  ],
}

export function PrivacyPage({ onNavigate }: Props) {
  const { lang } = useLanguage()
  const fr = lang === "fr"
  const rootRef = usePageEntrance([])
  const s = sections[lang]

  return (
    <div ref={rootRef} className="min-h-svh bg-background">
      <div className="page-header bg-gradient-to-br from-brand to-brand/70 px-6 py-12 text-white">
        <div className="mx-auto max-w-3xl">
          <Button variant="ghost" size="sm" className="text-white/70 hover:text-white mb-4 -ml-2" onClick={() => onNavigate("home")}>
            <ArrowLeft className="size-4 mr-1" />{fr ? "Retour" : "Back"}
          </Button>
          <div className="flex items-center gap-3">
            <Shield className="size-8" />
            <div>
              <h1 className="text-2xl font-bold">{fr ? "Politique de Confidentialite" : "Privacy Policy"}</h1>
              <p className="text-white/70 text-sm">{fr ? `Dernière mise à jour : ${new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}` : `Last updated: ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}`}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="space-y-8">
          {s.map((sec, i) => (
            <div key={i}>
              <h2 className="text-lg font-semibold text-foreground mb-2">{sec.title}</h2>
              {sec.content.split("\n").map((line, j) => (
                <p key={j} className={`text-sm text-muted-foreground leading-relaxed ${j > 0 ? "mt-2" : ""}`}>{line}</p>
              ))}
              {i < s.length - 1 && <Separator className="mt-6" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
