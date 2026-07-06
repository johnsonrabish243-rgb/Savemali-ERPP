import type { CaptchaChallenge, ChallengeType, CaptchaConfig } from "./types"
import { insforge } from "@/lib/supabase"

export interface ApiCreateChallengeResponse {
  id: string
  type: ChallengeType
  data: unknown
  token: string
  expires_at: string
}

export interface ApiVerifyResponse {
  success: boolean
  score: number
  message: string
}

export interface ApiStatsResponse {
  total_verifications: number
  success_rate: number
  fail_rate: number
  countries: Record<string, number>
  browsers: Record<string, number>
  devices: Record<string, number>
  os: Record<string, number>
  recent_logs: unknown[]
}

export const captchaApi = {
  async createChallenge(type?: ChallengeType): Promise<ApiCreateChallengeResponse | null> {
    try {
      const { data, error } = await insforge.database
        .from("captcha_challenges")
        .insert([{
          challenge_type: type ?? "shapes",
          expires_at: new Date(Date.now() + 30000).toISOString(),
        }])
        .select()
        .single()

      if (error || !data) return null
      const d = data as any
      return {
        id: d.id,
        type: d.challenge_type,
        data: d.challenge_data,
        token: d.token,
        expires_at: d.expires_at,
      }
    } catch { return null }
  },

  async verifyChallenge(challengeId: string, answer: unknown): Promise<ApiVerifyResponse | null> {
    try {
      const { data, error } = await insforge.database
        .from("captcha_challenges")
        .select("*, captcha_config!inner(*)")
        .eq("id", challengeId)
        .single()

      if (error || !data) return null
      const r = data as any

      if (r.is_verified) return { success: true, score: 100, message: "Already verified" }
      if (r.is_locked) return { success: false, score: 0, message: "Challenge locked" }
      if (new Date(r.expires_at) < new Date()) return { success: false, score: 0, message: "Challenge expired" }

      const isCorrect = JSON.stringify(answer) === JSON.stringify(r.challenge_data?.answer)

      if (isCorrect) {
        await insforge.database.from("captcha_challenges").update({ is_verified: true }).eq("id", challengeId)
        return { success: true, score: 100, message: "Verified" }
      }

      const newAttempts = (r.attempts_count || 0) + 1
      if (newAttempts >= 3) {
        await insforge.database.from("captcha_challenges").update({ attempts_count: newAttempts, is_locked: true }).eq("id", challengeId)
        return { success: false, score: 0, message: "Challenge locked" }
      }

      await insforge.database.from("captcha_challenges").update({ attempts_count: newAttempts }).eq("id", challengeId)
      return { success: false, score: 0, message: "Incorrect" }
    } catch { return null }
  },

  async logVerification(data: {
    workspace_id?: string
    user_id?: string
    challenge_type: string
    success: boolean
    score: number
    ip?: string
    user_agent?: string
    device?: string
    country?: string
    browser?: string
    os?: string
    time_ms: number
  }): Promise<void> {
    try {
      await insforge.database.from("captcha_logs").insert([data])
    } catch { }
  },

  async getStats(workspaceId: string): Promise<ApiStatsResponse | null> {
    try {
      const { data, error } = await insforge.database
        .from("captcha_logs")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(1000)

      if (error || !data) return null

      const logs = data as any[]
      const total = logs.length
      const successes = logs.filter((l) => l.success).length

      const countries: Record<string, number> = {}
      const browsers: Record<string, number> = {}
      const devices: Record<string, number> = {}
      const os: Record<string, number> = {}

      logs.forEach((l) => {
        if (l.country) countries[l.country] = (countries[l.country] || 0) + 1
        if (l.browser) browsers[l.browser] = (browsers[l.browser] || 0) + 1
        if (l.device) devices[l.device] = (devices[l.device] || 0) + 1
        if (l.os) os[l.os] = (os[l.os] || 0) + 1
      })

      return {
        total_verifications: total,
        success_rate: total > 0 ? (successes / total) * 100 : 0,
        fail_rate: total > 0 ? ((total - successes) / total) * 100 : 0,
        countries,
        browsers,
        devices,
        os,
        recent_logs: logs.slice(0, 50),
      }
    } catch { return null }
  },

  async saveConfig(workspaceId: string, config: Partial<CaptchaConfig>): Promise<boolean> {
    try {
      const { error } = await insforge.database
        .from("captcha_config")
        .upsert([{ workspace_id: workspaceId, ...config }])
      return !error
    } catch { return false }
  },

  async getConfig(workspaceId: string): Promise<Partial<CaptchaConfig> | null> {
    try {
      const { data, error } = await insforge.database
        .from("captcha_config")
        .select("*")
        .eq("workspace_id", workspaceId)
        .single()
      if (error || !data) return null
      return data as Partial<CaptchaConfig>
    } catch { return null }
  },
}
