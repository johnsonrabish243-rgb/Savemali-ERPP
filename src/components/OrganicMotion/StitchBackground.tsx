import * as React from "react"

interface Props {
  className?: string
}

export function StitchBackground({ className = "" }: Props) {
  const rootRef = React.useRef<HTMLDivElement>(null)
  const blobsRef = React.useRef<HTMLDivElement[]>([])

  React.useEffect(() => {
    const el = rootRef.current
    if (!el) return

    const blobs = blobsRef.current.filter(Boolean)
    let mx = 0, my = 0, scrollY = 0
    let curMx = 0, curMy = 0, curScroll = 0
    let raf: number
    let isVisible = true

    const observer = new IntersectionObserver(
      ([entry]) => { isVisible = entry.isIntersecting },
      { threshold: 0 }
    )
    observer.observe(el)

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t

    const tick = () => {
      if (!isVisible) {
        raf = requestAnimationFrame(tick)
        return
      }

      curMx = lerp(curMx, mx, 0.06)
      curMy = lerp(curMy, my, 0.06)
      curScroll = lerp(curScroll, scrollY, 0.04)

      const factors = [
        { x: 25, y: 18, s: 0.12 },
        { x: -16, y: -12, s: 0.08 },
        { x: 10, y: 15, s: 0.10 },
        { x: -20, y: 10, s: 0.06 },
      ]

      blobs.forEach((blob, i) => {
        if (!blob || !factors[i]) return
        const f = factors[i]
        const tx = curMx * f.x
        const ty = curMy * f.y + curScroll * f.s
        blob.style.transform = `translate3d(${tx}px, ${ty}px, 0)`
      })

      raf = requestAnimationFrame(tick)
    }

    const handleMouse = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      mx = (e.clientX - rect.left) / rect.width - 0.5
      my = (e.clientY - rect.top) / rect.height - 0.5
    }

    const handleScroll = () => {
      scrollY = window.scrollY
    }

    raf = requestAnimationFrame(tick)
    window.addEventListener("mousemove", handleMouse, { passive: true })
    window.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      observer.disconnect()
      window.removeEventListener("mousemove", handleMouse)
      window.removeEventListener("scroll", handleScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  const setBlobRef = (i: number) => (el: HTMLDivElement | null) => {
    blobsRef.current[i] = el!
  }

  return (
    <div
      ref={rootRef}
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <svg className="absolute" width="0" height="0">
        <defs>
          <filter id="stitch-morph">
            <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="2" result="noise">
              <animate attributeName="baseFrequency" values="0.012;0.016;0.012" dur="25s" repeatCount="indefinite" />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="30" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="stitch-morph-2">
            <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="2" seed="5" result="noise">
              <animate attributeName="baseFrequency" values="0.015;0.020;0.015" dur="20s" repeatCount="indefinite" />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="25" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      <div className="stitch-grid" />

      <div ref={setBlobRef(0)} className="absolute" style={{ left: "-5%", top: "-20%", width: "60%", height: "80%" }}>
        <div
          className="absolute inset-0 stitch-sand-1"
          style={{
            background: "radial-gradient(ellipse at 35% 45%, rgba(147,51,234,0.70) 0%, rgba(126,34,206,0.35) 30%, rgba(88,28,135,0.10) 60%, transparent 78%)",
            filter: "blur(25px) url(#stitch-morph)",
          }}
        />
      </div>

      <div ref={setBlobRef(1)} className="absolute" style={{ right: "-10%", top: "-15%", width: "55%", height: "70%" }}>
        <div
          className="absolute inset-0 stitch-sand-2"
          style={{
            background: "radial-gradient(ellipse at 65% 40%, rgba(79,70,229,0.65) 0%, rgba(67,56,202,0.30) 30%, rgba(49,46,129,0.08) 60%, transparent 78%)",
            filter: "blur(22px) url(#stitch-morph-2)",
          }}
        />
      </div>

      <div ref={setBlobRef(2)} className="absolute" style={{ left: "18%", bottom: "-25%", width: "50%", height: "65%" }}>
        <div
          className="absolute inset-0 stitch-sand-3"
          style={{
            background: "radial-gradient(ellipse at 50% 55%, rgba(6,182,212,0.55) 0%, rgba(20,184,166,0.22) 35%, transparent 72%)",
            filter: "blur(20px) url(#stitch-morph)",
          }}
        />
      </div>

      <div ref={setBlobRef(3)} className="absolute" style={{ right: "3%", top: "10%", width: "40%", height: "50%" }}>
        <div
          className="absolute inset-0 stitch-sand-4"
          style={{
            background: "radial-gradient(ellipse at 50% 50%, rgba(236,72,153,0.45) 0%, rgba(219,39,119,0.15) 40%, transparent 72%)",
            filter: "blur(18px) url(#stitch-morph-2)",
          }}
        />
      </div>

      <div className="stitch-blob-accent stitch-accent-1" />
      <div className="stitch-blob-accent stitch-accent-2" />
      <div className="stitch-beam" />
      <div className="stitch-edge-glow" />
    </div>
  )
}
