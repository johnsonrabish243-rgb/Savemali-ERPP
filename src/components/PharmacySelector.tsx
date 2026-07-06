import * as React from "react"
import { usePharmacy } from "@/hooks/use-pharmacy"
import { useLanguage } from "@/lib/i18n"
import { Store, ChevronDown, Plus, Settings, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { insforge } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"

interface PharmacySelectorProps {
  compact?: boolean
  onManagePharmacies?: () => void
}

export function PharmacySelector({ compact = false, onManagePharmacies }: PharmacySelectorProps) {
  const { pharmacies, selectedPharmacy, setSelectedPharmacy, isOwner, refresh } = usePharmacy()
  const { workspace } = useAuth()
  const { lang } = useLanguage()
  const fr = lang === "fr"
  const [open, setOpen] = React.useState(false)
  const [showCreate, setShowCreate] = React.useState(false)
  const [newName, setNewName] = React.useState("")
  const [newAddress, setNewAddress] = React.useState("")
  const [newPhone, setNewPhone] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleCreate = async () => {
    if (!newName.trim() || !workspace?.id) return
    setSaving(true)
    setError(null)
    try {
      const { error: insertError } = await insforge.database
        .from("pharmacies")
        .insert([{
          workspace_id: workspace.id,
          name: newName.trim(),
          address: newAddress.trim() || null,
          phone: newPhone.trim() || null,
        }])

      if (insertError) throw insertError
      await refresh()
      setShowCreate(false)
      setNewName("")
      setNewAddress("")
      setNewPhone("")
    } catch (err: any) {
      setError(err?.message ?? "Erreur")
    } finally {
      setSaving(false)
    }
  }

  if (pharmacies.length === 0 && !showCreate) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
          <Store className="h-4 w-4" />
          {fr ? "Aucune pharmacie" : "No pharmacies"}
        </div>
        {isOwner && (
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="mr-1 h-4 w-4" />
            {fr ? "Créer" : "Create"}
          </Button>
        )}
      </div>
    )
  }

  if (showCreate) {
    return (
      <div className="flex items-center gap-2 rounded-lg border bg-card p-3 shadow-sm">
        <div className="flex flex-col gap-2">
          <Input
            placeholder={fr ? "Nom de la pharmacie" : "Pharmacy name"}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-8 text-sm"
            autoFocus
          />
          <div className="flex gap-2">
            <Input
              placeholder={fr ? "Adresse (optionnel)" : "Address (optional)"}
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              className="h-8 text-sm"
            />
            <Input
              placeholder={fr ? "Téléphone (optionnel)" : "Phone (optional)"}
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={saving || !newName.trim()}>
              {saving ? "..." : (fr ? "Créer" : "Create")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent"
      >
        <Store className="h-4 w-4 text-primary" />
        <span className="max-w-[200px] truncate">
          {selectedPharmacy?.name ?? (fr ? "Toutes les pharmacies" : "All pharmacies")}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-72 rounded-lg border bg-card shadow-lg">
          <div className="p-1">
            <button
              onClick={() => {
                setSelectedPharmacy(null)
                setOpen(false)
              }}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent ${
                !selectedPharmacy ? "bg-accent font-medium" : ""
              }`}
            >
              <Store className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-left">{fr ? "Toutes les pharmacies" : "All pharmacies"}</span>
              {!selectedPharmacy && <Check className="h-4 w-4 text-primary" />}
            </button>

            <div className="my-1 h-px bg-border" />

            {pharmacies.map((pharmacy) => (
              <button
                key={pharmacy.id}
                onClick={() => {
                  setSelectedPharmacy(pharmacy)
                  setOpen(false)
                }}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent ${
                  selectedPharmacy?.id === pharmacy.id ? "bg-accent font-medium" : ""
                } ${!pharmacy.is_active ? "opacity-50" : ""}`}
              >
                <Store className="h-4 w-4 text-primary" />
                <div className="flex-1 text-left">
                  <div className="truncate">{pharmacy.name}</div>
                  {pharmacy.address && (
                    <div className="truncate text-xs text-muted-foreground">{pharmacy.address}</div>
                  )}
                </div>
                {!pharmacy.is_active && (
                  <span className="text-xs text-muted-foreground">
                    {fr ? "Inactif" : "Inactive"}
                  </span>
                )}
                {selectedPharmacy?.id === pharmacy.id && <Check className="h-4 w-4 text-primary" />}
              </button>
            ))}

            {isOwner && (
              <>
                <div className="my-1 h-px bg-border" />
                <button
                  onClick={() => {
                    setOpen(false)
                    setShowCreate(true)
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-primary hover:bg-accent"
                >
                  <Plus className="h-4 w-4" />
                  {fr ? "Nouvelle pharmacie" : "New pharmacy"}
                </button>
                {onManagePharmacies && (
                  <button
                    onClick={() => {
                      setOpen(false)
                      onManagePharmacies()
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
                  >
                    <Settings className="h-4 w-4" />
                    {fr ? "Gérer les pharmacies" : "Manage pharmacies"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
