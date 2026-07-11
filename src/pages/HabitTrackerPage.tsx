import * as React from "react"
import { useAuth } from "@/hooks/use-auth"
import { useLanguage } from "@/lib/i18n"
import { logAudit } from "@/lib/audit"
import { insforge } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageFooter } from "@/components/PageFooter"
import { Plus, Trash2, CheckCircle2, Circle, ChevronLeft, Target, Flame } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { Page } from "@/App"

interface Habit {
  id: string
  name: string
  streak: number
  created_at: string
}

interface HabitLog {
  habit_id: string
  done_date: string
}

interface Props {
  onNavigate: (p: Page) => void
}

const MAX_HABITS = 10
const RATE_LIMIT_MS = 2000

export function HabitTrackerPage({ onNavigate }: Props) {
  const { user, workspace } = useAuth()
  const { lang } = useLanguage()
  const fr = lang === "fr"
  const [habits, setHabits] = React.useState<Habit[]>([])
  const [logs, setLogs] = React.useState<HabitLog[]>([])
  const [newName, setNewName] = React.useState("")
  const [lastAddTime, setLastAddTime] = React.useState(0)
  const [loading, setLoading] = React.useState(true)

  const today = new Date().toISOString().slice(0, 10)

  React.useEffect(() => {
    if (!workspace?.id || !user?.id) return
    setLoading(true)
    Promise.all([
      insforge.database.from("habits").select("*").eq("workspace_id", workspace.id).eq("user_id", user.id).order("created_at", { ascending: true }),
      insforge.database.from("habit_logs").select("habit_id, done_date").eq("user_id", user.id).eq("done_date", today),
    ]).then(([habitsRes, logsRes]) => {
      if (habitsRes.error) toast.error(fr ? "Erreur chargement habitudes" : "Error loading habits")
      else setHabits(habitsRes.data as Habit[])
      if (logsRes.error) toast.error(fr ? "Erreur chargement progression" : "Error loading progress")
      else setLogs(logsRes.data as HabitLog[])
    }).catch(() => toast.error(fr ? "Erreur de connexion" : "Connection error"))
    .finally(() => setLoading(false))
  }, [workspace?.id, user?.id, today])

  async function addHabit() {
    const name = newName.trim()
    if (!name || habits.length >= MAX_HABITS || !workspace?.id || !user?.id) return
    const now = Date.now()
    if (now - lastAddTime < RATE_LIMIT_MS) return
    setLastAddTime(now)

    const { data, error } = await insforge.database.from("habits").insert([{
      workspace_id: workspace.id,
      user_id: user.id,
      name,
    }]).select().single()

    if (error) {
      if (error.message?.includes("unique") || error.code === "23505") {
        toast.error(fr ? "Cette habitude existe déjà" : "This habit already exists")
      } else {
        toast.error(fr ? "Erreur lors de l'ajout" : "Error adding habit")
      }
      return
    }

    setHabits((prev) => [...prev, data as Habit])
    setNewName("")
    logAudit({ action: "user_created", actor_id: user.id, metadata: { feature: "habit", name } })
  }

  async function toggleHabit(habitId: string) {
    if (!user?.id) return
    const isDone = logs.some((l) => l.habit_id === habitId)

    if (isDone) {
      const { error } = await insforge.database
        .from("habit_logs")
        .delete()
        .eq("habit_id", habitId)
        .eq("done_date", today)
        .eq("user_id", user.id)
      if (error) {
        toast.error(fr ? "Erreur de mise à jour" : "Update error")
        return
      }
      setLogs((prev) => prev.filter((l) => l.habit_id !== habitId))
    } else {
      const { error: logError } = await insforge.database
        .from("habit_logs")
        .insert([{ habit_id: habitId, user_id: user.id, done_date: today }])
      if (logError) {
        toast.error(fr ? "Erreur de mise à jour" : "Update error")
        return
      }
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
      const { data: prevLog } = await insforge.database
        .from("habit_logs")
        .select("id")
        .eq("habit_id", habitId)
        .eq("done_date", yesterday)
        .maybeSingle()
      const newStreak = prevLog
        ? (habits.find((h) => h.id === habitId)?.streak ?? 0) + 1
        : 1
      await insforge.database.from("habits").update({ streak: newStreak }).eq("id", habitId).eq("user_id", user.id)
      setHabits((prev) => prev.map((h) => (h.id === habitId ? { ...h, streak: newStreak } : h)))
      setLogs((prev) => [...prev, { habit_id: habitId, done_date: today }])
    }
  }

  async function deleteHabit(id: string) {
    if (!user?.id) return
    const { error } = await insforge.database.from("habits").delete().eq("id", id).eq("user_id", user.id)
    if (error) {
      toast.error(fr ? "Erreur de suppression" : "Delete error")
      return
    }
    setHabits((prev) => prev.filter((h) => h.id !== id))
    setLogs((prev) => prev.filter((l) => l.habit_id !== id))
    logAudit({ action: "user_deleted", actor_id: user.id, metadata: { feature: "habit" } })
  }

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <div className="size-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    )
  }

  const doneIds = new Set(logs.map((l) => l.habit_id))
  const doneCount = habits.filter((h) => doneIds.has(h.id)).length
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
          {habits.map((h) => {
            const isDone = doneIds.has(h.id)
            return (
              <div
                key={h.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-4 py-3 transition-all",
                  isDone ? "border-accent/30 bg-accent/[0.03]" : "border-border bg-card"
                )}
              >
                <button onClick={() => toggleHabit(h.id)} className="shrink-0">
                  {isDone ? (
                    <CheckCircle2 className="size-6 text-accent" />
                  ) : (
                    <Circle className="size-6 text-muted-foreground/50 hover:text-muted-foreground transition-colors" />
                  )}
                </button>
                <span className={cn("flex-1 text-sm font-medium", isDone ? "text-muted-foreground line-through" : "text-foreground")}>
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
            )
          })}
        </div>
      </div>
      <PageFooter onNavigate={onNavigate as (p: string) => void} />
    </div>
  )
}
