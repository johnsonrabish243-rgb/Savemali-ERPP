import type { FieldRules } from "@/lib/validation"

export const studentRules: Record<string, FieldRules> = {
  first_name: { required: "Le prénom est requis", minLength: { value: 2, message: "Minimum 2 caractères" }, maxLength: { value: 100 } },
  last_name: { required: "Le nom est requis", minLength: { value: 2, message: "Minimum 2 caractères" }, maxLength: { value: 100 } },
  class_name: { maxLength: { value: 50 } },
  parent_phone: { phone: true },
}

export const teacherRules: Record<string, FieldRules> = {
  first_name: { required: "Le prénom est requis", minLength: { value: 2 }, maxLength: { value: 100 } },
  last_name: { required: "Le nom est requis", minLength: { value: 2 }, maxLength: { value: 100 } },
  phone: { phone: true },
  salary_usd: { positive: true },
}

export const classRules: Record<string, FieldRules> = {
  name: { required: "Le nom de la classe est requis", minLength: { value: 2 }, maxLength: { value: 50 } },
  level: { maxLength: { value: 50 } },
  fees_usd: { positive: true },
}

export const examRules: Record<string, FieldRules> = {
  name: { required: "Le nom de l'examen est requis", minLength: { value: 2 }, maxLength: { value: 100 } },
  subject: { maxLength: { value: 100 } },
  max_score: { required: true, min: { value: 1, message: "Minimum 1" }, max: { value: 1000 } },
  coefficient: { min: { value: 0.5 }, max: { value: 10 } },
}

export const feePaymentRules: Record<string, FieldRules> = {
  amount_usd: { required: "Le montant est requis", positive: true },
  student_id: { required: "Sélectionnez un élève" },
}

export const medicineRules: Record<string, FieldRules> = {
  name: { required: "Le nom du médicament est requis", minLength: { value: 2 }, maxLength: { value: 200 } },
  category: { maxLength: { value: 100 } },
  unit: { maxLength: { value: 50 } },
  price_usd: { required: "Le prix est requis", positive: true },
  stock_quantity: { required: "Le stock est requis", min: { value: 0, message: "Ne peut pas être négatif" } },
  min_stock_alert: { min: { value: 0 }, max: { value: 10000 } },
}

export const stockAdjustRules: Record<string, FieldRules> = {
  adjustMedId: { required: "Sélectionnez un médicament" },
  adjustType: { required: "Sélectionnez un type" },
  adjustQty: { required: "La quantité est requise", min: { value: 0, message: "Minimum 0" } },
}

export const supplierOrderRules: Record<string, FieldRules> = {
  supplier_name: { required: "Le nom du fournisseur est requis", minLength: { value: 2 }, maxLength: { value: 200 } },
}

export const productRules: Record<string, FieldRules> = {
  name: { required: "Le nom du produit est requis", minLength: { value: 2 }, maxLength: { value: 200 } },
  category: { maxLength: { value: 100 } },
  price_usd: { required: "Le prix est requis", positive: true },
  stock_quantity: { required: "Le stock est requis", min: { value: 0 } },
  barcode: { maxLength: { value: 100 } },
}

export const customerRules: Record<string, FieldRules> = {
  name: { required: "Le nom du client est requis", minLength: { value: 2 }, maxLength: { value: 200 } },
  phone: { phone: true },
  email: { email: true },
}

export const invoiceRules: Record<string, FieldRules> = {
  customer_id: { required: "Sélectionnez un client" },
}

export const accountingEntryRules: Record<string, FieldRules> = {
  type: { required: "Sélectionnez un type" },
  amount_usd: { required: "Le montant est requis", positive: true },
  entry_date: { required: "La date est requise" },
  category: { maxLength: { value: 100 } },
  description: { maxLength: { value: 500 } },
}

export const employeeRules: Record<string, FieldRules> = {
  first_name: { required: "Le prénom est requis", minLength: { value: 2 }, maxLength: { value: 100 } },
  last_name: { maxLength: { value: 100 } },
  role: { required: "Le rôle est requis", minLength: { value: 2 }, maxLength: { value: 100 } },
  department: { maxLength: { value: 100 } },
  phone: { phone: true },
  email: { email: true },
  salary_usd: { positive: true },
  salary_percentage: { min: { value: 0 }, max: { value: 100 } },
}

export const memberRules: Record<string, FieldRules> = {
  display_name: { required: "Le nom complet est requis", minLength: { value: 2 }, maxLength: { value: 200 } },
  email: { required: "L'email est requis", email: true },
  password: { minLength: { value: 6, message: "Minimum 6 caractères" } },
  role: { required: "Sélectionnez un rôle" },
}
