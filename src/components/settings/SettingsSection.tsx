import * as React from "react"
import { cn } from "@/lib/utils"

interface SettingsSectionProps {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
  icon?: React.ReactNode
  action?: React.ReactNode
}

export function SettingsSection({ title, description, children, className, icon, action }: SettingsSectionProps) {
  return (
    <div className={cn("rounded-xl border border-border/60 bg-card shadow-xs", className)}>
      <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
        <div className="flex items-start gap-3 min-w-0">
          {icon && <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">{icon}</div>}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {description && <p className="text-xs text-muted-foreground mt-0.5 max-w-lg">{description}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="px-5 pb-5 pt-1">{children}</div>
    </div>
  )
}

export function SettingsRow({ label, description, children, className }: {
  label: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4 rounded-lg px-3 py-3 hover:bg-muted/30 transition-colors min-h-[48px]", className)}>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.25">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export function SettingsDivider() {
  return <div className="border-t border-border/50 my-2" />
}
