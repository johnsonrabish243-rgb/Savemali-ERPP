import { gsap } from "gsap"
import * as React from "react"

/** Animate page entrance. Call inside the page component. */
export function usePageEntrance(deps: unknown[] = []) {
  const rootRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(".page-header",
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
      )
      gsap.fromTo(".page-content",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power2.out", delay: 0.1 }
      )
      gsap.fromTo(".page-card",
        { opacity: 0, y: 16, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "power2.out", stagger: 0.06, delay: 0.2 }
      )
    }, rootRef)
    return () => ctx.revert()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return rootRef
}
