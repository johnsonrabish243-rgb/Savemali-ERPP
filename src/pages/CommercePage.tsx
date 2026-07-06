import * as React from "react"
import {
  ShoppingCart, Plus, Minus, Edit2, Trash2, Search, Loader2,
  RefreshCw, Users, FileText, DollarSign, Package, TrendingUp,
  Receipt, ArrowUpCircle, ArrowDownCircle, BarChart3, Check, X, History, User, ChevronDown,
  AlertTriangle, Calendar, Filter
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ReportGenerator } from "@/components/ReportGenerator"
import { EmptyState } from "@/components/EmptyState"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PageFooter } from "@/components/PageFooter"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLanguage } from "@/lib/i18n"
import { useAuth } from "@/hooks/use-auth"
import { useRole } from "@/hooks/use-role"
import { insforge } from "@/lib/supabase"
import { logActivity } from "@/lib/activity"
import { trackModuleOpen } from "@/lib/context-tracker"
import { usePageEntrance } from "@/hooks/use-page-entrance"
import { cn, safeParseFloat, safeParseInt } from "@/lib/utils"
import { formatCurrency } from "@/lib/currency"
import { publishNotification, createSaleNotification, createInvoiceNotification, createAccountingNotification } from "@/lib/notifications"
import { DialogFooterBrand } from "@/components/DialogFooterBrand"
import { validateFields, hasErrors } from "@/lib/validation"
import { productRules, customerRules, invoiceRules, accountingEntryRules } from "@/lib/rules"
import { detectInjection, logSecurityEvent } from "@/lib/security"
import { toast } from "sonner"

type Page = "home" | "education" | "pharmacy" | "commerce" | "gestion" | "dashboard" | "signin" | "signup" | "members" | "reports" | "privacy" | "terms"
interface Props { onNavigate: (p: Page) => void; initialTab?: string }

interface Product { id: string; workspace_id: string; name: string; category: string | null; price_usd: number; stock_quantity: number; barcode: string | null }
interface Customer { id: string; workspace_id: string; name: string; phone: string | null; email: string | null; total_spent: number }
interface Sale { id: string; workspace_id: string; customer_id: string | null; total_usd: number; payment_method: string; status: string; notes: string | null; sold_at: string }
interface SaleItem { id: string; sale_id: string; product_name: string; product_id: string | null; quantity: number; unit_price: number; total_price: number }
interface Invoice { id: string; workspace_id: string; customer_id: string | null; invoice_number: string; total_usd: number; status: string; due_date: string | null; notes: string | null; issued_at: string }
interface AccountingEntry { id: string; workspace_id: string; type: "income" | "expense"; category: string; description: string; amount_usd: number; entry_date: string }
interface CartItem { product: Product; qty: number }

const EMPTY_PRODUCT = { name: "", category: "", price_usd: "", stock_quantity: "", barcode: "" }
const EMPTY_CUSTOMER = { name: "", phone: "", email: "" }
const EMPTY_ENTRY = { type: "income" as "income" | "expense", category: "", description: "", amount_usd: "", entry_date: new Date().toISOString().slice(0, 10) }

