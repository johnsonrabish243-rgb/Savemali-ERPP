import * as React from "react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface UserAvatarProps {
  /** Avatar image URL (null = show initials) */
  avatarUrl?: string | null
  /** User display name */
  name?: string
  /** User email (fallback for initials) */
  email?: string
  /** Avatar size */
  size?: "default" | "sm" | "lg"
  /** Extra classes */
  className?: string
  /** Role color for initials background */
  roleColor?: string
}

function getInitials(name: string, email: string): string {
  const source = name || email || ""
  const parts = source.split(/[@.\s]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return source.slice(0, 2).toUpperCase()
}

export function UserAvatar({
  avatarUrl,
  name = "",
  email = "",
  size = "default",
  className,
  roleColor,
}: UserAvatarProps) {
  const initials = React.useMemo(() => getInitials(name, email), [name, email])

  return (
    <Avatar size={size} className={cn("shrink-0", className)}>
      {avatarUrl && (
        <AvatarImage
          src={avatarUrl}
          alt={name || email || "Avatar"}
          className="object-cover"
          loading="lazy"
        />
      )}
      <AvatarFallback
        className={cn(
          "text-xs font-semibold",
          roleColor || "bg-muted text-muted-foreground"
        )}
        delayMs={avatarUrl ? 600 : 0}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}
