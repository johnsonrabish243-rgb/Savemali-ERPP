import { useState, useEffect, useRef } from "react"
import { LogoIcon } from "@/components/Logo"

interface Props {
  onDone: () => void
}

export function LoadingScreen({ onDone }: Props) {
  const [lang] = useState<"fr" | "en">(() => {
    return (localStorage.getItem("savemali-lang") as "fr" | "en") || "fr"
  })
  const fr = lang === "fr"
  const [phase, setPhase] = useState<"enter" | "idle" | "exit">("enter")
  const [progress, setProgress] = useState(0)
  const rafRef = useRef<number>(0)
  const startRef = useRef(performance.now())
  const durationRef = useRef(2200)

  useEffect(() => {
    startRef.current = performance.now()
    const animate = (now: number) => {
      const elapsed = now - startRef.current
      const raw = Math.min(elapsed / durationRef.current, 1)
      const eased = 1 - Math.pow(1 - raw, 3)
      setProgress(eased)
      if (raw < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  useEffect(() => {
    if (progress >= 1) {
      setPhase("exit")
      const t = setTimeout(onDone, 600)
      return () => clearTimeout(t)
    }
  }, [progress, onDone])

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-all duration-600 ${
        phase === "enter" ? "opacity-100" : phase === "exit" ? "opacity-0 scale-[1.02]" : ""
      }`}
      style={{ background: "linear-gradient(160deg, #0a0a0a 0%, #1a1025 50%, #0a0a0a 100%)" }}
    >
      <div
        className="absolute w-[300px] h-[300px] rounded-full blur-[120px] opacity-20"
        style={{ background: "radial-gradient(circle, #c8399c 0%, transparent 70%)" }}
      />

      <div className="relative z-10 flex flex-col items-center">
        <div className="relative mb-8" style={{ animation: "splash-logo-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
          <LogoIcon size={96} className="shadow-2xl" />
          <div
            className="absolute inset-0 rounded-[32%]"
            style={{ animation: "splash-ring 2s ease-out infinite" }}
          />
        </div>

        <h1
          className="text-[32px] font-semibold tracking-tight text-white mb-2 opacity-0"
          style={{ animation: "splash-fade-up 0.6s 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}
        >
          SaveMali
        </h1>

        <p
          className="text-[13px] tracking-wide uppercase text-white/40 mb-12 opacity-0"
          style={{ animation: "splash-fade-up 0.6s 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}
        >
          {fr ? "Gestion intelligente" : "Smart Management"}
        </p>

        <div className="w-48 opacity-0" style={{ animation: "splash-fade-up 0.6s 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
          <div className="relative w-full h-[2px] overflow-hidden rounded-full bg-white/10">
            <div
              className="absolute top-0 left-0 h-full rounded-full"
              style={{
                width: `${progress * 100}%`,
                background: "linear-gradient(90deg, #c8399c, #7c3aed)",
                transition: "width 0.05s linear",
              }}
            />
          </div>
          <p className="text-center text-[11px] text-white/30 mt-3" style={{ fontVariantNumeric: "tabular-nums" }}>
            {Math.round(progress * 100)}%
          </p>
        </div>
      </div>

      <div className="absolute bottom-8 left-0 right-0 text-center opacity-0" style={{ animation: "splash-fade-up 0.6s 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
        <p className="text-[11px] text-white/25">
          © {new Date().getFullYear()} SaveMali SARL
        </p>
        <p className="text-[10px] text-white/15 mt-1">
          Développé par John Mocket
        </p>
      </div>

      <style>{`
        @keyframes splash-logo-in {
          0% { opacity: 0; transform: scale(0.8) translateY(12px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes splash-fade-up {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes splash-ring {
          0% { box-shadow: 0 0 0 0 rgba(200, 57, 156, 0.4); }
          100% { box-shadow: 0 0 0 24px rgba(200, 57, 156, 0); }
        }
      `}</style>
    </div>
  )
}
