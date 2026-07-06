export type Currency = "USD" | "CDF"

const STORAGE_KEY = "savemali-currency"
const RATE_KEY = "savemali-exchange-rate"

const DEFAULT_RATE = 2800 // 1 USD ≈ 2800 CDF (fallback)

export interface StoredRate {
  rate: number
  updatedAt: string
}

export function getCurrency(): Currency {
  return (localStorage.getItem(STORAGE_KEY) as Currency) || "CDF"
}

export function setCurrency(c: Currency) {
  localStorage.setItem(STORAGE_KEY, c)
}

export function getExchangeRate(): number {
  try {
    const raw = localStorage.getItem(RATE_KEY)
    if (raw) {
      const stored: StoredRate = JSON.parse(raw)
      // Use cached rate if less than 6 hours old
      const age = Date.now() - new Date(stored.updatedAt).getTime()
      if (age < 6 * 60 * 60 * 1000) {
        return stored.rate
      }
    }
  } catch {}
  return DEFAULT_RATE
}

export function setExchangeRate(rate: number) {
  const data: StoredRate = { rate, updatedAt: new Date().toISOString() }
  localStorage.setItem(RATE_KEY, JSON.stringify(data))
}

/**
 * Auto-fetch the latest USD→CDF rate from a free API.
 * Falls back to cached or default rate on error.
 */
export async function fetchExchangeRate(): Promise<number> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD")
    if (!res.ok) throw new Error("API error")
    const data = await res.json()
    const cdfRate = data.rates?.CDF
    if (cdfRate && typeof cdfRate === "number" && cdfRate > 100) {
      setExchangeRate(cdfRate)
      return cdfRate
    }
  } catch {}
  return getExchangeRate()
}

export const currencySymbols: Record<Currency, string> = {
  USD: "$",
  CDF: "FC",
}

export function formatCurrency(valueFc: number, currency?: Currency, showCents = false): string {
  const fractionDigits = showCents ? 2 : 0
  const formatted = showCents ? valueFc : Math.round(valueFc)
  return `${new Intl.NumberFormat("fr-FR", { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }).format(formatted)} FC`
}

export function convertToCdf(valueFc: number): number {
  return Math.round(valueFc)
}
