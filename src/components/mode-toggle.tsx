import { Moon, Sun, Monitor } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

interface ModeToggleProps {
  isPublic?: boolean
}

export function ModeToggle({ isPublic }: ModeToggleProps) {
  const { setTheme, theme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={cn(
          "inline-flex items-center justify-center rounded-lg p-2 transition-all duration-200",
          isPublic
            ? "text-white/60 hover:text-white hover:bg-white/[0.06]"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}>
          <Sun className="size-4 dark:hidden" />
          <Moon className="size-4 hidden dark:block" />
          <span className="sr-only">Toggle theme</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[130px]">
        <DropdownMenuItem onClick={() => setTheme("light")} className="gap-2">
          <Sun className="size-4" />
          <span>Light</span>
          {theme === "light" && <span className="ml-auto text-xs text-brand">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} className="gap-2">
          <Moon className="size-4" />
          <span>Dark</span>
          {theme === "dark" && <span className="ml-auto text-xs text-brand">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")} className="gap-2">
          <Monitor className="size-4" />
          <span>System</span>
          {theme === "system" && <span className="ml-auto text-xs text-brand">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
