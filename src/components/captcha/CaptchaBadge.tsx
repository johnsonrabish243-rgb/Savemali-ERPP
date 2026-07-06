import * as React from "react"
import { ShieldCheck, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCaptchaLang } from "@/lib/captcha/i18n"
import { CaptchaLegalModal } from "./CaptchaLegalModal"
import type { Language, WidgetSize, WidgetTheme } from "@/lib/captcha/types"

interface Props {
  lang: Language
  size: WidgetSize
  theme: WidgetTheme
  onClick: () => void
  phase: "idle" | "verifying" | "verified"
}

export function CaptchaBadge({ lang, size, theme, onClick, phase }: Props) {
  const t = useCaptchaLang(lang)
  const fr = lang === "fr"
  const [modal, setModal] = React.useState<"privacy" | "terms" | null>(null)
  const [hovered, setHovered] = React.useState(false)

  const sizeClasses = size === "compact" ? "h-[38px] px-2.5" : size === "large" ? "h-[48px] px-3.5" : "h-[42px] px-3"

  if (phase === "verified") return null

  return (
    <>
      <div
        onClick={phase === "idle" ? onClick : undefined}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          "flex cursor-pointer select-none items-center transition-all duration-150 rounded border overflow-hidden",
          "bg-[#f9f9f9] dark:bg-[#1a1a1a] border-[#d3d3d3] dark:border-[#333]",
          sizeClasses,
          phase === "idle" && "hover:shadow-sm hover:border-[#bbb] dark:hover:border-[#444]",
          phase === "verifying" && "cursor-default"
        )}
      >
        {/* Checkbox - reCAPTCHA style */}
        <div className={cn(
          "relative flex items-center justify-center rounded border-2 transition-all duration-200 shrink-0",
          phase === "verifying"
            ? "border-accent bg-accent/5"
            : hovered
              ? "border-[#aaa] bg-white dark:border-[#666] dark:bg-[#222]"
              : "border-[#c1c1c1] bg-white dark:border-[#555] dark:bg-[#222]",
          size === "compact" ? "size-[22px]" : size === "large" ? "size-[30px]" : "size-[26px]"
        )}>
          {phase === "idle" && !hovered && (
            <div className="size-[10px] rounded-sm bg-transparent" />
          )}
          {phase === "idle" && hovered && (
            <div className="size-[10px] rounded-sm bg-[#e0e0e0] dark:bg-[#444]" />
          )}
          {phase === "verifying" && (
            <Loader2 className="size-3.5 animate-spin text-accent" />
          )}
        </div>

        {/* Label + Logo */}
        <div className="flex items-center gap-2 ml-2.5">
          <span className={cn(
            "font-medium tracking-tight select-none",
            size === "compact" ? "text-[11px]" : size === "large" ? "text-[13px]" : "text-[12px]",
            "text-[#333] dark:text-[#ccc]"
          )}>
            {phase === "verifying" ? (fr ? "Vérification..." : "Verifying...") : t("badge.label")}
          </span>

          <div className="flex items-center gap-1 ml-1">
            <div className="flex items-center justify-center rounded bg-gradient-to-b from-[#2d7a4b] to-[#1e5e3a] size-[18px]">
              <ShieldCheck className="text-white size-3" />
            </div>
            <span className="text-[9px] font-semibold text-[#666] dark:text-[#888] hidden sm:inline">Savemali</span>
          </div>
        </div>

        {/* Links - right aligned */}
        <div className="flex items-center gap-1 ml-auto pl-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setModal("privacy") }}
            className="text-[9px] text-[#888] dark:text-[#666] hover:text-[#555] dark:hover:text-[#999] transition-colors"
          >
            {t("badge.privacy")}
          </button>
          <span className="text-[#ccc] dark:text-[#555] text-[8px]">·</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setModal("terms") }}
            className="text-[9px] text-[#888] dark:text-[#666] hover:text-[#555] dark:hover:text-[#999] transition-colors"
          >
            {t("badge.terms")}
          </button>
        </div>
      </div>
      {modal && <CaptchaLegalModal type={modal} lang={lang} onClose={() => setModal(null)} />}
    </>
  )
}
