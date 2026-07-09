export type Validator = (value: any) => string | null

export interface FieldRules {
  required?: boolean | string
  minLength?: { value: number; message?: string }
  maxLength?: { value: number; message?: string }
  min?: { value: number; message?: string }
  max?: { value: number; message?: string }
  pattern?: { value: RegExp; message?: string }
  email?: boolean
  phone?: boolean
  positive?: boolean
  validate?: (value: any) => string | null
}

export function required(msg?: string): Validator {
  return (v) => {
    if (v === null || v === undefined || v === "") return msg || "Ce champ est requis"
    if (typeof v === "string" && v.trim() === "") return msg || "Ce champ est requis"
    return null
  }
}

export function minLength(n: number, msg?: string): Validator {
  return (v) => {
    if (!v || typeof v !== "string") return null
    return v.length < n ? (msg || `Minimum ${n} caractères`) : null
  }
}

export function maxLength(n: number, msg?: string): Validator {
  return (v) => {
    if (!v || typeof v !== "string") return null
    return v.length > n ? (msg || `Maximum ${n} caractères`) : null
  }
}

export function minValue(n: number, msg?: string): Validator {
  return (v) => {
    const num = Number(v)
    if (isNaN(num) || v === "" || v === null || v === undefined) return null
    return num < n ? (msg || `Minimum ${n}`) : null
  }
}

export function maxValue(n: number, msg?: string): Validator {
  return (v) => {
    const num = Number(v)
    if (isNaN(num) || v === "" || v === null || v === undefined) return null
    return num > n ? (msg || `Maximum ${n}`) : null
  }
}

export function positiveNumber(msg?: string): Validator {
  return (v) => {
    if (v === "" || v === null || v === undefined) return null
    const num = Number(v)
    if (isNaN(num)) return msg || "Doit être un nombre"
    return num < 0 ? (msg || "Doit être un nombre positif") : null
  }
}

export function emailFormat(msg?: string): Validator {
  return (v) => {
    if (!v || typeof v !== "string") return null
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return !re.test(v) ? (msg || "Email invalide") : null
  }
}

export function phoneFormat(msg?: string): Validator {
  return (v) => {
    if (!v || typeof v !== "string") return null
    const cleaned = v.replace(/[\s\-().]/g, "")
    const re = /^\+?\d{7,15}$/
    return !re.test(cleaned) ? (msg || "Numéro de téléphone invalide") : null
  }
}

export function pattern(re: RegExp, msg: string): Validator {
  return (v) => {
    if (!v || typeof v !== "string") return null
    return !re.test(v) ? msg : null
  }
}

export function compose(...validators: Validator[]): Validator {
  return (v) => {
    for (const fn of validators) {
      const err = fn(v)
      if (err) return err
    }
    return null
  }
}

export function validateFields(data: Record<string, any>, rules: Record<string, FieldRules>): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const [field, fieldRules] of Object.entries(rules)) {
    const value = data[field]
    const validators: Validator[] = []

    if (fieldRules.required) {
      const msg = typeof fieldRules.required === "string" ? fieldRules.required : undefined
      validators.push(required(msg))
    }
    if (fieldRules.minLength) validators.push(minLength(fieldRules.minLength.value, fieldRules.minLength.message))
    if (fieldRules.maxLength) validators.push(maxLength(fieldRules.maxLength.value, fieldRules.maxLength.message))
    if (fieldRules.min) validators.push(minValue(fieldRules.min.value, fieldRules.min.message))
    if (fieldRules.max) validators.push(maxValue(fieldRules.max.value, fieldRules.max.message))
    if (fieldRules.positive) validators.push(positiveNumber())
    if (fieldRules.email) validators.push(emailFormat())
    if (fieldRules.phone) validators.push(phoneFormat())
    if (fieldRules.pattern) validators.push(pattern(fieldRules.pattern.value, fieldRules.pattern.message))
    if (fieldRules.validate) validators.push(fieldRules.validate)

    if (validators.length > 0) {
      const err = compose(...validators)(value)
      if (err) errors[field] = err
    }
  }
  return errors
}

export function hasErrors(errors: Record<string, string>): boolean {
  return Object.keys(errors).length > 0
}

/** Check if a field is required based on its rules */
export function isRequired(fieldName: string, rules: Record<string, FieldRules>): boolean {
  return !!rules[fieldName]?.required
}

// ─── HR Validation Rules ────────────────────────────────

export const HR_EMPLOYEE_RULES: Record<string, FieldRules> = {
  first_name: { required: true, minLength: { value: 2 } },
  last_name: { required: true, minLength: { value: 2 } },
  email: { required: true, email: true },
  phone: { phone: true },
  position: { required: true },
  department_id: { required: true },
  hire_date: { required: true },
  salary: { required: true, positive: true },
}

export const HR_DEPARTMENT_RULES: Record<string, FieldRules> = {
  name: { required: true, minLength: { value: 2 } },
}

export const HR_CONTRACT_RULES: Record<string, FieldRules> = {
  employee_id: { required: true },
  contract_type: { required: true },
  start_date: { required: true },
  salary: { required: true, positive: true },
}

export const HR_LEAVE_RULES: Record<string, FieldRules> = {
  employee_id: { required: true },
  leave_type: { required: true },
  start_date: { required: true },
  end_date: { required: true },
}

export const HR_RECRUITMENT_RULES: Record<string, FieldRules> = {
  position: { required: true, minLength: { value: 3 } },
}

export const HR_EVALUATION_RULES: Record<string, FieldRules> = {
  employee_id: { required: true },
  period: { required: true },
  score: { required: true, min: { value: 0 }, max: { value: 20 } },
}

export const HR_TRAINING_RULES: Record<string, FieldRules> = {
  title: { required: true, minLength: { value: 3 } },
  start_date: { required: true },
}
