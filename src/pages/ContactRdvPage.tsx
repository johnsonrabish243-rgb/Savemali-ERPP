import * as React from "react"
import { Calendar, Clock, Phone, Mail, MapPin, Globe, ChevronRight, Loader2, Check, X, AlertTriangle, MessageSquare, Shield, ChevronDown, ChevronUp, CalendarDays, Video, Building2, User, Upload, FileText, Search, ArrowUpDown, Filter, CreditCard, Smartphone, Laptop, Plus, Minus, ExternalLink, CheckCircle2, XCircle, Clock as ClockIcon, HelpCircle, BookOpen, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useLanguage } from "@/lib/i18n"
import { useAuth } from "@/hooks/use-auth"
import { insforge } from "@/lib/supabase"
import { sendEmail } from "@/lib/email"
import { sanitizeStrict, detectInjection, checkApiRateLimit } from "@/lib/security"
import { submitContactMessage, createAppointment, cancelAppointment, getUserAppointments, isWithinBusinessHours } from "@/lib/rdv"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { PageFooter } from "@/components/PageFooter"
import type { Page } from "@/App"

interface Props { onNavigate: (p: Page) => void }

const categories = [
  { value: "support", label: { fr: "Support technique", en: "Technical Support" } },
  { value: "commercial", label: { fr: "Information commerciale", en: "Business Info" } },
  { value: "billing", label: { fr: "Facturation", en: "Billing" } },
  { value: "partnership", label: { fr: "Partenariat", en: "Partnership" } },
  { value: "data_protection", label: { fr: "Protection des données", en: "Data Protection" } },
  { value: "other", label: { fr: "Autre", en: "Other" } },
]

const meetingTypes = [
  { value: "videoconference", icon: Video, label: { fr: "Visioconférence", en: "Video Conference" } },
  { value: "phone", icon: Smartphone, label: { fr: "Téléphone (WhatsApp)", en: "Phone (WhatsApp)" } },
  { value: "in_person", icon: Building2, label: { fr: "En présentiel", en: "In Person" } },
]

const purposes = [
  { value: "presentation", label: { fr: "Présentation SaveMali", en: "SaveMali Presentation" } },
  { value: "demo", label: { fr: "Démonstration", en: "Demo" } },
  { value: "support", label: { fr: "Support", en: "Support" } },
  { value: "training", label: { fr: "Formation", en: "Training" } },
  { value: "business", label: { fr: "Business Meeting", en: "Business Meeting" } },
  { value: "other", label: { fr: "Autre", en: "Other" } },
]

const faqItems = [
  { q: { fr: "Comment créer un espace de travail ?", en: "How to create a workspace?" }, a: { fr: "Connectez-vous à votre compte, puis cliquez sur 'Créer un espace de travail' dans le menu. Suivez les étapes pour configurer votre type d'activité.", en: "Log in to your account, then click 'Create Workspace' in the menu. Follow the steps to configure your business type." } },
  { q: { fr: "Comment contacter le support ?", en: "How to contact support?" }, a: { fr: "Utilisez le formulaire de contact ci-dessus ou envoyez un email à support@savemali.online. Notre équipe vous répondra sous 24h.", en: "Use the contact form above or email support@savemali.online. Our team will respond within 24h." } },
  { q: { fr: "Comment récupérer mon mot de passe ?", en: "How to reset my password?" }, a: { fr: "Sur la page de connexion, cliquez sur 'Mot de passe oublié'. Un code de vérification vous sera envoyé par email.", en: "On the login page, click 'Forgot password'. A verification code will be sent by email." } },
  { q: { fr: "Comment demander une démonstration ?", en: "How to request a demo?" }, a: { fr: "Prenez un rendez-vous via le formulaire ci-dessus en sélectionnant 'Démonstration' comme motif. Nous vous présenterons les fonctionnalités adaptées à vos besoins.", en: "Book an appointment via the form above selecting 'Demo' as purpose. We'll show you features tailored to your needs." } },
  { q: { fr: "Comment modifier mon rendez-vous ?", en: "How to modify my appointment?" }, a: { fr: "Connectez-vous à votre compte et allez dans la section 'Mes rendez-vous' pour modifier ou annuler. Vous pouvez aussi nous contacter directement.", en: "Log in to your account and go to 'My Appointments' section to reschedule or cancel. You can also contact us directly." } },
  { q: { fr: "Quels sont les horaires d'ouverture ?", en: "What are business hours?" }, a: { fr: "Nous sommes disponibles du lundi au vendredi, de 08h00 à 18h00 (heure de Kalemie, UTC+2).", en: "We're available Monday to Friday, 8:00 AM to 6:00 PM (Kalemie time, UTC+2)." } },
]

