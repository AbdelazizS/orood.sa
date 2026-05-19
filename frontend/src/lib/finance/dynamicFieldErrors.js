import { isValidSaudiIban } from "@/lib/finance/iban"
import { validateDynamicField } from "@/lib/validation/dynamicValidation"

/**
 * Client-side validation for dynamic payment fields.
 * @returns {Record<string, string>} field_key -> error message
 */
export function validateDynamicFormFields(fields, values, t, method = null) {
  const errors = {}
  for (const field of fields) {
    if (field.is_layout_block || field.field_type === "instruction_block") continue
    const codes = validateDynamicField(field, values[field.field_key], values, method)
    if (!codes.length) continue
    errors[field.field_key] = messageForFieldError(field, codes[0], t)
  }
  return errors
}

export function messageForFieldError(field, code, t) {
  const label = field.label || field.label_ar || field.label_en || field.field_key
  if (field.field_type === "iban" && code === "iban") {
    return t(
      "finance.ibanInvalid",
      "رقم الآيبان غير صحيح. الصيغة: SA متبوعاً بـ 22 رقمًا. مثال: {{example}}",
      { example: t("finance.ibanExampleFormatted", "SA03 8000 0000 6080 1016 7519") },
    )
  }
  if (code === "required") {
    return t("validation.required", "{{field}} مطلوب", { field: label })
  }
  if (code === "phone") {
    return t("validation.saudiPhoneHint", "مثل 05xxxxxxxx أو +9665xxxxxxxx")
  }
  if (code === "email") {
    return t("validation.email", "البريد الإلكتروني غير صحيح")
  }
  return t("validation.generic", "{{field}} غير صحيح", { field: label })
}

/** Map Laravel 422 errors to friendly field messages. */
export function mapFinanceApiErrors(err, t) {
  const raw = err?.response?.data?.errors
  if (!raw || typeof raw !== "object") return {}

  const out = {}
  for (const [key, messages] of Object.entries(raw)) {
    const msg = Array.isArray(messages) ? messages[0] : messages
    if (typeof msg !== "string") continue
    if (key.includes("iban") || /آيبان|IBAN/i.test(msg)) {
      out[key] = t(
        "finance.ibanInvalid",
        "رقم الآيبان غير صحيح. الصيغة: SA متبوعاً بـ 22 رقمًا. مثال: {{example}}",
        { example: t("finance.ibanExampleFormatted", "SA03 8000 0000 6080 1016 7519") },
      )
    } else {
      out[key] = msg
    }
  }
  return out
}

export { isValidSaudiIban }
