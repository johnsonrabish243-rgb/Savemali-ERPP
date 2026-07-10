import * as React from "react"
import {
  FlaskConical, Search, Plus, Package, AlertTriangle, TrendingUp,
  Truck, Edit2, Trash2, X, Check, Minus, Loader2, ShoppingCart,
  FileText, BarChart3, RefreshCw, Users, DollarSign, History,
  ArrowUpDown, ChevronDown
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ReportGenerator } from "@/components/ReportGenerator"
import { EmptyState } from "@/components/EmptyState"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLanguage } from "@/lib/i18n"
import { useAuth } from "@/hooks/use-auth"
import { useRole } from "@/hooks/use-role"
import { insforge } from "@/lib/supabase"
import { logActivity } from "@/lib/activity"
import { trackModuleOpen } from "@/lib/context-tracker"
import { cn, safeParseFloat, safeParseInt } from "@/lib/utils"
import { formatCurrency } from "@/lib/currency"
import { publishNotification, createSaleNotification, createOrderNotification } from "@/lib/notifications"
import { usePageEntrance } from "@/hooks/use-page-entrance"
import { DialogFooterBrand } from "@/components/DialogFooterBrand"
import { PageFooter } from "@/components/PageFooter"
import { validateFields, hasErrors } from "@/lib/validation"
import { medicineRules, stockAdjustRules, supplierOrderRules } from "@/lib/rules"
import { usePharmacy, type Pharmacy } from "@/hooks/use-pharmacy"
import { PharmacySelector } from "@/components/PharmacySelector"
import { detectInjection, logSecurityEvent } from "@/lib/security"
import { toast } from "sonner"

type Page = "home" | "education" | "pharmacy" | "commerce" | "gestion" | "dashboard" | "signin" | "signup" | "members" | "reports" | "privacy" | "terms"
interface Props { onNavigate: (p: Page) => void; initialTab?: string }

interface Medicine {
  id: string
  workspace_id: string
  pharmacy_id: string
  global_medicine_id: string | null
  name: string
  category: string | null
  unit: string
  price_usd: number
  stock_quantity: number
  min_stock_alert: number
}

interface CartItem { med: Medicine; qty: number }

interface Sale {
  id: string
  workspace_id: string
  pharmacy_id: string
  total_usd: number
  payment_method: string
  status: string
  sold_at: string
}

interface SaleItem {
  id: string
  sale_id: string
  workspace_id: string
  pharmacy_id: string
  product_name: string
  product_id: string | null
  quantity: number
  unit_price: number
  total_price: number
}

interface SupplierOrder {
  id: string
  workspace_id: string
  pharmacy_id: string
  supplier_name: string
  status: string
  total_cost: number | null
  notes: string | null
  ordered_at: string | null
  received_at: string | null
}

interface OrderItem {
  id: string
  order_id: string
  medicine_id: string
  medicine_name: string
  quantity: number
  unit_cost: number
  total_cost: number
}

interface StockMovement {
  id: string
  workspace_id: string
  pharmacy_id: string
  medicine_id: string
  medicine_name: string
  type: string
  quantity: number
  reason: string | null
  created_by: string | null
  created_at: string
}

interface TeamMember {
  id: string
  display_name: string | null
  email: string
  role: string | null
  status: string | null
}

interface ActivityLog {
  id: string
  action_type: string
  description: string
  amount_usd: number | null
  created_at: string
}

const EMPTY_FORM = { name: "", category: "", unit: "comprimé", price_usd: "", stock_quantity: "", min_stock_alert: "10" }
const EMPTY_ORDER = { supplier_name: "", notes: "" }