function ContactInfoCard({ fr }: { fr: boolean }) {
  const info = [
    { icon: MapPin, label: fr ? "Adresse" : "Address", value: "SaveMali SARL", sub: "Quartier Abbatoir, Avenue Cadastre No 321\nKalemie, Tanganyika, RDC" },
    { icon: Mail, label: "Email Support", value: "support@savemali.online", href: "mailto:support@savemali.online" },
    { icon: Shield, label: "DPO", value: "dpo@savemali.online", href: "mailto:dpo@savemali.online" },
    { icon: Globe, label: fr ? "Site Web" : "Website", value: "savemali.online", href: "https://savemali.online" },
    { icon: Clock, label: fr ? "Horaires" : "Hours", value: fr ? "Lundi – Vendredi" : "Monday – Friday", sub: "08h00 – 18h00" },
  ]
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {info.map((item, i) => (
        <div key={i} className="group rounded-xl border border-border/60 bg-card p-5 transition-all duration-300 hover:border-brand/30 hover:shadow-md">
          <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-brand/10">
            <item.icon className="size-5 text-brand" />
          </div>
          <p className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">{item.label}</p>
          <p className="text-sm font-semibold text-foreground">
            {item.href ? <a href={item.href} className="hover:text-brand transition-colors">{item.value}</a> : item.value}
          </p>
          {item.sub && <p className="mt-1 text-xs text-muted-foreground whitespace-pre-line">{item.sub}</p>}
        </div>
      ))}
    </div>
  )
}

function LiveStatus({ fr }: { fr: boolean }) {
  const [available, setAvailable] = React.useState(true)
  React.useEffect(() => {
    setAvailable(isWithinBusinessHours())
    const interval = setInterval(() => setAvailable(isWithinBusinessHours()), 60000)
    return () => clearInterval(interval)
  }, [])
  return (
    <div className="flex items-center gap-2.5 rounded-full border border-border/60 bg-card px-4 py-2 shadow-sm">
      <span className={cn("relative flex size-2.5", available && "animate-pulse")}>
        <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-75", available ? "bg-emerald-400" : "bg-red-400")} />
        <span className={cn("relative inline-flex size-2.5 rounded-full", available ? "bg-emerald-500" : "bg-red-500")} />
      </span>
      <span className="text-sm font-medium text-foreground">
        {available
          ? (fr ? "Support disponible" : "Support available")
          : (fr ? "Support indisponible" : "Support unavailable")}
      </span>
    </div>
  )
}

