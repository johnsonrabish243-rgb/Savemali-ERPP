import * as React from "react"
import { cn } from "@/lib/utils"

interface Props {
  children: React.ReactNode
  className?: string
  duration?: number
  delay?: number
  disabled?: boolean
}

export function KineticPulse({ children, className, duration = 2, delay = 0, disabled = false }: Props) {
  const [mounted, setMounted] = React.useState(delay === 0)

  React.useEffect(() => {
    if (delay === 0) return
    const timer = setTimeout(() => setMounted(true), delay * 1000)
    return () => clearTimeout(timer)
  }, [delay])

  if (disabled) return <>{children}</>

  return (
    <div
      className={cn("will-change-transform", mounted && "animate-kinetic-pulse", className)}
      style={{
        animationDuration: `${duration}s`,
        animationTimingFunction: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        animationIterationCount: "infinite",
      }}
    >
      {children}
    </div>
  )
}

export function KineticNumber({ value, className }: { value: string; className?: string }) {
  const ref = React.useRef<HTMLSpanElement>(null)
  const doneRef = React.useRef(false)

  React.useEffect(() => {
    if (doneRef.current) return
    const el = ref.current
    if (!el) return

    const num = parseInt(value.replace(/[^0-9]/g, ""), 10)
    if (isNaN(num)) return

    doneRef.current = true
    const duration = 1000
    const startTime = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.floor(eased * num)
      el.textContent = value.replace(/[0-9]+/, String(current))
      if (progress < 1) requestAnimationFrame(animate)
      else el.textContent = value
    }

    requestAnimationFrame(animate)
  }, [value])

  return <span ref={ref} className={className}>{value}</span>
}
