import { isValidSaudiIban, normalizeIban } from "@/lib/finance/iban"
import { isValidSaudiPhone, normalizeSaudiPhone } from "@/lib/phone/saudiPhone"

export function validateDynamicField(field, value, allValues = {}, method = null) {
  const errors = []
  const required = Boolean(field.required)
  const empty = value === undefined || value === null || value === ""

  if (required && empty) {
    errors.push("required")
    return errors
  }
  if (empty) return errors

  if (field.field_type === "phone" && !isValidSaudiPhone(value)) {
    errors.push("phone")
  }

  if (field.field_type === "iban" && !isValidSaudiIban(value)) {
    errors.push("iban")
  }

  if (field.field_type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
    errors.push("email")
  }

  if (["amount", "number"].includes(field.field_type)) {
    const num = Number(value)
    if (!Number.isFinite(num)) errors.push("number")
    if (method?.min_amount != null && num < Number(method.min_amount)) errors.push("min")
    if (method?.max_amount != null && num > Number(method.max_amount)) errors.push("max")
  }

  const config = field.config ?? field.config_json ?? {}
  if (config.regex) {
    try {
      const re = new RegExp(config.regex)
      if (!re.test(String(value))) errors.push("regex")
    } catch {
      /* ignore invalid admin regex */
    }
  }

  return errors
}

export function normalizeDynamicValue(field, value) {
  if (field.field_type === "phone") return normalizeSaudiPhone(value) ?? value
  if (field.field_type === "iban") return normalizeIban(value)
  return value
}
