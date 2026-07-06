import * as React from "react"
import { GraduationCap, BookOpen, Users, ClipboardCheck, Calendar, ClipboardList, MessageSquare } from "lucide-react"
import { useLanguage } from "@/lib/i18n"
import { Logo } from "@/components/Logo"
import { SpiralButton } from "@/components/SpiralButton"

type Page = "home" | "education" | "pharmacy" | "commerce" | "gestion" | "dashboard" | "signin" | "signup"
interface Props { onNavigate: (page: Page) => void }

export function EducationLandingPage({ onNavigate }: Props) {
  const { lang, t } = useLanguage()
  const fr = lang === "fr"

  const features = [
    { icon: Users, title: fr ? "Gestion des élèves" : "Student Management", desc: fr ? "Inscriptions, dossiers, contacts parents, suivi des paiements de scolarité et historique académique complet." : "Enrollment, records, parent contacts, tuition payment tracking and complete academic history." },
    { icon: BookOpen, title: fr ? "Enseignants & cours" : "Teachers & Classes", desc: fr ? "Planifiez les emplois du temps, assignez les enseignants aux classes et gérez les programmes pédagogiques." : "Schedule timetables, assign teachers to classes and manage curriculum programs." },
    { icon: ClipboardCheck, title: fr ? "Présences automatisées" : "Automated Attendance", desc: fr ? "Enregistrez les présences, absences et retards en un clic. Alertes automatiques aux parents." : "Record attendance, absences and lateness with one click. Automatic alerts to parents." },
    { icon: ClipboardList, title: fr ? "Notes & bulletins" : "Grades & Report Cards", desc: fr ? "Saisissez les notes, générez les bulletins automatiquement et suivez la progression de chaque élève." : "Enter grades, generate report cards automatically and track each student's progress." },
    { icon: Calendar, title: fr ? "Emplois du temps" : "Timetables", desc: fr ? "Créez et gérez les emplois du temps de votre établissement. Vue par classe, enseignant ou salle." : "Create and manage your school timetables. View by class, teacher or room." },
    { icon: MessageSquare, title: fr ? "Communication parents" : "Parent Communication", desc: fr ? "Notifications automatiques, bulletins en ligne, messagerie directe avec les familles." : "Automatic notifications, online report cards, direct messaging with families." },
  ]

  return (
    <div className="flex flex-col min-h-svh bg-background">

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 pb-16 pt-20 sm:pb-20 sm:pt-28 lg:pb-28 lg:pt-36">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/4 w-[800px] h-[800px] rounded-full bg-white/5 blur-[120px]" />
          <div className="absolute -bottom-1/3 -right-1/4 w-[600px] h-[600px] rounded-full bg-white/5 blur-[100px]" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm">
            <GraduationCap className="size-3" />
            {t.modules.education.title}
          </div>
          <h1 className="mx-auto max-w-4xl text-4xl font-bold leading-[1] tracking-[-0.8px] text-white text-balance sm:text-5xl md:text-6xl">
            {fr ? "La gestion scolaire simplifiée" : "School management simplified"}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-[1.7] text-white/80 sm:text-xl">
            {fr ? "Gérez vos élèves, enseignants, emplois du temps, notes et présences depuis une seule plateforme intuitive." : "Manage your students, teachers, timetables, grades and attendance from a single intuitive platform."}
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
            <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-blue-600/20 bg-blue-50 dark:bg-blue-950 px-4 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400">
              {fr ? "À propos du module" : "About this module"}
            </div>
            <h2 className="text-3xl font-bold tracking-[-0.8px] text-foreground text-balance sm:text-4xl lg:text-[44px] lg:leading-[1.15]">
              {fr ? "Tout pour votre établissement" : "Everything for your school"}
            </h2>
            <p className="mx-auto mt-5 max-w-3xl text-lg leading-[1.7] text-muted-foreground sm:text-xl">
              {fr ? "SaveMali Éducation simplifie l'administration scolaire avec des outils modernes pour la gestion des élèves, enseignants, notes et présences." : "SaveMali Education simplifies school administration with modern tools for managing students, teachers, grades and attendance."}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feat, i) => (
              <div key={i} className="group rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:border-blue-600/30 hover:shadow-md">
                <div className="mb-5 flex size-10 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950">
                  <feat.icon className="size-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="mb-2 text-base font-semibold text-foreground">{feat.title}</h3>
                <p className="text-sm leading-[1.6] text-muted-foreground">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ CTA ═══════════ */}
      <section className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold tracking-[-0.8px] text-white text-balance sm:text-4xl lg:text-[44px] lg:leading-[1.15]">
            {fr ? "Prêt à moderniser votre école ?" : "Ready to modernize your school?"}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-[1.7] text-white/80 sm:text-xl">
            {fr ? "Rejoignez des centaines d'établissements scolaires en RDC." : "Join hundreds of schools in the DRC."}
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
