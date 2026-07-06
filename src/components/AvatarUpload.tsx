import * as React from "react"
import { useAvatar } from "@/hooks/use-avatar"
import { useLanguage } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { UserAvatar } from "@/components/UserAvatar"
import { Upload, Trash2, Loader2, Check } from "lucide-react"

interface AvatarUploadProps {
  userId: string
  workspaceId: string
  name: string
  email: string
  currentAvatarUrl?: string | null
  roleColor?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onAvatarChange?: (url: string | null) => void
}

export function AvatarUpload({
  userId,
  workspaceId,
  name,
  email,
  currentAvatarUrl,
  roleColor,
  open,
  onOpenChange,
  onAvatarChange,
}: AvatarUploadProps) {
  const { lang } = useLanguage()
  const fr = lang === "fr"
  const { url, uploading, progress, upload, remove } = useAvatar(userId, workspaceId)
  const [preview, setPreview] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)
  const [isDragging, setIsDragging] = React.useState(false)
  const fileRef = React.useRef<HTMLInputElement>(null)

  const displayUrl = preview || url || currentAvatarUrl

  React.useEffect(() => {
    if (open) {
      setPreview(null)
      setError(null)
      setSuccess(false)
    }
  }, [open])

  const handleFile = async (file: File) => {
    setError(null)
    setSuccess(false)
    // Create local preview
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)
    // Validate
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError(fr ? "Format non supporté. Utilisez JPG, PNG ou WEBP." : "Unsupported format. Use JPG, PNG or WEBP.")
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError(fr ? "L'image ne doit pas dépasser 2 Mo." : "Image must not exceed 2 MB.")
      return
    }
    try {
      const ok = await upload(file)
      if (ok) {
        setSuccess(true)
        onAvatarChange?.(url)
        setTimeout(() => { setSuccess(false); onOpenChange(false) }, 1500)
      }
    } catch (err: any) {
      setError(err.message || "Upload failed")
      setPreview(null)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const handleRemove = async () => {
    const ok = await remove()
    if (ok) {
      setPreview(null)
      onAvatarChange?.(null)
      setTimeout(() => onOpenChange(false), 500)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{fr ? "Photo de profil" : "Profile photo"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          {/* Avatar preview */}
          <div className="relative">
            <UserAvatar
              avatarUrl={displayUrl}
              name={name}
              email={email}
              size="lg"
              className="size-24"
              roleColor={roleColor}
            />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/80">
                <Loader2 className="size-6 animate-spin text-brand" />
              </div>
            )}
            {success && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-success/20">
                <Check className="size-6 text-success" />
              </div>
            )}
          </div>

          {/* Progress bar */}
          {uploading && (
            <div className="w-full max-w-xs">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-brand transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-xs text-destructive text-center">{error}</p>
          )}

          {/* Drag & Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-6 transition-colors ${
              isDragging
                ? "border-brand bg-brand/5"
                : "border-border hover:border-brand/50 hover:bg-muted/50"
            }`}
          >
            <Upload className="size-8 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                {fr ? "Cliquez ou glissez-déposez" : "Click or drag and drop"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG, WEBP — {fr ? "max. 2 Mo" : "max. 2 MB"}
              </p>
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
              e.target.value = ""
            }}
          />
        </div>

        <DialogFooter className="flex-row gap-2 sm:gap-2">
          {(url || currentAvatarUrl) && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRemove}
              disabled={uploading}
              className="gap-1.5"
            >
              <Trash2 className="size-3.5" />
              {fr ? "Supprimer" : "Remove"}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="ml-auto"
          >
            {fr ? "Fermer" : "Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
