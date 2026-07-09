import { createClient } from "@insforge/sdk"

function getClient() {
  const baseUrl = import.meta.env.VITE_INSFORGE_URL
  const anonKey = import.meta.env.VITE_INSFORGE_ANON_KEY
  if (!baseUrl) console.error("VITE_INSFORGE_URL is not set")
  if (!anonKey) console.error("VITE_INSFORGE_ANON_KEY is not set")
  return createClient({ baseUrl, anonKey, isServerMode: true })
}

export const insforge = getClient()

export type WorkspaceType = "pharmacy" | "commerce" | "education" | "gestion" | "hr"

export interface Workspace {
  id: string
  name: string
  type: WorkspaceType
  owner_id: string
  country: string
  created_at: string
}

export interface GlobalMedicine {
  id: string
  name: string
  generic_name: string | null
  category: string
  unit: string
  default_price_usd: number
  description: string | null
  requires_prescription: boolean
}

export interface StoreMedicine {
  id: string
  workspace_id: string
  global_medicine_id: string | null
  name: string
  category: string | null
  unit: string
  price_usd: number
  stock_quantity: number
  min_stock_alert: number
}
