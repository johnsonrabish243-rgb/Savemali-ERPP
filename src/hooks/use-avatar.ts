import * as React from "react"
import { insforge } from "@/lib/supabase"

const BUCKET = "avatars"
const MAX_SIZE = 2 * 1024 * 1024 // 2MB
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"]
const MAX_DIMENSION = 512

export interface AvatarState {
  url: string | null
  loading: boolean
}

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error("Compression failed"))
        },
        file.type === "image/png" ? "image/png" : "image/jpeg",
        0.85
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Invalid image")) }
    img.src = url
  })
}

function validateFile(file: File): string | null {
  if (!ACCEPTED.includes(file.type)) return "Format non supporté. Utilisez JPG, PNG ou WEBP."
  if (file.size > MAX_SIZE) return "L'image ne doit pas dépasser 2 Mo."
  return null
}

function getInitials(name: string, email: string): string {
  const source = name || email || ""
  const parts = source.split(/[@.\s]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return source.slice(0, 2).toUpperCase()
}

function getMemberId(userId: string, workspaceId: string): string {
  return `${workspaceId}/${userId}`
}

export function useAvatar(userId: string | undefined, workspaceId: string | undefined) {
  const [url, setUrl] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const [progress, setProgress] = React.useState(0)

  // Fetch avatar URL from workspace_members
  const fetchAvatar = React.useCallback(async () => {
    if (!userId || !workspaceId) return
    try {
      const { data } = await insforge.database
        .from("workspace_members")
        .select("avatar_url")
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId)
        .maybeSingle()
      setUrl((data as any)?.avatar_url ?? null)
    } catch {
      setUrl(null)
    }
  }, [userId, workspaceId])

  React.useEffect(() => {
    fetchAvatar()
  }, [fetchAvatar])

  // Upload avatar — uses SDK HTTP client for direct PUT (bypasses upload-strategy which may return presigned)
  const upload = React.useCallback(async (file: File): Promise<string | false> => {
    if (!userId || !workspaceId) return false
    const error = validateFile(file)
    if (error) throw new Error(error)

    setUploading(true)
    setProgress(0)
    try {
      setProgress(20)
      const compressed = await compressImage(file)
      setProgress(40)

      const path = `${workspaceId}/${userId}.jpg`

      // Remove old file if exists
      await insforge.storage.from(BUCKET).remove(path)

      setProgress(60)

      // Upload file via SDK storage API
      const { error: uploadErr } = await insforge.storage.from(BUCKET).upload(path, compressed, {
        contentType: "image/jpeg",
        upsert: true,
      })
      if (uploadErr) throw new Error(uploadErr.message || "Upload failed")

      setProgress(90)

      // Construct public URL via SDK helper
      const { data: urlData } = insforge.storage.from(BUCKET).getPublicUrl(path)
      const publicUrl = urlData?.publicUrl ?? `${import.meta.env.VITE_INSFORGE_URL}/api/storage/buckets/${BUCKET}/objects/${encodeURIComponent(path)}`

      // Update workspace_members
      const { error: dbErr } = await insforge.database
        .from("workspace_members")
        .update({ avatar_url: publicUrl })
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId)
      if (dbErr) {
        console.error("[Avatar] Failed to save avatar_url to DB:", dbErr)
        throw new Error(`Avatar saved to storage but failed to update profile: ${dbErr.message}`)
      }

      setUrl(publicUrl)
      setProgress(100)
      return publicUrl
    } finally {
      setUploading(false)
      setTimeout(() => setProgress(0), 500)
    }
  }, [userId, workspaceId])

  // Delete avatar
  const remove = React.useCallback(async (): Promise<boolean> => {
    if (!userId || !workspaceId) return false
    try {
      const path = `${workspaceId}/${userId}.jpg`
      await insforge.storage.from(BUCKET).remove(path).catch(() => {})
      await insforge.database
        .from("workspace_members")
        .update({ avatar_url: null })
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId)
      setUrl(null)
      return true
    } catch {
      return false
    }
  }, [userId, workspaceId])

  return { url, loading, uploading, progress, upload, remove, getInitials: (name: string, email: string) => getInitials(name, email) }
}

// Static helper to get avatar URL for any member (used in activity feeds, etc.)
export async function fetchMemberAvatar(userId: string, workspaceId: string): Promise<string | null> {
  try {
    const { data } = await insforge.database
      .from("workspace_members")
      .select("avatar_url")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle()
    return (data as any)?.avatar_url ?? null
  } catch {
    return null
  }
}
