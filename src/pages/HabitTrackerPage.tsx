import * as React from "react"
import { useAuth } from "@/hooks/use-auth"
import { useLanguage } from "@/lib/i18n"
import { logAudit } from "@/lib/audit"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageFooter } from "@/components/PageFooter"
import { Plus, Trash2, CheckCircle2, Circle, ChevronLeft, Target, Flame } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Page } from "@/App"

interface Habit {
  id: string
  name: string
  createdAt: number
  doneToday: boolean
  streak: number
  lastDoneDate: string | null
}

interface Props {
  onNavigate: (p: Page) => void
}

const STORAGE_KEY = "savemali_habits"
const MAX_HABITS = 10
const RATE_LIMIT_MS = 2000

function loadHabits(): Habit[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveHabits(h: Habit[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(h))
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function HabitTrackerPage({ onNavigate }: Props) {
  const { user, loading: authLoading } = useAuth()
  const { lang } = useLanguage()
  const fr = lang === "fr"
  const [habits, setHabits] = React.useState<Habit[]>(loadHabits)
  const [newName, setNewName] = React.useState("")
  const [lastAddTime, setLastAddTime] = React.useState(0)

  const today = todayStr()

  React.useEffect(() => { saveHabits(habits) }, [habits])

  function addHabit() {
    const name = newName.trim()
    if (!name || habits.length >= MAX_HABITS) return
    const now = Date.now()
    if (now - lastAddTime < RATE_LIMIT_MS) return
    setLastAddTime(now)
    const habit: Habit = {
      id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
      name,
      createdAt: now,
      doneToday: false,
      streak: 0,
      lastDoneDate: null,
    }
    setHabits((prev) => [...prev, habit])
    setNewName("")
    logAudit({ action: "user_created", actor_id: user?.id, actor_email: user?.email, metadata: { feature: "habit", name } })
  }

  function toggleHabit(id: string) {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h
        if (h.doneToday) return { ...h, doneToday: false }
        const newStreak = h.lastDoneDate === today ? h.streak : h.streak + 1
        return { ...h, doneToday: true, streak: newStreak, lastDoneDate: today }
      })
    )
  }

  function deleteHabit(id: string) {
    setHabits((prev) => prev.filter((h) => h.id !== id))
    logAudit({ action: "user_deleted", actor_id: user?.id, actor_email: user?.email, metadata: { feature: "habit" } })
  }

  function resetDaily() {
    setHabits((prev) => prev.map((h) => ({ ...h, doneToday: false })))
  }

  if (authLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <div className="size-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    )
  }

  const doneCount = habits.filter((h) => h.doneToday).length
  const totalStreak = habits.reduce((max, h) => Math.max(max, h.streak), 0)
  const completed = habits.length > 0 ? Math.round((doneCount / habits.length) * 100) : 0

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-4 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="size-9 shrink-0" onClick={() => onNavigate("dashboard")}>
            <ChevronLeft className="size-5" />
          </Button>
          <div className="flex size-10 items-center justify-center rounded-xl bg-accent/10">
            <Target className="size-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">{fr ? "Suivi d'habitudes" : "Habit Tracker"}</h1>
            <p className="text-sm text-muted-foreground">{fr ? "Suivez vos habitudes quotidiennes" : "Track your daily habits"}</p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{fr ? "Aujourd'hui" : "Today"}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{doneCount}/{habits.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{fr ? "Réalisé" : "Completed"}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{completed}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{fr ? "Meilleure série" : "Best Streak"}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-1.5">
              <p className="text-2xl font-bold">{totalStreak}</p>
              <Flame className="size-5 text-orange-500" />
            </CardContent>
          </Card>
        </div>

        <div className="mb-4 flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addHabit()}
            placeholder={fr ? "Nouvelle habitude..." : "New habit..."}
            className="flex-1"
            maxLength={60}
          />
          <Button onClick={addHabit} disabled={!newName.trim() || habits.length >= MAX_HABITS} className="gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90 shrink-0">
            <Plus className="size-4" />
            {fr ? "Ajouter" : "Add"}
          </Button>
        </div>
        {habits.length >= MAX_HABITS && (
          <p className="mb-3 text-xs text-muted-foreground">{fr ? "Maximum 10 habitudes atteint" : "Maximum 10 habits reached"}</p>
        )}

        {habits.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12">
              <Target className="size-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground text-center">
                {fr ? "Ajoutez votre première habitude à suivre" : "Add your first habit to track"}
              </p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          {habits.map((h) => (
            <div
              key={h.id}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-4 py-3 transition-all",
                h.doneToday ? "border-accent/30 bg-accent/[0.03]" : "border-border bg-card"
              )}
            >
              <button onClick={() => toggleHabit(h.id)} className="shrink-0">
                {h.doneToday ? (
                  <CheckCircle2 className="size-6 text-accent" />
                ) : (
                  <Circle className="size-6 text-muted-foreground/50 hover:text-muted-foreground transition-colors" />
                )}
              </button>
              <span className={cn("flex-1 text-sm font-medium", h.doneToday ? "text-muted-foreground line-through" : "text-foreground")}>
                {h.name}
              </span>
              {h.streak > 0 && (
                <span className="flex items-center gap-1 text-xs text-orange-500 shrink-0">
                  <Flame className="size-3" /> {h.streak}
                </span>
              )}
              <button onClick={() => deleteHabit(h.id)} className="shrink-0 text-muted-foreground/50 hover:text-destructive transition-colors">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>

        {habits.length > 0 && (
          <div className="mt-4 flex justify-end">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={resetDaily}>
              {fr ? "Réinitialiser le quotidien" : "Reset daily"}
            </Button>
          </div>
        )}
      </div>
      <PageFooter onNavigate={onNavigate as (p: string) => void} />
    </div>
  )
}