export function CommercePage({ onNavigate, initialTab }: Props) {
  const { lang } = useLanguage()
  const { workspace, user } = useAuth()
  const { role } = useRole()
  const fr = lang === "fr"
  const now = new Date()
  const [tab, setTab] = React.useState(initialTab || "clients")

  React.useEffect(() => {
    trackModuleOpen("commerce")
  }, [])

  const [products, setProducts] = React.useState<Product[]>([])
  const [customers, setCustomers] = React.useState<Customer[]>([])
  const [invoices, setInvoices] = React.useState<Invoice[]>([])
  const [sales, setSales] = React.useState<Sale[]>([])
  const [entries, setEntries] = React.useState<AccountingEntry[]>([])
  const [members, setMembers] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)

  const [productSearch, setProductSearch] = React.useState("")
  const [posSearch, setPosSearch] = React.useState("")
  const [cart, setCart] = React.useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = React.useState("cash")
  const [saleMsg, setSaleMsg] = React.useState<string | null>(null)

  const [showProduct, setShowProduct] = React.useState(false)
  const [editProduct, setEditProduct] = React.useState<Product | null>(null)
  const [productForm, setProductForm] = React.useState({ ...EMPTY_PRODUCT })
  const [productError, setProductError] = React.useState<string | null>(null)
  const [productErrors, setProductErrors] = React.useState<Record<string, string>>({})

  const [showCustomer, setShowCustomer] = React.useState(false)
  const [editCustomer, setEditCustomer] = React.useState<Customer | null>(null)
  const [customerForm, setCustomerForm] = React.useState({ ...EMPTY_CUSTOMER })
  const [customerError, setCustomerError] = React.useState<string | null>(null)
  const [customerErrors, setCustomerErrors] = React.useState<Record<string, string>>({})

  const [showInvoice, setShowInvoice] = React.useState(false)
  const [invoiceForm, setInvoiceForm] = React.useState<{ customer_id: string; due_date: string; notes: string; line_items: { product_name: string; quantity: string; unit_price: string }[] }>({ customer_id: "", due_date: "", notes: "", line_items: [{ product_name: "", quantity: "1", unit_price: "" }] })
  const [invoiceError, setInvoiceError] = React.useState<string | null>(null)
  const [invoiceErrors, setInvoiceErrors] = React.useState<Record<string, string>>({})

  const [showEntry, setShowEntry] = React.useState(false)
  const [entryForm, setEntryForm] = React.useState({ ...EMPTY_ENTRY })
  const [entryError, setEntryError] = React.useState<string | null>(null)
  const [entryErrors, setEntryErrors] = React.useState<Record<string, string>>({})

  const [expandedSaleId, setExpandedSaleId] = React.useState<string | null>(null)
  const [saleItemsMap, setSaleItemsMap] = React.useState<Record<string, SaleItem[]>>({})

  const [historyDateFrom, setHistoryDateFrom] = React.useState("")
  const [historyDateTo, setHistoryDateTo] = React.useState("")
  const [historyTypeFilter, setHistoryTypeFilter] = React.useState("all")
  const [expandedHistoryId, setExpandedHistoryId] = React.useState<string | null>(null)
  const [historyDetailsMap, setHistoryDetailsMap] = React.useState<Record<string, any[]>>({})
  const [topProducts, setTopProducts] = React.useState<{ name: string; totalQty: number; totalRevenue: number }[]>([])
  const [loadingReports, setLoadingReports] = React.useState(false)

  const fetchData = React.useCallback(async () => {
    if (!workspace) return
    setLoading(true)
    const [{ data: prods }, { data: custs }, { data: invs }, { data: sls }, { data: acc }, { data: mems }] = await Promise.all([
      insforge.database.from("commerce_products").select("*").eq("workspace_id", workspace.id).order("name"),
      insforge.database.from("customers").select("*").eq("workspace_id", workspace.id).order("name"),
      insforge.database.from("invoices").select("*").eq("workspace_id", workspace.id).order("issued_at", { ascending: false }).limit(100),
      insforge.database.from("sales").select("*").eq("workspace_id", workspace.id).order("sold_at", { ascending: false }).limit(50),
      insforge.database.from("accounting_entries").select("*").eq("workspace_id", workspace.id).order("entry_date", { ascending: false }).limit(100),
      insforge.database.from("workspace_members").select("*").eq("workspace_id", workspace.id),
    ])
    setProducts((prods as Product[]) ?? [])
    setCustomers((custs as Customer[]) ?? [])
    setInvoices((invs as Invoice[]) ?? [])
    setSales((sls as Sale[]) ?? [])
    setEntries((acc as AccountingEntry[]) ?? [])
    setMembers((mems as any[]) ?? [])
    setLoading(false)
  }, [workspace])

  React.useEffect(() => { fetchData() }, [fetchData])

  React.useEffect(() => {
    const savedReports = localStorage.getItem("savemali_com_reports")
    if (savedReports) {
      try { const p = JSON.parse(savedReports); if (p.topProducts) setTopProducts(p.topProducts) } catch {}
    }
    const savedHistory = localStorage.getItem("savemali_com_history")
    if (savedHistory) {
      try { const h = JSON.parse(savedHistory); if (h.dateFrom) setHistoryDateFrom(h.dateFrom); if (h.dateTo) setHistoryDateTo(h.dateTo); if (h.typeFilter) setHistoryTypeFilter(h.typeFilter) } catch {}
    }
  }, [])

  React.useEffect(() => {
    if (!workspace) return
    ;(async () => {
      setLoadingReports(true)
      const { data } = await insforge.database.from("sale_items").select("*").eq("workspace_id", workspace.id).limit(500)
      if (data) {
        const grouped: Record<string, { qty: number; rev: number }> = {}
        for (const item of data as SaleItem[]) {
          if (!grouped[item.product_name]) grouped[item.product_name] = { qty: 0, rev: 0 }
          grouped[item.product_name].qty += item.quantity
          grouped[item.product_name].rev += Number(item.total_price)
        }
        const sorted = Object.entries(grouped).map(([name, v]) => ({ name, totalQty: v.qty, totalRevenue: v.rev })).sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 10)
        setTopProducts(sorted)
        localStorage.setItem("savemali_com_reports", JSON.stringify({ topProducts: sorted }))
      }
      setLoadingReports(false)
    })()
  }, [workspace])

  React.useEffect(() => {
    localStorage.setItem("savemali_com_history", JSON.stringify({ dateFrom: historyDateFrom, dateTo: historyDateTo, typeFilter: historyTypeFilter }))
  }, [historyDateFrom, historyDateTo, historyTypeFilter])

  const todaySales = sales.filter((s) => { if (!s.sold_at) return false; const d = new Date(s.sold_at); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate() })
  const todayRevenue = todaySales.reduce((sum, s) => sum + Number(s.total_usd ?? 0), 0)

  const stats = [
    { label: fr ? "Ventes aujourd'hui" : "Today's sales", value: formatCurrency(todayRevenue), icon: DollarSign },
    { label: fr ? "Produits" : "Products", value: products.length, icon: Package },
    { label: fr ? "Clients" : "Customers", value: customers.length, icon: Users },
    { label: fr ? "Transactions" : "Transactions", value: todaySales.length, icon: TrendingUp },
  ]

  const productFiltered = products.filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()))
  const posFiltered = products.filter((p) => p.name.toLowerCase().includes(posSearch.toLowerCase()) && p.stock_quantity > 0)

  const totalCategories = new Set(products.filter((p) => p.category).map((p) => p.category)).size
  const totalStockValue = products.reduce((s, p) => s + (Number(p.price_usd) ?? 0) * (Number(p.stock_quantity) ?? 0), 0)
  const lowStockCount = products.filter((p) => p.stock_quantity <= 5).length
  const totalCustomerSpent = customers.reduce((s, c) => s + (Number(c.total_spent) ?? 0), 0)
  const activeCustomers = customers.filter((c) => Number(c.total_spent) > 0).length

  const totalIncome = entries.filter((e) => e.type === "income").reduce((s, e) => s + (Number(e.amount_usd) ?? 0), 0)
  const totalExpense = entries.filter((e) => e.type === "expense").reduce((s, e) => s + (Number(e.amount_usd) ?? 0), 0)

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    const dateStr = date.toISOString().slice(0, 10)
    const daySales = sales.filter(s => s.sold_at?.startsWith(dateStr))
    const total = daySales.reduce((sum, s) => sum + (Number(s.total_usd) ?? 0), 0)
    return { date: dateStr, total, count: daySales.length }
  })

  const combinedHistory = React.useMemo(() => {
    const items: { id: string; date: string; type: "sale" | "invoice"; reference: string; amount: number; status: string; refId: string }[] = []
    for (const s of sales) {
      items.push({
        id: `sale-${s.id}`,
        date: s.sold_at,
        type: "sale",
        reference: s.id.slice(0, 8),
        amount: Number(s.total_usd),
        status: s.status,
        refId: s.id,
      })
    }
    for (const inv of invoices) {
      items.push({
        id: `inv-${inv.id}`,
        date: inv.issued_at,
        type: "invoice",
        reference: inv.invoice_number,
        amount: Number(inv.total_usd),
        status: inv.status,
        refId: inv.id,
      })
    }
    let filtered = items
    if (historyTypeFilter !== "all") {
      filtered = filtered.filter(i => i.type === historyTypeFilter)
    }
    if (historyDateFrom) {
      filtered = filtered.filter(i => i.date >= historyDateFrom)
    }
    if (historyDateTo) {
      filtered = filtered.filter(i => i.date <= historyDateTo + "T23:59:59")
    }
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return filtered
  }, [sales, invoices, historyDateFrom, historyDateTo, historyTypeFilter])

  // PRODUCT CRUD
  const openAddProduct = () => { setProductForm({ ...EMPTY_PRODUCT }); setProductError(null); setProductErrors({}); setEditProduct(null); setShowProduct(true) }
  const openEditProduct = (p: Product) => {
    setEditProduct(p)
    setProductForm({ name: p.name, category: p.category ?? "", price_usd: String(p.price_usd), stock_quantity: String(p.stock_quantity), barcode: p.barcode ?? "" })
    setProductError(null); setProductErrors({}); setShowProduct(true)
  }
  const saveProduct = async () => {
    if (!workspace) return
    const errs = validateFields(productForm, productRules)
    setProductErrors(errs)
    if (hasErrors(errs)) return
    const formStr = [productForm.name, productForm.category, productForm.barcode].join(" ")
    if (detectInjection(formStr)) {
      logSecurityEvent({ type: "injection_attempt", details: `Suspicious input in product form`, path: "commerce" })
      setProductError(fr ? "Entrée suspecte détectée." : "Suspicious input detected."); setSaving(false); return
    }
    if (!editProduct && products.some((p) => p.name.trim().toLowerCase() === productForm.name.trim().toLowerCase())) {
      toast.error(fr ? "Un produit avec ce nom existe déjà" : "A product with this name already exists")
      setSaving(false); return
    }
    setSaving(true); setProductError(null)
    const payload = { workspace_id: workspace.id, name: productForm.name.trim(), category: productForm.category || null, price_usd: safeParseFloat(productForm.price_usd), stock_quantity: safeParseInt(productForm.stock_quantity), barcode: productForm.barcode || null }
    const { error } = editProduct
      ? await insforge.database.from("commerce_products").update(payload).eq("id", editProduct.id).eq("workspace_id", workspace.id)
      : await insforge.database.from("commerce_products").insert([payload])
    if (error) { setProductError(error.message); setSaving(false); return }
    if (!editProduct) import("@/lib/stats").then(({ invalidateStatsCache }) => invalidateStatsCache())
    setShowProduct(false); setEditProduct(null); fetchData(); setSaving(false)
  }
  const deleteProduct = async (id: string) => {
    if (!confirm(fr ? "Supprimer ce produit ?" : "Delete this product?")) return
    const { error } = await insforge.database.from("commerce_products").delete().eq("id", id).eq("workspace_id", workspace.id)
    if (error) { alert(fr ? "Erreur lors de la suppression" : "Delete error"); return }
    fetchData()
  }

  // CUSTOMER CRUD
  const openAddCustomer = () => { setCustomerForm({ ...EMPTY_CUSTOMER }); setCustomerError(null); setCustomerErrors({}); setEditCustomer(null); setShowCustomer(true) }
  const openEditCustomer = (c: Customer) => {
    setEditCustomer(c)
    setCustomerForm({ name: c.name, phone: c.phone ?? "", email: c.email ?? "" })
    setCustomerError(null); setCustomerErrors({}); setShowCustomer(true)
  }
  const saveCustomer = async () => {
    if (!workspace) return
    const errs = validateFields(customerForm, customerRules)
    setCustomerErrors(errs)
    if (hasErrors(errs)) return
    const formStr = [customerForm.name, customerForm.phone, customerForm.email].join(" ")
    if (detectInjection(formStr)) {
      logSecurityEvent({ type: "injection_attempt", details: `Suspicious input in customer form`, path: "commerce" })
      setCustomerError(fr ? "Entrée suspecte détectée." : "Suspicious input detected."); setSaving(false); return
    }
    if (!editCustomer && customers.some((c) => c.name.trim().toLowerCase() === customerForm.name.trim().toLowerCase())) {
      toast.error(fr ? "Un client avec ce nom existe déjà" : "A customer with this name already exists")
      setSaving(false); return
    }
    setSaving(true); setCustomerError(null)
    const payload = { workspace_id: workspace.id, name: customerForm.name.trim(), phone: customerForm.phone || null, email: customerForm.email || null }
    const { error } = editCustomer
      ? await insforge.database.from("customers").update(payload).eq("id", editCustomer.id).eq("workspace_id", workspace.id)
      : await insforge.database.from("customers").insert([payload])
    if (error) { setCustomerError(error.message); setSaving(false); return }
    setShowCustomer(false); setEditCustomer(null); fetchData(); setSaving(false)
  }
  const deleteCustomer = async (id: string) => {
    if (!confirm(fr ? "Supprimer ce client ?" : "Delete this customer?")) return
    const { error } = await insforge.database.from("customers").delete().eq("id", id).eq("workspace_id", workspace.id)
    if (error) { alert(fr ? "Erreur lors de la suppression" : "Delete error"); return }
    fetchData()
  }

  // CART
  const addToCart = (p: Product) => setCart((prev) => {
    const ex = prev.find((c) => c.product.id === p.id)
    if (ex) {
      const newQty = Math.min(ex.qty + 1, p.stock_quantity)
      return prev.map((c) => c.product.id === p.id ? { ...c, qty: newQty } : c)
    }
    return [...prev, { product: p, qty: 1 }]
  })
  const removeFromCart = (id: string) => setCart((prev) => prev.filter((c) => c.product.id !== id))
  const changeQty = (id: string, d: number) => setCart((prev) => prev.map((c) => c.product.id === id ? { ...c, qty: Math.min(Math.max(1, c.qty + d), c.product.stock_quantity) } : c))
  const cartTotal = cart.reduce((s, c) => s + (Number(c.product.price_usd) ?? 0) * (c.qty ?? 0), 0)

  const processSale = async () => {
    if (!workspace || cart.length === 0) return
    setSaving(true)
    const { data: sale, error } = await insforge.database.from("sales").insert([{ workspace_id: workspace.id, total_usd: cartTotal, payment_method: paymentMethod, status: "completed" }]).select().single()
    if (error || !sale) { setSaving(false); return }
    await insforge.database.from("sale_items").insert(cart.map((c) => ({ sale_id: sale.id, workspace_id: workspace.id, product_name: c.product.name, product_id: c.product.id, quantity: c.qty, unit_price: c.product.price_usd, total_price: c.product.price_usd * c.qty })))
    for (const c of cart) await insforge.database.from("commerce_products").update({ stock_quantity: Math.max(0, c.product.stock_quantity - c.qty) }).eq("id", c.product.id).eq("workspace_id", workspace.id).gte("stock_quantity", c.qty)
    if (user && workspace.owner_id) {
      const itemsSummary = cart.map((c) => `${c.product.name} ×${c.qty}`).join(", ")
      await logActivity({ workspaceId: workspace.id, ownerId: workspace.owner_id, actorUserId: user.id, actorEmail: user.email ?? "", actorName: user.email ?? "", actionType: "sale", module: "commerce", description: `Vente commerce ${formatCurrency(cartTotal)} — ${itemsSummary}`, amountUsd: cartTotal, referenceId: sale.id })
      await publishNotification(createSaleNotification(workspace.id, user.email?.split("@")[0] ?? "Caissier", cartTotal, "FC", "commerce", "ventes"))
    }
    setCart([]); setSaleMsg(fr ? `Vente de ${formatCurrency(cartTotal)} enregistrée !` : `Sale of ${formatCurrency(cartTotal)} recorded!`)
    fetchData(); setSaving(false); setTimeout(() => setSaleMsg(null), 3000)
  }

  // SALES EXPAND
  const toggleSaleExpand = async (saleId: string) => {
    if (expandedSaleId === saleId) { setExpandedSaleId(null); return }
    setExpandedSaleId(saleId)
    if (!saleItemsMap[saleId]) {
      const { data } = await insforge.database.from("sale_items").select("*").eq("sale_id", saleId).eq("workspace_id", workspace.id).order("product_name")
      setSaleItemsMap((prev) => ({ ...prev, [saleId]: (data as SaleItem[]) ?? [] }))
    }
  }

  const toggleHistoryExpand = async (itemId: string, type: string, refId: string) => {
    if (expandedHistoryId === itemId) { setExpandedHistoryId(null); return }
    setExpandedHistoryId(itemId)
    if (!historyDetailsMap[itemId]) {
      if (type === "sale") {
        const { data } = await insforge.database.from("sale_items").select("*").eq("sale_id", refId).eq("workspace_id", workspace.id).order("product_name")
        setHistoryDetailsMap(prev => ({ ...prev, [itemId]: (data as SaleItem[]) ?? [] }))
      } else {
        const { data } = await insforge.database.from("invoice_items").select("*").eq("invoice_id", refId).eq("workspace_id", workspace.id).order("product_name")
        setHistoryDetailsMap(prev => ({ ...prev, [itemId]: (data as any[]) ?? [] }))
      }
    }
  }

  // INVOICES
  const openNewInvoice = () => {
    setInvoiceForm({ customer_id: "", due_date: "", notes: "", line_items: [{ product_name: "", quantity: "1", unit_price: "" }] })
    setInvoiceError(null); setInvoiceErrors({}); setShowInvoice(true)
  }
  const updateInvLine = (i: number, f: string, v: string) => setInvoiceForm((prev) => {
    const items = [...prev.line_items]; items[i] = { ...items[i], [f]: v }; return { ...prev, line_items: items }
  })
  const addInvLine = () => setInvoiceForm((prev) => ({ ...prev, line_items: [...prev.line_items, { product_name: "", quantity: "1", unit_price: "" }] }))
  const removeInvLine = (i: number) => setInvoiceForm((prev) => ({ ...prev, line_items: prev.line_items.filter((_, idx) => idx !== i) }))
  const invoiceTotal = invoiceForm.line_items.filter((item) => item.product_name.trim() && safeParseFloat(item.unit_price) > 0).reduce((s, item) => s + safeParseFloat(item.unit_price) * safeParseInt(item.quantity || "1"), 0)

  const saveInvoice = async () => {
    if (!workspace) return
    const errs = validateFields(invoiceForm, invoiceRules)
    setInvoiceErrors(errs)
    if (hasErrors(errs)) return
    const validItems = invoiceForm.line_items.filter((item) => item.product_name.trim() && safeParseFloat(item.unit_price) > 0)
    if (validItems.length === 0) { setInvoiceError(fr ? "Ajoutez au moins un article" : "Add at least one item"); return }
    const formStr = [invoiceForm.customer_id, invoiceForm.due_date, invoiceForm.notes, ...invoiceForm.line_items.map((li) => li.product_name)].join(" ")
    if (detectInjection(formStr)) {
      logSecurityEvent({ type: "injection_attempt", details: `Suspicious input in invoice form`, path: "commerce" })
      setInvoiceError(fr ? "Entrée suspecte détectée." : "Suspicious input detected."); setSaving(false); return
    }
    setSaving(true); setInvoiceError(null)
    const { data: lastInv } = await insforge.database.from("invoices").select("invoice_number").eq("workspace_id", workspace.id).order("invoice_number", { ascending: false }).limit(1)
    const lastNum = parseInt((((lastInv as any)?.[0])?.invoice_number ?? "INV-000").replace("INV-", ""), 10)
    const invoiceNumber = `INV-${String((lastNum || 0) + 1).padStart(3, "0")}`
    const total = validItems.reduce((s, item) => s + safeParseFloat(item.unit_price) * safeParseInt(item.quantity), 0)
    const { data: invoice, error } = await insforge.database.from("invoices").insert([{ workspace_id: workspace.id, customer_id: invoiceForm.customer_id, invoice_number: invoiceNumber, total_usd: total, status: "draft", due_date: invoiceForm.due_date || null, notes: invoiceForm.notes || null }]).select().single()
    if (error || !invoice) { setInvoiceError(error?.message ?? "Error"); setSaving(false); return }
    await insforge.database.from("invoice_items").insert(validItems.map((item) => ({ workspace_id: workspace.id, invoice_id: invoice.id, product_name: item.product_name.trim(), quantity: safeParseInt(item.quantity), unit_price: safeParseFloat(item.unit_price), total_price: safeParseFloat(item.unit_price) * safeParseInt(item.quantity) })))
    if (user && workspace.owner_id) {
      await logActivity({ workspaceId: workspace.id, ownerId: workspace.owner_id, actorUserId: user.id, actorEmail: user.email ?? "", actorName: user.email ?? "", actionType: "create", module: "commerce", description: `Facture ${invoiceNumber} créée — ${formatCurrency(total)}`, amountUsd: total, referenceId: invoice.id })
    }
    publishNotification(createInvoiceNotification(workspace.id, user?.email?.split("@")[0] ?? "Caissier", invoiceNumber, "commerce", "invoices"))
    setShowInvoice(false); setSaving(false); fetchData()
  }

  const updateInvoiceStatus = async (invoiceId: string, newStatus: string) => {
    if (!workspace) return
    const { error } = await insforge.database.from("invoices").update({ status: newStatus }).eq("id", invoiceId).eq("workspace_id", workspace.id)
    if (error) { alert(error.message); return }
    if (newStatus === "paid") {
      const inv = invoices.find((i) => i.id === invoiceId)
      if (inv && inv.customer_id) {
        const { data: cust } = await insforge.database.from("customers").select("total_spent").eq("id", inv.customer_id).eq("workspace_id", workspace.id).single()
        if (cust) {
          await insforge.database.from("customers").update({ total_spent: Number(cust.total_spent ?? 0) + Number(inv.total_usd) }).eq("id", inv.customer_id).eq("workspace_id", workspace.id)
        }
      }
    }
    fetchData()
  }

  const statusLabel = (s: string) => {
    const map: Record<string, string> = { draft: fr ? "Brouillon" : "Draft", sent: fr ? "Envoyée" : "Sent", paid: fr ? "Payée" : "Paid", cancelled: fr ? "Annulée" : "Cancelled" }
    return map[s] ?? s
  }
  const statusVariant = (s: string): "default" | "secondary" | "destructive" | "outline" => {
    if (s === "paid") return "default"
    if (s === "cancelled") return "destructive"
    if (s === "sent") return "outline"
    return "secondary"
  }
  const payLabel = (m: string) => {
    const map: Record<string, string> = { cash: fr ? "Espèces" : "Cash", mobile_money: "Mobile Money", card: fr ? "Carte" : "Card", credit: fr ? "Crédit" : "Credit" }
    return map[m] ?? m
  }

  // ACCOUNTING
  const openAddEntry = (type?: "income" | "expense") => { setEntryForm({ ...EMPTY_ENTRY, type: type ?? "income" }); setEntryError(null); setEntryErrors({}); setShowEntry(true) }
  const saveEntry = async () => {
    if (!workspace) return
    const errs = validateFields(entryForm, accountingEntryRules)
    setEntryErrors(errs)
    if (hasErrors(errs)) return
    const formStr = [entryForm.category, entryForm.description, entryForm.amount_usd, entryForm.entry_date].join(" ")
    if (detectInjection(formStr)) {
      logSecurityEvent({ type: "injection_attempt", details: `Suspicious input in accounting entry form`, path: "commerce" })
      setEntryError(fr ? "Entrée suspecte détectée." : "Suspicious input detected."); setSaving(false); return
    }
    setSaving(true); setEntryError(null)
    const { error } = await insforge.database.from("accounting_entries").insert([{ workspace_id: workspace.id, type: entryForm.type, category: entryForm.category || entryForm.type, description: entryForm.description.trim(), amount_usd: safeParseFloat(entryForm.amount_usd), entry_date: entryForm.entry_date }])
    if (error) { setEntryError(error.message); setSaving(false); return }
    publishNotification(createAccountingNotification(workspace.id, user?.email?.split("@")[0] ?? "Commerce", entryForm.description.trim(), safeParseFloat(entryForm.amount_usd), entryForm.type, "commerce", "comptabilite"))
    setShowEntry(false); fetchData(); setSaving(false)
  }
  const deleteEntry = async (id: string) => {
    if (!confirm(fr ? "Supprimer cette entrée ?" : "Delete this entry?")) return
    const { error } = await insforge.database.from("accounting_entries").delete().eq("id", id).eq("workspace_id", workspace.id)
    if (error) { alert(fr ? "Erreur lors de la suppression" : "Delete error"); return }
    fetchData()
  }

  const rootRef = usePageEntrance([loading])

  if (!workspace) return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <ShoppingCart className="size-12 text-muted-foreground" />
      <p className="text-muted-foreground">{fr ? "Connectez-vous pour accéder au commerce." : "Sign in to access commerce."}</p>
      <Button onClick={() => onNavigate("signin")}>{fr ? "Se connecter" : "Sign in"}</Button>
    </div>
  )

  return (
    <div ref={rootRef} className="min-h-svh bg-background">
      <div className="page-header bg-gradient-to-br from-warning to-warning/70 px-4 py-4 text-primary-foreground">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
                <button onClick={() => onNavigate("dashboard")} className="hover:text-white hover:underline">{fr ? "Tableau de bord" : "Dashboard"}</button>
                <span>/</span><span className="text-white">{fr ? "Commerce" : "Commerce"}</span>
              </div>
              <h1 className="text-2xl font-bold flex items-center gap-2"><ShoppingCart className="size-6" /> {fr ? "Commerce" : "Commerce"}</h1>
              <p className="text-white/70 text-sm mt-0.5">{workspace.name}</p>
            </div>
            <Button variant="outline" size="sm" className="border-white/30 text-white hover:bg-white/10 gap-1.5" onClick={fetchData}><RefreshCw className="size-3.5" />{fr ? "Actualiser" : "Refresh"}</Button>
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
            <TabsTrigger value="clients"><Users className="size-4 mr-1.5" />{fr ? "Clients" : "Customers"}</TabsTrigger>
            <TabsTrigger value="factures"><FileText className="size-4 mr-1.5" />{fr ? "Factures" : "Invoices"}</TabsTrigger>
            <TabsTrigger value="produits"><Package className="size-4 mr-1.5" />{fr ? "Produits" : "Products"}</TabsTrigger>
            <TabsTrigger value="ventes"><ShoppingCart className="size-4 mr-1.5" />{fr ? "Ventes" : "Sales"}</TabsTrigger>
            <TabsTrigger value="comptabilite"><Receipt className="size-4 mr-1.5" />{fr ? "Comptabilité" : "Accounting"}</TabsTrigger>
            <TabsTrigger value="reports"><FileText className="size-4 mr-1.5" />{fr ? "Rapports" : "Reports"}</TabsTrigger>
            <TabsTrigger value="history"><History className="size-4 mr-1.5" />{fr ? "Historique" : "History"}</TabsTrigger>
          </TabsList>

          {/* CLIENTS */}
          <TabsContent value="clients">
            <div className="mb-6 grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">{fr ? "Total clients" : "Total customers"}</p>
                <p className="text-lg font-bold text-foreground">{customers.length}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">{fr ? "Dépenses totales" : "Total spent"}</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(totalCustomerSpent, undefined, true)}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">{fr ? "Clients actifs" : "Active customers"}</p>
                <p className="text-lg font-bold text-foreground">{activeCustomers}</p>
              </div>
            </div>
            <div className="flex justify-end mb-4">
              <Button onClick={openAddCustomer} className="gap-1.5 bg-warning text-warning-foreground hover:bg-warning/90"><Plus className="size-4" />{fr ? "Ajouter un client" : "Add customer"}</Button>
            </div>
            {loading ? <div className="flex h-32 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div> :
              customers.length === 0 ? (
                <EmptyState
                  icon={<Users className="size-12" />}
                  title={fr ? "Aucun client" : "No customers"}
                  description={fr ? "Ajoutez des clients pour suivre leurs achats." : "Add customers to track their purchases."}
                  action={<Button variant="outline" size="sm" onClick={openAddCustomer}><Plus className="size-3.5 mr-1" />{fr ? "Ajouter" : "Add"}</Button>}
                />
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50"><tr>{[fr ? "Nom" : "Name", fr ? "Téléphone" : "Phone", fr ? "Courriel" : "Email", fr ? "Total dépensé" : "Total spent", ""].map((h) => <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-border">
                      {customers.map((c) => (
                        <tr key={c.id} className="bg-card hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium text-foreground flex items-center gap-2"><User className="size-3.5 text-muted-foreground" />{c.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{c.phone ?? "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{c.email ?? "—"}</td>
                          <td className="px-4 py-3 font-medium text-foreground">{formatCurrency(Number(c.total_spent), undefined, true)}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1.5 justify-end">
                              <Button size="icon" variant="ghost" className="size-7" onClick={() => openEditCustomer(c)}><Edit2 className="size-3.5" /></Button>
                              {role === "admin" && <Button size="icon" variant="ghost" className="size-7 text-destructive hover:text-destructive" onClick={() => deleteCustomer(c.id)}><Trash2 className="size-3.5" /></Button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </TabsContent>

          {/* FACTURES */}
          <TabsContent value="factures">
            <div className="flex justify-end mb-4">
              <Button onClick={openNewInvoice} className="gap-1.5 bg-warning text-warning-foreground hover:bg-warning/90"><Plus className="size-4" />{fr ? "Nouvelle facture" : "New invoice"}</Button>
            </div>
            {loading ? <div className="flex h-32 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div> :
              invoices.length === 0 ? (
                <EmptyState
                  icon={<FileText className="size-12" />}
                  title={fr ? "Aucune facture" : "No invoices"}
                  description={fr ? "Créez des factures pour vos clients." : "Create invoices for your customers."}
                  action={<Button variant="outline" size="sm" onClick={openNewInvoice}><Plus className="size-3.5 mr-1" />{fr ? "Nouvelle facture" : "New invoice"}</Button>}
                />
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50"><tr>{[fr ? "Facture" : "Invoice", fr ? "Client" : "Customer", fr ? "Total (FC)" : "Total (FC)", fr ? "Statut" : "Status", fr ? "Échéance" : "Due date", ""].map((h) => <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-border">
                      {invoices.map((inv) => {
                        const cust = customers.find((c) => c.id === inv.customer_id)
                        return (
                          <tr key={inv.id} className="bg-card hover:bg-muted/30">
                            <td className="px-4 py-3 font-medium text-foreground">{inv.invoice_number}</td>
                            <td className="px-4 py-3 text-muted-foreground">{cust?.name ?? "—"}</td>
                            <td className="px-4 py-3 text-foreground">{formatCurrency(Number(inv.total_usd), undefined, true)}</td>
                            <td className="px-4 py-3"><Badge variant={statusVariant(inv.status)} className={inv.status === "paid" ? "bg-success/15 text-success border-success/30" : inv.status === "sent" ? "border-blue-400 text-blue-600" : ""}>{statusLabel(inv.status)}</Badge></td>
                            <td className="px-4 py-3 text-muted-foreground">{inv.due_date ? new Date(inv.due_date).toLocaleDateString(fr ? "fr-FR" : "en-US") : "—"}</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1 justify-end">
                                {inv.status === "draft" && (role === "admin" || role === "accountant") && <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => updateInvoiceStatus(inv.id, "sent")}><ArrowUpCircle className="size-3" />{fr ? "Envoyer" : "Send"}</Button>}
                                {inv.status === "sent" && (role === "admin" || role === "accountant") && <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-success text-success hover:bg-success/10" onClick={() => updateInvoiceStatus(inv.id, "paid")}><Check className="size-3" />{fr ? "Payer" : "Pay"}</Button>}
                                {(inv.status === "draft" || inv.status === "sent") && (role === "admin" || role === "accountant") && <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive border-destructive/40 hover:bg-destructive/10" onClick={() => updateInvoiceStatus(inv.id, "cancelled")}><X className="size-3" />{fr ? "Annuler" : "Cancel"}</Button>}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
          </TabsContent>

          {/* PRODUITS */}
          <TabsContent value="produits">
            <div className="mb-6 grid grid-cols-4 gap-3">
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">{fr ? "Total produits" : "Total products"}</p>
                <p className="text-lg font-bold text-foreground">{products.length}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">{fr ? "Catégories" : "Categories"}</p>
                <p className="text-lg font-bold text-foreground">{totalCategories}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">{fr ? "Valeur stock (FC)" : "Stock value (FC)"}</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(totalStockValue, undefined, true)}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">{fr ? "Stock faible" : "Low stock"}</p>
                <p className="text-lg font-bold text-destructive">{lowStockCount}</p>
              </div>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div className="relative flex-1 max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" /><Input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder={fr ? "Rechercher..." : "Search..."} className="pl-9" /></div>
              <Button onClick={openAddProduct} className="gap-1.5 bg-warning text-warning-foreground hover:bg-warning/90"><Plus className="size-4" />{fr ? "Ajouter" : "Add product"}</Button>
            </div>
            {loading ? <div className="flex h-32 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div> :
              productFiltered.length === 0 ? (
                <EmptyState
                  icon={<Package className="size-12" />}
                  title={fr ? "Aucun produit" : "No products"}
                  description={fr ? "Ajoutez des produits pour commencer à vendre." : "Add products to start selling."}
                  action={<Button variant="outline" size="sm" onClick={openAddProduct}><Plus className="size-3.5 mr-1" />{fr ? "Ajouter" : "Add"}</Button>}
                />
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50"><tr>{[fr ? "Produit" : "Product", fr ? "Catégorie" : "Category", fr ? "Prix (FC)" : "Price (FC)", fr ? "Stock" : "Stock", fr ? "Code-barres" : "Barcode", ""].map((h) => <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-border">
                      {productFiltered.map((p) => (
                        <tr key={p.id} className="bg-card hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{p.category ?? "—"}</td>
                          <td className="px-4 py-3 text-foreground">{formatCurrency(p.price_usd)}</td>
                          <td className="px-4 py-3"><Badge variant={p.stock_quantity < 5 ? "destructive" : "secondary"}>{p.stock_quantity}</Badge></td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{p.barcode ?? "—"}</td>
                          <td className="px-4 py-3"><div className="flex gap-1.5 justify-end"><Button size="icon" variant="ghost" className="size-7" onClick={() => openEditProduct(p)}><Edit2 className="size-3.5" /></Button>{role === "admin" && <Button size="icon" variant="ghost" className="size-7 text-destructive hover:text-destructive" onClick={() => deleteProduct(p.id)}><Trash2 className="size-3.5" /></Button>}</div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </TabsContent>

          {/* VENTES */}
          <TabsContent value="ventes">
            <Tabs defaultValue="caisse">
              <TabsList className="mb-4">
                <TabsTrigger value="caisse"><ShoppingCart className="size-4 mr-1.5" />{fr ? "Caisse" : "POS"}</TabsTrigger>
                <TabsTrigger value="historique"><History className="size-4 mr-1.5" />{fr ? "Historique" : "History"}</TabsTrigger>
              </TabsList>

              <TabsContent value="caisse">
                {saleMsg && <Alert className="mb-4 border-success/30 bg-success/10"><Check className="size-4 text-success" /><AlertDescription className="text-success-muted-foreground">{saleMsg}</AlertDescription></Alert>}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-2 space-y-4">
                    <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" /><Input value={posSearch} onChange={(e) => setPosSearch(e.target.value)} placeholder={fr ? "Chercher un produit..." : "Search product..."} className="pl-9" /></div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {posFiltered.slice(0, 18).map((p) => (
                        <button key={p.id} onClick={() => addToCart(p)} className="rounded-lg border border-border bg-card p-3 text-left hover:border-warning/50 hover:bg-warning/5 transition-all">
                          <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.category ? `${p.category} · ` : ""}{p.stock_quantity} {fr ? "en stock" : "in stock"}</p>
                          <p className="text-sm font-bold text-warning mt-1">{formatCurrency(p.price_usd)}</p>
                        </button>
                      ))}
                      {posFiltered.length === 0 && <p className="col-span-3 text-center text-muted-foreground py-8 text-sm">{fr ? "Aucun produit disponible" : "No products available"}</p>}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
                    <h3 className="font-semibold text-foreground">{fr ? "Panier" : "Cart"}</h3>
                    {cart.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">{fr ? "Panier vide" : "Cart is empty"}</p> : (
                      <ScrollArea className="flex-1 max-h-48">
                        {cart.map((c) => (
                          <div key={c.product.id} className="flex items-center gap-2 py-2 border-b border-border last:border-0">
                            <div className="flex-1 min-w-0"><p className="text-xs font-medium text-foreground truncate">{c.product.name}</p><p className="text-xs text-muted-foreground">{formatCurrency(c.product.price_usd)} × {c.qty}</p></div>
                            <div className="flex items-center gap-1">
                              <Button size="icon" variant="outline" className="size-6" onClick={() => changeQty(c.product.id, -1)}><Minus className="size-3" /></Button>
                              <span className="w-6 text-center text-xs font-bold text-foreground">{c.qty}</span>
                              <Button size="icon" variant="outline" className="size-6" onClick={() => changeQty(c.product.id, 1)}><Plus className="size-3" /></Button>
                              <Button size="icon" variant="ghost" className="size-6 text-destructive" onClick={() => removeFromCart(c.product.id)}><X className="size-3" /></Button>
                            </div>
                          </div>
                        ))}
                      </ScrollArea>
                    )}
                    <Separator />
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">{fr ? "Paiement" : "Payment"}</Label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">{fr ? "Espèces" : "Cash"}</SelectItem>
                          <SelectItem value="mobile_money">Mobile Money</SelectItem>
                          <SelectItem value="card">{fr ? "Carte" : "Card"}</SelectItem>
                          <SelectItem value="credit">{fr ? "Crédit" : "Credit"}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-between font-bold text-foreground"><span>Total</span><span>{formatCurrency(cartTotal, undefined, true)}</span></div>
                    <Button className="w-full bg-warning text-warning-foreground hover:bg-warning/90 gap-2" onClick={processSale} disabled={cart.length === 0 || saving}>
                      {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}{fr ? "Encaisser" : "Checkout"}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="historique">
                {loading ? <div className="flex h-32 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div> :
                  sales.length === 0 ? <EmptyState
                    icon={<History className="size-12" />}
                    title={fr ? "Aucune vente" : "No sales yet"}
                    description={fr ? "Les transactions apparaîtront ici." : "Transactions will appear here."}
                  /> : (
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50"><tr>{[fr ? "Date" : "Date", fr ? "Montant (FC)" : "Amount (FC)", fr ? "Paiement" : "Payment", fr ? "Statut" : "Status", ""].map((h) => <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>)}</tr></thead>
                        <tbody className="divide-y divide-border">
                          {sales.map((s) => (
                            <React.Fragment key={s.id}>
                              <tr className="bg-card hover:bg-muted/30 cursor-pointer" onClick={() => toggleSaleExpand(s.id)}>
                                <td className="px-4 py-3 text-muted-foreground">{new Date(s.sold_at).toLocaleString(fr ? "fr-FR" : "en-US", { dateStyle: "short", timeStyle: "short" })}</td>
                                <td className="px-4 py-3 font-medium text-foreground">{formatCurrency(Number(s.total_usd), undefined, true)}</td>
                                <td className="px-4 py-3 text-muted-foreground capitalize">{payLabel(s.payment_method)}</td>
                                <td className="px-4 py-3"><Badge variant={s.status === "completed" ? "secondary" : "destructive"}>{s.status === "completed" ? (fr ? "Complétée" : "Completed") : (fr ? "Annulée" : "Cancelled")}</Badge></td>
                                <td className="px-4 py-3"><ChevronDown className={`size-4 text-muted-foreground transition-transform ${expandedSaleId === s.id ? "rotate-180" : ""}`} /></td>
                              </tr>
                              {expandedSaleId === s.id && (
                                <tr key={`${s.id}-items`}>
                                  <td colSpan={5} className="px-4 py-3 bg-muted/20">
                                    {saleItemsMap[s.id] ? (
                                      saleItemsMap[s.id].length === 0 ? (
                                        <p className="text-xs text-muted-foreground">{fr ? "Aucun article" : "No items"}</p>
                                      ) : (
                                        <div className="text-xs space-y-1">
                                          {saleItemsMap[s.id].map((item) => (
                                            <div key={item.id} className="flex justify-between text-foreground">
                                              <span>{item.product_name} × {item.quantity}</span>
                                              <span>{formatCurrency(Number(item.total_price), undefined, true)}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )
                                    ) : (
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="size-3 animate-spin" />{fr ? "Chargement..." : "Loading..."}</div>
                                    )}
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* COMPTABILITÉ */}
          <TabsContent value="comptabilite">
            <div className="flex gap-2 justify-end mb-4">
              <Button onClick={() => openAddEntry("income")} className="gap-1.5 bg-success text-success-foreground hover:bg-success/90 text-xs"><ArrowUpCircle className="size-4" />{fr ? "Revenu" : "Income"}</Button>
              <Button onClick={() => openAddEntry("expense")} className="gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs"><ArrowDownCircle className="size-4" />{fr ? "Dépense" : "Expense"}</Button>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: fr ? "Revenus" : "Income", value: totalIncome, color: "border-success/30 bg-success/5 text-success" },
                { label: fr ? "Dépenses" : "Expenses", value: totalExpense, color: "border-destructive/30 bg-destructive/5 text-destructive" },
                { label: fr ? "Solde" : "Balance", value: totalIncome - totalExpense, color: (totalIncome - totalExpense) >= 0 ? "border-success/30 bg-success/5 text-success" : "border-destructive/30 bg-destructive/5 text-destructive" },
              ].map((c, i) => (
                <div key={i} className={`rounded-lg border p-4 ${c.color}`}>
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                  <p className="text-lg font-bold">{formatCurrency(c.value, undefined, true)}</p>
                </div>
              ))}
            </div>
            {loading ? <div className="flex h-32 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div> :
              entries.length === 0 ? (
                <EmptyState
                  icon={<Receipt className="size-12" />}
                  title={fr ? "Aucune entrée comptable" : "No accounting entries"}
                  description={fr ? "Ajoutez des revenus ou dépenses pour suivre la comptabilité." : "Add income or expenses to track accounting."}
                  action={<Button variant="outline" size="sm" onClick={() => openAddEntry("income")}><Plus className="size-3.5 mr-1" />{fr ? "Ajouter" : "Add"}</Button>}
                />
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50"><tr>{[fr ? "Date" : "Date", fr ? "Type" : "Type", fr ? "Catégorie" : "Category", fr ? "Description" : "Description", fr ? "Montant (FC)" : "Amount (FC)", ""].map((h) => <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-border">
                      {entries.map((e) => (
                        <tr key={e.id} className="bg-card hover:bg-muted/30">
                          <td className="px-4 py-3 text-muted-foreground">{new Date(e.entry_date).toLocaleDateString(fr ? "fr-FR" : "en-US")}</td>
                          <td className="px-4 py-3"><Badge variant={e.type === "income" ? "secondary" : "destructive"} className="text-xs">{e.type === "income" ? (fr ? "Revenu" : "Income") : (fr ? "Dépense" : "Expense")}</Badge></td>
                          <td className="px-4 py-3 text-muted-foreground">{e.category}</td>
                          <td className="px-4 py-3 text-foreground">{e.description}</td>
                          <td className={`px-4 py-3 font-medium ${e.type === "income" ? "text-success" : "text-destructive"}`}>{e.type === "income" ? "+" : "-"}{formatCurrency(Number(e.amount_usd), undefined, true)}</td>
                          <td className="px-4 py-3">{role === "admin" && <Button size="icon" variant="ghost" className="size-7 text-destructive hover:text-destructive" onClick={() => deleteEntry(e.id)}><Trash2 className="size-3.5" /></Button>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </TabsContent>

          {/* RAPPORTS */}
          <TabsContent value="reports">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{fr ? "Rapports & Export" : "Reports & Export"}</h3>
                <p className="text-sm text-muted-foreground">{fr ? "Générez des rapports PDF ou Word" : "Generate PDF or Word reports"}</p>
              </div>
              <ReportGenerator
                moduleType="commerce"
                workspace={workspace!}
                data={{ products, customers, sales, invoices, members }}
              />
            </div>
            <div className="mb-6 grid grid-cols-4 gap-3">
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">{fr ? "Produits" : "Products"}</p>
                <p className="text-lg font-bold text-foreground">{products.length}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">{fr ? "Clients" : "Customers"}</p>
                <p className="text-lg font-bold text-foreground">{customers.length}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">{fr ? "Revenu aujourd'hui" : "Today's revenue"}</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(todayRevenue, undefined, true)}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">{fr ? "Ventes totales" : "Total sales"}</p>
                <p className="text-lg font-bold text-foreground">{sales.length}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-sm font-semibold text-foreground mb-4">{fr ? "Ventes des 7 derniers jours" : "Last 7 days sales"}</h3>
                {loading ? (
                  <div className="flex h-32 items-center justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
                ) : (
                  <div className="flex items-end gap-2 h-32">
                    {last7Days.map((d) => {
                      const maxVal = Math.max(...last7Days.map(x => x.total), 1)
                      const pct = (d.total / maxVal) * 100
                      return (
                        <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-[10px] text-muted-foreground">{formatCurrency(d.total)}</span>
                          <div className="w-full flex-1 flex flex-col justify-end">
                            <div className="w-full rounded-t bg-warning transition-all" style={{ height: `${Math.max(pct, 3)}%` }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground">{new Date(d.date).toLocaleDateString(fr ? "fr-FR" : "en-US", { weekday: "short" })}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-sm font-semibold text-foreground mb-4">{fr ? "Produits les plus vendus" : "Top selling products"}</h3>
                {topProducts.length === 0 ? (
                  <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">{loadingReports ? <Loader2 className="size-5 animate-spin" /> : (fr ? "Aucune donnée" : "No data")}</div>
                ) : (
                  <div className="space-y-2">
                    {topProducts.slice(0, 8).map((p, i) => (
                      <div key={p.name} className="flex items-center gap-2 text-sm">
                        <span className="w-5 text-xs text-muted-foreground font-medium">#{i + 1}</span>
                        <span className="flex-1 text-foreground truncate">{p.name}</span>
                        <span className="text-xs text-muted-foreground">{p.totalQty} {fr ? "vendus" : "sold"}</span>
                        <span className="font-medium text-foreground">{formatCurrency(p.totalRevenue, undefined, true)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-sm font-semibold text-foreground mb-4">{fr ? "Stock faible" : "Low stock alert"}</h3>
                {lowStockCount === 0 ? (
                  <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">{fr ? "Tout est en stock" : "All stocked up"}</div>
                ) : (
                  <div className="space-y-2">
                    {products.filter(p => p.stock_quantity < 5).sort((a, b) => a.stock_quantity - b.stock_quantity).slice(0, 10).map(p => (
                      <div key={p.id} className="flex items-center gap-2 text-sm">
                        <AlertTriangle className="size-3.5 text-destructive shrink-0" />
                        <span className="flex-1 text-foreground truncate">{p.name}</span>
                        <Badge variant="destructive" className="text-[10px]">{p.stock_quantity} {fr ? "restants" : "left"}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-sm font-semibold text-foreground mb-4">{fr ? "Factures récentes" : "Recent invoices"}</h3>
                {invoices.length === 0 ? (
                  <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">{fr ? "Aucune facture" : "No invoices"}</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          {[fr ? "Facture" : "Invoice", fr ? "Montant" : "Amount", fr ? "Statut" : "Status"].map(h => <th key={h} className="px-2 py-2 text-left text-[10px] font-medium text-muted-foreground">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.slice(0, 8).map(inv => (
                          <tr key={inv.id} className="border-b border-border/50 last:border-0">
                            <td className="px-2 py-2 text-xs text-foreground">{inv.invoice_number}</td>
                            <td className="px-2 py-2 text-xs font-medium text-foreground">{formatCurrency(Number(inv.total_usd), undefined, true)}</td>
                            <td className="px-2 py-2"><Badge variant={statusVariant(inv.status)} className="text-[10px]">{statusLabel(inv.status)}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* HISTORIQUE */}
          <TabsContent value="history">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input type="date" value={historyDateFrom} onChange={e => setHistoryDateFrom(e.target.value)} className="w-36 pl-8 h-9 text-xs" />
                </div>
                <span className="text-xs text-muted-foreground">{fr ? "à" : "to"}</span>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input type="date" value={historyDateTo} onChange={e => setHistoryDateTo(e.target.value)} className="w-36 pl-8 h-9 text-xs" />
                </div>
                <Select value={historyTypeFilter} onValueChange={setHistoryTypeFilter}>
                  <SelectTrigger className="h-9 text-xs w-32"><Filter className="size-3 mr-1" /><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{fr ? "Tous" : "All"}</SelectItem>
                    <SelectItem value="sale">{fr ? "Ventes" : "Sales"}</SelectItem>
                    <SelectItem value="invoice">{fr ? "Factures" : "Invoices"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {loading ? <div className="flex h-32 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div> :
              combinedHistory.length === 0 ? (
                <EmptyState
                  icon={<History className="size-12" />}
                  title={fr ? "Aucun historique" : "No history found"}
                  description={fr ? "L'historique des ventes et factures apparaîtra ici." : "Sales and invoice history will appear here."}
                />
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50"><tr>{[fr ? "Date" : "Date", fr ? "Type" : "Type", fr ? "Référence" : "Reference", fr ? "Montant (FC)" : "Amount (FC)", fr ? "Statut" : "Status", ""].map(h => <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-border">
                      {combinedHistory.map((item) => (
                        <React.Fragment key={item.id}>
                          <tr className="bg-card hover:bg-muted/30 cursor-pointer" onClick={() => toggleHistoryExpand(item.id, item.type, item.refId)}>
                            <td className="px-4 py-3 text-muted-foreground">{new Date(item.date).toLocaleDateString(fr ? "fr-FR" : "en-US")}</td>
                            <td className="px-4 py-3"><Badge variant={item.type === "sale" ? "secondary" : "outline"} className="text-xs">{item.type === "sale" ? (fr ? "Vente" : "Sale") : (fr ? "Facture" : "Invoice")}</Badge></td>
                            <td className="px-4 py-3 font-medium text-foreground">{item.reference}</td>
                            <td className="px-4 py-3 text-foreground">{formatCurrency(item.amount, undefined, true)}</td>
                            <td className="px-4 py-3"><Badge variant={statusVariant(item.status)}>{statusLabel(item.status)}</Badge></td>
                            <td className="px-4 py-3"><ChevronDown className={`size-4 text-muted-foreground transition-transform ${expandedHistoryId === item.id ? "rotate-180" : ""}`} /></td>
                          </tr>
                          {expandedHistoryId === item.id && (
                            <tr key={`${item.id}-details`}>
                              <td colSpan={6} className="px-4 py-3 bg-muted/20">
                                {historyDetailsMap[item.id] ? (
                                  (historyDetailsMap[item.id] as any[]).length === 0 ? (
                                    <p className="text-xs text-muted-foreground">{fr ? "Aucun détail" : "No details"}</p>
                                  ) : (
                                    <div className="text-xs space-y-1">
                                      {(historyDetailsMap[item.id] as any[]).map((d: any, i: number) => (
                                        <div key={d.id ?? i} className="flex justify-between text-foreground">
                                          <span>{d.product_name} × {d.quantity}</span>
                                          <span>{formatCurrency(Number(d.total_price), undefined, true)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )
                                ) : (
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="size-3 animate-spin" />{fr ? "Chargement..." : "Loading..."}</div>
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </TabsContent>
        </Tabs>
      </div>

      {/* PRODUCT DIALOG */}
      <Dialog open={showProduct} onOpenChange={(o) => { setShowProduct(o); if (!o) setEditProduct(null) }}>
        <DialogContent className="ag-dialog max-w-lg p-0">
          <DialogHeader className="px-6 pt-5 pb-0">
            <DialogTitle className="text-foreground">{editProduct ? (fr ? "Modifier" : "Edit") : (fr ? "Ajouter un produit" : "Add product")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 py-4">
            {productError && <Alert variant="destructive"><AlertDescription>{productError}</AlertDescription></Alert>}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[{ id: "name", label: fr ? "Nom" : "Name", ph: "Ex: Savon Omo" }, { id: "category", label: fr ? "Catégorie" : "Category", ph: "Ex: Hygiène" }].map((f) => (
                <div key={f.id} className="space-y-1.5"><Label htmlFor={`prod-${f.id}`} className="text-sm font-medium text-foreground">{f.label}</Label><Input id={`prod-${f.id}`} value={(productForm as any)[f.id]} onChange={(e) => setProductForm((p) => ({ ...p, [f.id]: e.target.value }))} placeholder={f.ph} className="h-10 rounded-lg text-foreground" />{productErrors[f.id] && <p className="text-xs text-destructive">{productErrors[f.id]}</p>}</div>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="prod-price" className="text-sm font-medium text-foreground">{fr ? "Prix (FC)" : "Price (FC)"}</Label><Input id="prod-price" value={productForm.price_usd} onChange={(e) => setProductForm((p) => ({ ...p, price_usd: e.target.value }))} placeholder="1.50" className="h-10 rounded-lg text-foreground" />{productErrors.price_usd && <p className="text-xs text-destructive">{productErrors.price_usd}</p>}</div>
              <div className="space-y-1.5"><Label htmlFor="prod-stock" className="text-sm font-medium text-foreground">{fr ? "Stock" : "Stock"}</Label><Input id="prod-stock" value={productForm.stock_quantity} onChange={(e) => setProductForm((p) => ({ ...p, stock_quantity: e.target.value }))} placeholder="50" className="h-10 rounded-lg text-foreground" />{productErrors.stock_quantity && <p className="text-xs text-destructive">{productErrors.stock_quantity}</p>}</div>
            </div>
            <div className="space-y-1.5"><Label htmlFor="prod-barcode" className="text-sm font-medium text-foreground">{fr ? "Code-barres" : "Barcode"}</Label><Input id="prod-barcode" value={productForm.barcode} onChange={(e) => setProductForm((p) => ({ ...p, barcode: e.target.value }))} placeholder="1234567890" className="h-10 rounded-lg text-foreground" />{productErrors.barcode && <p className="text-xs text-destructive">{productErrors.barcode}</p>}</div>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border/50">
            <Button variant="outline" onClick={() => { setShowProduct(false); setEditProduct(null) }}>{fr ? "Annuler" : "Cancel"}</Button>
            <Button onClick={saveProduct} disabled={saving} className="bg-warning text-warning-foreground hover:bg-warning/90 gap-2">{saving && <Loader2 className="size-4 animate-spin" />}{fr ? "Enregistrer" : "Save"}</Button>
          </DialogFooter>
          <DialogFooterBrand />
        </DialogContent>
      </Dialog>

      {/* CUSTOMER DIALOG */}
      <Dialog open={showCustomer} onOpenChange={(o) => { setShowCustomer(o); if (!o) setEditCustomer(null) }}>
        <DialogContent className="ag-dialog max-w-md p-0">
          <DialogHeader className="px-6 pt-5 pb-0">
            <DialogTitle className="text-foreground">{editCustomer ? (fr ? "Modifier le client" : "Edit customer") : (fr ? "Ajouter un client" : "Add customer")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 py-4">
            {customerError && <Alert variant="destructive"><AlertDescription>{customerError}</AlertDescription></Alert>}
            <div className="space-y-1.5"><Label htmlFor="cust-name" className="text-sm font-medium text-foreground">{fr ? "Nom" : "Name"}</Label><Input id="cust-name" value={customerForm.name} onChange={(e) => setCustomerForm((p) => ({ ...p, name: e.target.value }))} placeholder={fr ? "Ex: Jean Mpoyo" : "Ex: John Doe"} className="h-10 rounded-lg text-foreground" />{customerErrors.name && <p className="text-xs text-destructive">{customerErrors.name}</p>}</div>
            <div className="space-y-1.5"><Label htmlFor="cust-phone" className="text-sm font-medium text-foreground">{fr ? "Téléphone" : "Phone"}</Label><Input id="cust-phone" value={customerForm.phone} onChange={(e) => setCustomerForm((p) => ({ ...p, phone: e.target.value }))} placeholder="+243 8XX XXX XXX" className="h-10 rounded-lg text-foreground" />{customerErrors.phone && <p className="text-xs text-destructive">{customerErrors.phone}</p>}</div>
            <div className="space-y-1.5"><Label htmlFor="cust-email" className="text-sm font-medium text-foreground">{fr ? "Courriel" : "Email"}</Label><Input id="cust-email" type="email" value={customerForm.email} onChange={(e) => setCustomerForm((p) => ({ ...p, email: e.target.value }))} placeholder="exemple@email.com" className="h-10 rounded-lg text-foreground" />{customerErrors.email && <p className="text-xs text-destructive">{customerErrors.email}</p>}</div>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border/50">
            <Button variant="outline" onClick={() => { setShowCustomer(false); setEditCustomer(null) }}>{fr ? "Annuler" : "Cancel"}</Button>
            <Button onClick={saveCustomer} disabled={saving} className="bg-warning text-warning-foreground hover:bg-warning/90 gap-2">{saving && <Loader2 className="size-4 animate-spin" />}{fr ? "Enregistrer" : "Save"}</Button>
          </DialogFooter>
          <DialogFooterBrand />
        </DialogContent>
      </Dialog>

      {/* INVOICE DIALOG */}
      <Dialog open={showInvoice} onOpenChange={setShowInvoice}>
        <DialogContent className="max-w-xl ag-dialog p-0">
          <DialogHeader className="px-6 pt-5 pb-0">
            <DialogTitle className="text-foreground">{fr ? "Nouvelle facture" : "New invoice"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 py-4 max-h-[60vh] overflow-y-auto">
            {invoiceError && <Alert variant="destructive"><AlertDescription>{invoiceError}</AlertDescription></Alert>}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">{fr ? "Client" : "Customer"}</Label>
              {customers.length === 0 ? (
                <p className="text-sm text-muted-foreground">{fr ? "Aucun client disponible" : "No customers available"}</p>
              ) : (
                <Select value={invoiceForm.customer_id} onValueChange={(v) => setInvoiceForm((p) => ({ ...p, customer_id: v }))}>
                  <SelectTrigger className="h-10 rounded-lg"><SelectValue placeholder={fr ? "Sélectionner un client" : "Select a customer"} /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}{c.phone ? ` — ${c.phone}` : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {invoiceErrors.customer_id && <p className="text-xs text-destructive">{invoiceErrors.customer_id}</p>}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-foreground">{fr ? "Articles" : "Items"}</Label>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addInvLine}><Plus className="size-3" />{fr ? "Ajouter" : "Add"}</Button>
              </div>
              {invoiceForm.line_items.map((item, i) => (
                <div key={i} className="flex items-end gap-2">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{fr ? "Produit" : "Product"}</Label>
                    <Input value={item.product_name} onChange={(e) => updateInvLine(i, "product_name", e.target.value)} placeholder={fr ? "Nom du produit" : "Product name"} className="h-9 rounded-lg text-sm" />
                  </div>
                  <div className="w-16 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{fr ? "Qté" : "Qty"}</Label>
                    <Input value={item.quantity} onChange={(e) => updateInvLine(i, "quantity", e.target.value)} className="h-9 rounded-lg text-sm text-center" />
                  </div>
                  <div className="w-20 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{fr ? "Prix" : "Price"}</Label>
                    <Input value={item.unit_price} onChange={(e) => updateInvLine(i, "unit_price", e.target.value)} placeholder="0.00" className="h-9 rounded-lg text-sm text-center" />
                  </div>
                  <Button size="icon" variant="ghost" className="size-8 text-destructive shrink-0" onClick={() => removeInvLine(i)}><X className="size-3.5" /></Button>
                </div>
              ))}
              <div className="flex justify-end text-sm font-bold text-foreground pt-2">{fr ? "Total" : "Total"}: {formatCurrency(invoiceTotal, undefined, true)}</div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-due" className="text-sm font-medium text-foreground">{fr ? "Date d'échéance" : "Due date"}</Label>
              <Input id="inv-due" type="date" value={invoiceForm.due_date} onChange={(e) => setInvoiceForm((p) => ({ ...p, due_date: e.target.value }))} className="h-10 rounded-lg text-foreground" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-notes" className="text-sm font-medium text-foreground">{fr ? "Notes" : "Notes"}</Label>
              <Input id="inv-notes" value={invoiceForm.notes} onChange={(e) => setInvoiceForm((p) => ({ ...p, notes: e.target.value }))} placeholder={fr ? "Optionnel" : "Optional"} className="h-10 rounded-lg text-foreground" />
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border/50">
            <Button variant="outline" onClick={() => setShowInvoice(false)}>{fr ? "Annuler" : "Cancel"}</Button>
            <Button onClick={saveInvoice} disabled={saving} className="bg-warning text-warning-foreground hover:bg-warning/90 gap-2">{saving && <Loader2 className="size-4 animate-spin" />}{fr ? "Créer la facture" : "Create invoice"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ACCOUNTING ENTRY DIALOG */}
      <Dialog open={showEntry} onOpenChange={setShowEntry}>
        <DialogContent className="ag-dialog max-w-md p-0">
          <DialogHeader className="px-6 pt-5 pb-0">
            <DialogTitle className="text-foreground">{fr ? "Nouvelle entrée comptable" : "New accounting entry"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 py-4">
            {entryError && <Alert variant="destructive"><AlertDescription>{entryError}</AlertDescription></Alert>}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">{fr ? "Type" : "Type"}</Label>
              <div className="flex gap-2">
                {[{ v: "income", label: fr ? "Revenu" : "Income", cls: "border-success text-success bg-success/10" }, { v: "expense", label: fr ? "Dépense" : "Expense", cls: "border-destructive text-destructive bg-destructive/10" }].map((t) => (
                  <button key={t.v} type="button" onClick={() => setEntryForm((p) => ({ ...p, type: t.v as any }))} className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${entryForm.type === t.v ? t.cls : "border-border text-muted-foreground hover:bg-muted"}`}>{t.label}</button>
                ))}
              </div>
              {entryErrors.type && <p className="text-xs text-destructive">{entryErrors.type}</p>}
            </div>
            {[{ id: "category", label: fr ? "Catégorie" : "Category", ph: fr ? "Ex: Ventes, Loyer" : "Ex: Sales, Rent" }, { id: "description", label: fr ? "Description" : "Description", ph: fr ? "Ex: Vente du jour" : "Ex: Daily sales" }].map((f) => (
              <div key={f.id} className="space-y-1.5"><Label htmlFor={`entry-${f.id}`} className="text-sm font-medium text-foreground">{f.label}</Label><Input id={`entry-${f.id}`} value={(entryForm as any)[f.id]} onChange={(e) => setEntryForm((p) => ({ ...p, [f.id]: e.target.value }))} placeholder={f.ph} className="h-10 rounded-lg text-foreground" />{entryErrors[f.id] && <p className="text-xs text-destructive">{entryErrors[f.id]}</p>}</div>
            ))}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="entry-amount" className="text-sm font-medium text-foreground">{fr ? "Montant (FC)" : "Amount (FC)"}</Label><Input id="entry-amount" type="number" value={entryForm.amount_usd} onChange={(e) => setEntryForm((p) => ({ ...p, amount_usd: e.target.value }))} placeholder="100.00" className="h-10 rounded-lg text-foreground" />{entryErrors.amount_usd && <p className="text-xs text-destructive">{entryErrors.amount_usd}</p>}</div>
              <div className="space-y-1.5"><Label htmlFor="entry-date" className="text-sm font-medium text-foreground">{fr ? "Date" : "Date"}</Label><Input id="entry-date" type="date" value={entryForm.entry_date} onChange={(e) => setEntryForm((p) => ({ ...p, entry_date: e.target.value }))} className="h-10 rounded-lg text-foreground" />{entryErrors.entry_date && <p className="text-xs text-destructive">{entryErrors.entry_date}</p>}</div>
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border/50">
            <Button variant="outline" onClick={() => setShowEntry(false)}>{fr ? "Annuler" : "Cancel"}</Button>
            <Button onClick={saveEntry} disabled={saving} className="gap-2 bg-warning text-warning-foreground hover:bg-warning/90">{saving && <Loader2 className="size-4 animate-spin" />}{fr ? "Enregistrer" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <PageFooter onNavigate={onNavigate} />
    </div>
  )
}
