import * as React from "react"
import { Shield, AlertTriangle, Clock, RefreshCw, Check, X, Loader2, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/lib/i18n"
import { sha256, generateSalt, generateSessionId, getRandomChallenge, type ChallengeData } from "@/lib/crypto"
import { insforge } from "@/lib/supabase"

interface Props {
  userId: string
  onSuccess: () => void
  onLockout: () => void
}

export function SavemaliChallenge({ userId, onSuccess, onLockout }: Props) {
  const { lang } = useLanguage()
  const fr = lang === "fr"

  const [loading, setLoading] = React.useState(true)
  const [challenge, setChallenge] = React.useState<ChallengeData | null>(null)
  const [challengeId, setChallengeId] = React.useState<string | null>(null)
  const [sessionId] = React.useState(generateSessionId)
  const [answer, setAnswer] = React.useState("")
  const [attempts, setAttempts] = React.useState(0)
  const [isLocked, setIsLocked] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [timer, setTimer] = React.useState(30)
  const [submitting, setSubmitting] = React.useState(false)

  // Arrangement state
  const [arranged, setArranged] = React.useState<string[]>([])
  const [draggedIdx, setDraggedIdx] = React.useState<number | null>(null)

  // Pattern state
  const [selectedPattern, setSelectedPattern] = React.useState<number[]>([])

  const generateAndStore = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    setAnswer("")
    setArranged([])
    setSelectedPattern([])
    setTimer(30)

    const c = getRandomChallenge()
    setChallenge(c)

    const answerHash = await sha256(c.answer + c.salt)
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 30000)

    const { data: chalData, error: chalError } = await insforge.database
      .from("verification_challenges")
      .insert([{
        user_id: userId,
        session_id: sessionId,
        challenge_type: c.type,
        challenge_data: c.data,
        answer_hash: answerHash,
        salt: c.salt,
        expires_at: expiresAt.toISOString(),
        attempts_count: 0,
      }])
      .select()
      .single()

    if (chalError) {
      console.error("Challenge insert error:", chalError)
      setError(fr ? "Erreur de création du défi. Réessayez." : "Challenge creation error. Retry.")
      setLoading(false)
      return
    }

    if (chalData) setChallengeId((chalData as any).id)
    if (c.type === "arrangement") {
      setArranged(c.data.items.map((i: any) => i.id))
    }
    setLoading(false)
  }, [userId, sessionId])

  React.useEffect(() => { generateAndStore() }, [generateAndStore])

  React.useEffect(() => {
    if (isLocked || !challengeId) return
    const interval = setInterval(async () => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          setError(fr ? "Temps écoulé. Nouveau défi..." : "Time expired. New challenge...")
          setTimeout(() => generateAndStore(), 1000)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isLocked, challengeId, fr, generateAndStore])

  const handleSubmit = async () => {
    if (!challenge || !challengeId || submitting) return
    setSubmitting(true)
    setError(null)

    const { data: record } = await insforge.database
      .from("verification_challenges")
      .select("*")
      .eq("id", challengeId)
      .single()

    if (!record) {
      setError(fr ? "Erreur de vérification" : "Verification error")
      setSubmitting(false)
      return
    }

    const r = record as any

    if (r.is_locked) {
      setIsLocked(true)
      onLockout()
      setSubmitting(false)
      return
    }

    if (new Date(r.expires_at) < new Date()) {
      setError(fr ? "Temps écoulé. Nouveau défi..." : "Time expired. New challenge...")
      setTimeout(() => generateAndStore(), 1000)
      setSubmitting(false)
      return
    }

    let userAnswer = ""
    if (challenge.type === "math") {
      userAnswer = answer.trim()
    } else if (challenge.type === "arrangement") {
      userAnswer = arranged.join(",")
    } else if (challenge.type === "pattern") {
      userAnswer = selectedPattern.sort((a, b) => a - b).join(",")
    }

    const userHash = await sha256(userAnswer + r.salt)

    if (userHash === r.answer_hash) {
      await insforge.database
        .from("verification_challenges")
        .update({ is_verified: true })
        .eq("id", challengeId)
      onSuccess()
    } else {
      const newAttempts = (r.attempts_count || 0) + 1
      setAttempts(newAttempts)

      if (newAttempts >= 3) {
        await insforge.database
          .from("verification_challenges")
          .update({ attempts_count: newAttempts, is_locked: true })
          .eq("id", challengeId)
        setIsLocked(true)
        setSubmitting(false)
        onLockout()
        return
      }

      await insforge.database
        .from("verification_challenges")
        .update({ attempts_count: newAttempts })
        .eq("id", challengeId)

      setError(fr ? "Réponse incorrecte. Réessayez." : "Wrong answer. Try again.")
      setAnswer("")
      setSelectedPattern([])
      setSubmitting(false)
    }
  }

  const remaining = Math.max(0, timer)
  const timerPercent = (remaining / 30) * 100
  const showWarning = attempts >= 2

  if (loading) return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <Loader2 className="size-8 animate-spin text-accent" />
      <p className="text-sm text-muted-foreground">{fr ? "Préparation du défi..." : "Preparing challenge..."}</p>
    </div>
  )

  if (!challenge) return null

  return (
    <div className={cn("space-y-5 rounded-xl border p-6 transition-all", showWarning ? "border-destructive/40 bg-destructive/[0.03]" : "border-border bg-card")}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="size-5 text-accent" />
          <span className="text-sm font-semibold text-foreground">{fr ? "Vérification de sécurité" : "Security verification"}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            <span className={cn("font-mono font-bold", remaining <= 10 ? "text-destructive" : "text-foreground")}>{remaining}s</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {fr ? "Tentatives" : "Attempts"}: <span className={cn("font-bold", showWarning ? "text-destructive" : "text-foreground")}>{attempts}</span> / 3
          </div>
        </div>
      </div>

      {/* Timer bar */}
      <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-1000", remaining <= 10 ? "bg-destructive" : "bg-accent")} style={{ width: `${timerPercent}%` }} />
      </div>

      {/* Warning */}
      {showWarning && (
        <Alert variant="destructive" className="border-destructive/30 bg-destructive/5 py-2">
          <AlertTriangle className="size-4" />
          <AlertDescription className="text-xs font-medium">
            {fr ? "Un dernier échec verrouillera votre session." : "One more failed attempt will lock your session."}
          </AlertDescription>
        </Alert>
      )}

      {/* Error */}
      {error && !showWarning && (
        <Alert variant="destructive" className="py-2">
          <X className="size-4" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {/* Question */}
      <div>
        <p className="text-sm font-medium text-foreground mb-3">
          {fr ? "Résolvez ce défi pour prouver que vous êtes humain" : "Solve this challenge to prove you are human"}
        </p>
        <p className="text-base font-bold text-center text-foreground py-2">{challenge.question}</p>
      </div>

      {/* Challenge UI */}
      {challenge.type === "math" && (
        <Input
          type="number"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={fr ? "Votre réponse..." : "Your answer..."}
          className="text-center text-lg font-bold h-12"
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          autoFocus
        />
      )}

      {challenge.type === "arrangement" && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground text-center">{fr ? "Glissez-déposez pour réordonner" : "Drag to reorder"}</p>
          <div className="flex flex-col gap-2">
            {arranged.map((id, idx) => {
              const item = challenge.data.items.find((i: any) => i.id === id)
              return (
                <div
                  key={id}
                  draggable
                  onDragStart={() => setDraggedIdx(idx)}
                  onDragOver={(e) => { e.preventDefault(); if (draggedIdx === null || draggedIdx === idx) return; const next = [...arranged]; const [removed] = next.splice(draggedIdx, 1); next.splice(idx, 0, removed); setArranged(next); setDraggedIdx(idx) }}
                  onDragEnd={() => setDraggedIdx(null)}
                  className={cn("flex items-center gap-3 rounded-lg border bg-card px-4 py-3 cursor-grab active:cursor-grabbing transition-colors hover:bg-muted/30", draggedIdx === idx && "opacity-50")}
                >
                  <GripVertical className="size-4 text-muted-foreground shrink-0" />
                  <span className="text-2xl">{item?.emoji}</span>
                  <span className="text-sm font-medium text-foreground">{item?.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{idx + 1}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {challenge.type === "pattern" && (
        <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
          {challenge.data.items.map((item: any, idx: number) => {
            const sel = selectedPattern.includes(idx)
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedPattern((prev) => prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx])}
                className={cn("flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-all", sel ? "border-accent bg-accent/10" : "border-border bg-card hover:border-muted-foreground/30")}
              >
                <span className="text-3xl">{item.emoji}</span>
                <span className="text-[10px] text-muted-foreground">{item.label}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => { generateAndStore(); setAttempts(0) }}
        >
          <RefreshCw className="size-3.5" />
          {fr ? "Nouveau code" : "New code"}
        </Button>
        <Button
          size="sm"
          className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 gap-1.5"
          onClick={handleSubmit}
          disabled={submitting || (challenge.type === "math" && !answer.trim())}
        >
          {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
          {fr ? "Vérifier" : "Verify"}
        </Button>
      </div>
    </div>
  )
}
