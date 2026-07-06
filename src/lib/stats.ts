import { insforge } from "@/lib/supabase"

export interface PlatformStats {
  totalWorkspaces: number
  totalStudents: number
  totalMedicines: number
  totalUsers: number
  totalTeachers: number
  totalEmployees: number
}

interface CacheEntry {
  data: PlatformStats
  timestamp: number
}

const cache: Record<string, CacheEntry> = {}
const CACHE_TTL = 60 * 1000

export function invalidateStatsCache(): void {
  Object.keys(cache).forEach((k) => delete cache[k])
}

export async function fetchPlatformStats(workspaceId?: string): Promise<PlatformStats> {
  const cacheKey = workspaceId ?? "__global__"
  const entry = cache[cacheKey]
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data
  }

  try {
    const scoped = (table: string) => {
      let q = insforge.database.from(table).select("id", { count: "exact", head: true })
      if (workspaceId) q = q.eq("workspace_id", workspaceId)
      return q
    }

    const [ws, students, medicines, members, teachers, employees] = await Promise.all([
      workspaceId
        ? Promise.resolve({ count: 1 })
        : insforge.database.from("workspaces").select("id", { count: "exact", head: true }),
      scoped("students"),
      scoped("store_medicines"),
      workspaceId
        ? insforge.database.from("workspace_members").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "active")
        : insforge.database.from("workspace_members").select("id", { count: "exact", head: true }).eq("status", "active"),
      scoped("teachers"),
      scoped("employees"),
    ])

    const data: PlatformStats = {
      totalWorkspaces: ws.count ?? 0,
      totalStudents: students.count ?? 0,
      totalMedicines: medicines.count ?? 0,
      totalUsers: members.count ?? 0,
      totalTeachers: teachers.count ?? 0,
      totalEmployees: employees.count ?? 0,
    }
    cache[cacheKey] = { data, timestamp: Date.now() }
    return data
  } catch {
    return entry?.data ?? {
      totalWorkspaces: 0,
      totalStudents: 0,
      totalMedicines: 0,
      totalUsers: 0,
      totalTeachers: 0,
      totalEmployees: 0,
    }
  }
}
