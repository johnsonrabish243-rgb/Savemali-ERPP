import { Helmet } from "react-helmet-async"
import type { Page } from "@/App"

export interface PageMeta {
  title: string
  description: string
  titleEn: string
  descriptionEn: string
  ogImage?: string
  noIndex?: boolean
  canonical?: string
}

const getBaseUrl = () => {
  if (typeof window !== "undefined") return window.location.origin
  return "https://www.savemali.online"
}

const BASE_URL = getBaseUrl()

const pageMeta: Record<string, PageMeta> = {
  home: {
    title: "SaveMali — Gérez mieux, progressez plus",
    description: "SaveMali est une plateforme ERP gratuite tout-en-un pour gérer pharmacie, commerce, école, entreprise et RH.",
    titleEn: "SaveMali — Manage better, progress more",
    descriptionEn: "SaveMali is a free all-in-one ERP platform for managing pharmacy, commerce, school, business and HR.",
  },
  about: {
    title: "À propos de SaveMali — ERP gratuit",
    description: "Découvrez SaveMali, la plateforme ERP gratuite créée par John Mocket & JVisionLab pour les entreprises africaines.",
    titleEn: "About SaveMali — Free ERP",
    descriptionEn: "Discover SaveMali, the free ERP platform built by John Mocket & JVisionLab for African businesses.",
  },
  contact: {
    title: "Contact — SaveMali",
    description: "Contactez l'équipe SaveMali par email, WhatsApp ou formulaire. Support technique disponible du lundi au vendredi.",
    titleEn: "Contact — SaveMali",
    descriptionEn: "Contact the SaveMali team by email, WhatsApp or form. Technical support available Monday to Friday.",
  },
  "contact-rdv": {
    title: "Contact & Rendez-vous — SaveMali",
    description: "Prenez rendez-vous avec l'équipe SaveMali pour une démonstration personnalisée ou contactez notre support technique.",
    titleEn: "Contact & Appointment — SaveMali",
    descriptionEn: "Book an appointment with the SaveMali team for a personalized demo or contact our technical support.",
  },
  privacy: {
    title: "Politique de confidentialité — SaveMali",
    description: "Consultez la politique de confidentialité de SaveMali concernant la collecte, l'utilisation et la protection de vos données personnelles.",
    titleEn: "Privacy Policy — SaveMali",
    descriptionEn: "Read the SaveMali privacy policy regarding the collection, use and protection of your personal data.",
  },
  terms: {
    title: "Conditions d'utilisation — SaveMali",
    description: "Consultez les conditions générales d'utilisation de la plateforme SaveMali ERP.",
    titleEn: "Terms of Service — SaveMali",
    descriptionEn: "Read the SaveMali ERP platform terms and conditions of use.",
  },
  "landing-education": {
    title: "Module Éducation — SaveMali ERP gratuit",
    description: "Gérez votre établissement scolaire avec SaveMali : inscriptions, notes, bulletins, emplois du temps, communications parents.",
    titleEn: "Education Module — SaveMali Free ERP",
    descriptionEn: "Manage your school with SaveMali: enrollments, grades, report cards, schedules, parent communications.",
  },
  "landing-pharmacy": {
    title: "Module Pharmacie — SaveMali ERP gratuit",
    description: "Gérez votre pharmacie avec SaveMali : catalogue médicaments, ordonnances, ventes, alertes péremption, fournisseurs.",
    titleEn: "Pharmacy Module — SaveMali Free ERP",
    descriptionEn: "Manage your pharmacy with SaveMali: medicine catalog, prescriptions, sales, expiry alerts, suppliers.",
  },
  "landing-commerce": {
    title: "Module Commerce — SaveMali ERP gratuit",
    description: "Gérez votre commerce avec SaveMali : caisse enregistreuse, produits, ventes, stocks, fidélité clients, tableau de bord.",
    titleEn: "Commerce Module — SaveMali Free ERP",
    descriptionEn: "Manage your business with SaveMali: cash register, products, sales, inventory, customer loyalty, dashboard.",
  },
  "landing-gestion": {
    title: "Module Gestion — SaveMali ERP gratuit",
    description: "Gérez votre entreprise avec SaveMali : comptabilité, paie, reporting, analytiques, multi-sites.",
    titleEn: "Management Module — SaveMali Free ERP",
    descriptionEn: "Manage your business with SaveMali: accounting, payroll, reporting, analytics, multi-site.",
  },
  "landing-hr": {
    title: "Module RH — SaveMali ERP gratuit",
    description: "Gérez vos ressources humaines avec SaveMali : employés, présences, congés, contrats, tâches, paie.",
    titleEn: "HR Module — SaveMali Free ERP",
    descriptionEn: "Manage your human resources with SaveMali: employees, attendance, leave, contracts, tasks, payroll.",
  },
  signin: {
    title: "Connexion — SaveMali",
    description: "Connectez-vous à votre espace SaveMali pour accéder à vos modules de gestion.",
    titleEn: "Sign In — SaveMali",
    descriptionEn: "Sign in to your SaveMali workspace to access your management modules.",
    noIndex: true,
  },
  signup: {
    title: "Inscription — SaveMali",
    description: "Créez votre compte SaveMali gratuitement et accédez à tous les modules ERP.",
    titleEn: "Sign Up — SaveMali",
    descriptionEn: "Create your free SaveMali account and access all ERP modules.",
    noIndex: true,
  },
  "reset-password": {
    title: "Réinitialisation mot de passe — SaveMali",
    description: "Réinitialisez votre mot de passe SaveMali.",
    titleEn: "Reset Password — SaveMali",
    descriptionEn: "Reset your SaveMali password.",
    noIndex: true,
  },
}

