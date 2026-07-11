import * as React from "react"
import { FileText, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useLanguage } from "@/lib/i18n"
import { usePageEntrance } from "@/hooks/use-page-entrance"

type Page = "home" | "education" | "pharmacy" | "commerce" | "gestion" | "dashboard" | "signin" | "signup" | "members" | "reports" | "privacy" | "terms"
interface Props { onNavigate: (p: Page) => void }

const sections: Record<string, { title: string; content: string }[]> = {
  fr: [
    {
      title: "1. Acceptation des Conditions",
      content: "En accedant a la plateforme SaveMali (https://www.savemali.online) et en utilisant nos services, vous reconnaissez avoir lu, compris et accepte d'etre lie par les presentes Conditions Generales d'Utilisation (CGU). Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser nos services. Ces conditions constituent un contrat legal entre vous et SaveMali SARL.",
    },
    {
      title: "2. Definition des Parties",
      content: "« SaveMali », « nous », « notre » designe SaveMali SARL, societe immatriculee en Republique Democratique du Congo, dont le siege social est situe a Kalemie, Province du Tanganyika. « Vous », « votre », « utilisateur » designe toute personne physique ou morale utilisant la plateforme. « Plateforme » designe l'ensemble des services web, mobiles et API fournis par SaveMali.",
    },
    {
      title: "3. Description des Services",
      content: "SaveMali est une plateforme ERP (Enterprise Resource Planning) tout-en-un proposant des modules de gestion pour les secteurs de la pharmacie, du commerce, de l'education, de la gestion d'entreprise et des ressources humaines. Les services comprennent : la gestion des stocks et inventaires, la gestion des ventes et achats, la comptabilite, la gestion des ressources humaines, la gestion scolaire, le reporting et l'analyse, et tout autre service que SaveMali pourra ajouter ulterieurement. Nous nous reservons le droit de modifier, suspendre ou interrompre tout ou partie de nos services a tout moment, moyennant preavis raisonnable.",
    },
    {
      title: "4. Inscription et Compte Utilisateur",
      content: "4.1. Pour acceder a nos services, vous devez creer un compte en fournissant des informations exactes, completes et a jour.\n4.2. Vous etes seul responsable de la confidentialite de vos identifiants de connexion (email et mot de passe).\n4.3. Vous etes responsable de toutes les activities effectuees sous votre compte.\n4.4. Vous devez nous informer immediatement de toute utilisation non autorisee de votre compte.\n4.5. Nous nous reservons le droit de refuser la creation d'un compte ou de le resilier sans preavis en cas de fausses informations ou de violation des presentes conditions.\n4.6. Le compte est personnel et non cessible sans notre accord ecrit prealable.",
    },
    {
      title: "5. Abonnements et Paiements",
      content: "5.1. Nos services sont fournis sur la base d'un abonnement payant, avec une periode d'essai gratuite le cas echeant.\n5.2. Les tarifs sont ceux en vigueur au moment de la souscription, consultables sur notre site.\n5.3. Le paiement est exige d'avance pour chaque periode d'abonnement (mensuelle ou annuelle).\n5.4. En cas de non-paiement, nous nous reservons le droit de suspendre ou resilier votre acces a la plateforme apres un delai de grace de 15 jours.\n5.5. Les remboursements sont accordes au cas par cas, conformement a notre politique de remboursement disponible sur demande.\n5.6. Les prix peuvent etre modifies moyennant un preavis de 30 jours. La modification n'affecte pas la periode d'abonnement en cours.",
    },
    {
      title: "6. Obligations de l'Utilisateur",
      content: "6.1. Vous vous engagez a utiliser la plateforme conformement aux lois et reglements applicables, notamment la legislation congolaise et le droit OHADA.\n6.2. Vous vous engagez a ne pas utiliser la plateforme a des fins illegales, frauduleuses ou non autorisees.\n6.3. Il est strictement interdit de :\n   (a) Tenter de contourner les mesures de securite de la plateforme\n   (b) Introduire des virus, chevaux de Troie ou tout code malveillant\n   (c) Acceder ou tenter d'acceder aux donnees d'autres utilisateurs\n   (d) Utiliser la plateforme pour envoyer des communications non sollicitees (spam)\n   (e) Copier, reproduire, vendre ou revendre nos services sans autorisation\n   (f) Utiliser la plateforme d'une maniere qui pourrait endommager, surcharger ou deteriorer nos infrastructures\n6.4. Vous etes responsable de la exactitude et de la legalite des donnees que vous saisissez dans la plateforme.",
    },
    {
      title: "7. Propriete Intellectuelle",
      content: "7.1. La plateforme SaveMali, y compris mais sans s'y limiter, son code source, son design, ses logos, ses marques, ses interfaces utilisateur et son contenu, est protegee par les droits de propriete intellectuelle (droits d'auteur, marques, brevets) conformement au droit congolais et aux traites internationaux.\n7.2. SaveMali vous accorde une licence non exclusive, non transferable et limitee dans le temps pour utiliser la plateforme conformement a ces conditions.\n7.3. Vous ne pouvez pas :\n   (a) Copier, modifier, distribuer, vendre ou louer tout ou partie de la plateforme\n   (b) Creer des oeuvres derivees basees sur la plateforme\n   (c) Decompiler, desassembler ou effectuer du reverse engineering\n   (d) Retirer les mentions de droits d'auteur ou de propriete intellectuelle\n7.4. Vous conservez la propriete intellectuelle des donnees que vous saisissez (contenu utilisateur). En nous les fournissant, vous nous accordez une licence mondiale, non exclusive et libre de redevance pour les heberger, stocker et traiter aux fins de la fourniture de nos services.",
    },
    {
      title: "8. Protection des Donnees et Confidentialite",
      content: "8.1. SaveMali traite vos donnees personnelles conformement a sa Politique de Confidentialite, qui fait partie integrante des presentes conditions.\n8.2. Vous reconnaissez que les donnees que vous saisissez dans la plateforme peuvent contenir des informations personnelles sur vos clients, employes, eleves ou autres tiers. Il vous incombe de vous assurer que vous disposez des autorisations necessaires pour collecter et traiter ces donnees.\n8.3. SaveMali agit en tant que sous-traitant pour les donnees que vous traitez via ses modules. Vous etes le responsable du traitement pour ces donnees.\n8.4. Nous mettons en oeuvre des mesures de securite techniques et organisationnelles conformes aux normes internationales pour proteger vos donnees.",
    },
    {
      title: "9. Conformite OHADA et Fiscale",
      content: "9.1. SaveMali s'efforce de garantir la conformite de ses modules comptables avec le Plan Comptable General de l'OHADA.\n9.2. Il vous incombe de verifier que les rapports et exports generes par la plateforme repondent a vos obligations legales et reglementaires specifiques.\n9.3. SaveMali ne fournit pas de conseil juridique, comptable ou fiscal. Nous vous recommandons de consulter un professionnel qualifie pour vous assurer de votre conformite.\n9.4. Les donnees comptables et financieres sont conservees conformement aux durees legales de prescription (10 ans) conformement au droit comptable et fiscal congolais.",
    },
    {
      title: "10. Garanties et Limitation de Responsabilite",
      content: "10.1. La plateforme est fournie « en l'etat » et « selon disponibilite », sans garantie explicite ou implicite, sauf disposition legale imperatives contraire.\n10.2. SaveMali s'efforce d'assurer une disponibilite de la plateforme de 99.9% (hors maintenance planifiee et cas de force majeure).\n10.3. SaveMali ne saurait etre tenu responsable :\n   (a) Des dommages indirects, accessoires ou consecutifs (perte de donnees, perte de revenus, interruption d'activite)\n   (b) Des actes de tiers, y compris lesattaques informatiques ou piratages malgre les mesures de securite mises en place\n   (c) De l'utilisation non conforme de la plateforme par l'utilisateur\n   (d) Des erreurs ou omissions dans les donnees saisies par l'utilisateur\n10.4. Dans tous les cas, la responsabilite totale de SaveMali est limitee au montant total des frais payes par vous au cours des 12 mois precedant le fait generateur du dommage.\n10.5. Les limitations de responsabilite ne s'appliquent pas en cas de dol, faute lourde, dommages corporels ou violation de la reglementation sur la protection des donnees.",
    },
    {
      title: "11. Suspension et Resiliation",
      content: "11.1. Vous pouvez resilier votre compte a tout moment en nous contactant. La resiliation prend effet a la fin de la periode d'abonnement en cours.\n11.2. SaveMali peut suspendre ou resilier votre acces a la plateforme sans preavis en cas de :\n   (a) Violation des presentes conditions\n   (b) Non-paiement de votre abonnement apres le delai de grace\n   (c) Utilisation frauduleuse ou illegale de la plateforme\n   (d) Injonction judiciaire ou reglementaire\n11.3. En cas de resiliation, nous vous donnerons acces a vos donnees pendant 30 jours pour faciliter leur exportation. Passe ce delai, vos donnees seront definitivement supprimees, sauf obligation legale de conservation.\n11.4. Les dispositions qui, par leur nature, doivent survivre a la resiliation (propriete intellectuelle, limitation de responsabilite, confidentialite) restent en vigueur.",
    },
    {
      title: "12. Force Majeure",
      content: "SaveMali ne saurait etre tenu responsable de tout manquement a ses obligations au titre des presentes conditions si ce manquement est du a un evenement de force majeure tel que defini par la jurisprudence congolaise et le droit commun des contrats OHADA, notamment : catastrophes naturelles, pandemies, guerres, emeutes, greves, actes de terrorisme, pannes de reseau electrique ou de telecommunications independantes de notre controle.",
    },
    {
      title: "13. Loi Applicable et Juridiction",
      content: "13.1. Les presentes conditions sont regies par le droit de la Republique Democratique du Congo et, le cas echeant, par le droit OHADA.\n13.2. Tout litige relatif aux presentes conditions sera soumis a la competence exclusive des tribunaux de Kalemie, Republique Democratique du Congo.\n13.3. Avant tout recours judiciaire, les parties s'efforceront de resoudre le differend a l'amiable dans un delai de 30 jours a compter de la notification ecrite du litige.",
    },
    {
      title: "14. Dispositions Generales",
      content: "14.1. Les presentes conditions constituent l'integralite de l'accord entre vous et SaveMali concernant l'utilisation de la plateforme.\n14.2. Si une disposition des presentes conditions est jugee invalide ou inapplicable par un tribunal competent, les autres dispositions restent en pleine vigueur.\n14.3. Le fait pour SaveMali de ne pas exercer un droit en vertu des presentes conditions ne constitue pas une renonciation a ce droit.\n14.4. Vous ne pouvez pas ceder vos droits ou obligations au titre des presentes conditions sans notre consentement ecrit prealable.\n14.5. Nous pouvons ceder nos droits et obligations a une entite liee ou dans le cadre d'une fusion, acquisition ou vente de tout ou partie de nos actifs.",
    },
    {
      title: "15. Modifications des Conditions",
      content: "SaveMali peut modifier les presentes conditions a tout moment. Les modifications prennent effet des leur publication sur la plateforme. En cas de modification substantielle, nous vous en informerons par email ou via une notification sur la plateforme au moins 30 jours avant l'entree en vigueur. Votre utilisation continue de la plateforme apres les modifications constitue votre acceptation des nouvelles conditions. Si vous n'acceptez pas les modifications, vous pouvez resilier votre compte avant leur entree en vigueur.",
    },
    {
      title: "16. Contact et Support",
      content: "Pour toute question, reclame ou assistance relative a ces conditions ou a nos services :\n\n- Support technique : support@savemali.com\n- WhatsApp : +243 857 599 332\n- Adresse : SaveMali SARL, Quartier Abbatoir, Avenue Cadastre N°321, Kalemie, Province du Tanganyika, Republique Democratique du Congo\n\nNotre equipe de support est disponible du lundi au vendredi de 8h a 18h (heure de Kalemie).",
    },
  ],
  en: [
    {
      title: "1. Acceptance of Terms",
      content: "By accessing the SaveMali platform (https://www.savemali.online) and using our services, you acknowledge that you have read, understood, and agree to be bound by these Terms of Use. If you do not accept these terms, please do not use our services. These terms constitute a legal contract between you and SaveMali SARL.",
    },
    {
      title: "2. Definition of Parties",
      content: '"SaveMali", "we", "us", "our" refers to SaveMali SARL, a company registered in the Democratic Republic of Congo, with its registered office in Kalemie, Tanganyika Province. "You", "your", "user" refers to any individual or legal entity using the platform. "Platform" refers to all web, mobile and API services provided by SaveMali.',
    },
    {
      title: "3. Service Description",
      content: "SaveMali is an all-in-one ERP (Enterprise Resource Planning) platform offering management modules for the pharmacy, commerce, education, business management, and human resources sectors. Services include: inventory and stock management, sales and purchasing management, accounting, human resources management, school management, reporting and analytics, and any other service that SaveMali may add later. We reserve the right to modify, suspend, or discontinue any or all of our services at any time, with reasonable notice.",
    },
    {
      title: "4. Registration and User Account",
      content: "4.1. To access our services, you must create an account by providing accurate, complete and up-to-date information.\n4.2. You are solely responsible for the confidentiality of your login credentials (email and password).\n4.3. You are responsible for all activities under your account.\n4.4. You must immediately notify us of any unauthorized use of your account.\n4.5. We reserve the right to refuse account creation or terminate it without notice in case of false information or violation of these terms.\n4.6. The account is personal and non-transferable without our prior written consent.",
    },
    {
      title: "5. Subscriptions and Payments",
      content: "5.1. Our services are provided on a paid subscription basis, with a free trial period where applicable.\n5.2. Prices are those in effect at the time of subscription, as displayed on our website.\n5.3. Payment is required in advance for each subscription period (monthly or annual).\n5.4. In case of non-payment, we reserve the right to suspend or terminate your access to the platform after a 15-day grace period.\n5.5. Refunds are granted on a case-by-case basis, in accordance with our refund policy available upon request.\n5.6. Prices may be changed with 30 days' notice. The change does not affect the current subscription period.",
    },
    {
      title: "6. User Obligations",
      content: "6.1. You agree to use the platform in accordance with applicable laws and regulations, including Congolese law and OHADA law.\n6.2. You agree not to use the platform for illegal, fraudulent or unauthorized purposes.\n6.3. It is strictly forbidden to:\n   (a) Attempt to bypass the platform's security measures\n   (b) Introduce viruses, trojans or any malicious code\n   (c) Access or attempt to access other users' data\n   (d) Use the platform to send unsolicited communications (spam)\n   (e) Copy, reproduce, sell or resell our services without authorization\n   (f) Use the platform in a way that could damage, overload or impair our infrastructure\n6.4. You are responsible for the accuracy and legality of the data you enter into the platform.",
    },
    {
      title: "7. Intellectual Property",
      content: "7.1. The SaveMali platform, including but not limited to its source code, design, logos, trademarks, user interfaces and content, is protected by intellectual property rights (copyright, trademarks, patents) in accordance with Congolese law and international treaties.\n7.2. SaveMali grants you a non-exclusive, non-transferable, time-limited license to use the platform in accordance with these terms.\n7.3. You may not:\n   (a) Copy, modify, distribute, sell or rent any part of the platform\n   (b) Create derivative works based on the platform\n   (c) Decompile, disassemble or reverse engineer\n   (d) Remove copyright or intellectual property notices\n7.4. You retain intellectual property rights to the data you enter (user content). By providing it, you grant us a worldwide, non-exclusive, royalty-free license to host, store and process it for the purpose of providing our services.",
    },
    {
      title: "8. Data Protection and Privacy",
      content: "8.1. SaveMali processes your personal data in accordance with its Privacy Policy, which forms an integral part of these terms.\n8.2. You acknowledge that the data you enter into the platform may contain personal information about your customers, employees, students or other third parties. It is your responsibility to ensure you have the necessary authorizations to collect and process this data.\n8.3. SaveMali acts as a data processor for data you process through its modules. You are the data controller for this data.\n8.4. We implement technical and organizational security measures in accordance with international standards to protect your data.",
    },
    {
      title: "9. OHADA and Tax Compliance",
      content: "9.1. SaveMali strives to ensure compliance of its accounting modules with the OHADA General Accounting Plan.\n9.2. It is your responsibility to verify that the reports and exports generated by the platform meet your specific legal and regulatory obligations.\n9.3. SaveMali does not provide legal, accounting or tax advice. We recommend consulting a qualified professional to ensure your compliance.\n9.4. Accounting and financial data are retained in accordance with statutory limitation periods (10 years) in compliance with Congolese accounting and tax law.",
    },
    {
      title: "10. Warranties and Limitation of Liability",
      content: '10.1. The platform is provided "as is" and "as available", without express or implied warranty, except as required by applicable law.\n10.2. SaveMali strives to ensure 99.9% platform availability (excluding planned maintenance and force majeure events).\n10.3. SaveMali shall not be liable for:\n   (a) Indirect, incidental or consequential damages (data loss, loss of revenue, business interruption)\n   (b) Acts of third parties, including cyberattacks or hacking despite implemented security measures\n   (c) Improper use of the platform by the user\n   (d) Errors or omissions in data entered by the user\n10.4. In all cases, SaveMali\'s total liability is limited to the total amount of fees paid by you in the 12 months preceding the event giving rise to the damage.\n10.5. Liability limitations do not apply in cases of fraud, gross negligence, bodily injury, or violation of data protection regulations.',
    },
    {
      title: "11. Suspension and Termination",
      content: "11.1. You may terminate your account at any time by contacting us. Termination takes effect at the end of the current subscription period.\n11.2. SaveMali may suspend or terminate your access to the platform without notice in case of:\n   (a) Violation of these terms\n   (b) Non-payment of your subscription after the grace period\n   (c) Fraudulent or illegal use of the platform\n   (d) Judicial or regulatory order\n11.3. Upon termination, we will provide you access to your data for 30 days to facilitate export. After this period, your data will be permanently deleted, unless legally required to retain it.\n11.4. Provisions that by their nature should survive termination (intellectual property, limitation of liability, confidentiality) remain in effect.",
    },
    {
      title: "12. Force Majeure",
      content: "SaveMali shall not be liable for any failure to perform its obligations under these terms if such failure is due to a force majeure event as defined by Congolese case law and OHADA contract law, including: natural disasters, pandemics, wars, riots, strikes, acts of terrorism, power or telecommunications outages beyond our control.",
    },
    {
      title: "13. Governing Law and Jurisdiction",
      content: "13.1. These terms are governed by the laws of the Democratic Republic of Congo and, where applicable, by OHADA law.\n13.2. Any dispute relating to these terms shall be subject to the exclusive jurisdiction of the courts of Kalemie, Democratic Republic of Congo.\n13.3. Before any legal proceedings, the parties shall attempt to resolve the dispute amicably within 30 days of written notice of the dispute.",
    },
    {
      title: "14. General Provisions",
      content: "14.1. These terms constitute the entire agreement between you and SaveMali regarding the use of the platform.\n14.2. If any provision of these terms is found to be invalid or unenforceable by a competent court, the remaining provisions remain in full force and effect.\n14.3. SaveMali's failure to enforce a right under these terms does not constitute a waiver of that right.\n14.4. You may not assign your rights or obligations under these terms without our prior written consent.\n14.5. We may assign our rights and obligations to a related entity or in connection with a merger, acquisition, or sale of all or part of our assets.",
    },
    {
      title: "15. Modifications to Terms",
      content: "SaveMali may modify these terms at any time. Changes take effect upon publication on the platform. In the event of a material change, we will notify you by email or via an in-app notification at least 30 days before the change takes effect. Your continued use of the platform after modifications constitutes your acceptance of the new terms. If you do not accept the changes, you may terminate your account before they take effect.",
    },
    {
      title: "16. Contact and Support",
      content: "For any questions, complaints or assistance regarding these terms or our services:\n\n- Technical support: support@savemali.com\n- WhatsApp: +243 857 599 332\n- Address: SaveMali SARL, Abbatoir Quarter, Cadastre Avenue N°321, Kalemie, Tanganyika Province, Democratic Republic of Congo\n\nOur support team is available Monday through Friday from 8:00 AM to 6:00 PM (Kalemie time).",
    },
  ],
}

export function TermsPage({ onNavigate }: Props) {
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
            <FileText className="size-8" />
            <div>
              <h1 className="text-2xl font-bold">{fr ? "Conditions Generales d'Utilisation" : "Terms of Use"}</h1>
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
