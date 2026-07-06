import * as React from "react"
import { validateFields, type FieldRules } from "@/lib/validation"

export interface UseFormValidationReturn<T extends Record<string, any>> {
  data: T
  errors: Record<string, string>
  touched: Record<string, boolean>
  setField: (field: keyof T, value: any) => void
  setFields: (fields: Partial<T>) => void
  validate: () => boolean
  validateField: (field: keyof T) => void
  reset: () => void
  getData: () => T
}

export function useFormValidation<T extends Record<string, any>>(
  initialData: T,
  rules: Record<keyof T, FieldRules>
): UseFormValidationReturn<T> {
  const [data, setData] = React.useState<T>(initialData)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [touched, setTouched] = React.useState<Record<string, boolean>>({})

  const setField = React.useCallback((field: keyof T, value: any) => {
    setData(prev => ({ ...prev, [field]: value }))
    setTouched(prev => ({ ...prev, [field as string]: true }))
  }, [])

  const setFields = React.useCallback((fields: Partial<T>) => {
    setData(prev => ({ ...prev, ...fields }))
  }, [])

  const validate = React.useCallback((): boolean => {
    const errs = validateFields(data, rules as Record<string, FieldRules>)
    setErrors(errs)
    const allTouched: Record<string, boolean> = {}
    for (const key of Object.keys(rules)) allTouched[key] = true
    setTouched(allTouched)
    return Object.keys(errs).length === 0
  }, [data, rules])

  const validateField = React.useCallback((field: keyof T) => {
    const fieldRules = rules[field]
    if (!fieldRules) return
    const errs = validateFields({ [field]: data[field] }, { [field]: fieldRules } as Record<string, FieldRules>)
    setErrors(prev => {
      const next = { ...prev }
      if (errs[field as string]) next[field as string] = errs[field as string]
      else delete next[field as string]
      return next
    })
  }, [data, rules])

  const reset = React.useCallback(() => {
    setData(initialData)
    setErrors({})
    setTouched({})
  }, [initialData])

  const getData = React.useCallback(() => data, [data])

  return { data, errors, touched, setField, setFields, validate, validateField, reset, getData }
}

export function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
