import { insforge } from "@/lib/supabase"
import { sendEmail } from "@/lib/email"
import { logAudit } from "@/lib/audit"
import { sanitizeStrict, detectInjection } from "@/lib/security"

export interface ContactMessageInput {
  workspace_id?: string
  user_id?: string
  full_name: string
  company?: string
  email: string
  phone?: string
  subject: string
  category: "support" | "commercial" | "billing" | "partnership" | "data_protection" | "other"
  message: string
}

export interface AppointmentInput {
  workspace_id?: string
  user_id?: string
  full_name: string
  company?: string
  email: string
  phone?: string
  meeting_date: string
  meeting_time: string
  meeting_type: "videoconference" | "phone" | "in_person"
  purpose: string
  comments?: string
  created_by_name?: string
  created_by_email?: string
}

const meetingTypeLabels: Record<string, string> = {
  videoconference: "Visioconférence",
  phone: "Téléphone (WhatsApp)",
  in_person: "En présentiel",
}

export async function submitContactMessage(input: ContactMessageInput) {
  if (detectInjection(input.message) || detectInjection(input.subject)) {
    throw new Error("Invalid input detected")
  }

  const contactNumber = await generateContactNumber()

  const { data, error } = await insforge.database
    .from("contact_messages")
    .insert([{
      workspace_id: input.workspace_id ?? null,
      user_id: input.user_id ?? null,
      contact_number: contactNumber,
      full_name: sanitizeStrict(input.full_name),
      company: input.company ? sanitizeStrict(input.company) : null,
      email: input.email.trim().toLowerCase(),
      phone: input.phone ?? null,
      subject: sanitizeStrict(input.subject),
      category: input.category,
      message: sanitizeStrict(input.message),
      created_by_email: input.email,
      created_by_name: sanitizeStrict(input.full_name),
    }])
    .select()
    .single()

  if (error) throw new Error(error.message)

  await logAudit({
    action: "contact_message_sent",
    target_id: contactNumber,
    target_type: "contact_message",
    metadata: { category: input.category },
  })

  const emailResult = await sendEmail({
    to: "support@savemali.online",
    subject: `Nouveau message - ${input.subject}`,
    template: "contact",
    templateData: {
      name: input.full_name,
      email: input.email,
      phone: input.phone || "",
      address: input.company || "",
      message: `Catégorie: ${input.category}\n\n${input.message}`,
    },
  })

  await sendEmail({
    to: "johnmoket5@gmail.com",
    template: "contact",
    templateData: {
      name: input.full_name,
      email: input.email,
      phone: input.phone || "",
      address: input.company || "",
      message: `Catégorie: ${input.category}\n\n${input.message}`,
    },
  })

  await sendEmail({
    to: input.email,
    template: "support-auto-reply",
    templateData: {
      ticketNumber: contactNumber,
      name: input.full_name,
      category: input.category,
      subject: input.subject,
      message: input.message,
    },
  })

  return { data, contactNumber }
}

export async function createAppointment(input: AppointmentInput) {
  if (detectInjection(input.comments || "") || detectInjection(input.purpose)) {
    throw new Error("Invalid input detected")
  }

  const { data: conflicts } = await insforge.database
    .from("appointments")
    .select("id")
    .eq("meeting_date", input.meeting_date)
    .eq("meeting_time", input.meeting_time)
    .in("status", ["pending", "confirmed"])
    .limit(1)

  if (conflicts && conflicts.length > 0) {
    throw new Error("Ce créneau est déjà réservé")
  }

  const appointmentNumber = await generateAppointmentNumber()

  const { data, error } = await insforge.database
    .from("appointments")
    .insert([{
      workspace_id: input.workspace_id ?? null,
      user_id: input.user_id ?? null,
      appointment_number: appointmentNumber,
      full_name: sanitizeStrict(input.full_name),
      company: input.company ? sanitizeStrict(input.company) : null,
      email: input.email.trim().toLowerCase(),
      phone: input.phone ?? null,
      meeting_date: input.meeting_date,
      meeting_time: input.meeting_time,
      meeting_type: input.meeting_type,
      purpose: input.purpose,
      comments: input.comments ? sanitizeStrict(input.comments) : null,
      created_by_email: input.created_by_email || input.email,
      created_by_name: sanitizeStrict(input.created_by_name || input.full_name),
    }])
    .select()
    .single()

  if (error) throw new Error(error.message)

  await logAudit({
    action: "appointment_created",
    target_id: appointmentNumber,
    target_type: "appointment",
    metadata: { date: input.meeting_date, time: input.meeting_time, type: input.meeting_type },
  })

  const dateStr = new Date(input.meeting_date + "T" + input.meeting_time).toLocaleDateString("fr-FR", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  })
  const timeStr = input.meeting_time.slice(0, 5)

  await sendEmail({
    to: "support@savemali.online",
    template: "rdv-confirmation",
    templateData: {
      appointmentNumber,
      name: input.full_name,
      date: dateStr,
      time: timeStr,
      type: meetingTypeLabels[input.meeting_type] || input.meeting_type,
      purpose: input.purpose,
      comments: input.comments || "",
    },
  })

  await sendEmail({
    to: "johnmoket5@gmail.com",
    template: "rdv-confirmation",
    templateData: {
      appointmentNumber,
      name: input.full_name,
      date: dateStr,
      time: timeStr,
      type: meetingTypeLabels[input.meeting_type] || input.meeting_type,
      purpose: input.purpose,
      comments: input.comments || "",
    },
  })

  await sendEmail({
    to: input.email,
    template: "rdv-confirmation",
    templateData: {
      appointmentNumber,
      name: input.full_name,
      date: dateStr,
      time: timeStr,
      type: meetingTypeLabels[input.meeting_type] || input.meeting_type,
      purpose: input.purpose,
      comments: input.comments || "",
    },
  })

  return { data, appointmentNumber }
}

export async function cancelAppointment(id: string, reason?: string) {
  const { data, error } = await insforge.database
    .from("appointments")
    .update({ status: "cancelled", cancellation_reason: reason || null })
    .eq("id", id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  if (data?.email) {
    await sendEmail({
      to: data.email,
      template: "rdv-cancellation",
      templateData: {
        appointmentNumber: data.appointment_number,
        name: data.full_name,
        reason: reason || "",
      },
    })
  }

  return data
}

export async function getUserAppointments(email: string, userId?: string) {
  const query = insforge.database
    .from("appointments")
    .select("*")
    .order("meeting_date", { ascending: false })
    .limit(50)

  if (userId) {
    query.eq("user_id", userId)
  } else {
    query.eq("email", email.toLowerCase())
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data as any[]) ?? []
}

async function generateContactNumber(): Promise<string> {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `MSG-${timestamp}-${random}`
}

async function generateAppointmentNumber(): Promise<string> {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `RDV-${timestamp}-${random}`
}

export function isWithinBusinessHours(): boolean {
  const now = new Date()
  const day = now.getDay()
  const hour = now.getHours()
  const minute = now.getMinutes()
  const totalMinutes = hour * 60 + minute
  if (day === 0 || day === 6) return false
  const openMinutes = 8 * 60
  const closeMinutes = 18 * 60
  return totalMinutes >= openMinutes && totalMinutes < closeMinutes
}
