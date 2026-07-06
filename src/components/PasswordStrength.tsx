import { useLanguage } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { getPasswordStrength } from "@/lib/security"

export type Strength = "weak" | "medium" | "strong" | "excellent"

export function evaluateStrength(pw: string): { level: Strength; score: number } {
  const s = getPasswordStrength(pw)
  const level: Strength = s.score <= 1 ? "weak" : s.score === 2 ? "medium" : s.score === 3 ? "strong" : "excellent"
  return { level, score: s.score }
}

const labels = { weak: { en: "Weak", fr: "Faible" }, medium: { en: "Medium", fr: "Moyen" }, strong: { en: "Strong", fr: "Fort" }, excellent: { en: "Excellent", fr: "Excellent" } }
const colors = { weak: "bg-red-500", medium: "bg-orange-400", strong: "bg-lime-500", excellent: "bg-green-500" }

export function PasswordStrengthMeter({ password }: { password: string }) {
  const { lang } = useLanguage()
  const fr = lang === "fr"
  if (!password) return null
  const { level, score } = evaluateStrength(password)
  const barCount = Math.min(score + 1, 4)

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={cn("h-1.5 flex-1 rounded-full transition-all", i <= barCount ? colors[level] : "bg-muted")} />
        ))}
      </div>
      <p className={cn("text-[11px] font-medium", level === "weak" ? "text-red-500" : level === "medium" ? "text-orange-400" : level === "strong" ? "text-lime-500" : "text-green-500")}>
        {labels[level][fr ? "fr" : "en"]}
      </p>
    </div>
  )
}
