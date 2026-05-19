export function normalizeSaudiPhone(input) {
  if (!input) return null
  let digits = String(input).replace(/\D/g, "")
  if (digits.startsWith("966")) digits = digits.slice(3)
  if (digits.startsWith("0")) digits = digits.slice(1)
  if (digits.length === 9 && digits.startsWith("5")) return `0${digits}`
  if (digits.length === 10 && digits.startsWith("05")) return digits
  return null
}

export function isValidSaudiPhone(input) {
  const n = normalizeSaudiPhone(input)
  return n !== null && /^05\d{8}$/.test(n)
}

export const isValidSaudiMobile = isValidSaudiPhone

export function saudiPhoneHelperText(t) {
  return t("validation.saudiPhoneHint", "مثل 05xxxxxxxx أو +9665xxxxxxxx")
}

export const SAUDI_PHONE_INPUT_PROPS = {
  type: "tel",
  inputMode: "tel",
  autoComplete: "tel",
  maxLength: 16,
  placeholder: "05xxxxxxxx",
}

export function saudiPhoneFieldError(value, t) {
  const trimmed = String(value ?? "").trim()
  if (!trimmed) return null
  if (!isValidSaudiPhone(trimmed)) {
    return t("validation.saudiPhoneInvalid", "Use a Saudi mobile number, e.g. 05xxxxxxxx.")
  }
  return null
}

/** Restrict input to Saudi mobile digits while typing (05 + 8 digits). */
export function formatSaudiPhoneInput(raw) {
  let digits = String(raw ?? "").replace(/\D/g, "")
  if (digits.startsWith("966")) digits = digits.slice(3)
  if (digits.startsWith("05")) return digits.slice(0, 10)
  if (digits.startsWith("5")) return `0${digits.slice(0, 9)}`
  if (digits.startsWith("0")) return digits.slice(0, 10)
  return digits.slice(0, 10)
}

/** Required + format checks (purchase checkout / add listing contact phone). */
export function contactPhoneFieldError(value, t, { required = false } = {}) {
  const trimmed = String(value ?? "").trim()
  if (!trimmed) {
    return required
      ? t("purchase.validation.phoneRequired", "رقم الجوال مطلوب.")
      : null
  }
  return saudiPhoneFieldError(value, t)
}
