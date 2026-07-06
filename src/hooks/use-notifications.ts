import * as React from "react"
import { useAuth } from "@/hooks/use-auth"
import { useLanguage } from "@/lib/i18n"
import { insforge } from "@/lib/supabase"

export interface Notification {
  id: string
  workspace_id: string
  user_id: string | null
  type: string
  title: string
  message: string
  module: string
  link: string | null
  read: boolean
  created_at: string
  actor_name: string | null
}

interface UseNotificationsReturn {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  error: string | null
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  refresh: () => Promise<void>
}

const MAX_NOTIFICATIONS = 50
const POLL_INTERVAL = 15000

export function useNotifications(): UseNotificationsReturn {
  const { workspace, user } = useAuth()
  const { lang } = useLanguage()
  const fr = lang === "fr"

  const [notifications, setNotifications] = React.useState<Notification[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const fetchNotifications = React.useCallback(async () => {
    if (!workspace?.id || !user?.id) return

    try {
      const { data, error } = await insforge.database
        .from("workspace_notifications")
        .select("*")
        .eq("workspace_id", workspace.id)
        .or(`user_id.is.null,user_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(MAX_NOTIFICATIONS)

      if (error) throw error
      setNotifications((data as Notification[]) ?? [])
    } catch (err: any) {
      setError(err?.message ?? (fr ? "Erreur de chargement" : "Load error"))
    } finally {
      setLoading(false)
    }
  }, [workspace?.id, user?.id, fr])

  const markAsRead = React.useCallback(async (id: string) => {
    if (!workspace?.id) return
    try {
      const { error } = await insforge.database
        .from("workspace_notifications")
        .update({ read: true })
        .eq("id", id)
        .eq("workspace_id", workspace.id)

      if (error) throw error

      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      )
    } catch (err: any) {
      setError(err?.message ?? (fr ? "Erreur" : "Error"))
    }
  }, [workspace?.id, fr])

  const markAllAsRead = React.useCallback(async () => {
    if (!workspace?.id || !user?.id) return

    try {
      const { error } = await insforge.database
        .from("workspace_notifications")
        .update({ read: true })
        .eq("workspace_id", workspace.id)
        .or(`user_id.is.null,user_id.eq.${user.id}`)
        .eq("read", false)

      if (error) throw error

      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    } catch (err: any) {
      setError(err?.message ?? (fr ? "Erreur" : "Error"))
    }
  }, [workspace?.id, user?.id, fr])

  React.useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  React.useEffect(() => {
    if (!workspace?.id) return

    const interval = setInterval(() => {
      fetchNotifications()
    }, POLL_INTERVAL)

    return () => clearInterval(interval)
  }, [workspace?.id, fetchNotifications])

  return {
    notifications,
    unreadCount: notifications.filter(n => !n.read).length,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  }
}

export function useNotificationActions() {
  const { workspace, user } = useAuth()

  const createNotification = React.useCallback(async (
    payload: Omit<Notification, "id" | "created_at" | "read" | "user_id"> & { user_id?: string }
  ) => {
    if (!workspace?.id) return

    try {
      const { error } = await insforge.database
        .from("workspace_notifications")
        .insert([{
          workspace_id: workspace.id,
          user_id: payload.user_id ?? null,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          module: payload.module,
          link: payload.link,
          actor_name: payload.actor_name ?? user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "Quelqu'un",
        }])

      if (error) throw error
    } catch (err) {
      console.error("Failed to create notification:", err)
    }
  }, [workspace?.id, user])

  const createBroadcastNotification = React.useCallback(async (
    payload: Omit<Notification, "id" | "created_at" | "read" | "user_id">,
    excludeUserId?: string
  ) => {
    if (!workspace?.id) return

    try {
      const { data: members } = await insforge.database
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", workspace.id)
        .eq("status", "active")

      if (!members?.length) return

      const targetMembers = members.filter(m => m.user_id !== excludeUserId)

      if (!targetMembers.length) return

      const notifications = targetMembers.map(m => ({
        workspace_id: workspace.id,
        user_id: m.user_id,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        module: payload.module,
        link: payload.link,
        actor_name: payload.actor_name ?? user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "Quelqu'un",
      }))

      const { error } = await insforge.database
        .from("workspace_notifications")
        .insert(notifications)

      if (error) throw error
    } catch (err) {
      console.error("Failed to create broadcast notification:", err)
    }
  }, [workspace?.id, user])

  return { createNotification, createBroadcastNotification }
}