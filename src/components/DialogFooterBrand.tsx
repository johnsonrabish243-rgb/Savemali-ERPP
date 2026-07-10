import { useLanguage } from "@/lib/i18n"
import { LogoIcon } from "@/components/Logo"

export function DialogFooterBrand() {
  const { lang } = useLanguage()
  const fr = lang === "fr"

  return (
    <div className="flex flex-col items-center gap-1 border-t border-border/30 bg-muted/10 px-6 py-2">
      <div className="flex items-center gap-1.5">
        <LogoIcon size={16} className="rounded" />
        <span className="text-[10px] font-semibold text-muted-foreground/60">
          SaveMali
        </span>
      </div>
      <span className="text-[9px] text-muted-foreground/40">
        &copy; {new Date().getFullYear()} SaveMali {fr ? "SARL" : "LLC"} — {fr ? "Développé par John Mocket" : "Developed by John Mocket"}
      </span>
    </div>
  )
}
