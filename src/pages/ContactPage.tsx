import * as React from "react"
import { gsap } from "gsap"
import { Mail, MapPin, MessageSquare, ArrowRight, Send, Loader2, CheckCircle, AlertTriangle } from "lucide-react"
import { Logo } from "@/components/Logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useLanguage } from "@/lib/i18n"
import { SeoHead } from "@/lib/seo"
import { useAuth } from "@/hooks/use-auth"
import { createSupportTicket } from "@/lib/support"
import { sanitizeStrict, detectInjection } from "@/lib/security"
import { checkApiRateLimit } from "@/lib/security"
import { toast } from "sonner"
import type { Page } from "@/App"

interface Props { onNavigate: (page: Page) => void }

const CATEGORIES = [
  { value: "general", fr: "Question generale", en: "General question" },
  { value: "technical", fr: "Probleme technique", en: "Technical issue" },
  { value: "billing", fr: "Facturation", en: "Billing" },
  { value: "account", fr: "Compte & connexion", en: "Account & login" },
  { value: "feature", fr: "Proposition de fonctionnalite", en: "Feature request" },
  { value: "bug", fr: "Rapport de bug", en: "Bug report" },
  { value: "other", fr: "Autre", en: "Other" },
]

export function ContactPage({ onNavigate }: Props) {
  const { lang } = useLanguage()
  const { user } = useAuth()
  const fr = lang === "fr"
  const ref = React.useRef<HTMLDivElement>(null)
  const [form, setForm] = React.useState({ name: "", email: "", category: "general", subject: "", message: "" })
  const [sending, setSending] = React.useState(false)
  const [sent, setSent] = React.useState(false)
  const [ticketNum, setTicketNum] = React.useState("")
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    if (user?.email) setForm((p) => ({ ...p, email: user.email ?? "", name: user.email?.split("@")[0] ?? "" }))
  }, [user])

  React.useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".contact-hero", { opacity: 0, y: 30, duration: 0.6, ease: "power3.out" })
      gsap.from(".contact-form", { opacity: 0, y: 20, duration: 0.5, ease: "power2.out", delay: 0.2 })
      gsap.from(".contact-info", { opacity: 0, x: 30, duration: 0.5, ease: "power2.out", scrollTrigger: { trigger: ".contact-info", start: "top 85%" } })
    }, ref)
    return () => ctx.revert()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const name = sanitizeStrict(form.name, 100)
    const email = sanitizeStrict(form.email, 200)
    const subject = sanitizeStrict(form.subject, 200)
    const message = sanitizeStrict(form.message, 5000)

    if (!name || !email || !subject || !message) {
      setError(fr ? "Veuillez remplir tous les champs obligatoires." : "Please fill in all required fields.")
      return
    }

    if (detectInjection(name) || detectInjection(subject) || detectInjection(message)) {
      setError(fr ? "Entree suspectee. Veuillez reformuler votre message." : "Suspicious input detected. Please rephrase.")
      return
    }

    const rateCheck = checkApiRateLimit("contact-form", 5, 60000)
    if (!rateCheck.allowed) {
      setError(fr ? "Trop de demandes. Veuillez patienter." : "Too many requests. Please wait.")
      return
    }

    setSending(true)
    const result = await createSupportTicket({
      category: form.category,
      subject,
      message,
      created_by_email: email,
      created_by_name: name,
      priority: "normal",
    })

    if (result.error) {
      setError(result.error)
      setSending(false)
      return
    }

    setTicketNum(result.ticketNumber || "")
    setSent(true)
    setSending(false)
    toast.success(fr ? "Message envoye avec succes!" : "Message sent successfully!")
  }

  const info = [
    { icon: Mail, label: "Email", value: "support@savemali.online" },
    { icon: MapPin, label: fr ? "Adresse" : "Address", value: fr ? "Quartier Abbatoir, Avenue Cadastre N°321, Kalemie, Tanganyika, RDC" : "Abbatoir Quarter, Cadastre Avenue N°321, Kalemie, Tanganyika, DRC" },
    { icon: MessageSquare, label: "WhatsApp", value: "+243 857 599 332" },
  ]

  return (
    <div ref={ref} className="flex flex-col">
      <SeoHead page="contact" lang={lang} />
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
            {fr ? "Une question, un probleme technique ? Notre equipe est la pour vous aider." : "A question or technical issue? Our team is here to help."}
          </p>
        </div>
      </section>

      <section className="bg-surface py-16 sm:py-24 lg:py-[96px]">
        <div className="ag-container">
          <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-5">
            {/* Form */}
            <div className="contact-form lg:col-span-3">
              {sent ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-card p-10 text-center">
                  <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                    <CheckCircle className="size-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    {fr ? "Message envoye avec succes !" : "Message sent successfully!"}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {fr ? "Votre numero de ticket :" : "Your ticket number:"}
                  </p>
                  <p className="text-lg font-mono font-bold text-brand mb-4">{ticketNum}</p>
                  <p className="text-sm text-muted-foreground mb-6">
                    {fr ? "Vous recevrez un email de confirmation sous peu." : "You will receive a confirmation email shortly."}
                  </p>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => { setSent(false); setForm({ name: "", email: "", category: "general", subject: "", message: "" }) }}>
                      {fr ? "Nouveau message" : "New message"}
                    </Button>
                    <Button onClick={() => onNavigate("home")}>
                      {fr ? "Accueil" : "Home"}
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="flex items-start gap-2.5 rounded-lg bg-destructive/10 p-3.5 text-sm text-destructive">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="name">{fr ? "Nom complet" : "Full name"} *</Label>
                      <Input id="name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder={fr ? "Votre nom" : "Your name"} required className="h-10 rounded-lg" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email *</Label>
                      <Input id="email" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="votre@email.com" required className="h-10 rounded-lg" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="category">{fr ? "Categorie" : "Category"} *</Label>
                    <select id="category" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{fr ? c.fr : c.en}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="subject">{fr ? "Sujet" : "Subject"} *</Label>
                    <Input id="subject" value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} placeholder={fr ? "Resume de votre demande" : "Summary of your request"} required className="h-10 rounded-lg" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="message">{fr ? "Message" : "Message"} *</Label>
                    <textarea id="message" rows={5} value={form.message} onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} placeholder={fr ? "Decrivez votre demande en details..." : "Describe your request in detail..."} required className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y min-h-[120px]" />
                  </div>
                  <Button type="submit" disabled={sending} className="w-full gap-2 h-11 rounded-xl">
                    {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    {sending ? (fr ? "Envoi en cours..." : "Sending...") : (fr ? "Envoyer le message" : "Send message")}
                  </Button>
                </form>
              )}
            </div>

            {/* Info sidebar */}
            <div className="contact-info lg:col-span-2 space-y-8">
              <h2 className="text-2xl font-bold tracking-[-0.8px] text-text-heading sm:text-3xl">
                {fr ? "Nos coordonnees" : "Our details"}
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
              <div className="rounded-xl border border-border/60 bg-card p-5">
                <h3 className="text-sm font-semibold text-foreground mb-2">
                  {fr ? "Horaires d'assistance" : "Support hours"}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {fr ? "Lundi-Vendredi : 8h00 - 18h00 (heure de Kalemie)" : "Monday-Friday: 8:00 AM - 6:00 PM (Kalemie time)"}
                </p>
              </div>
              <div className="pt-4">
                <button className="ag-btn-ghost gap-2" onClick={() => onNavigate("home")}>
                  <ArrowRight className="size-4" /> {fr ? "Retour a l'accueil" : "Back to home"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="ag-footer">
        <div className="ag-container text-center">
          <div className="mb-4 flex justify-center"><Logo imgClassName="h-10 brightness-0 invert" /></div>
          <p className="text-xs text-[#71717a]">&copy; {new Date().getFullYear()} SaveMali {fr ? "SARL" : "LLC"} — {fr ? "Developpe par John Mocket" : "Developed by John Mocket"}</p>
        </div>
      </footer>
    </div>
  )
}
