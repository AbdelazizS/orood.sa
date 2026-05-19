/** Laravel-style API error body → single user-facing string */
export function purchaseErrorMessage(error, t) {
  const data = error?.response?.data
  if (typeof data?.message === "string" && data.message.trim()) {
    return data.message
  }
  const errors = data?.errors
  if (errors && typeof errors === "object") {
    const first = Object.values(errors).flat().find((m) => typeof m === "string" && m.trim())
    if (first) return first
  }
  const status = error?.response?.status
  if (status === 403) return t("purchase.errorForbidden", "لا يمكن إتمام هذه العملية.")
  if (status === 401) return t("purchase.errorAuth", "انتهت الجلسة. سجّل الدخول مجددًا.")
  if (status === 422) return t("purchase.errorValidation", "تعذّر إتمام الشراء. تحقق من الرصيد والبيانات.")
  if (error?.message && typeof error.message === "string") return error.message
  return t("common.error")
}

import { normalizeSaudiPhone, saudiPhoneFieldError } from "@/lib/phone/saudiPhone"

export { normalizeSaudiPhone }

/** Client-side checkout rules (mirrors backend max lengths where applicable). */
export function getPurchaseFieldErrors(
  { buyerName, buyerPhone, quantity, buyerNote, shippingAddress, paymentMethod },
  t,
) {
  const errors = {}

  const name = String(buyerName ?? "").trim()
  if (!name) {
    errors.buyerName = t("purchase.validation.nameRequired", "Please enter your name.")
  } else if (name.length < 2) {
    errors.buyerName = t("purchase.validation.nameMin", "Name must be at least 2 characters.")
  } else if (name.length > 255) {
    errors.buyerName = t("purchase.validation.nameMax", "Name is too long (max 255).")
  }

  const phoneErr = saudiPhoneFieldError(buyerPhone, t)
  if (phoneErr) errors.buyerPhone = phoneErr

  const qRaw = quantity === "" || quantity == null ? "" : String(quantity).trim()
  if (qRaw === "") {
    errors.quantity = t("purchase.validation.quantityRequired", "Enter a quantity.")
  } else {
    const qNum = Number(quantity)
    if (!Number.isFinite(qNum) || !Number.isInteger(qNum)) {
      errors.quantity = t("purchase.validation.quantityInteger", "Quantity must be a whole number.")
    } else if (qNum < 1 || qNum > 999) {
      errors.quantity = t("purchase.validation.quantityRange", "Quantity must be between 1 and 999.")
    }
  }

  const note = String(buyerNote ?? "")
  if (note.length > 2000) {
    errors.buyerNote = t("purchase.validation.noteMax", "Notes are too long (max 2000 characters).")
  }

  const addr = String(shippingAddress ?? "").trim()
  if (addr.length > 500) {
    errors.shippingAddress = t("purchase.validation.addressMax", "Address is too long (max 500 characters).")
  } else if (paymentMethod === "cod" && addr.length < 5) {
    errors.shippingAddress = t(
      "purchase.validation.addressCodMin",
      "For cash on delivery, enter a full shipping address (at least 5 characters).",
    )
  }

  return errors
}
