import * as React from "react"
import { gsap } from "gsap"

type MorphState = "idle" | "ring" | "check"

interface Props {
  size?: number
  className?: string
  state?: MorphState
  autoCycle?: boolean
  interval?: number
}

export function LogoMorph({ size = 72, className, state: externalState, autoCycle = false, interval = 3000 }: Props) {
  const [internalState, setInternalState] = React.useState<MorphState>("idle")
  const [imgLoaded, setImgLoaded] = React.useState(false)
  const imgRef = React.useRef<HTMLImageElement>(null)
  const glowRef = React.useRef<HTMLDivElement>(null)
  const ringRef = React.useRef<SVGCircleElement>(null)
  const checkRef = React.useRef<SVGPathElement>(null)
  const state = externalState || internalState

  React.useEffect(() => {
    if (!autoCycle) return
    const states: MorphState[] = ["idle", "ring", "check", "ring"]
    let idx = 0
    const timer = setInterval(() => {
      idx = (idx + 1) % states.length
      setInternalState(states[idx])
    }, interval)
    return () => clearInterval(timer)
  }, [autoCycle, interval])

  React.useEffect(() => {
    if (!imgLoaded) return

    gsap.set([ringRef.current, checkRef.current], { transformOrigin: "center" })

    const tl = gsap.timeline({ defaults: { ease: "power2.out", duration: 0.3 } })

    if (state === "idle") {
      tl.to(glowRef.current, { scale: 1, opacity: 0.6, duration: 0.25 }, 0)
      tl.to(imgRef.current, { scale: 1, opacity: 1, duration: 0.25 }, 0)
      tl.set(ringRef.current, { strokeDashoffset: 2 * Math.PI * size * 0.44 })
      tl.to(ringRef.current, { scale: 1.3, opacity: 0, duration: 0.2 }, 0)
      tl.to(checkRef.current, { scale: 0.5, opacity: 0, duration: 0.15 }, 0)
    } else if (state === "ring") {
      tl.to(imgRef.current, { scale: 0.92, opacity: 0.85, duration: 0.25 }, 0)
      tl.to(glowRef.current, { scale: 1.15, opacity: 0.4, duration: 0.3 }, 0)
      tl.to(ringRef.current, { scale: 1, opacity: 1, strokeDashoffset: 0, duration: 0.4, ease: "back.out(1.5)" }, 0)
      tl.to(checkRef.current, { scale: 0.5, opacity: 0, duration: 0.15 }, 0)
    } else if (state === "check") {
      tl.to(checkRef.current, { scale: 1, opacity: 1, duration: 0.25, ease: "back.out(2)" }, 0)
      tl.to(imgRef.current, { scale: 0.95, opacity: 0.75, duration: 0.2 }, 0)
      tl.to(glowRef.current, { scale: 1.25, opacity: 0.3, duration: 0.25 }, 0)
      tl.to(ringRef.current, { scale: 1.05, opacity: 0.9, strokeDashoffset: 0, duration: 0.2 }, 0)
    }

    return () => tl.kill()
  }, [state, size, imgLoaded])

  const half = size / 2
  const ringR = size * 0.44
  const ringCirc = 2 * Math.PI * ringR

  return (
    <div className={className} style={{ width: size, height: size, position: "relative", flexShrink: 0 }}>
      <div
        ref={glowRef}
        style={{
          position: "absolute", inset: -size * 0.15, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59,130,246,0.25) 0%, transparent 70%)",
          opacity: 0.6, willChange: "transform",
        }}
      />
      <img
        ref={imgRef}
        src="/SaveMali_Logo.png"
        alt=""
        onLoad={() => setImgLoaded(true)}
        style={{
          width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%",
          position: "relative", zIndex: 1, willChange: "transform",
        }}
      />
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none" }}
      >
        <defs>
          <linearGradient id="logoRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
        <circle
          ref={ringRef}
          cx={half} cy={half} r={ringR}
          fill="none" stroke="url(#logoRingGrad)" strokeWidth={size * 0.06}
          strokeDasharray={ringCirc} strokeDashoffset={ringCirc}
          opacity={0}
        />
        <path
          ref={checkRef}
          d={`M ${size * 0.32} ${size * 0.5} L ${size * 0.44} ${size * 0.62} L ${size * 0.68} ${size * 0.38}`}
          fill="none" stroke="#22c55e" strokeWidth={size * 0.065}
          strokeLinecap="round" strokeLinejoin="round"
          opacity={0}
        />
      </svg>
    </div>
  )
}
