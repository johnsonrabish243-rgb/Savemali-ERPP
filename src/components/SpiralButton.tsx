import * as React from "react"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface SpiralButtonProps {
  onClick: () => void
  label: string
  className?: string
}

export function SpiralButton({ onClick, label, className }: SpiralButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative inline-flex items-center gap-2.5 overflow-hidden rounded-full px-8 py-4 text-sm font-semibold text-white transition-all duration-300 hover:scale-105",
        "bg-gradient-to-br from-[#C8399C] via-[#9b51a0] to-[#7C3AED]",
        "shadow-lg shadow-[#C8399C]/30 hover:shadow-xl hover:shadow-[#7C3AED]/40",
        "animate-[water-pulse_3s_ease-in-out_infinite]",
        className
      )}
    >
      {/* Layer 1: Outer spiral - slow clockwise */}
      <span className="absolute inset-[-50%] animate-[water-spiral_4s_linear_infinite] opacity-30">
        <span className="block h-full w-full rounded-full bg-[conic-gradient(from_0deg,transparent_0%,rgba(255,255,255,0.25)_15%,transparent_30%,rgba(255,255,255,0.15)_45%,transparent_60%,rgba(255,255,255,0.2)_75%,transparent_90%,transparent_100%)]" />
      </span>

      {/* Layer 2: Inner spiral - medium counter-clockwise */}
      <span className="absolute inset-[-30%] animate-[water-spiral-reverse_3s_linear_infinite] opacity-25">
        <span className="block h-full w-full rounded-full bg-[conic-gradient(from_120deg,transparent_0%,rgba(255,255,255,0.3)_20%,transparent_40%,rgba(200,57,156,0.2)_60%,transparent_80%,transparent_100%)]" />
      </span>

      {/* Layer 3: Core spiral - fast clockwise */}
      <span className="absolute inset-[-10%] animate-[water-spiral_2s_linear_infinite] opacity-20">
        <span className="block h-full w-full rounded-full bg-[conic-gradient(from_240deg,transparent_0%,rgba(124,58,237,0.3)_25%,transparent_50%,rgba(255,255,255,0.2)_75%,transparent_100%)]" />
      </span>

      {/* Water flow streak */}
      <span className="absolute inset-0 overflow-hidden rounded-full">
        <span className="absolute top-0 left-0 h-full w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[water-flow_2.5s_linear_infinite]" />
      </span>

      {/* Ripple rings on hover */}
      <span className="absolute inset-0 rounded-full border border-white/10 animate-[water-ripple_2s_ease-out_infinite] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
      <span className="absolute inset-0 rounded-full border border-white/5 animate-[water-ripple_2s_ease-out_0.5s_infinite] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Content */}
      <span className="relative z-10">{label}</span>
      <ArrowRight className="relative z-10 size-4 transition-transform duration-300 group-hover:translate-x-1" />
    </button>
  )
}
