import { useState } from "react"
import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  size?: "sm" | "md" | "lg" | "xl"
  showText?: boolean
  imgClassName?: string
}

const sizeMap = {
  sm: { box: 28, full: "text-sm" },
  md: { box: 36, full: "text-base" },
  lg: { box: 48, full: "text-xl" },
  xl: { box: 64, full: "text-2xl" },
}

function LogoSvg({ w }: { w: number }) {
  return (
    <svg width={w} height={w} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`lg-${w}`} x1="0" y1="0" x2="64" y2="64">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#c2410c" />
        </linearGradient>
        <radialGradient id={`lg-shine-${w}`} cx="28%" cy="28%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <filter id={`ls-${w}`}>
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="rgba(0,0,0,0.25)" />
        </filter>
      </defs>
      <rect x="0" y="0" width="64" height="64" rx="16" fill={`url(#lg-${w})`} filter={`url(#ls-${w})`} />
      <rect x="0" y="0" width="64" height="64" rx="16" fill={`url(#lg-shine-${w})`} />
      <rect x="3" y="3" width="58" height="58" rx="13" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" />
      <rect x="6" y="6" width="52" height="52" rx="10" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
      <text x="32" y="45" textAnchor="middle" fill="white" fontSize="36" fontWeight="900" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="-1">S</text>
    </svg>
  )
}

export function Logo({ className, size = "md", showText = true, imgClassName }: LogoProps) {
  const s = sizeMap[size]
  const [imgFailed, setImgFailed] = useState(false)

  return (
    <div className={cn("flex items-center gap-2.5 shrink-0", className)}>
      <div className="relative shrink-0" style={{ width: s.box, height: s.box }}>
        {!imgFailed && (
          <img
            src="/SaveMali_Logo.png"
            alt="SaveMali"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ borderRadius: "32%" }}
            onError={() => setImgFailed(true)}
          />
        )}
        <div className="absolute inset-0" style={{ opacity: imgFailed ? 1 : 0 }}>
          <LogoSvg w={s.box} />
        </div>
      </div>
      {showText && (
        <span className={cn("font-extrabold tracking-tight text-foreground", s.full)}>
          Save<span className="text-[#f97316]">Mali</span>
        </span>
      )}
    </div>
  )
}

export function LogoIcon({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <div className={cn("shrink-0", className)} style={{ width: size, height: size }}>
      <LogoSvg w={size} />
    </div>
  )
}
