import * as React from "react"
import { useAuth } from "@/hooks/use-auth"
import { insforge } from "@/lib/supabase"
import type { WorkspaceType } from "@/lib/supabase"

export interface Pharmacy {
  id: string
  workspace_id: string
  name: string
  address: string | null
  phone: string | null
  email: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PharmacyMember {
  id: string
  pharmacy_id: string
  user_id: string
  can_view_sales: boolean
  can_view_purchases: boolean
  can_view_expenses: boolean
  can_view_reports: boolean
  can_manage_stock: boolean
  can_delete_sales: boolean
  can_export_data: boolean
  created_at: string
}

interface PharmacyContextValue {
  pharmacies: Pharmacy[]
  selectedPharmacy: Pharmacy | null
  setSelectedPharmacy: (pharmacy: Pharmacy | null) => void
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  isOwner: boolean
  canAccessPharmacy: (pharmacyId: string) => boolean
  getPharmacyPermissions: (pharmacyId: string) => PharmacyMember | null
}

const PharmacyContext = React.createContext<PharmacyContextValue | null>(null)

const STORAGE_KEY = "savemali-selected-pharmacy"

export function PharmacyProvider({ children }: { children: React.ReactNode }) {
  const { workspace, user } = useAuth()
  const [pharmacies, setPharmacies] = React.useState<Pharmacy[]>([])
  const [selectedPharmacy, setSelectedPharmacyState] = React.useState<Pharmacy | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [pharmacyMembers, setPharmacyMembers] = React.useState<PharmacyMember[]>([])

  const isOwner = workspace?.owner_id === user?.id

  const fetchPharmacies = React.useCallback(async () => {
    if (!workspace?.id) return

    try {
      const { data, error } = await insforge.database
        .from("pharmacies")
        .select("*")
        .eq("workspace_id", workspace.id)
        .order("name", { ascending: true })

      if (error) throw error

      const pharmacyList = (data ?? []) as Pharmacy[]
      setPharmacies(pharmacyList)

      if (pharmacyList.length > 0) {
        const savedId = localStorage.getItem(STORAGE_KEY)
        const saved = savedId ? pharmacyList.find(p => p.id === savedId) : null
        setSelectedPharmacyState(saved ?? pharmacyList[0])
      } else {
        setSelectedPharmacyState(null)
      }
    } catch (err: any) {
      setError(err?.message ?? "Erreur de chargement")
    } finally {
      setLoading(false)
    }
  }, [workspace?.id])

  const fetchPharmacyMembers = React.useCallback(async () => {
    if (!workspace?.id || isOwner) return

    try {
      // First get pharmacy IDs for this workspace
      const { data: phData } = await insforge.database
        .from("pharmacies")
        .select("id")
        .eq("workspace_id", workspace.id)

      const pharmacyIds = (phData ?? []).map((p: any) => p.id)
      if (pharmacyIds.length === 0) {
        setPharmacyMembers([])
        return
      }

      // Then get members for those pharmacies only
      const { data, error } = await insforge.database
        .from("pharmacy_members")
        .select("*")
        .in("pharmacy_id", pharmacyIds)
        .eq("user_id", user?.id ?? "")

      if (error) throw error
      setPharmacyMembers((data ?? []) as PharmacyMember[])
    } catch (err) {
      console.error("Failed to fetch pharmacy members:", err)
    }
  }, [workspace?.id, user?.id, isOwner])

  const setSelectedPharmacy = React.useCallback((pharmacy: Pharmacy | null) => {
    setSelectedPharmacyState(pharmacy)
    if (pharmacy) {
      localStorage.setItem(STORAGE_KEY, pharmacy.id)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const canAccessPharmacy = React.useCallback((pharmacyId: string) => {
    if (isOwner) return true
    return pharmacyMembers.some(m => m.pharmacy_id === pharmacyId)
  }, [isOwner, pharmacyMembers])

  const getPharmacyPermissions = React.useCallback((pharmacyId: string) => {
    if (isOwner) {
      return {
        id: "owner",
        pharmacy_id: pharmacyId,
        user_id: user?.id ?? "",
        can_view_sales: true,
        can_view_purchases: true,
        can_view_expenses: true,
        can_view_reports: true,
        can_manage_stock: true,
        can_delete_sales: true,
        can_export_data: true,
        created_at: new Date().toISOString(),
      } as PharmacyMember
    }
    return pharmacyMembers.find(m => m.pharmacy_id === pharmacyId) ?? null
  }, [isOwner, user?.id, pharmacyMembers])

  React.useEffect(() => {
    fetchPharmacies()
  }, [fetchPharmacies])

  React.useEffect(() => {
    fetchPharmacyMembers()
  }, [fetchPharmacyMembers])

  return (
    <PharmacyContext.Provider value={{
      pharmacies,
      selectedPharmacy,
      setSelectedPharmacy,
      loading,
      error,
      refresh: fetchPharmacies,
      isOwner,
      canAccessPharmacy,
      getPharmacyPermissions,
    }}>
      {children}
    </PharmacyContext.Provider>
  )
}

export function usePharmacy() {
  const ctx = React.useContext(PharmacyContext)
  if (!ctx) throw new Error("usePharmacy must be used within PharmacyProvider")
  return ctx
}
