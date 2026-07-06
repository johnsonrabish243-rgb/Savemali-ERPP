import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function safeParseFloat(v: string, fallback = 0, allowNegative = false): number {
  const n = parseFloat(v)
  if (isNaN(n) || !isFinite(n)) return fallback
  if (!allowNegative && n < 0) return fallback
  return n
}

export function safeParseInt(v: string, fallback = 0, allowNegative = false): number {
  const n = parseInt(v, 10)
  if (isNaN(n) || !isFinite(n)) return fallback
  if (!allowNegative && n < 0) return fallback
  return n
}
