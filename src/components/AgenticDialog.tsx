import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { LogoIcon } from "@/components/Logo"
import { useLanguage } from "@/lib/i18n"

interface AgenticDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  maxWidth?: "sm" | "md" | "lg" | "xl"
  icon?: React.ReactNode
  accentColor?: "primary" | "success" | "warning" | "accent"
}

const ACCENT_COLORS = {
  primary: {
    headerBg: "bg-primary/5",
    headerBorder: "border-primary/10",
    iconBg: "bg-primary/10",
    iconText: "text-primary",
    titleText: "text-foreground",
  },
  success: {
    headerBg: "bg-success/5",
    headerBorder: "border-success/10",
    iconBg: "bg-success/10",
    iconText: "text-success",
    titleText: "text-foreground",
  },
  warning: {
    headerBg: "bg-warning/5",
    headerBorder: "border-warning/10",
    iconBg: "bg-warning/10",
    iconText: "text-warning",
    titleText: "text-foreground",
  },
  accent: {
    headerBg: "bg-accent/5",
    headerBorder: "border-accent/10",
    iconBg: "bg-accent/10",
    iconText: "text-accent",
    titleText: "text-foreground",
  },
}

const MAX_WIDTHS = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-xl",
  xl: "sm:max-w-2xl",
}

export function AgenticDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  maxWidth = "md",
  icon,
  accentColor = "primary",
}: AgenticDialogProps) {
  const { lang } = useLanguage()
  const fr = lang === "fr"
  const colors = ACCENT_COLORS[accentColor]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "gap-0 p-0 overflow-hidden",
          MAX_WIDTHS[maxWidth]
        )}
      >
        {/* Header with accent */}
        <div
          className={cn(
            "relative border-b px-6 py-4",
            colors.headerBg,
            colors.headerBorder
          )}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {icon && (
                <div
                  className={cn(
                    "flex size-10 items-center justify-center rounded-xl",
                    colors.iconBg
                  )}
                >
                  <span className={colors.iconText}>{icon}</span>
                </div>
              )}
              <div>
                <DialogTitle
                  className={cn("text-lg font-semibold tracking-tight", colors.titleText)}
                >
                  {title}
                </DialogTitle>
                {description && (
                  <DialogDescription className="mt-0.5 text-sm text-muted-foreground">
                    {description}
                  </DialogDescription>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="border-t border-border/50 bg-muted/20 px-6 py-3">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {footer}
            </div>
          </div>
        )}

        {/* Logo + copyright */}
        <div className="border-t border-border/30 bg-muted/10 px-6 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <LogoIcon size={16} className="rounded" />
              <span className="text-[10px] font-semibold text-muted-foreground/60">
                SaveMali
              </span>
            </div>
            <span className="text-[9px] text-muted-foreground/40">
              &copy; {new Date().getFullYear()} SaveMali
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Form field components ──────────────────────────────────────────────

interface FieldProps {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
  className?: string
  hint?: string
}

export function AgenticField({ label, required, error, children, className, hint }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="flex items-center gap-1 text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive">*</span>}
      </label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}

export function AgenticInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm",
        "placeholder:text-muted-foreground",
        "focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "transition-colors",
        className
      )}
      {...props}
    />
  )
}

export function AgenticSelect({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm",
        "focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "transition-colors",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}

export function AgenticTextarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm",
        "placeholder:text-muted-foreground",
        "focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "transition-colors resize-none",
        className
      )}
      {...props}
    />
  )
}

export function AgenticFormRow({
  children,
  columns = 2,
  className,
}: {
  children: React.ReactNode
  columns?: 1 | 2 | 3
  className?: string
}) {
  const colClass = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-3",
  }

  return (
    <div className={cn("grid gap-4", colClass[columns], className)}>
      {children}
    </div>
  )
}
