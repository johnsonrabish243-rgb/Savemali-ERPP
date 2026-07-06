import * as React from "react"

interface Props {
  className?: string
}

const BLOBS = [
  { size: 70, x: 5, y: -5, color1: "rgba(59,130,246,0.18)", color2: "rgba(59,130,246,0.05)", duration: 14, delay: 0, moveX: 12, moveY: 8 },
  { size: 55, x: 50, y: -15, color1: "rgba(16,185,129,0.14)", color2: "rgba(16,185,129,0.04)", duration: 18, delay: -3, moveX: -10, moveY: 6 },
  { size: 60, x: 65, y: 45, color1: "rgba(139,92,246,0.16)", color2: "rgba(139,92,246,0.04)", duration: 12, delay: -5, moveX: 8, moveY: -10 },
  { size: 40, x: 20, y: 55, color1: "rgba(6,182,212,0.12)", color2: "rgba(6,182,212,0.03)", duration: 16, delay: -2, moveX: -6, moveY: 7 },
  { size: 45, x: -10, y: 30, color1: "rgba(245,158,11,0.08)", color2: "rgba(245,158,11,0.02)", duration: 20, delay: -7, moveX: 9, moveY: -5 },
  { size: 50, x: 35, y: 70, color1: "rgba(59,130,246,0.10)", color2: "rgba(59,130,246,0.03)", duration: 15, delay: -4, moveX: -8, moveY: 6 },
]

export function AuroraBackground({ className = "" }: Props) {
  const rootRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const handleMouse = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2
      el.style.setProperty("--aurora-mx", String(x))
      el.style.setProperty("--aurora-my", String(y))
    }
    window.addEventListener("mousemove", handleMouse, { passive: true })
    return () => window.removeEventListener("mousemove", handleMouse)
  }, [])

  return (
    <div
      ref={rootRef}
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={{ "--aurora-mx": 0, "--aurora-my": 0 } as React.CSSProperties}
    >
      {BLOBS.map((b, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${b.size}%`,
            paddingBottom: `${b.size}%`,
            left: `${b.x}%`,
            top: `${b.y}%`,
            background: `radial-gradient(circle at 50% 50%, ${b.color1} 0%, ${b.color2} 50%, transparent 70%)`,
            willChange: "transform",
            transform: "translate3d(0,0,0)",
            animation: `aurora-drift-${i} ${b.duration}s ${b.delay}s ease-in-out infinite alternate`,
            transition: "transform 0.4s ease-out",
            filter: "blur(40px)",
          }}
          onMouseMove={() => {}} // trigger CSS
        />
      ))}
      <style>{`
        ${BLOBS.map((b, i) => `
          @keyframes aurora-drift-${i} {
            0%   { transform: translate3d(0,0,0) scale(1); }
            50%  { transform: translate3d(${b.moveX}px, ${b.moveY}px, 0) scale(1.08); }
            100% { transform: translate3d(${-b.moveX * 0.6}px, ${-b.moveY * 0.6}px, 0) scale(0.95); }
          }
        `).join("\n")}
        .aurora-parallax {
          --px: calc(var(--aurora-mx, 0) * 15px);
          --py: calc(var(--aurora-my, 0) * 10px);
          transform: translate3d(var(--px), var(--py), 0) !important;
        }
      `}</style>
    </div>
  )
}

export function AuroraLayer({ className = "" }: Props) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {/* base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand/[0.03] via-transparent to-accent/[0.03]" />
      {/* large soft ambient */}
      <div
        className="absolute -left-1/4 -top-1/4 size-3/4 rounded-full opacity-30"
        style={{
          background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)",
          filter: "blur(80px)",
          willChange: "transform",
          animation: "aurora-ambient-1 20s ease-in-out infinite alternate",
        }}
      />
      <div
        className="absolute -bottom-1/4 -right-1/4 size-3/4 rounded-full opacity-25"
        style={{
          background: "radial-gradient(circle, rgba(16,185,129,0.10) 0%, transparent 70%)",
          filter: "blur(80px)",
          willChange: "transform",
          animation: "aurora-ambient-2 25s ease-in-out infinite alternate",
        }}
      />
      <div
        className="absolute left-1/3 top-1/3 size-1/2 rounded-full opacity-20"
        style={{
          background: "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)",
          filter: "blur(80px)",
          willChange: "transform",
          animation: "aurora-ambient-3 18s ease-in-out infinite alternate",
        }}
      />
      <style>{`
        @keyframes aurora-ambient-1 {
          0%   { transform: translate3d(0,0,0) scale(1); }
          50%  { transform: translate3d(30px,-20px,0) scale(1.1); }
          100% { transform: translate3d(-20px,15px,0) scale(0.9); }
        }
        @keyframes aurora-ambient-2 {
          0%   { transform: translate3d(0,0,0) scale(1); }
          50%  { transform: translate3d(-25px,15px,0) scale(0.95); }
          100% { transform: translate3d(20px,-25px,0) scale(1.05); }
        }
        @keyframes aurora-ambient-3 {
          0%   { transform: translate3d(0,0,0) scale(1); }
          50%  { transform: translate3d(15px,10px,0) scale(1.15); }
          100% { transform: translate3d(-15px,-10px,0) scale(0.85); }
        }
      `}</style>
    </div>
  )
}