function ContactFormSection({ fr }: { fr: boolean }) {
  const [form, setForm] = React.useState({ full_name: "", company: "", email: "", phone: "", subject: "", category: "support", message: "", acceptedPriv: false })
  const [file, setFile] = React.useState<File | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [success, setSuccess] = React.useState<{ number: string } | null>(null)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.full_name.trim()) e.full_name = fr ? "Nom requis" : "Name required"
    if (!form.email.trim()) e.email = fr ? "Email requis" : "Email required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = fr ? "Email invalide" : "Invalid email"
    if (!form.subject.trim()) e.subject = fr ? "Sujet requis" : "Subject required"
    if (!form.message.trim()) e.message = fr ? "Message requis" : "Message required"
    else if (form.message.trim().length < 10) e.message = fr ? "Minimum 10 caractères" : "Minimum 10 characters"
    if (!form.acceptedPriv) e.acceptedPriv = fr ? "Vous devez accepter la politique" : "You must accept the privacy policy"
    if (detectInjection(form.message) || detectInjection(form.subject)) e.general = fr ? "Détection d'injection" : "Injection detected"
    const rate = checkApiRateLimit("contact_form", 3, 60000)
    if (!rate.allowed) e.general = fr ? "Trop de tentatives. Réessayez dans une minute." : "Too many attempts. Try again in a minute."
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const result = await submitContactMessage({
        full_name: form.full_name,
        company: form.company || undefined,
        email: form.email,
        phone: form.phone || undefined,
        subject: form.subject,
        category: form.category as any,
        message: form.message,
      })
      setSuccess({ number: result.contactNumber })
      toast.success(fr ? "Message envoyé avec succès !" : "Message sent successfully!")
    } catch (err: any) {
      toast.error(err.message || fr ? "Erreur lors de l'envoi" : "Error sending message")
    } finally {
      setSaving(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
          <Check className="size-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="mb-2 text-xl font-bold text-foreground">{fr ? "Message envoyé !" : "Message sent!"}</h3>
        <p className="mb-1 text-sm text-muted-foreground">{fr ? "Référence :" : "Reference:"}</p>
        <p className="mb-4 font-mono text-lg font-bold text-brand">{success.number}</p>
        <p className="mb-6 text-sm text-muted-foreground">{fr ? "Un email de confirmation vous a été envoyé." : "A confirmation email has been sent to you."}</p>
        <Button variant="outline" onClick={() => setSuccess(null)}>{fr ? "Nouveau message" : "New message"}</Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {errors.general && <Alert variant="destructive"><AlertTriangle className="size-4" /><AlertDescription>{errors.general}</AlertDescription></Alert>}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cf-name">{fr ? "Nom complet" : "Full Name"} *</Label>
          <Input id="cf-name" value={form.full_name} onChange={(e) => setForm(p => ({ ...p, full_name: e.target.value }))} className={errors.full_name ? "border-destructive" : ""} />
          {errors.full_name && <p className="text-xs text-destructive">{errors.full_name}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="cf-company">{fr ? "Entreprise / Organisation" : "Company / Organization"}</Label>
          <Input id="cf-company" value={form.company} onChange={(e) => setForm(p => ({ ...p, company: e.target.value }))} />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cf-email">Email *</Label>
          <Input id="cf-email" type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} className={errors.email ? "border-destructive" : ""} />
          {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="cf-phone">{fr ? "Téléphone" : "Phone"}</Label>
          <Input id="cf-phone" type="tel" value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))} />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cf-subject">{fr ? "Sujet" : "Subject"} *</Label>
          <Input id="cf-subject" value={form.subject} onChange={(e) => setForm(p => ({ ...p, subject: e.target.value }))} className={errors.subject ? "border-destructive" : ""} />
          {errors.subject && <p className="text-xs text-destructive">{errors.subject}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="cf-category">{fr ? "Catégorie" : "Category"}</Label>
          <Select value={form.category} onValueChange={(v) => setForm(p => ({ ...p, category: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label[fr ? "fr" : "en"]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="cf-message">{fr ? "Message" : "Message"} *</Label>
        <Textarea id="cf-message" rows={5} value={form.message} onChange={(e) => setForm(p => ({ ...p, message: e.target.value }))} className={errors.message ? "border-destructive" : ""} />
        {errors.message && <p className="text-xs text-destructive">{errors.message}</p>}
      </div>
      <div className="space-y-2">
        <Label>{fr ? "Pièce jointe (optionnelle)" : "Attachment (optional)"}</Label>
        <div className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
          <Upload className="size-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{file ? file.name : (fr ? "Ajouter un fichier" : "Add a file")}</span>
          <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
      </div>
      <div className="flex items-start gap-2.5">
        <input type="checkbox" id="cf-priv" checked={form.acceptedPriv} onChange={(e) => setForm(p => ({ ...p, acceptedPriv: e.target.checked }))} className="mt-1 size-4 rounded border-border accent-brand" />
        <Label htmlFor="cf-priv" className="text-sm text-muted-foreground">
          {fr ? "J'accepte la politique de confidentialité." : "I accept the privacy policy."} *
        </Label>
      </div>
      {errors.acceptedPriv && <p className="text-xs text-destructive">{errors.acceptedPriv}</p>}
      <Button type="submit" disabled={saving} className="w-full gap-2">
        {saving ? <Loader2 className="size-4 animate-spin" /> : <MessageSquare className="size-4" />}
        {saving ? (fr ? "Envoi..." : "Sending...") : (fr ? "Envoyer le message" : "Send message")}
      </Button>
    </form>
  )
}

function AppointmentSection({ fr, email, userId }: { fr: boolean; email?: string; userId?: string }) {
  const [form, setForm] = React.useState({ full_name: "", company: "", email: email || "", phone: "", meeting_date: "", meeting_time: "", meeting_type: "videoconference", purpose: "presentation", comments: "" })
  const [saving, setSaving] = React.useState(false)
  const [success, setSuccess] = React.useState<{ number: string } | null>(null)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  const today = new Date().toISOString().split("T")[0]

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.full_name.trim()) e.full_name = fr ? "Nom requis" : "Name required"
    if (!form.email.trim()) e.email = fr ? "Email requis" : "Email required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = fr ? "Email invalide" : "Invalid email"
    if (!form.meeting_date) e.meeting_date = fr ? "Date requise" : "Date required"
    else if (form.meeting_date < today) e.meeting_date = fr ? "Date passée" : "Past date"
    if (!form.meeting_time) e.meeting_time = fr ? "Heure requise" : "Time required"
    if (detectInjection(form.comments)) e.comments = fr ? "Détection d'injection" : "Injection detected"
    const rate = checkApiRateLimit("rdv_form", 3, 60000)
    if (!rate.allowed) e.general = fr ? "Trop de tentatives. Réessayez dans une minute." : "Too many attempts. Try again in a minute."
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const result = await createAppointment({
        full_name: form.full_name,
        company: form.company || undefined,
        email: form.email,
        phone: form.phone || undefined,
        meeting_date: form.meeting_date,
        meeting_time: form.meeting_time,
        meeting_type: form.meeting_type as any,
        purpose: form.purpose,
        comments: form.comments || undefined,
        user_id: userId,
        created_by_name: form.full_name,
        created_by_email: form.email,
      })
      setSuccess({ number: result.appointmentNumber })
      toast.success(fr ? "Rendez-vous confirmé !" : "Appointment confirmed!")
    } catch (err: any) {
      toast.error(err.message || fr ? "Erreur" : "Error")
    } finally {
      setSaving(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-brand/10">
          <CalendarDays className="size-8 text-brand" />
        </div>
        <h3 className="mb-2 text-xl font-bold text-foreground">{fr ? "Rendez-vous confirmé !" : "Appointment confirmed!"}</h3>
        <p className="mb-1 text-sm text-muted-foreground">{fr ? "Référence :" : "Reference:"}</p>
        <p className="mb-4 font-mono text-lg font-bold text-brand">{success.number}</p>
        <p className="mb-6 text-sm text-muted-foreground">{fr ? "Un email de confirmation vous a été envoyé." : "A confirmation email has been sent to you."}</p>
        <Button variant="outline" onClick={() => setSuccess(null)}>{fr ? "Nouveau rendez-vous" : "New appointment"}</Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {errors.general && <Alert variant="destructive"><AlertTriangle className="size-4" /><AlertDescription>{errors.general}</AlertDescription></Alert>}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="rdv-name">{fr ? "Nom complet" : "Full Name"} *</Label>
          <Input id="rdv-name" value={form.full_name} onChange={(e) => setForm(p => ({ ...p, full_name: e.target.value }))} className={errors.full_name ? "border-destructive" : ""} />
          {errors.full_name && <p className="text-xs text-destructive">{errors.full_name}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="rdv-company">{fr ? "Entreprise" : "Company"}</Label>
          <Input id="rdv-company" value={form.company} onChange={(e) => setForm(p => ({ ...p, company: e.target.value }))} />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="rdv-email">Email *</Label>
          <Input id="rdv-email" type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} className={errors.email ? "border-destructive" : ""} />
          {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="rdv-phone">{fr ? "Téléphone" : "Phone"}</Label>
          <Input id="rdv-phone" type="tel" value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))} />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="rdv-date">{fr ? "Date" : "Date"} *</Label>
          <Input id="rdv-date" type="date" min={today} value={form.meeting_date} onChange={(e) => setForm(p => ({ ...p, meeting_date: e.target.value }))} className={errors.meeting_date ? "border-destructive" : ""} />
          {errors.meeting_date && <p className="text-xs text-destructive">{errors.meeting_date}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="rdv-time">{fr ? "Heure" : "Time"} *</Label>
          <Input id="rdv-time" type="time" value={form.meeting_time} onChange={(e) => setForm(p => ({ ...p, meeting_time: e.target.value }))} className={errors.meeting_time ? "border-destructive" : ""} />
          {errors.meeting_time && <p className="text-xs text-destructive">{errors.meeting_time}</p>}
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{fr ? "Type de rendez-vous" : "Meeting type"} *</Label>
          <div className="grid grid-cols-3 gap-2">
            {meetingTypes.map((t) => (
              <button key={t.value} type="button" onClick={() => setForm(p => ({ ...p, meeting_type: t.value }))} className={cn("flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs transition-all", form.meeting_type === t.value ? "border-brand bg-brand/5 text-brand" : "border-border/60 text-muted-foreground hover:border-border")}>
                <t.icon className="size-4" />
                {t.label[fr ? "fr" : "en"]}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="rdv-purpose">{fr ? "Motif" : "Purpose"} *</Label>
          <Select value={form.purpose} onValueChange={(v) => setForm(p => ({ ...p, purpose: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {purposes.map((p) => <SelectItem key={p.value} value={p.value}>{p.label[fr ? "fr" : "en"]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="rdv-comments">{fr ? "Commentaires" : "Comments"}</Label>
        <Textarea id="rdv-comments" rows={3} value={form.comments} onChange={(e) => setForm(p => ({ ...p, comments: e.target.value }))} placeholder={fr ? "Informations complémentaires..." : "Additional information..."} />
        {errors.comments && <p className="text-xs text-destructive">{errors.comments}</p>}
      </div>
      <Button type="submit" disabled={saving} className="w-full gap-2">
        {saving ? <Loader2 className="size-4 animate-spin" /> : <CalendarDays className="size-4" />}
        {saving ? (fr ? "Confirmation..." : "Confirming...") : (fr ? "Confirmer le rendez-vous" : "Confirm appointment")}
      </Button>
    </form>
  )
}

function MyAppointments({ fr, email, userId }: { fr: boolean; email?: string; userId?: string }) {
  const [appointments, setAppointments] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [filter, setFilter] = React.useState("upcoming")

  React.useEffect(() => {
    if (!email && !userId) return
    setLoading(true)
    getUserAppointments(email || "", userId)
      .then(setAppointments)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [email, userId])

  const now = new Date()
  const filtered = appointments.filter((a) => {
    const d = new Date(a.meeting_date + "T" + a.meeting_time)
    if (filter === "upcoming") return d >= now && a.status !== "cancelled"
    if (filter === "past") return d < now || a.status === "completed"
    if (filter === "cancelled") return a.status === "cancelled"
    return true
  })

  const statusStyles: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    confirmed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    completed: "bg-muted text-muted-foreground",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  }

  const statusLabels: Record<string, string> = {
    pending: fr ? "En attente" : "Pending",
    confirmed: fr ? "Confirmé" : "Confirmed",
    completed: fr ? "Terminé" : "Completed",
    cancelled: fr ? "Annulé" : "Cancelled",
  }

  if (!email && !userId) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <CalendarDays className="size-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">{fr ? "Connectez-vous pour voir vos rendez-vous" : "Log in to see your appointments"}</p>
      </div>
    )
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {["upcoming", "past", "cancelled"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-colors", filter === f ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
            {f === "upcoming" ? (fr ? "À venir" : "Upcoming") : f === "past" ? (fr ? "Passés" : "Past") : (fr ? "Annulés" : "Cancelled")}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <CalendarDays className="size-8 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">{fr ? "Aucun rendez-vous" : "No appointments"}</p>
        </div>
      ) : (
        filtered.map((a) => (
          <div key={a.id} className="rounded-lg border border-border/60 p-4 transition-all hover:border-border">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-brand">{a.appointment_number}</span>
                  <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", statusStyles[a.status] || "")}>{statusLabels[a.status] || a.status}</span>
                </div>
                <p className="text-sm font-medium text-foreground">{a.purpose}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="size-3" />{new Date(a.meeting_date + "T" + a.meeting_time).toLocaleDateString(fr ? "fr-FR" : "en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="size-3" />{a.meeting_time.slice(0, 5)}</span>
                </div>
              </div>
              {(a.status === "pending" || a.status === "confirmed") && (
                <Button variant="ghost" size="sm" className="shrink-0 text-destructive hover:text-destructive gap-1 text-xs" onClick={async () => {
                  if (!confirm(fr ? "Annuler ce rendez-vous ?" : "Cancel this appointment?")) return
                  try {
                    await cancelAppointment(a.id)
                    setAppointments((prev: any[]) => prev.map((p: any) => p.id === a.id ? { ...p, status: "cancelled" } : p))
                    toast.success(fr ? "Rendez-vous annulé" : "Appointment cancelled")
                  } catch { toast.error(fr ? "Erreur" : "Error") }
                }}>
                  <X className="size-3.5" />{fr ? "Annuler" : "Cancel"}
                </Button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function FaqSection({ fr }: { fr: boolean }) {
  const [open, setOpen] = React.useState<number | null>(null)
  return (
    <div className="space-y-2">
      {faqItems.map((item, i) => (
        <div key={i} className="rounded-xl border border-border/60 bg-card overflow-hidden transition-all duration-300">
          <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-muted/20">
            <span className="text-sm font-medium text-foreground">{item.q[fr ? "fr" : "en"]}</span>
            {open === i ? <ChevronUp className="size-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="size-4 shrink-0 text-muted-foreground" />}
          </button>
          {open === i && (
            <div className="border-t border-border/40 px-5 py-4">
              <p className="text-sm text-muted-foreground leading-relaxed">{item.a[fr ? "fr" : "en"]}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function LocationSection({ fr }: { fr: boolean }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-card p-5">
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand/10">
            <MapPin className="size-5 text-brand" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">SaveMali SARL</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Quartier Abbatoir, Avenue Cadastre No 321<br />
              Kalemie, Tanganyika<br />
              République Démocratique du Congo
            </p>
          </div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-3">
            <Clock className="size-4 text-brand" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">{fr ? "Horaires d'ouverture" : "Business hours"}</p>
              <p className="text-sm font-semibold text-foreground">{fr ? "Lun–Ven : 08h00–18h00" : "Mon–Fri: 8AM–6PM"}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-3">
            <Globe className="size-4 text-brand" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">{fr ? "Fuseau horaire" : "Time zone"}</p>
              <p className="text-sm font-semibold text-foreground">UTC+2 (Kalemie)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ContactRdvPage({ onNavigate }: Props) {
  const { lang } = useLanguage()
  const { user, workspace } = useAuth()
  const fr = lang === "fr"
  const [tab, setTab] = React.useState("contact")

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [tab])

  return (
    <div className="min-h-svh bg-background">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 pb-20 pt-24 sm:pb-28 sm:pt-32">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/4 w-[800px] h-[800px] rounded-full bg-white/5 blur-[120px]" />
          <div className="absolute -bottom-1/3 -right-1/4 w-[600px] h-[600px] rounded-full bg-white/5 blur-[100px]" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            {fr ? "Contactez SaveMali" : "Contact SaveMali"}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">
            {fr
              ? "Notre équipe est à votre disposition pour répondre à vos questions, vous accompagner dans vos projets et planifier une démonstration personnalisée."
              : "Our team is available to answer your questions, support your projects, and schedule a personalized demo."}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" className="rounded-full gap-2 shadow-lg" onClick={() => { setTab("appointment"); window.scrollTo({ top: document.getElementById("rdv-section")?.offsetTop ?? 600, behavior: "smooth" }) }}>
              <CalendarDays className="size-4" />
              {fr ? "Prendre un rendez-vous" : "Book an appointment"}
            </Button>
            <Button size="lg" variant="secondary" className="rounded-full gap-2 shadow-lg" onClick={() => { setTab("contact"); window.scrollTo({ top: document.getElementById("contact-section")?.offsetTop ?? 600, behavior: "smooth" }) }}>
              <MessageSquare className="size-4" />
              {fr ? "Contacter le support" : "Contact support"}
            </Button>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-12">
        {/* ── Live Status ── */}
        <div className="flex justify-center">
          <LiveStatus fr={fr} />
        </div>

        {/* ── Contact Info Cards ── */}
        <ContactInfoCard fr={fr} />

        {/* ── Tabs: Contact Form / Appointment / My Appointments / FAQ / Location ── */}
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="contact" className="gap-2"><MessageSquare className="size-4" />{fr ? "Contact" : "Contact"}</TabsTrigger>
            <TabsTrigger value="appointment" className="gap-2"><CalendarDays className="size-4" />{fr ? "Rendez-vous" : "Appointment"}</TabsTrigger>
            <TabsTrigger value="my-appointments" className="gap-2"><Calendar className="size-4" />{fr ? "Mes rendez-vous" : "My appointments"}</TabsTrigger>
            <TabsTrigger value="faq" className="gap-2"><HelpCircle className="size-4" />FAQ</TabsTrigger>
            <TabsTrigger value="location" className="gap-2"><MapPin className="size-4" />{fr ? "Localisation" : "Location"}</TabsTrigger>
          </TabsList>

          <TabsContent value="contact" className="mt-6">
            <div id="contact-section" className="grid gap-8 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <Card>
                  <CardHeader>
                    <CardTitle>{fr ? "Envoyez-nous un message" : "Send us a message"}</CardTitle>
                    <CardDescription>{fr ? "Remplissez le formulaire ci-dessous et nous vous répondrons dans les plus brefs délais." : "Fill out the form below and we'll get back to you shortly."}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ContactFormSection fr={fr} />
                  </CardContent>
                </Card>
              </div>
              <div className="lg:col-span-2 space-y-4">
                <div className="rounded-xl border border-border/60 bg-card p-5">
                  <h4 className="text-sm font-semibold text-foreground mb-2">{fr ? "Pourquoi nous contacter ?" : "Why contact us?"}</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">{<ChevronRight className="size-3.5 mt-0.5 shrink-0 text-brand" />}{fr ? "Question sur nos services" : "Question about our services"}</li>
                    <li className="flex items-start gap-2">{<ChevronRight className="size-3.5 mt-0.5 shrink-0 text-brand" />}{fr ? "Demande de démonstration" : "Demo request"}</li>
                    <li className="flex items-start gap-2">{<ChevronRight className="size-3.5 mt-0.5 shrink-0 text-brand" />}{fr ? "Problème technique" : "Technical issue"}</li>
                    <li className="flex items-start gap-2">{<ChevronRight className="size-3.5 mt-0.5 shrink-0 text-brand" />}{fr ? "Proposition de partenariat" : "Partnership proposal"}</li>
                  </ul>
                </div>
                <div className="rounded-xl border border-border/60 bg-card p-5">
                  <h4 className="text-sm font-semibold text-foreground mb-2">{fr ? "Réponse rapide" : "Quick response"}</h4>
                  <p className="text-sm text-muted-foreground">{fr ? "Notre équipe s'engage à répondre à toutes les demandes sous 24 heures ouvrées." : "Our team commits to responding within 24 business hours."}</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="appointment" className="mt-6">
            <div id="rdv-section" className="grid gap-8 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <Card>
                  <CardHeader>
                    <CardTitle>{fr ? "Planifiez un rendez-vous" : "Schedule an appointment"}</CardTitle>
                    <CardDescription>{fr ? "Choisissez un créneau qui vous convient et nous vous contacterons pour confirmer." : "Pick a time that works for you and we'll confirm."}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AppointmentSection fr={fr} email={user?.email} userId={user?.id} />
                  </CardContent>
                </Card>
              </div>
              <div className="lg:col-span-2 space-y-4">
                <div className="rounded-xl border border-border/60 bg-card p-5">
                  <h4 className="text-sm font-semibold text-foreground mb-3">{fr ? "Type de rendez-vous" : "Meeting type"}</h4>
                  <div className="space-y-3">
                    {meetingTypes.map((t) => (
                      <div key={t.value} className="flex items-center gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand/10">
                          <t.icon className="size-4 text-brand" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{t.label[fr ? "fr" : "en"]}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-border/60 bg-card p-5">
                  <h4 className="text-sm font-semibold text-foreground mb-2">{fr ? "Disponibilités" : "Availability"}</h4>
                  <p className="text-sm text-muted-foreground">{fr ? "Lundi au Vendredi, 08h00–18h00 (UTC+2)" : "Monday to Friday, 8AM–6PM (UTC+2)"}</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="my-appointments" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{fr ? "Mes rendez-vous" : "My appointments"}</CardTitle>
                <CardDescription>{fr ? "Consultez et gérez vos rendez-vous." : "View and manage your appointments."}</CardDescription>
              </CardHeader>
              <CardContent>
                <MyAppointments fr={fr} email={user?.email} userId={user?.id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="faq" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>FAQ</CardTitle>
                <CardDescription>{fr ? "Questions fréquemment posées" : "Frequently asked questions"}</CardDescription>
              </CardHeader>
              <CardContent>
                <FaqSection fr={fr} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="location" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{fr ? "Localisation" : "Location"}</CardTitle>
                <CardDescription>{fr ? "Retrouvez-nous à notre adresse" : "Find us at our address"}</CardDescription>
              </CardHeader>
              <CardContent>
                <LocationSection fr={fr} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <PageFooter onNavigate={onNavigate} />
    </div>
  )
}