const SITE_NAME = "SaveMali"
const DEFAULT_OG_IMAGE = `${BASE_URL}/SaveMali_Logo.png`
const AUTHOR = "John Mocket & JVisionLab"

interface SeoHeadProps {
  page: Page
  lang?: string
  overrideMeta?: Partial<PageMeta>
}

export function SeoHead({ page, lang = "fr", overrideMeta }: SeoHeadProps) {
  const base = pageMeta[page]
  if (!base) return null

  const meta = { ...base, ...overrideMeta }
  const isFr = lang === "fr"
  const title = isFr ? meta.title : meta.titleEn
  const description = isFr ? meta.description : meta.descriptionEn
  const canonical = meta.canonical || `${BASE_URL}/#/${page}`
  const ogImage = meta.ogImage || DEFAULT_OG_IMAGE
  const alternateUrl = `${BASE_URL}/#/${page}`

  return (
    <Helmet>
      <html lang={lang} />
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />

      {meta.noIndex && <meta name="robots" content="noindex, nofollow" />}
      {!meta.noIndex && <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />}

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1254" />
      <meta property="og:image:height" content="1254" />
      <meta property="og:locale" content={isFr ? "fr_CD" : "en_US"} />
      <meta property="og:locale:alternate" content={isFr ? "en_US" : "fr_CD"} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@savemali" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      <link rel="alternate" hrefLang="fr" href={`${BASE_URL}/#/${page}`} />
      <link rel="alternate" hrefLang="en" href={`${BASE_URL}/#/${page}`} />
      <link rel="alternate" hrefLang="x-default" href={`${BASE_URL}/#/${page}`} />

      <meta name="application-name" content={SITE_NAME} />
      <meta name="author" content={AUTHOR} />
      <meta name="google-site-verification" content="0b6JySvn3UbAOOk45wMN6Dz_7v3Yd1sERymW2s_C5ac" />
    </Helmet>
  )
}

export function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "SaveMali SARL",
    alternateName: "SaveMali",
    url: BASE_URL,
    logo: `${BASE_URL}/SaveMali_Logo.png`,
    description: "Plateforme ERP gratuite tout-en-un pour les entreprises africaines.",
    foundingDate: "2024",
    founders: [
      { "@type": "Person", name: "John Mocket" },
    ],
    address: {
      "@type": "PostalAddress",
      streetAddress: "Quartier Abbatoir, Avenue Cadastre N°321",
      addressLocality: "Kalemie",
      addressRegion: "Tanganyika",
      addressCountry: "CD",
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: "+243-857-599-332",
        contactType: "support",
        email: "support@savemali.online",
        availableLanguage: ["French", "English"],
      },
    ],
    sameAs: [
      "https://www.savemali.online",
    ],
  }
  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  )
}

export function WebSiteSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "SaveMali",
    url: BASE_URL,
    description: "Plateforme ERP gratuite tout-en-un pour les entreprises africaines.",
    inLanguage: ["fr", "en"],
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/#/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  }
  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  )
}

export function SoftwareApplicationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "SaveMali",
    operatingSystem: "Web",
    applicationCategory: "BusinessApplication",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description: "Plateforme ERP gratuite tout-en-un pour la gestion de pharmacie, commerce, éducation, entreprise et ressources humaines.",
    author: {
      "@type": "Person",
      name: "John Mocket",
    },
  }
  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  )
}

export function BreadcrumbSchema({ items }: { items: { name: string; nameEn: string; url: string }[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${BASE_URL}${item.url}`,
    })),
  }
  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  )
}

export function FaqSchema({ questions }: { questions: { question: string; answer: string }[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: q.answer,
      },
    })),
  }
  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  )
}

export function ContactPageSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contact SaveMali",
    url: `${BASE_URL}/#/contact-rdv`,
    description: "Page de contact et de prise de rendez-vous avec l'équipe SaveMali.",
    mainEntity: {
      "@type": "Organization",
      name: "SaveMali SARL",
      telephone: "+243-857-599-332",
      email: "support@savemali.online",
    },
  }
  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  )
}

export function generateSitemapXml(): string {
  const publicPages = Object.keys(pageMeta).filter((p) => !pageMeta[p].noIndex)
  const urls = publicPages.map((page) => {
    const meta = pageMeta[page]
    const freq = page === "home" ? "weekly" : "monthly"
    const priority = page === "home" ? "1.0" : "0.8"
    return `
  <url>
    <loc>${BASE_URL}/#/${page}</loc>
    <lastmod>2026-07-11</lastmod>
    <changefreq>${freq}</changefreq>
    <priority>${priority}</priority>
    <xhtml:link rel="alternate" hreflang="fr" href="${BASE_URL}/#/${page}" />
    <xhtml:link rel="alternate" hreflang="en" href="${BASE_URL}/#/${page}" />
  </url>`
  }).join("")

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls}
</urlset>`
}

export const PUBLIC_PAGES = Object.keys(pageMeta).filter((p) => !pageMeta[p].noIndex) as Page[]
export { pageMeta, BASE_URL }
