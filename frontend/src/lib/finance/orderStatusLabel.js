/**
 * Payment-method-aware order status label for dashboards and lists.
 */
export function getPaymentAwareStatusLabel(order, t, { isBuyer } = {}) {
  const pm = order?.payment_method ?? "escrow"
  const status = order?.status ?? ""
  const role = isBuyer ? "buyer" : "seller"

  if (pm === "escrow" || pm === "balance") {
    if (status === "awaiting_payment") {
      const key = "dashboard.status.awaiting_payment_escrow"
      const label = t(key)
      if (label !== key) return label
    }
  }

  if (pm === "direct_transfer" && status === "awaiting_payment") {
    const key = "dashboard.status.awaiting_payment_direct_transfer"
    const label = t(key)
    if (label !== key) return label
  }

  const matrixKey = `finance.status.${pm}.${status}.${role}`
  const matrixLabel = t(matrixKey)
  if (matrixLabel !== matrixKey) return matrixLabel

  return t(`dashboard.status.${status}`, status)
}
