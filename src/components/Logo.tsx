import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  size?: "sm" | "md" | "lg"
  imgClassName?: string
}

const sizeMap = {
  sm: { container: "size-7", text: "text-xs", full: "text-sm" },
  md: { container: "size-9", text: "text-sm", full: "text-base" },
  lg: { container: "size-12", text: "text-base", full: "text-xl" },
}

export function Logo({ className, size = "md", imgClassName }: LogoProps) {
  const s = sizeMap[size]

  return (
    <div className={cn("flex items-center gap-2.5 shrink-0", className)}>
      <div className={cn("relative shrink-0 overflow-hidden rounded-xl shadow-sm", s.container)}>
          <img
            src="/SaveMali_Logo.png"
            alt="SaveMali"
            className={cn("h-full w-full object-cover", imgClassName)}
          onError={(e) => {
            const img = e.currentTarget
            img.style.display = "none"
            const fallback = img.nextElementSibling as HTMLElement
            if (fallback) fallback.style.display = "flex"
          }}
        />
        <div
          className="hidden h-full w-full items-center justify-center bg-[#f97316] rounded-xl"
          aria-hidden
        >
          <span className={cn("font-extrabold text-white", s.text)}>S</span>
        </div>
      </div>
      <span className={cn("font-extrabold tracking-tight text-foreground", s.full)}>
        Save<span className="text-[#f97316]">Mali</span>
      </span>
    </div>
  )
}