export function PharmacyPage({ onNavigate, initialTab }: Props) {
  const { lang } = useLanguage()
  const { workspace, user } = useAuth()
  const { role } = useRole()
  const fr = lang === "fr"
  const [tab, setTab] = React.useState(initialTab || "inventory")
  const { selectedPharmacy, pharmacies, setSelectedPharmacy, isOwner } = usePharmacy()

  React.useEffect(() => {
    trackModuleOpen("pharmacy")
  }, [])

  const [medicines, setMedicines] = React.useState<Medicine[]>([])
  const [sales, setSales] = React.useState<Sale[]>([])
  const [saleItemsMap, setSaleItemsMap] = React.useState<Record<string, SaleItem[]>>({})
  const [orders, setOrders] = React.useState<SupplierOrder[]>([])
  const [orderItemsMap, setOrderItemsMap] = React.useState<Record<string, OrderItem[]>>({})
  const [movements, setMovements] = React.useState<StockMovement[]>([])
  const [members, setMembers] = React.useState<TeamMember[]>([])
  const [activities, setActivities] = React.useState<ActivityLog[]>([])
  const [prescriptions, setPrescriptions] = React.useState<{ id: string; patient_name: string; medicine: string; dosage: string; doctor: string; date: string; status: string }[]>([])
  const [accountingEntries, setAccountingEntries] = React.useState<{ id: string; date: string; type: "income" | "expense"; category: string; amount: number; description: string }[]>([])
  const [expenses, setExpenses] = React.useState<{ id: string; date: string; category: string; amount: number; description: string }[]>([])
  const [historyEntries, setHistoryEntries] = React.useState<{ id: string; date: string; type: string; amount: number; description: string }[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [catFilter, setCatFilter] = React.useState("all")

  // Prescription form
  const [prescForm, setPrescForm] = React.useState({ patient_name: "", medicine: "", dosage: "", doctor: "", date: new Date().toISOString().split("T")[0], status: "active" })

  // Accounting form
  const [acctForm, setAcctForm] = React.useState({ date: new Date().toISOString().split("T")[0], type: "income", category: "", amount: "", description: "" })

  // Expense form
  const [expForm, setExpForm] = React.useState({ date: new Date().toISOString().split("T")[0], category: "", amount: "", description: "" })

  // History filters
  const [histDateFilter, setHistDateFilter] = React.useState("")
  const [histTypeFilter, setHistTypeFilter] = React.useState("all")

  // Dialog states
  const [showAdd, setShowAdd] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<Medicine | null>(null)
  const [form, setForm] = React.useState({ ...EMPTY_FORM })
  const [saving, setSaving] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)
  const [medicineErrors, setMedicineErrors] = React.useState<Record<string, string>>({})

  // POS
  const [cart, setCart] = React.useState<CartItem[]>([])
  const [posSearch, setPosSearch] = React.useState("")
  const [saleMsg, setSaleMsg] = React.useState<string | null>(null)

  // Orders
  const [showOrder, setShowOrder] = React.useState(false)
  const [orderForm, setOrderForm] = React.useState({ ...EMPTY_ORDER })
  const [orderItems, setOrderItems] = React.useState<{ medicine_id: string; medicine_name: string; quantity: string; unit_cost: string }[]>([])
  const [orderErrors, setOrderErrors] = React.useState<Record<string, string>>({})

  // Stock adjustment
  const [showAdjust, setShowAdjust] = React.useState(false)
  const [adjustMedId, setAdjustMedId] = React.useState("")
  const [adjustType, setAdjustType] = React.useState<"in" | "out" | "set">("in")
  const [adjustQty, setAdjustQty] = React.useState("")
  const [adjustReason, setAdjustReason] = React.useState("")
  const [adjustMsg, setAdjustMsg] = React.useState<string | null>(null)
  const [adjustErrors, setAdjustErrors] = React.useState<Record<string, string>>({})

  // Sales history expand
  const [expandedSale, setExpandedSale] = React.useState<string | null>(null)

  // Members filter
  const [roleFilter, setRoleFilter] = React.useState("all")

  const fetchAll = React.useCallback(async () => {
    if (!workspace) return
    setLoading(true)
    const pharmacyFilter = selectedPharmacy ? { pharmacy_id: selectedPharmacy.id } : { workspace_id: workspace.id }
    const [medRes, salesRes, ordersRes, movesRes, membersRes, actRes] = await Promise.all([
      selectedPharmacy
        ? insforge.database.from("store_medicines").select("*").eq("pharmacy_id", selectedPharmacy.id).order("name")
        : insforge.database.from("store_medicines").select("*").eq("workspace_id", workspace.id).order("name"),
      selectedPharmacy
        ? insforge.database.from("sales").select("*").eq("pharmacy_id", selectedPharmacy.id).order("sold_at", { ascending: false }).limit(100)
        : insforge.database.from("sales").select("*").eq("workspace_id", workspace.id).order("sold_at", { ascending: false }).limit(100),
      selectedPharmacy
        ? insforge.database.from("supplier_orders").select("*").eq("pharmacy_id", selectedPharmacy.id).order("ordered_at", { ascending: false })
        : insforge.database.from("supplier_orders").select("*").eq("workspace_id", workspace.id).order("ordered_at", { ascending: false }),
      selectedPharmacy
        ? insforge.database.from("stock_movements").select("*").eq("pharmacy_id", selectedPharmacy.id).order("created_at", { ascending: false }).limit(100)
        : insforge.database.from("stock_movements").select("*").eq("workspace_id", workspace.id).order("created_at", { ascending: false }).limit(100),
      insforge.database.from("workspace_members").select("*").eq("workspace_id", workspace.id).order("display_name"),
      selectedPharmacy
        ? insforge.database.from("activity_logs").select("*").eq("workspace_id", workspace.id).eq("module", "pharmacy").order("created_at", { ascending: false }).limit(20)
        : insforge.database.from("activity_logs").select("*").eq("workspace_id", workspace.id).eq("module", "pharmacy").order("created_at", { ascending: false }).limit(20),
    ])
    setMedicines((medRes.data as Medicine[]) ?? [])
    setSales((salesRes.data as Sale[]) ?? [])
    setOrders((ordersRes.data as SupplierOrder[]) ?? [])
    setMovements((movesRes.data as StockMovement[]) ?? [])
    setMembers((membersRes.data as TeamMember[]) ?? [])
    setActivities((actRes.data as ActivityLog[]) ?? [])
    setLoading(false)
  }, [workspace, selectedPharmacy])

  React.useEffect(() => { fetchAll() }, [fetchAll])

  // Eagerly fetch all sale items for topMedicines report
  React.useEffect(() => {
    if (!workspace || sales.length === 0) return
    let cancelled = false
    async function fetchAllItems() {
      if (!selectedPharmacy) { setSaleItemsMap({}); return }
      const { data } = await insforge.database.from("sale_items").select("*").eq("pharmacy_id", selectedPharmacy.id).limit(500)
      if (cancelled || !data) return
      const map: Record<string, SaleItem[]> = {}
      for (const item of data) {
        const sid = item.sale_id
        if (!map[sid]) map[sid] = []
        map[sid].push(item as SaleItem)
      }
      setSaleItemsMap(map)
    }
    fetchAllItems()
    return () => { cancelled = true }
  }, [workspace?.id, sales.length, selectedPharmacy?.id])

  React.useEffect(() => {
    if (!workspace) return
    async function loadExtra() {
      const [prescRes, expRes] = await Promise.all([
        insforge.database.from("pharmacy_prescriptions").select("*").eq("workspace_id", workspace.id).order("created_at", { ascending: false }),
        insforge.database.from("pharmacy_expenses").select("*").eq("workspace_id", workspace.id).order("created_at", { ascending: false }),
      ])
      setPrescriptions((prescRes.data as any[]) ?? [])
      setExpenses((expRes.data as any[]) ?? [])
      // Fetch accounting from DB
      const { data: accData } = await insforge.database.from("pharmacy_accounting").select("*").eq("workspace_id", workspace.id).order("entry_date", { ascending: false })
      setAccountingEntries((accData as any[]) ?? [])
      setHistoryEntries([])
    }
    loadExtra()
  }, [workspace?.id])

  const fetchSaleItems = async (saleId: string) => {
    if (saleItemsMap[saleId]) return
    const { data } = await insforge.database.from("sale_items").select("*").eq("sale_id", saleId).eq("workspace_id", workspace!.id)
    if (data) setSaleItemsMap((p) => ({ ...p, [saleId]: data as SaleItem[] }))
  }

  const fetchOrderItems = async (orderId: string) => {
    if (orderItemsMap[orderId]) return
    const { data } = await insforge.database.from("order_items").select("*").eq("order_id", orderId).eq("workspace_id", workspace!.id)
    if (data) setOrderItemsMap((p) => ({ ...p, [orderId]: data as OrderItem[] }))
  }

  const categories = React.useMemo(() => {
    const cats = new Set(medicines.map((m) => m.category ?? ""))
    return Array.from(cats).filter(Boolean).sort()
  }, [medicines])

  const filtered = medicines.filter((m) => {
    const s = search.toLowerCase()
    return (m.name.toLowerCase().includes(s)) && (catFilter === "all" || m.category === catFilter)
  })

  const lowStock = medicines.filter((m) => m.stock_quantity <= m.min_stock_alert)

  const totalStockValue = Number(medicines.reduce((s, m) => s + m.price_usd * m.stock_quantity, 0)) ?? 0

  const stats = [
    { label: fr ? "Médicaments" : "Medicines", value: medicines.length, icon: FlaskConical, color: "text-success" },
    { label: fr ? "Stock faible" : "Low stock", value: lowStock.length, icon: AlertTriangle, color: "text-warning" },
    { label: fr ? "Valeur stock (FC)" : "Stock value (FC)", value: formatCurrency(totalStockValue), icon: TrendingUp, color: "text-info" },
    { label: fr ? "Catégories" : "Categories", value: categories.length, icon: Package, color: "text-purple" },
  ]

  const openAdd = () => { setForm({ ...EMPTY_FORM }); setFormError(null); setMedicineErrors({}); setEditTarget(null); setShowAdd(true) }
  const openEdit = (m: Medicine) => {
    setEditTarget(m)
    setForm({ name: m.name, category: m.category ?? "", unit: m.unit, price_usd: String(m.price_usd), stock_quantity: String(m.stock_quantity), min_stock_alert: String(m.min_stock_alert) })
    setFormError(null)
    setMedicineErrors({})
    setShowAdd(true)
  }

  const handleSave = async () => {
    const errs = validateFields(form, medicineRules); setMedicineErrors(errs); if (hasErrors(errs)) return
    if (!workspace) { setFormError(fr ? "Workspace requis" : "Workspace required"); return }
    if (!selectedPharmacy) { setFormError(fr ? "Sélectionnez une pharmacie" : "Select a pharmacy"); return }
    const formStr = [form.name, form.category, form.unit].join(" ")
    if (detectInjection(formStr)) {
      logSecurityEvent({ type: "injection_attempt", details: `Suspicious input in medicine form`, path: "pharmacy" })
      setFormError(fr ? "Entrée suspecte détectée." : "Suspicious input detected."); return
    }
    if (!editTarget && medicines.some((m) => m.name.trim().toLowerCase() === form.name.trim().toLowerCase())) {
      toast.error(fr ? "Un médicament avec ce nom existe déjà" : "A medicine with this name already exists")
      setSaving(false); return
    }
    setSaving(true); setFormError(null)
    const payload = {
      workspace_id: workspace.id,
      pharmacy_id: selectedPharmacy.id,
      name: form.name.trim(),
      category: form.category || null,
      unit: form.unit,
      price_usd: safeParseFloat(form.price_usd),
      stock_quantity: safeParseInt(form.stock_quantity),
      min_stock_alert: safeParseInt(form.min_stock_alert, 10),
    }
    const { data: savedMed, error } = editTarget
      ? await insforge.database.from("store_medicines").update(payload).eq("id", editTarget.id).eq("workspace_id", workspace.id).select().maybeSingle()
      : await insforge.database.from("store_medicines").insert([payload]).select().maybeSingle()
    if (error) { setFormError(error.message); setSaving(false); return }
    if (!editTarget) import("@/lib/stats").then(({ invalidateStatsCache }) => invalidateStatsCache())
    if (user && workspace.owner_id) {
      const qty = safeParseInt(form.stock_quantity)
      const prev = editTarget?.stock_quantity ?? 0
      const delta = qty - prev
      const desc = editTarget
        ? `Stock mis à jour: ${form.name.trim()} — ${prev} → ${qty} ${form.unit}`
        : `Nouveau médicament ajouté: ${form.name.trim()} (${qty} ${form.unit} à ${form.price_usd})`
      await logActivity({ workspaceId: workspace.id, ownerId: workspace.owner_id, actorUserId: user.id, actorEmail: user.email ?? "", actorName: user.email ?? "", actionType: editTarget ? "stock_edit" : "stock_add", module: "pharmacy", description: desc, amountUsd: delta !== 0 ? Math.abs(delta) * safeParseFloat(form.price_usd) : null, referenceId: savedMed?.id ?? editTarget?.id ?? null })
    }
    setShowAdd(false); setEditTarget(null); fetchAll()
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm(fr ? "Supprimer ce médicament ?" : "Delete this medicine?")) return
    const { error } = await insforge.database.from("store_medicines").delete().eq("id", id).eq("workspace_id", workspace.id)
    if (error) { alert(fr ? "Erreur lors de la suppression" : "Delete error"); return }
    fetchAll()
  }

  // POS
  const posFiltered = medicines.filter((m) =>
    m.name.toLowerCase().includes(posSearch.toLowerCase()) && m.stock_quantity > 0
  )
  const addToCart = (med: Medicine) => {
    setCart((prev) => {
      const ex = prev.find((c) => c.med.id === med.id)
      if (ex) {
        const newQty = Math.min(ex.qty + 1, med.stock_quantity)
        return prev.map((c) => c.med.id === med.id ? { ...c, qty: newQty } : c)
      }
      return [...prev, { med, qty: 1 }]
    })
  }
  const removeFromCart = (id: string) => setCart((prev) => prev.filter((c) => c.med.id !== id))
  const changeQty = (id: string, delta: number) => {
    setCart((prev) => prev.map((c) => c.med.id === id ? { ...c, qty: Math.min(Math.max(1, c.qty + delta), c.med.stock_quantity) } : c))
  }
  const cartTotal = Number(cart.reduce((s, c) => s + c.med.price_usd * c.qty, 0)) ?? 0

  const processSale = async () => {
    if (!workspace || cart.length === 0) return
    if (!selectedPharmacy) { setSaleMsg(fr ? "Sélectionnez une pharmacie" : "Select a pharmacy"); return }
    setSaving(true)
    const { data: sale, error: saleErr } = await insforge.database
      .from("sales")
      .insert([{
        workspace_id: workspace.id,
        pharmacy_id: selectedPharmacy.id,
        total_usd: cartTotal,
        payment_method: "cash",
        status: "completed"
      }])
      .select()
      .single()
    if (saleErr || !sale) { setSaving(false); return }

    const items = cart.map((c) => ({
      sale_id: sale.id,
      workspace_id: workspace.id,
      pharmacy_id: selectedPharmacy.id,
      product_name: c.med.name,
      product_id: c.med.id,
      quantity: c.qty,
      unit_price: c.med.price_usd,
      total_price: c.med.price_usd * c.qty,
    }))
    await insforge.database.from("sale_items").insert(items)
    for (const c of cart) {
      const { data: freshMed, error: fetchErr } = await insforge.database
        .from("store_medicines")
        .select("stock_quantity")
        .eq("id", c.med.id)
        .eq("workspace_id", workspace.id)
        .single()

      if (fetchErr || !freshMed) {
        toast.error(fr ? "Erreur de vérification du stock" : "Stock verification error")
        setSaving(false); return
      }

      const currentStock = Number(freshMed.stock_quantity ?? 0)
      if (currentStock < c.qty) {
        toast.error(fr ? `Stock insuffisant pour ${c.med.name}` : `Insufficient stock for ${c.med.name}`)
        setSaving(false); return
      }

      const { error: updateErr } = await insforge.database
        .from("store_medicines")
        .update({ stock_quantity: currentStock - c.qty })
        .eq("id", c.med.id)
        .eq("workspace_id", workspace.id)
        .eq("stock_quantity", currentStock)

      if (updateErr) {
        toast.error(fr ? "Erreur de mise à jour du stock" : "Stock update error")
        setSaving(false); return
      }
    }
    if (user && workspace.owner_id) {
      const itemsSummary = cart.map((c) => `${c.med.name} ×${c.qty}`).join(", ")
      await logActivity({ workspaceId: workspace.id, ownerId: workspace.owner_id, actorUserId: user.id, actorEmail: user.email ?? "", actorName: user.email ?? "", actionType: "sale", module: "pharmacy", description: `Vente pharmacie ${formatCurrency(cartTotal)} — ${itemsSummary}`, amountUsd: cartTotal, referenceId: sale.id })
      await publishNotification(createSaleNotification(workspace.id, user.email?.split("@")[0] ?? "Pharmacien", cartTotal, "FC", "pharmacy", "sales"))
    }
    setCart([])
    setSaleMsg(fr ? `Vente de ${formatCurrency(cartTotal)} enregistrée !` : `Sale of ${formatCurrency(cartTotal)} recorded!`)
    fetchAll()
    setSaving(false)
    setTimeout(() => setSaleMsg(null), 3000)
  }

  // Stock adjustment
  const openAdjust = (medId?: string) => {
    setAdjustMedId(medId ?? "")
    setAdjustType("in")
    setAdjustQty("")
    setAdjustReason("")
    setAdjustMsg(null)
    setAdjustErrors({})
    setShowAdjust(true)
  }

  const handleAdjust = async () => {
    const errs = validateFields({ adjustMedId, adjustType, adjustQty }, stockAdjustRules); setAdjustErrors(errs); if (hasErrors(errs)) return
    if (!workspace) return
    if (!selectedPharmacy) { setAdjustErrors({ adjustMedId: fr ? "Sélectionnez une pharmacie" : "Select a pharmacy" }); return }
    const med = medicines.find((m) => m.id === adjustMedId)
    if (!med) return
    const formStr = [adjustMedId, adjustType, adjustQty, adjustReason].join(" ")
    if (detectInjection(formStr)) {
      logSecurityEvent({ type: "injection_attempt", details: `Suspicious input in stock adjustment form`, path: "pharmacy" })
      setAdjustErrors({ adjustReason: fr ? "Entrée suspecte détectée." : "Suspicious input detected." }); return
    }
    setSaving(true)
    const qty = safeParseInt(adjustQty)
    let newStock = med.stock_quantity
    let actualQty = qty
    if (adjustType === "in") newStock += qty
    else if (adjustType === "out") { actualQty = Math.min(qty, med.stock_quantity); newStock = med.stock_quantity - actualQty }
    else newStock = qty

    await insforge.database.from("store_medicines").update({ stock_quantity: newStock }).eq("id", adjustMedId).eq("workspace_id", workspace.id)
    await insforge.database.from("stock_movements").insert([{
      workspace_id: workspace.id,
      pharmacy_id: selectedPharmacy.id,
      medicine_id: adjustMedId,
      medicine_name: med.name, type: adjustType === "set" ? "adjustment" : adjustType,
      quantity: actualQty, reason: adjustReason || null,
      created_by: user?.id ?? null,
    }])
    if (user && workspace.owner_id) {
      const desc = `Stock ${adjustType === "in" ? "entré" : adjustType === "out" ? "sorti" : "ajusté"}: ${med.name} (${adjustType === "set" ? `${qty}` : `${qty} ${adjustType === "in" ? "+" : "-"}`})`
      await logActivity({ workspaceId: workspace.id, ownerId: workspace.owner_id, actorUserId: user.id, actorEmail: user.email ?? "", actorName: user.email ?? "", actionType: `stock_${adjustType}`, module: "pharmacy", description: desc, referenceId: adjustMedId })
    }
    setShowAdjust(false)
    fetchAll()
    setSaving(false)
    setAdjustMsg(fr ? "Stock ajusté avec succès" : "Stock adjusted successfully")
    setTimeout(() => setAdjustMsg(null), 3000)
  }

  // Orders
  const openNewOrder = () => {
    setOrderForm({ ...EMPTY_ORDER })
    setOrderItems([])
    setFormError(null)
    setOrderErrors({})
    setShowOrder(true)
  }

  const addOrderItem = () => {
    setOrderItems((prev) => [...prev, { medicine_id: "", medicine_name: "", quantity: "1", unit_cost: "0" }])
  }

  const updateOrderItem = (idx: number, field: string, value: string) => {
    setOrderItems((prev) => {
      const copy = [...prev]
      copy[idx] = { ...copy[idx], [field]: value }
      if (field === "medicine_id") {
        const med = medicines.find((m) => m.id === value)
        if (med) copy[idx].medicine_name = med.name
      }
      return copy
    })
  }

  const removeOrderItem = (idx: number) => {
    setOrderItems((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSaveOrder = async () => {
    const errs = validateFields(orderForm, supplierOrderRules); setOrderErrors(errs); if (hasErrors(errs)) return
    if (!workspace) return
    if (!selectedPharmacy) { setFormError(fr ? "Sélectionnez une pharmacie" : "Select a pharmacy"); return }
    if (orderItems.length === 0) {
      setFormError(fr ? "Ajoutez au moins un article" : "Add at least one item")
      return
    }
    const formStr = [orderForm.supplier_name, orderForm.expected_date, ...orderItems.map((oi) => oi.medicine_name)].join(" ")
    if (detectInjection(formStr)) {
      logSecurityEvent({ type: "injection_attempt", details: `Suspicious input in supplier order form`, path: "pharmacy" })
      setFormError(fr ? "Entrée suspecte détectée." : "Suspicious input detected."); return
    }
    setSaving(true)
    setFormError(null)
    const itemsPayload = orderItems.map((oi) => ({
      medicine_id: oi.medicine_id,
      medicine_name: oi.medicine_name,
      quantity: safeParseInt(oi.quantity, 1),
      unit_cost: safeParseFloat(oi.unit_cost),
      total_cost: safeParseFloat(oi.unit_cost) * safeParseInt(oi.quantity, 1),
    }))
    const total = itemsPayload.reduce((s, i) => s + i.total_cost, 0)
    const { data: order, error: orderErr } = await insforge.database
      .from("supplier_orders")
      .insert([{
        workspace_id: workspace.id,
        pharmacy_id: selectedPharmacy.id,
        supplier_name: orderForm.supplier_name.trim(),
        total_cost: total,
        notes: orderForm.notes || null
      }])
      .select()
      .single()
    if (orderErr || !order) { setFormError(orderErr?.message ?? "Error"); setSaving(false); return }
    await insforge.database.from("order_items").insert(itemsPayload.map((ip) => ({
      ...ip,
      order_id: order.id,
      pharmacy_id: selectedPharmacy.id
    })))
    if (user && workspace.owner_id) {
      await logActivity({ workspaceId: workspace.id, ownerId: workspace.owner_id, actorUserId: user.id, actorEmail: user.email ?? "", actorName: user.email ?? "", actionType: "order_created", module: "pharmacy", description: `Nouvelle commande: ${orderForm.supplier_name.trim()} — ${formatCurrency(total)}`, amountUsd: total, referenceId: order.id })
    }
    publishNotification(createOrderNotification(workspace.id, user?.email?.split("@")[0] ?? "Pharmacien", orderForm.supplier_name.trim(), "pharmacy", "orders"))
    setShowOrder(false)
    fetchAll()
    setSaving(false)
  }

  const updateOrderStatus = async (id: string, status: string, orderSupplierName?: string) => {
    const now = new Date().toISOString()
    const updates: Record<string, any> = { status }
    if (status === "ordered") updates.ordered_at = now
    if (status === "received") updates.received_at = now

    if (status === "received") {
      const { data: items } = await insforge.database.from("order_items").select("*").eq("order_id", id).eq("workspace_id", workspace!.id)
      if (items && items.length > 0) {
        for (const item of items) {
          const med = medicines.find((m) => m.id === item.medicine_id)
          if (med) {
            await insforge.database.from("store_medicines").update({ stock_quantity: med.stock_quantity + item.quantity }).eq("id", item.medicine_id).eq("workspace_id", workspace!.id)
            await insforge.database.from("stock_movements").insert([{
              workspace_id: workspace!.id,
              pharmacy_id: selectedPharmacy?.id,
              medicine_id: item.medicine_id,
              medicine_name: item.medicine_name, type: "in",
              quantity: item.quantity, reason: `Réception commande ${orderSupplierName || ""}`,
              created_by: user?.id ?? null,
            }])
          }
        }
      }
    }

    await insforge.database.from("supplier_orders").update(updates).eq("id", id).eq("workspace_id", workspace!.id)
    if (user && workspace?.owner_id) {
      const label = status === "ordered" ? "Commandée" : status === "received" ? "Reçue" : "Annulée"
      await logActivity({ workspaceId: workspace.id, ownerId: workspace.owner_id, actorUserId: user.id, actorEmail: user.email ?? "", actorName: user.email ?? "", actionType: `order_${status}`, module: "pharmacy", description: `Commande ${label.toLowerCase()}`, referenceId: id })
    }
    fetchAll()
  }

  // Reports
  const monthlySales = React.useMemo(() => {
    const now = new Date()
    const months: { label: string; total: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      const label = d.toLocaleDateString(fr ? "fr-FR" : "en-US", { month: "short", year: "2-digit" })
      const total = sales
        .filter((s) => {
          if (!s.sold_at) return false
          const sd = new Date(s.sold_at)
          return sd.getFullYear() === d.getFullYear() && sd.getMonth() === d.getMonth()
        })
        .reduce((sum, s) => sum + Number(s.total_usd), 0) ?? 0
      months.push({ label, total })
    }
    return months
  }, [sales, fr])

  const topMedicines = React.useMemo(() => {
    const counts: Record<string, { name: string; qty: number; total: number }> = {}
    for (const sid of Object.keys(saleItemsMap)) {
      for (const item of saleItemsMap[sid]) {
        if (!counts[item.product_name]) counts[item.product_name] = { name: item.product_name, qty: 0, total: 0 }
        counts[item.product_name].qty += item.quantity
        counts[item.product_name].total += item.total_price
      }
    }
    return Object.values(counts).sort((a, b) => b.qty - a.qty).slice(0, 10)
  }, [saleItemsMap])

  const mergedHistory = React.useMemo(() => {
    const fromSales = sales.map((s) => ({
      id: s.id,
      date: s.sold_at?.split("T")[0] ?? "",
      type: "Sale",
      amount: Number(s.total_usd),
      description: `${fr ? "Vente" : "Sale"} - ${s.payment_method}`,
    }))
    const fromLocal = historyEntries.filter((h) => h.type !== "Sale")
    const all = [...fromLocal, ...fromSales].filter((h) => {
      if (histDateFilter && h.date !== histDateFilter) return false
      if (histTypeFilter !== "all" && h.type !== histTypeFilter) return false
      return true
    })
    return all.sort((a, b) => b.date.localeCompare(a.date))
  }, [sales, historyEntries, histDateFilter, histTypeFilter, fr])

  const rootRef = usePageEntrance([medicines])

  if (!workspace) return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <FlaskConical className="size-12 text-muted-foreground" />
      <p className="text-muted-foreground">{fr ? "Connectez-vous pour accéder à la pharmacie." : "Sign in to access the pharmacy."}</p>
      <Button onClick={() => onNavigate("signin")}>{fr ? "Se connecter" : "Sign in"}</Button>
    </div>
  )

  return (
    <div ref={rootRef} className="min-h-svh bg-background">
      <div className="page-header bg-gradient-to-br from-success to-success/70 px-4 py-4 text-primary-foreground">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
                <button onClick={() => onNavigate("dashboard")} className="hover:text-white underline-offset-2 hover:underline">
                  {fr ? "Tableau de bord" : "Dashboard"}
                </button>
                <span>/</span>
                <span className="text-white">{fr ? "Pharmacie" : "Pharmacy"}</span>
              </div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FlaskConical className="size-6" /> {fr ? "Pharmacie" : "Pharmacy"}
              </h1>
              <p className="text-white/70 text-sm mt-0.5">{workspace.name}</p>
            </div>
            <div className="flex items-center gap-3">
              <PharmacySelector />
              <Button variant="outline" size="sm" className="border-white/30 text-white hover:bg-white/10 gap-1.5" onClick={fetchAll}>
                <RefreshCw className="size-3.5" />{fr ? "Actualiser" : "Refresh"}
              </Button>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s, i) => (
              <div key={i} className="rounded-xl bg-white/10 p-3 backdrop-blur-sm">
                <p className="text-white/60 text-xs">{s.label}</p>
                <p className="text-xl font-bold text-white">{loading ? "..." : s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="page-content mx-auto max-w-7xl px-4 py-4 sm:px-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6 flex-wrap">
            <TabsTrigger value="inventory"><Package className="size-4 mr-1.5" />{fr ? "Inventaire" : "Inventory"}</TabsTrigger>
            <TabsTrigger value="sales"><ShoppingCart className="size-4 mr-1.5" />{fr ? "Ventes" : "Sales"}</TabsTrigger>
            <TabsTrigger value="stocks"><BarChart3 className="size-4 mr-1.5" />{fr ? "Stocks" : "Stocks"}</TabsTrigger>
            <TabsTrigger value="orders"><Truck className="size-4 mr-1.5" />{fr ? "Commandes" : "Orders"}</TabsTrigger>
            <TabsTrigger value="users"><Users className="size-4 mr-1.5" />{fr ? "Utilisateurs" : "Users"}</TabsTrigger>
            <TabsTrigger value="reports"><FileText className="size-4 mr-1.5" />{fr ? "Rapports" : "Reports"}</TabsTrigger>
            <TabsTrigger value="prescriptions"><FileText className="size-4 mr-1.5" />{fr ? "Ordonnances" : "Prescriptions"}</TabsTrigger>
            <TabsTrigger value="accounting"><DollarSign className="size-4 mr-1.5" />{fr ? "Comptabilité" : "Accounting"}</TabsTrigger>
            <TabsTrigger value="expenses"><TrendingUp className="size-4 mr-1.5" />{fr ? "Dépenses" : "Expenses"}</TabsTrigger>
            <TabsTrigger value="history"><History className="size-4 mr-1.5" />{fr ? "Historique" : "History"}</TabsTrigger>
          </TabsList>

          {/* ============ INVENTAIRE ============ */}
          <TabsContent value="inventory">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div className="flex gap-2 flex-1">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={fr ? "Rechercher..." : "Search..."} className="pl-9" />
                </div>
                <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="all">{fr ? "Toutes catégories" : "All categories"}</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <Button onClick={openAdd} className="gap-1.5 bg-success text-success-foreground hover:bg-success/90">
                <Plus className="size-4" />{fr ? "Ajouter" : "Add medicine"}
              </Button>
            </div>

            {loading ? (
              <div className="flex h-32 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
            ) : filtered.length === 0 ? (
              <EmptyState icon={<FlaskConical className="size-12" />} title={fr ? "Aucun médicament trouvé" : "No medicines found"} description={fr ? "Ajoutez des médicaments à votre stock." : "Add medicines to your stock."} action={<Button variant="outline" size="sm" onClick={openAdd}><Plus className="size-3.5 mr-1" />{fr ? "Ajouter un médicament" : "Add medicine"}</Button>} />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      {[fr ? "Médicament" : "Medicine", fr ? "Catégorie" : "Category", fr ? "Unité" : "Unit", fr ? "Prix (FC)" : "Price (FC)", fr ? "Stock" : "Stock", ""].map((h) => (
                        <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((m) => (
                      <tr key={m.id} className="bg-card hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">{m.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{m.category ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{m.unit}</td>
                        <td className="px-4 py-3 text-foreground">{formatCurrency(m.price_usd)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={m.stock_quantity <= m.min_stock_alert ? "destructive" : "secondary"}>
                            {m.stock_quantity} {m.unit}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5 justify-end">
                            <Button size="icon" variant="ghost" className="size-7" onClick={() => openEdit(m)}><Edit2 className="size-3.5" /></Button>
                            {(role === "admin" || role === "pharmacist" || role === "stock_manager") && (
                              <Button size="icon" variant="ghost" className="size-7 text-destructive hover:text-destructive" onClick={() => handleDelete(m.id)}><Trash2 className="size-3.5" /></Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* ============ VENTES ============ */}
          <TabsContent value="sales">
            <Tabs defaultValue="pos" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="pos"><ShoppingCart className="size-4 mr-1.5" />{fr ? "Point de vente" : "POS"}</TabsTrigger>
                <TabsTrigger value="history"><History className="size-4 mr-1.5" />{fr ? "Historique" : "History"}</TabsTrigger>
              </TabsList>

              <TabsContent value="pos">
                {saleMsg && <Alert className="mb-4 border-success/30 bg-success/10"><Check className="size-4 text-success" /><AlertDescription className="text-success-muted-foreground">{saleMsg}</AlertDescription></Alert>}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-2 space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input value={posSearch} onChange={(e) => setPosSearch(e.target.value)} placeholder={fr ? "Chercher un médicament à vendre..." : "Search medicine to sell..."} className="pl-9" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {posFiltered.slice(0, 24).map((m) => (
                        <button key={m.id} onClick={() => addToCart(m)} className="rounded-lg border border-border bg-card p-3 text-left hover:border-success/50 hover:bg-success/5 transition-all">
                          <p className="text-xs font-medium text-foreground truncate">{m.name}</p>
                          <p className="text-xs text-muted-foreground">{m.unit} · {m.stock_quantity} {fr ? "en stock" : "in stock"}</p>
                          <p className="text-sm font-bold text-success mt-1">{formatCurrency(m.price_usd)}</p>
                        </button>
                      ))}
                      {posFiltered.length === 0 && <p className="col-span-3 text-center text-muted-foreground py-8 text-sm">{fr ? "Aucun médicament disponible" : "No medicines available"}</p>}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
                    <h3 className="font-semibold text-foreground">{fr ? "Panier" : "Cart"}</h3>
                    {cart.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">{fr ? "Panier vide" : "Cart is empty"}</p>
                    ) : (
                      <ScrollArea className="flex-1 max-h-72">
                        {cart.map((c) => (
                          <div key={c.med.id} className="flex items-center gap-2 py-2 border-b border-border last:border-0">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-foreground truncate">{c.med.name}</p>
                              <p className="text-xs text-muted-foreground">{formatCurrency(c.med.price_usd)} × {c.qty}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button size="icon" variant="outline" className="size-6" onClick={() => changeQty(c.med.id, -1)}><Minus className="size-3" /></Button>
                              <span className="w-6 text-center text-xs font-bold text-foreground">{c.qty}</span>
                              <Button size="icon" variant="outline" className="size-6" onClick={() => changeQty(c.med.id, 1)}><Plus className="size-3" /></Button>
                              <Button size="icon" variant="ghost" className="size-6 text-destructive" onClick={() => removeFromCart(c.med.id)}><X className="size-3" /></Button>
                            </div>
                          </div>
                        ))}
                      </ScrollArea>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold text-foreground">
                      <span>{fr ? "Total" : "Total"}</span><span>{formatCurrency(cartTotal, undefined, true)}</span>
                    </div>
                    <Button className="w-full bg-success text-success-foreground hover:bg-success/90 gap-2" onClick={processSale} disabled={cart.length === 0 || saving}>
                      {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                      {fr ? "Encaisser" : "Checkout"}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="history">
                {loading ? <div className="flex h-32 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div> :
                  sales.length === 0 ? <EmptyState icon={<History className="size-12" />} title={fr ? "Aucune vente" : "No sales yet"} description={fr ? "Les ventes enregistrées apparaîtront ici." : "Recorded sales will appear here."} /> : (
                    <div className="space-y-2">
                      {sales.map((s) => (
                        <div key={s.id}>
                          <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4 cursor-pointer hover:bg-muted/20" onClick={() => {
                            if (expandedSale === s.id) { setExpandedSale(null); return }
                            setExpandedSale(s.id)
                            fetchSaleItems(s.id)
                          }}>
                            <div className="flex items-center gap-4">
                              <p className="text-sm font-medium text-foreground">{new Date(s.sold_at).toLocaleDateString(fr ? "fr-FR" : "en-US", { dateStyle: "medium", timeStyle: "short" })}</p>
                              <Badge variant={s.status === "completed" ? "secondary" : "outline"}>{s.status === "completed" ? (fr ? "Terminée" : "Completed") : s.status}</Badge>
                              <span className="text-xs text-muted-foreground capitalize">{s.payment_method}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground">{formatCurrency(Number(s.total_usd), undefined, true)}</span>
                              <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", expandedSale === s.id && "rotate-180")} />
                            </div>
                          </div>
                          {expandedSale === s.id && (
                            <div className="mx-2 mb-2 rounded-lg border border-border bg-muted/20 p-3">
                              {!saleItemsMap[s.id] ? (
                                <Loader2 className="size-4 animate-spin text-muted-foreground" />
                              ) : saleItemsMap[s.id].length === 0 ? (
                                <p className="text-sm text-muted-foreground">{fr ? "Aucun article" : "No items"}</p>
                              ) : (
                                <table className="w-full text-sm">
                                  <thead><tr className="text-muted-foreground text-xs"><th className="text-left p-2">{fr ? "Article" : "Item"}</th><th className="text-right p-2">{fr ? "Qté" : "Qty"}</th><th className="text-right p-2">{fr ? "Prix" : "Price"}</th><th className="text-right p-2">{fr ? "Total" : "Total"}</th></tr></thead>
                                  <tbody className="divide-y divide-border">
                                    {saleItemsMap[s.id].map((item) => (
                                      <tr key={item.id}>
                                        <td className="p-2 text-foreground">{item.product_name}</td>
                                        <td className="p-2 text-right text-muted-foreground">{item.quantity}</td>
                                         <td className="p-2 text-right text-muted-foreground">{formatCurrency(Number(item.unit_price), undefined, true)}</td>
                                        <td className="p-2 text-right font-medium text-foreground">{formatCurrency(Number(item.total_price), undefined, true)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* ============ STOCKS ============ */}
          <TabsContent value="stocks">
            {adjustMsg && <Alert className="mb-4 border-success/30 bg-success/10"><Check className="size-4 text-success" /><AlertDescription>{adjustMsg}</AlertDescription></Alert>}
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">{fr ? "Ajuster le stock" : "Adjust stock"}</h3>
              {(role === "admin" || role === "pharmacist" || role === "stock_manager") && (
                <Button onClick={() => openAdjust()} className="gap-1.5 bg-success text-success-foreground hover:bg-success/90">
                  <Plus className="size-4" />{fr ? "Nouvel ajustement" : "New adjustment"}
                </Button>
              )}
            </div>

            <div className="rounded-lg border border-border mb-8">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      {[fr ? "Médicament" : "Medicine", fr ? "Stock actuel" : "Current stock", fr ? "Alerte min" : "Min alert", fr ? "Action" : "Action"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {medicines.slice(0, 20).map((m) => (
                      <tr key={m.id} className="bg-card hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium text-foreground">{m.name}</td>
                        <td className="px-4 py-3">
                          <Badge variant={m.stock_quantity <= m.min_stock_alert ? "destructive" : "secondary"}>{m.stock_quantity} {m.unit}</Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{m.min_stock_alert}</td>
                        <td className="px-4 py-3">
                          {(role === "admin" || role === "pharmacist" || role === "stock_manager") && (
                            <Button size="sm" variant="outline" className="gap-1" onClick={() => openAdjust(m.id)}>
                              <ArrowUpDown className="size-3.5" />{fr ? "Ajuster" : "Adjust"}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-foreground mb-4">{fr ? "Mouvements de stock" : "Stock movements"}</h3>
            {movements.length === 0 ? (
              <EmptyState icon={<ArrowUpDown className="size-12" />} title={fr ? "Aucun mouvement" : "No movements"} description={fr ? "Les mouvements de stock apparaîtront ici." : "Stock movements will appear here."} />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      {[fr ? "Médicament" : "Medicine", fr ? "Type" : "Type", fr ? "Quantité" : "Quantity", fr ? "Raison" : "Reason", fr ? "Date" : "Date"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {movements.map((mv) => (
                      <tr key={mv.id} className="bg-card hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium text-foreground">{mv.medicine_name}</td>
                        <td className="px-4 py-3">
                          <Badge variant={mv.type === "in" ? "secondary" : mv.type === "out" ? "destructive" : "outline"}>
                            {mv.type === "in" ? fr ? "Entrée" : "In" : mv.type === "out" ? fr ? "Sortie" : "Out" : fr ? "Ajustement" : "Adjustment"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-foreground font-medium">{mv.type === "in" ? "+" : mv.type === "out" ? "-" : "="}{mv.quantity}</td>
                        <td className="px-4 py-3 text-muted-foreground">{mv.reason ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{new Date(mv.created_at).toLocaleDateString(fr ? "fr-FR" : "en-US", { dateStyle: "short", timeStyle: "short" })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* ============ COMMANDES ============ */}
          <TabsContent value="orders">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">{fr ? "Commandes fournisseurs" : "Supplier orders"}</h3>
              {(role === "admin") && (
                <Button onClick={openNewOrder} className="gap-1.5 bg-success text-success-foreground hover:bg-success/90">
                  <Plus className="size-4" />{fr ? "Nouvelle commande" : "New order"}
                </Button>
              )}
            </div>

            {orders.length === 0 ? (
              <EmptyState icon={<Truck className="size-12" />} title={fr ? "Aucune commande" : "No orders"} description={fr ? "Passez des commandes auprès de vos fournisseurs." : "Place orders with your suppliers."} action={<Button variant="outline" size="sm" onClick={openNewOrder}><Plus className="size-3.5 mr-1" />{fr ? "Créer une commande" : "Create order"}</Button>} />
            ) : (
              <div className="space-y-2">
                {orders.map((o) => (
                  <div key={o.id} className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-foreground">{o.supplier_name}</span>
                        <Badge variant={o.status === "received" ? "secondary" : o.status === "cancelled" ? "destructive" : o.status === "ordered" ? "default" : "outline"}>
                          {o.status === "pending" ? (fr ? "En attente" : "Pending") : o.status === "ordered" ? (fr ? "Commandé" : "Ordered") : o.status === "received" ? (fr ? "Reçu" : "Received") : (fr ? "Annulé" : "Cancelled")}
                        </Badge>
                      </div>
                      <span className="font-bold text-foreground">{formatCurrency(Number(o.total_cost ?? 0), undefined, true)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex gap-4">
                        {o.ordered_at && <span>{fr ? "Commandé" : "Ordered"}: {new Date(o.ordered_at).toLocaleDateString(fr ? "fr-FR" : "en-US")}</span>}
                        {o.received_at && <span>{fr ? "Reçu" : "Received"}: {new Date(o.received_at).toLocaleDateString(fr ? "fr-FR" : "en-US")}</span>}
                        {o.notes && <span className="italic">{o.notes}</span>}
                      </div>
                      <div className="flex gap-1">
                        {(role === "admin" || role === "pharmacist" || role === "stock_manager") && (
                          <>
                            {o.status === "pending" && (
                              <>
                                <Button size="sm" variant="outline" className="gap-1" onClick={() => updateOrderStatus(o.id, "ordered")}>
                                  {fr ? "Commander" : "Order"}
                                </Button>
                                <Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={() => updateOrderStatus(o.id, "cancelled")}>
                                  {fr ? "Annuler" : "Cancel"}
                                </Button>
                              </>
                            )}
                            {o.status === "ordered" && (
                              <>
                                <Button size="sm" variant="outline" className="gap-1" onClick={async () => {
                                  await fetchOrderItems(o.id)
                                  updateOrderStatus(o.id, "received", o.supplier_name)
                                }}>
                                  <Check className="size-3.5" />{fr ? "Marquer reçu" : "Mark received"}
                                </Button>
                                <Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={() => updateOrderStatus(o.id, "cancelled")}>
                                  {fr ? "Annuler" : "Cancel"}
                                </Button>
                              </>
                            )}
                          </>
                        )}
                        <Button size="sm" variant="ghost" className="size-7" onClick={async () => {
                          await fetchOrderItems(o.id)
                          setExpandedSale(expandedSale === o.id ? null : o.id)
                        }}>
                          <ChevronDown className={cn("size-4", expandedSale === o.id && "rotate-180")} />
                        </Button>
                      </div>
                    </div>
                    {expandedSale === o.id && orderItemsMap[o.id] && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <table className="w-full text-sm">
                          <thead><tr className="text-muted-foreground text-xs"><th className="text-left p-2">{fr ? "Article" : "Item"}</th><th className="text-right p-2">{fr ? "Qté" : "Qty"}</th><th className="text-right p-2">{fr ? "Coût unit." : "Unit cost"}</th><th className="text-right p-2">{fr ? "Total" : "Total"}</th></tr></thead>
                          <tbody className="divide-y divide-border">
                            {orderItemsMap[o.id].map((item) => (
                              <tr key={item.id}>
                                <td className="p-2 text-foreground">{item.medicine_name}</td>
                                <td className="p-2 text-right text-muted-foreground">{item.quantity}</td>
                                 <td className="p-2 text-right text-muted-foreground">{formatCurrency(Number(item.unit_cost), undefined, true)}</td>
                                <td className="p-2 text-right font-medium text-foreground">{formatCurrency(Number(item.total_cost), undefined, true)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ============ UTILISATEURS ============ */}
          <TabsContent value="users">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">{fr ? "Membres de l'équipe" : "Team members"}</h3>
              <Button variant="outline" className="gap-1.5" onClick={() => onNavigate("members")}>
                <Users className="size-4" />{fr ? "Inviter" : "Invite"}
              </Button>
            </div>
            <div className="mb-4">
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="all">{fr ? "Tous les rôles" : "All roles"}</option>
                <option value="pharmacist">{fr ? "Pharmacien" : "Pharmacist"}</option>
                <option value="manager">{fr ? "Gérant" : "Manager"}</option>
                <option value="cashier">{fr ? "Caissier" : "Cashier"}</option>
                <option value="viewer">{fr ? "Observateur" : "Viewer"}</option>
              </select>
            </div>
            {members.length === 0 ? (
              <EmptyState icon={<Users className="size-12" />} title={fr ? "Aucun membre" : "No members"} description={fr ? "Invitez des membres pour collaborer." : "Invite team members to collaborate."} />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      {[fr ? "Nom" : "Name", fr ? "Courriel" : "Email", fr ? "Rôle" : "Role", fr ? "Statut" : "Status"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {members
                      .filter((m) => roleFilter === "all" || m.role === roleFilter)
                      .map((m) => (
                        <tr key={m.id} className="bg-card hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium text-foreground">{m.display_name ?? "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
                          <td className="px-4 py-3">
                            <Badge variant="outline">{m.role ?? "—"}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={m.status === "active" ? "secondary" : "destructive"}>{m.status ?? "—"}</Badge>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* ============ RAPPORTS ============ */}
          <TabsContent value="reports">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{fr ? "Rapports & Export" : "Reports & Export"}</h3>
                <p className="text-sm text-muted-foreground">{fr ? "Générez des rapports PDF ou Word" : "Generate PDF or Word reports"}</p>
              </div>
              <ReportGenerator
                moduleType="pharmacy"
                workspace={workspace!}
                data={{ medicines, sales, orders, members }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
              {[
                { label: fr ? "Ventes totales" : "Total sales", value: formatCurrency(Number(sales.reduce((s, sale) => s + Number(sale.total_usd), 0)) ?? 0), icon: DollarSign, color: "text-success" },
                { label: fr ? "Médicaments" : "Medicines", value: medicines.length, icon: FlaskConical, color: "text-info" },
                { label: fr ? "Alertes stock" : "Stock alerts", value: lowStock.length, icon: AlertTriangle, color: "text-warning" },
                { label: fr ? "Valeur stock (FC)" : "Stock value (FC)", value: formatCurrency(totalStockValue), icon: TrendingUp, color: "text-purple" },
              ].map((s, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <s.icon className={cn("size-4", s.color)} />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
              <Card>
                <CardHeader><CardTitle className="text-sm">{fr ? "Ventes mensuelles" : "Monthly sales"}</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2 h-32">
                    {monthlySales.map((m, i) => {
                      const max = Math.max(...monthlySales.map((x) => x.total), 1)
                      const height = (m.total / max) * 100
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                           <span className="text-[10px] text-muted-foreground">{formatCurrency(m.total)}</span>
                          <div className="w-full bg-success/20 rounded-t" style={{ height: `${Math.max(height, 4)}%` }}>
                            <div className="w-full h-full bg-success rounded-t" style={{ height: `${height}%` }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground">{m.label}</span>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm">{fr ? "Top médicaments" : "Top medicines"}</CardTitle></CardHeader>
                <CardContent>
                  {topMedicines.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">{fr ? "Aucune vente" : "No sales yet"}</p>
                  ) : (
                    <div className="space-y-2">
                      {topMedicines.map((tm, i) => (
                        <div key={tm.name} className="flex items-center gap-3">
                          <span className="w-5 text-xs font-bold text-muted-foreground">{i + 1}.</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{tm.name}</p>
                             <p className="text-xs text-muted-foreground">{tm.qty} {fr ? "vendus" : "sold"} · {formatCurrency(tm.total, undefined, true)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-sm">{fr ? "Activité récente" : "Recent activity"}</CardTitle></CardHeader>
              <CardContent>
                {activities.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">{fr ? "Aucune activité" : "No activity"}</p>
                ) : (
                  <ScrollArea className="max-h-64">
                    <div className="space-y-2">
                      {activities.map((a) => (
                        <div key={a.id} className="flex items-start gap-3 text-sm py-1.5 border-b border-border last:border-0">
                          <Badge variant="outline" className="shrink-0 text-[10px]">{a.action_type}</Badge>
                          <div className="flex-1 min-w-0">
                            <p className="text-foreground truncate">{a.description}</p>
                            <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString(fr ? "fr-FR" : "en-US", { dateStyle: "short", timeStyle: "short" })}</p>
                          </div>
                          {a.amount_usd != null && <span className="text-xs font-medium text-foreground shrink-0">{formatCurrency(a.amount_usd, undefined, true)}</span>}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============ ORDONNANCES ============ */}
          <TabsContent value="prescriptions">
            <div className="flex flex-col gap-4 mb-4">
              <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
                <h3 className="text-sm font-semibold text-foreground">{fr ? "Nouvelle ordonnance" : "New prescription"}</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Input value={prescForm.patient_name} onChange={(e) => setPrescForm((p) => ({ ...p, patient_name: e.target.value }))} placeholder={fr ? "Patient" : "Patient name"} className="h-9 text-sm" />
                  <Input value={prescForm.medicine} onChange={(e) => setPrescForm((p) => ({ ...p, medicine: e.target.value }))} placeholder={fr ? "Médicament" : "Medicine"} className="h-9 text-sm" />
                  <Input value={prescForm.dosage} onChange={(e) => setPrescForm((p) => ({ ...p, dosage: e.target.value }))} placeholder={fr ? "Posologie" : "Dosage"} className="h-9 text-sm" />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Input value={prescForm.doctor} onChange={(e) => setPrescForm((p) => ({ ...p, doctor: e.target.value }))} placeholder={fr ? "Médecin" : "Doctor"} className="h-9 text-sm" />
                  <Input type="date" value={prescForm.date} onChange={(e) => setPrescForm((p) => ({ ...p, date: e.target.value }))} className="h-9 text-sm" />
                  <Select value={prescForm.status} onValueChange={(v) => setPrescForm((p) => ({ ...p, status: v }))}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{fr ? "Active" : "Active"}</SelectItem>
                      <SelectItem value="completed">{fr ? "Terminée" : "Completed"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end">
                  <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90 gap-1" onClick={async () => {
                    if (!prescForm.patient_name || !prescForm.medicine || !workspace) return
                    const { data, error } = await insforge.database.from("pharmacy_prescriptions").insert([{ workspace_id: workspace.id, patient_name: prescForm.patient_name, medicine: prescForm.medicine, dosage: prescForm.dosage, doctor: prescForm.doctor, date: prescForm.date, status: prescForm.status }]).select().single()
                    if (!error && data) setPrescriptions((prev) => [data as any, ...prev])
                    setPrescForm({ patient_name: "", medicine: "", dosage: "", doctor: "", date: new Date().toISOString().split("T")[0], status: "active" })
                  }}>
                    <Plus className="size-3.5" />{fr ? "Ajouter" : "Add"}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{prescriptions.length} {fr ? "ordonnance(s)" : "prescription(s)"}</p>
            </div>
            {prescriptions.length === 0 ? (
              <EmptyState icon={<FileText className="size-12" />} title={fr ? "Aucune ordonnance" : "No prescriptions"} description={fr ? "Les ordonnances enregistrées apparaîtront ici." : "Recorded prescriptions will appear here."} />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      {[fr ? "Patient" : "Patient", fr ? "Médicament" : "Medicine", fr ? "Posologie" : "Dosage", fr ? "Médecin" : "Doctor", fr ? "Date" : "Date", fr ? "Statut" : "Status", ""].map((h) => (
                        <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {prescriptions.map((p) => (
                      <tr key={p.id} className="bg-card hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">{p.patient_name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{p.medicine}</td>
                        <td className="px-4 py-3 text-muted-foreground">{p.dosage}</td>
                        <td className="px-4 py-3 text-muted-foreground">{p.doctor}</td>
                        <td className="px-4 py-3 text-muted-foreground">{p.date}</td>
                        <td className="px-4 py-3">
                          <Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status === "active" ? (fr ? "Active" : "Active") : (fr ? "Terminée" : "Completed")}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5 justify-end">
                            {(role === "admin" || role === "pharmacist" || role === "stock_manager") && (
                              <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={async () => { await insforge.database.from("pharmacy_prescriptions").delete().eq("id", p.id); setPrescriptions((prev) => prev.filter((x) => x.id !== p.id)) }}><Trash2 className="size-3.5" /></Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* ============ COMPTABILITÉ ============ */}
          <TabsContent value="accounting">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">{fr ? "Revenus" : "Income"}</p>
                <p className="text-xl font-bold text-success">{formatCurrency(Number(accountingEntries.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0)) ?? 0, undefined, true)}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">{fr ? "Dépenses" : "Expenses"}</p>
                <p className="text-xl font-bold text-destructive">{formatCurrency(Number(accountingEntries.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0)) ?? 0, undefined, true)}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">{fr ? "Solde" : "Balance"}</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency((Number(accountingEntries.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0)) ?? 0) - (Number(accountingEntries.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0)) ?? 0), undefined, true)}</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 mb-4">
              <h3 className="text-sm font-semibold text-foreground">{fr ? "Nouvelle entrée" : "New entry"}</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <Input type="date" value={acctForm.date} onChange={(e) => setAcctForm((p) => ({ ...p, date: e.target.value }))} className="h-9 text-sm" />
                <Select value={acctForm.type} onValueChange={(v) => setAcctForm((p) => ({ ...p, type: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">{fr ? "Revenu" : "Income"}</SelectItem>
                    <SelectItem value="expense">{fr ? "Dépense" : "Expense"}</SelectItem>
                  </SelectContent>
                </Select>
                <Input value={acctForm.category} onChange={(e) => setAcctForm((p) => ({ ...p, category: e.target.value }))} placeholder={fr ? "Catégorie" : "Category"} className="h-9 text-sm" />
                <Input type="number" step="0.01" min="0" value={acctForm.amount} onChange={(e) => setAcctForm((p) => ({ ...p, amount: e.target.value }))} placeholder={fr ? "Montant" : "Amount"} className="h-9 text-sm" />
                <Input value={acctForm.description} onChange={(e) => setAcctForm((p) => ({ ...p, description: e.target.value }))} placeholder={fr ? "Description" : "Description"} className="h-9 text-sm" />
              </div>
              <div className="flex justify-end">
                <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90 gap-1" onClick={async () => {
                  const amt = safeParseFloat(acctForm.amount)
                  if (amt <= 0 || !acctForm.category || !workspace) return
                  const payload = { workspace_id: workspace.id, type: acctForm.type, category: acctForm.category, amount: amt, description: acctForm.description, entry_date: acctForm.date || new Date().toISOString().split("T")[0] }
                  const { data, error } = await insforge.database.from("pharmacy_accounting").insert([payload]).select().single()
                  if (!error && data) setAccountingEntries((prev) => [data, ...prev])
                  setAcctForm({ date: new Date().toISOString().split("T")[0], type: "income", category: "", amount: "", description: "" })
                }}>
                  <Plus className="size-3.5" />{fr ? "Ajouter" : "Add"}
                </Button>
              </div>
            </div>
            {accountingEntries.length === 0 ? (
              <EmptyState icon={<DollarSign className="size-12" />} title={fr ? "Aucune entrée" : "No entries"} description={fr ? "Ajoutez des revenus ou dépenses pour suivre la comptabilité." : "Add income or expenses to track accounting."} />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      {[fr ? "Date" : "Date", fr ? "Type" : "Type", fr ? "Catégorie" : "Category", fr ? "Montant" : "Amount", fr ? "Description" : "Description", ""].map((h) => (
                        <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {accountingEntries.map((e) => (
                      <tr key={e.id} className="bg-card hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground">{e.entry_date || e.date}</td>
                        <td className="px-4 py-3"><Badge variant={e.type === "income" ? "secondary" : "destructive"}>{e.type === "income" ? (fr ? "Revenu" : "Income") : (fr ? "Dépense" : "Expense")}</Badge></td>
                        <td className="px-4 py-3 text-foreground">{e.category}</td>
                         <td className="px-4 py-3 font-medium text-foreground">{formatCurrency(e.amount, undefined, true)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{e.description || "—"}</td>
                        <td className="px-4 py-3">
                          {(role === "admin" || role === "pharmacist" || role === "stock_manager") && (
                            <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={async () => { await insforge.database.from("pharmacy_accounting").delete().eq("id", e.id); setAccountingEntries((prev) => prev.filter((x) => x.id !== e.id)) }}><Trash2 className="size-3.5" /></Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* ============ DÉPENSES ============ */}
          <TabsContent value="expenses">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">{fr ? "Total dépenses" : "Total expenses"}</p>
                <p className="text-xl font-bold text-destructive">{formatCurrency(Number(expenses.reduce((s, e) => s + e.amount, 0)) ?? 0, undefined, true)}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">{fr ? "Nombre" : "Count"}</p>
                <p className="text-xl font-bold text-foreground">{expenses.length}</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 mb-4">
              <h3 className="text-sm font-semibold text-foreground">{fr ? "Nouvelle dépense" : "New expense"}</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Input type="date" value={expForm.date} onChange={(e) => setExpForm((p) => ({ ...p, date: e.target.value }))} className="h-9 text-sm" />
                <Input value={expForm.category} onChange={(e) => setExpForm((p) => ({ ...p, category: e.target.value }))} placeholder={fr ? "Catégorie" : "Category"} className="h-9 text-sm" />
                <Input type="number" step="0.01" min="0" value={expForm.amount} onChange={(e) => setExpForm((p) => ({ ...p, amount: e.target.value }))} placeholder={fr ? "Montant" : "Amount"} className="h-9 text-sm" />
                <Input value={expForm.description} onChange={(e) => setExpForm((p) => ({ ...p, description: e.target.value }))} placeholder={fr ? "Description" : "Description"} className="h-9 text-sm" />
              </div>
              <div className="flex justify-end">
                <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90 gap-1" onClick={async () => {
                  const amt = safeParseFloat(expForm.amount)
                  if (amt <= 0 || !expForm.category || !workspace) return
                  const { data, error } = await insforge.database.from("pharmacy_expenses").insert([{ workspace_id: workspace.id, date: expForm.date, category: expForm.category, amount: amt, description: expForm.description }]).select().single()
                  if (!error && data) setExpenses((prev) => [data as any, ...prev])
                  setExpForm({ date: new Date().toISOString().split("T")[0], category: "", amount: "", description: "" })
                }}>
                  <Plus className="size-3.5" />{fr ? "Ajouter" : "Add"}
                </Button>
              </div>
            </div>
            {expenses.length === 0 ? (
              <EmptyState icon={<TrendingUp className="size-12" />} title={fr ? "Aucune dépense" : "No expenses"} description={fr ? "Les dépenses enregistrées apparaîtront ici." : "Recorded expenses will appear here."} />
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                  {Object.entries(expenses.reduce<Record<string, number>>((acc, e) => { acc[e.category] = (acc[e.category] || 0) + e.amount; return acc }, {})).map(([cat, tot]) => (
                    <div key={cat} className="rounded-lg border border-border bg-card p-3 text-center">
                      <p className="text-xs text-muted-foreground">{cat}</p>
                      <p className="text-sm font-bold text-destructive">{formatCurrency(tot, undefined, true)}</p>
                    </div>
                  ))}
                </div>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        {[fr ? "Date" : "Date", fr ? "Catégorie" : "Category", fr ? "Montant" : "Amount", fr ? "Description" : "Description", ""].map((h) => (
                          <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {expenses.map((e) => (
                        <tr key={e.id} className="bg-card hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 text-muted-foreground">{e.date}</td>
                          <td className="px-4 py-3 text-foreground">{e.category}</td>
                          <td className="px-4 py-3 font-medium text-destructive">{formatCurrency(e.amount, undefined, true)}</td>
                          <td className="px-4 py-3 text-muted-foreground">{e.description || "—"}</td>
                          <td className="px-4 py-3">
                            {(role === "admin" || role === "pharmacist" || role === "stock_manager") && (
                              <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={async () => { await insforge.database.from("pharmacy_expenses").delete().eq("id", e.id); setExpenses((prev) => prev.filter((x) => x.id !== e.id)) }}><Trash2 className="size-3.5" /></Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </TabsContent>

          {/* ============ HISTORIQUE ============ */}
          <TabsContent value="history">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div className="flex gap-2">
                <Input type="date" value={histDateFilter} onChange={(e) => setHistDateFilter(e.target.value)} className="h-9 text-sm max-w-[180px]" />
                <Select value={histTypeFilter} onValueChange={setHistTypeFilter}>
                  <SelectTrigger className="h-9 text-sm w-[140px]"><SelectValue placeholder={fr ? "Type" : "Type"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{fr ? "Tous" : "All"}</SelectItem>
                    <SelectItem value="Sale">{fr ? "Vente" : "Sale"}</SelectItem>
                    <SelectItem value="Payment">{fr ? "Paiement" : "Payment"}</SelectItem>
                    <SelectItem value="Other">{fr ? "Autre" : "Other"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">{mergedHistory.length} {fr ? "entrée(s)" : "entry(ies)"}</p>
            </div>
            {mergedHistory.length === 0 ? (
              <EmptyState icon={<History className="size-12" />} title={fr ? "Aucun historique" : "No history"} description={fr ? "L'historique des transactions apparaîtra ici." : "Transaction history will appear here."} />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      {[fr ? "Date" : "Date", fr ? "Type" : "Type", fr ? "Montant" : "Amount", fr ? "Description" : "Description", ""].map((h) => (
                        <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {mergedHistory.map((h) => {
                      const isLocal = !sales.some((s) => s.id === h.id)
                      return (
                        <tr key={h.id} className="bg-card hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 text-muted-foreground">{h.date}</td>
                          <td className="px-4 py-3"><Badge variant={h.type === "Sale" ? "secondary" : h.type === "Payment" ? "default" : "outline"}>{h.type}</Badge></td>
                           <td className="px-4 py-3 font-medium text-foreground">{formatCurrency(h.amount, undefined, true)}</td>
                          <td className="px-4 py-3 text-muted-foreground">{h.description || "—"}</td>
                          <td className="px-4 py-3">
                            {isLocal && (role === "admin" || role === "pharmacist" || role === "stock_manager") && (
                              <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => setHistoryEntries((prev) => prev.filter((x) => x.id !== h.id))}><Trash2 className="size-3.5" /></Button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showAdd} onOpenChange={(o) => { setShowAdd(o); if (!o) setEditTarget(null) }}>
        <DialogContent className="ag-dialog max-w-lg p-0">
          <DialogHeader className="px-6 pt-5 pb-0">
            <DialogTitle className="text-foreground">{editTarget ? (fr ? "Modifier" : "Edit medicine") : (fr ? "Ajouter un médicament" : "Add medicine")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 py-4">
            {formError && <Alert variant="destructive"><AlertDescription>{formError}</AlertDescription></Alert>}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                { id: "name", label: fr ? "Nom" : "Name", ph: "Ex: Paracétamol 500mg" },
                { id: "category", label: fr ? "Catégorie" : "Category", ph: "Ex: Analgésique" },
              ].map((f) => (
                <div key={f.id} className="space-y-1.5">
                  <Label htmlFor={f.id} className="text-sm font-medium text-foreground">{f.label}</Label>
                  <Input id={f.id} value={(form as any)[f.id]} onChange={(e) => setForm((p) => ({ ...p, [f.id]: e.target.value }))} placeholder={f.ph} className="h-10 rounded-lg text-foreground" />
                  {medicineErrors[f.id] && <p className="text-xs text-destructive">{medicineErrors[f.id]}</p>}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="unit" className="text-sm font-medium text-foreground">{fr ? "Unité" : "Unit"}</Label>
                <Input id="unit" value={form.unit} onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))} placeholder="comprimé, flacon…" className="h-10 rounded-lg text-foreground" />
                {medicineErrors.unit && <p className="text-xs text-destructive">{medicineErrors.unit}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="price_usd" className="text-sm font-medium text-foreground">{fr ? "Prix (FC)" : "Price (FC)"}</Label>
                <Input id="price_usd" value={form.price_usd} onChange={(e) => setForm((p) => ({ ...p, price_usd: e.target.value }))} placeholder="0.50" className="h-10 rounded-lg text-foreground" />
                {medicineErrors.price_usd && <p className="text-xs text-destructive">{medicineErrors.price_usd}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="stock_quantity" className="text-sm font-medium text-foreground">{fr ? "Stock actuel" : "Current stock"}</Label>
                <Input id="stock_quantity" value={form.stock_quantity} onChange={(e) => setForm((p) => ({ ...p, stock_quantity: e.target.value }))} placeholder="100" className="h-10 rounded-lg text-foreground" />
                {medicineErrors.stock_quantity && <p className="text-xs text-destructive">{medicineErrors.stock_quantity}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="min_stock_alert" className="text-sm font-medium text-foreground">{fr ? "Seuil alerte" : "Min stock alert"}</Label>
                <Input id="min_stock_alert" value={form.min_stock_alert} onChange={(e) => setForm((p) => ({ ...p, min_stock_alert: e.target.value }))} placeholder="10" className="h-10 rounded-lg text-foreground" />
                {medicineErrors.min_stock_alert && <p className="text-xs text-destructive">{medicineErrors.min_stock_alert}</p>}
              </div>
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border/50">
            <Button variant="outline" onClick={() => { setShowAdd(false); setEditTarget(null) }}>{fr ? "Annuler" : "Cancel"}</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-success text-success-foreground hover:bg-success/90 gap-2">
              {saving && <Loader2 className="size-4 animate-spin" />}{fr ? "Enregistrer" : "Save"}
            </Button>
          </DialogFooter>
          <DialogFooterBrand />
        </DialogContent>
      </Dialog>

      {/* Stock adjustment Dialog */}
      <Dialog open={showAdjust} onOpenChange={setShowAdjust}>
        <DialogContent className="ag-dialog max-w-md p-0">
          <DialogHeader className="px-6 pt-5 pb-0">
            <DialogTitle className="text-foreground">{fr ? "Ajuster le stock" : "Adjust stock"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 py-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">{fr ? "Médicament" : "Medicine"}</Label>
              <select value={adjustMedId} onChange={(e) => setAdjustMedId(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">{fr ? "Sélectionner..." : "Select..."}</option>
                {medicines.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.stock_quantity} {m.unit})</option>)}
              </select>
              {adjustErrors.adjustMedId && <p className="text-xs text-destructive">{adjustErrors.adjustMedId}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">{fr ? "Type" : "Type"}</Label>
              <select value={adjustType} onChange={(e) => setAdjustType(e.target.value as any)} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="in">{fr ? "Entrée (ajouter)" : "In (add)"}</option>
                <option value="out">{fr ? "Sortie (retirer)" : "Out (remove)"}</option>
                <option value="set">{fr ? "Définir (remplacer)" : "Set (replace)"}</option>
              </select>
              {adjustErrors.adjustType && <p className="text-xs text-destructive">{adjustErrors.adjustType}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">{fr ? "Quantité" : "Quantity"}</Label>
              <Input type="number" min="0" value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} placeholder="10" className="h-10 rounded-lg text-foreground" />
              {adjustErrors.adjustQty && <p className="text-xs text-destructive">{adjustErrors.adjustQty}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">{fr ? "Raison" : "Reason"}</Label>
              <Input value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder={fr ? "Ex: Inventaire, casse, péremption..." : "E.g. Inventory, breakage, expiry..."} className="h-10 rounded-lg text-foreground" />
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border/50">
            <Button variant="outline" onClick={() => setShowAdjust(false)}>{fr ? "Annuler" : "Cancel"}</Button>
            <Button onClick={handleAdjust} disabled={saving || !adjustMedId || !safeParseInt(adjustQty)} className="bg-success text-success-foreground hover:bg-success/90 gap-2">
              {saving && <Loader2 className="size-4 animate-spin" />}{fr ? "Valider" : "Confirm"}
            </Button>
          </DialogFooter>
          <DialogFooterBrand />
        </DialogContent>
      </Dialog>

      {/* New order Dialog */}
      <Dialog open={showOrder} onOpenChange={setShowOrder}>
        <DialogContent className="max-w-lg ag-dialog p-0">
          <DialogHeader className="px-6 pt-5 pb-0">
            <DialogTitle className="text-foreground">{fr ? "Nouvelle commande" : "New order"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 py-4 max-h-[60vh] overflow-y-auto">
            {formError && <Alert variant="destructive"><AlertDescription>{formError}</AlertDescription></Alert>}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">{fr ? "Fournisseur" : "Supplier"}</Label>
              <Input value={orderForm.supplier_name} onChange={(e) => setOrderForm((p) => ({ ...p, supplier_name: e.target.value }))} placeholder={fr ? "Nom du fournisseur" : "Supplier name"} className="h-10 rounded-lg text-foreground" />
              {orderErrors.supplier_name && <p className="text-xs text-destructive">{orderErrors.supplier_name}</p>}
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-foreground">{fr ? "Articles" : "Items"}</Label>
              <Button size="sm" variant="outline" onClick={addOrderItem} className="gap-1"><Plus className="size-3.5" />{fr ? "Ajouter" : "Add"}</Button>
            </div>
            {orderItems.map((oi, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <div className="flex-1 space-y-1.5">
                  <select value={oi.medicine_id} onChange={(e) => updateOrderItem(idx, "medicine_id", e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">{fr ? "Choisir..." : "Choose..."}</option>
                    {medicines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="w-16 space-y-1.5">
                  <Input type="number" min="1" value={oi.quantity} onChange={(e) => updateOrderItem(idx, "quantity", e.target.value)} placeholder="1" className="h-10 rounded-lg text-foreground text-center" />
                </div>
                <div className="w-20 space-y-1.5">
                  <Input type="number" min="0" step="0.01" value={oi.unit_cost} onChange={(e) => updateOrderItem(idx, "unit_cost", e.target.value)} placeholder="0.00" className="h-10 rounded-lg text-foreground text-center" />
                </div>
                <Button size="icon" variant="ghost" className="size-8 shrink-0 mt-1 text-destructive" onClick={() => removeOrderItem(idx)}><X className="size-4" /></Button>
              </div>
            ))}
            {orderItems.length > 0 && (
              <div className="text-right text-sm font-medium text-foreground">
                {fr ? "Total" : "Total"}: {formatCurrency(orderItems.reduce((s, oi) => s + safeParseFloat(oi.unit_cost) * safeParseInt(oi.quantity, 1), 0), undefined, true)}
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">{fr ? "Notes" : "Notes"}</Label>
              <Input value={orderForm.notes} onChange={(e) => setOrderForm((p) => ({ ...p, notes: e.target.value }))} placeholder={fr ? "Notes optionnelles..." : "Optional notes..."} className="h-10 rounded-lg text-foreground" />
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border/50">
            <Button variant="outline" onClick={() => setShowOrder(false)}>{fr ? "Annuler" : "Cancel"}</Button>
            <Button onClick={handleSaveOrder} disabled={saving} className="bg-success text-success-foreground hover:bg-success/90 gap-2">
              {saving && <Loader2 className="size-4 animate-spin" />}{fr ? "Créer la commande" : "Create order"}
            </Button>
          </DialogFooter>
          <DialogFooterBrand />
        </DialogContent>
      </Dialog>
      <PageFooter onNavigate={onNavigate} />
    </div>
  )
}
