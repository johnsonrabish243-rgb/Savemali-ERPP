import * as React from "react"
import { gsap } from "gsap"

const COLORS = [
  "rgba(59, 130, 246, 0.08)",
  "rgba(16, 185, 129, 0.08)",
  "rgba(139, 92, 246, 0.08)",
  "rgba(6, 182, 212, 0.08)",
  "rgba(245, 158, 11, 0.06)",
]

export function WaterBubbles() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let w = canvas.width = canvas.offsetWidth
    let h = canvas.height = canvas.offsetHeight

    const bubbles: {
      x: number; y: number; r: number; vx: number; vy: number
      color: string; alpha: number; phase: number
    }[] = []

    const COUNT = 18
    for (let i = 0; i < COUNT; i++) {
      bubbles.push({
        x: Math.random() * w,
        y: h + Math.random() * h * 0.5,
        r: 20 + Math.random() * 55,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -(0.2 + Math.random() * 0.5),
        color: COLORS[i % COLORS.length],
        alpha: 0.2 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
      })
    }

    const tl = gsap.timeline({ repeat: -1 })
    let time = 0

    const animate = () => {
      ctx.clearRect(0, 0, w, h)
      time += 0.008

      for (const b of bubbles) {
        b.x += b.vx + Math.sin(time + b.phase) * 0.5
        b.y += b.vy

        if (b.y + b.r < 0) {
          b.y = h + b.r
          b.x = Math.random() * w
        }
        if (b.x < -b.r) b.x = w + b.r
        if (b.x > w + b.r) b.x = -b.r

        ctx.beginPath()
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
        ctx.fillStyle = b.color
        ctx.fill()

        ctx.beginPath()
        ctx.arc(b.x - b.r * 0.25, b.y - b.r * 0.25, b.r * 0.4, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${b.alpha * 0.15})`
        ctx.fill()

        ctx.beginPath()
        ctx.arc(b.x - b.r * 0.15, b.y - b.r * 0.4, b.r * 0.15, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${b.alpha * 0.25})`
        ctx.fill()
      }

      tl.progress(time / 30)
      requestAnimationFrame(animate)
    }

    const raf = requestAnimationFrame(animate)

    const resize = () => {
      w = canvas.width = canvas.offsetWidth
      h = canvas.height = canvas.offsetHeight
    }
    window.addEventListener("resize", resize)

    return () => {
      cancelAnimationFrame(raf)
      tl.kill()
      window.removeEventListener("resize", resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 size-full"
      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
    />
  )
}
