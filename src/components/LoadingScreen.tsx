import { useState, useEffect } from "react"

interface Props {
  onDone: () => void
}

export function LoadingScreen({ onDone }: Props) {
  const [lang] = useState<"fr" | "en">(() => {
    return (localStorage.getItem("savemali-lang") as "fr" | "en") || "fr"
  })
  const fr = lang === "fr"
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true)
      setTimeout(onDone, 500)
    }, 1800)
    return () => clearTimeout(timer)
  }, [onDone])

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${
        fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center">
        <div className="mb-8">
          <img
            src="/SaveMali_Logo.png"
            alt="SaveMali"
            className="size-20 rounded-2xl object-cover shadow-2xl"
            onError={(e) => {
              const img = e.currentTarget
              img.style.display = "none"
              const fallback = document.createElement("div")
              fallback.className =
                "size-20 rounded-2xl bg-gradient-to-br from-brand to-brand/70 flex items-center justify-center shadow-2xl"
              fallback.innerHTML = '<span class="text-3xl font-bold text-white">S</span>'
              img.parentNode?.insertBefore(fallback, img)
            }}
          />
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-1">
          SaveMali
        </h1>

        <p className="text-sm text-muted-foreground mb-10">
          {fr ? "Gestion intelligente" : "Smart management"}
        </p>

        <div className="w-56 flex flex-col items-center gap-3">
          <div className="relative w-full h-[3px] overflow-hidden rounded-full bg-muted">
            <div className="absolute top-0 left-0 h-full w-[40%] rounded-full bg-gradient-to-r from-transparent via-brand to-transparent" style={{ animation: "loading-sweep 1.4s ease-in-out infinite" }} />
          </div>
          <p className="text-[11px] text-muted-foreground/70" style={{ animation: "pulse 2s ease-in-out infinite" }}>
            {fr ? "Chargement..." : "Loading..."}
          </p>
        </div>
      </div>

      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="text-[11px] text-muted-foreground/60">
          © {new Date().getFullYear()} SaveMali SARL
        </p>
        <p className="text-[10px] text-muted-foreground/40 mt-1">
          Développé par John Mocket
        </p>
      </div>

      <style>{`
        @keyframes loading-sweep {
          0% { left: -40%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  )
}
