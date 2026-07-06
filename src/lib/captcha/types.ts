export type CaptchaPhase = "idle" | "challenge" | "verifying" | "verified" | "error"

export type ChallengeType = "shapes" | "images" | "people" | "puzzle" | "sequential" | "audio"

export type WidgetSize = "compact" | "default" | "large"

export type WidgetTheme = "light" | "dark" | "auto"

export type WidgetMode = "visible" | "invisible" | "enterprise"

export type Language = "fr" | "en" | "es" | "pt" | "ar" | "sw"

export interface CaptchaConfig {
  size: WidgetSize
  theme: WidgetTheme
  mode: WidgetMode
  lang: Language
  animations: boolean
  riskThreshold: number
  challengeTypes: ChallengeType[]
}

export interface ChallengeResult {
  success: boolean
  score: number
  attempts: number
  timeMs: number
}

export interface MediaItem {
  id: string
  category: string
  tags: string[]
  url: string
  thumbnailUrl?: string
  difficulty: number
  lang?: Language
  aiScore?: number
  width?: number
  height?: number
}

export interface BehavioralData {
  mouseMovements: { x: number; y: number; t: number }[]
  clickEvents: { x: number; y: number; t: number }[]
  touchEvents?: { x: number; y: number; t: number; force?: number }[]
  keystrokes?: { key: string; t: number; interval?: number }[]
  scrollEvents?: { y: number; t: number }[]
  viewport: { width: number; height: number }
  userAgent: string
  timeSinceLoad: number
}

export interface RiskAssessment {
  score: number
  isAutomated: boolean
  confidence: number
  signals: RiskSignal[]
}

export interface RiskSignal {
  name: string
  weight: number
  value: number
  description: string
}

export interface CaptchaChallenge {
  id: string
  type: ChallengeType
  data: unknown
  difficulty: number
  expiresAt: number
  token: string
}

export interface CaptchaWidgetProps {
  onVerify: () => void
  size?: WidgetSize
  theme?: WidgetTheme
  mode?: WidgetMode
  lang?: Language
  challengeTypes?: ChallengeType[]
}

export const DEFAULT_LANGUAGES: Language[] = ["fr", "en", "es", "pt", "ar", "sw"]

export const LANGUAGE_LABELS: Record<Language, string> = {
  fr: "Français",
  en: "English",
  es: "Español",
  pt: "Português",
  ar: "العربية",
  sw: "Kiswahili",
}
