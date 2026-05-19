/** Payment method display + success copy for checkout (escrow, COD, direct transfer). */

export const PURCHASE_PAYMENT_UI = {
  escrow: {
    titleKey: "purchase.escrow",
    titleDefault: "الدفع عبر المنصة",
  },
  cod: {
    titleKey: "purchase.cod",
    titleDefault: "الدفع عند الاستلام",
  },
  direct_transfer: {
    titleKey: "purchase.directTransfer",
    titleDefault: "تحويل بنكي مباشر للبائع",
  },
}

const SUCCESS_TOAST_KEYS = {
  escrow: "purchase.successToast.escrow",
  balance: "purchase.successToast.escrow",
  cod: "purchase.successToast.cod",
  direct_transfer: "purchase.successToast.direct_transfer",
}

const SUCCESS_TOAST_DEFAULTS = {
  escrow: "تم إصدار الفاتورة — الدفع عبر المنصة",
  cod: "تم إصدار الفاتورة — الدفع عند الاستلام",
  direct_transfer: "تم إصدار الطلب — تحويل بنكي مباشر للبائع",
}

const CONFIRM_NOTE_KEYS = {
  escrow: "purchase.confirmDialogEscrowNote",
  balance: "purchase.confirmDialogEscrowNote",
  direct_transfer: "purchase.confirmDialogDirectTransferNote",
}

/** Normalize API/state codes (e.g. balance → escrow). */
export function normalizePurchasePaymentMethod(method) {
  if (!method || method === "balance") return "escrow"
  if (method in PURCHASE_PAYMENT_UI) return method
  return method
}

export function getPurchasePaymentMethodLabel(method, t) {
  const code = normalizePurchasePaymentMethod(method)
  const ui = PURCHASE_PAYMENT_UI[code]
  if (ui) return t(ui.titleKey, ui.titleDefault)
  return t(`dashboard.paymentMethodLabel.${code}`, code)
}

export function getPurchaseSuccessToast(method, t) {
  const code = normalizePurchasePaymentMethod(method)
  const key = SUCCESS_TOAST_KEYS[code] ?? "purchase.successToast.default"
  const fallback =
    SUCCESS_TOAST_DEFAULTS[code] ??
    `${t("purchase.invoiceIssued", "تم إصدار الفاتورة")} — ${getPurchasePaymentMethodLabel(code, t)}`
  return t(key, fallback)
}

const CONFIRM_NOTE_DEFAULTS = {
  escrow:
    "يبقى المبلغ لدى المنصة حتى يشحن البائع وتؤكد الاستلام؛ عندها يُضاف للبائع.",
  direct_transfer:
    "بعد التأكيد حوّل المبلغ إلى حساب البائع وارفع السند في نموذج الشراء. سيراجع البائع السند ويؤكد الاستلام.",
}

export function getPurchaseConfirmDialogNote(method, t) {
  const code = normalizePurchasePaymentMethod(method)
  const key = CONFIRM_NOTE_KEYS[code]
  if (!key) return null
  const text = t(key, CONFIRM_NOTE_DEFAULTS[code] ?? "")
  return text || null
}
