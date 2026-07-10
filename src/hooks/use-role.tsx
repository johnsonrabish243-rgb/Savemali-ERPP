import * as React from "react"
import { useAuth } from "@/hooks/use-auth"
import { insforge } from "@/lib/supabase"
import type { WorkspaceType } from "@/lib/supabase"

export type RoleKey =
  | "admin" | "manager" | "teacher" | "cashier" | "accountant" | "supervisor" | "viewer"
  | "pharmacist" | "stock_manager" | "seller" | "hr" | "payroll" | "employee"

export interface UserRole {
  role: RoleKey
  workspaceType: WorkspaceType
  isOwner: boolean
  loading: boolean
}

const ROLE_MAP: Record<string, RoleKey> = {
  admin: "admin",
  manager: "manager",
  teacher: "teacher",
  cashier: "cashier",
  accountant: "accountant",
  supervisor: "supervisor",
  viewer: "viewer",
  pharmacist: "pharmacist",
  "stock_manager": "stock_manager",
  "stock Manager": "stock_manager",
  seller: "seller",
  hr: "hr",
  payroll: "payroll",
  employee: "employee",
}

export function useRole(): UserRole {
  const { user, workspace, isOwner } = useAuth()
  const [role, setRole] = React.useState<UserRole>({
    role: "viewer",
    workspaceType: "gestion",
    isOwner: false,
    loading: true,
  })

  React.useEffect(() => {
    if (!user || !workspace) {
      setRole({ role: "viewer", workspaceType: "gestion", isOwner: false, loading: false })
      return
    }

    // Owner is always admin
    if (isOwner) {
      setRole({ role: "admin", workspaceType: workspace.type, isOwner: true, loading: false })
      return
    }

    // Non-owner: fetch role from workspace_members
    const fetchRole = async () => {
      try {
        const { data } = await insforge.database
          .from("workspace_members")
          .select("role")
          .eq("workspace_id", workspace.id)
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle()

        if (data?.role) {
          setRole({
            role: ROLE_MAP[data.role] ?? "viewer",
            workspaceType: workspace.type,
            isOwner: false,
            loading: false,
          })
        } else {
          setRole({ role: "viewer", workspaceType: workspace.type, isOwner: false, loading: false })
        }
      } catch (err) {
        console.warn("Failed to fetch user role, defaulting to viewer:", err)
        setRole({ role: "viewer", workspaceType: workspace.type, isOwner: false, loading: false })
      }
    }

    fetchRole()
  }, [user, workspace, isOwner])

  return role
}
