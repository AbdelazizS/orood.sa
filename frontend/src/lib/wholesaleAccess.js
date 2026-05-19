/**
 * @param {{ id?: number|string }|null|undefined} user
 * @param {{ user_id?: number|string, seller?: { id?: number|string } }|null|undefined} product
 */
export function isWholesaleProductOwner(user, product) {
  if (!user?.id || !product) return false
  const uid = Number(user.id)
  if (Number.isNaN(uid)) return false
  if (product.user_id != null && Number(product.user_id) === uid) return true
  if (product.seller?.id != null && Number(product.seller.id) === uid) return true
  return false
}

const ACTIVE_RESERVATION_STATUSES = new Set(["pending", "payment_pending"])

function reservationHasPurchase(mr) {
  if (!mr || mr.purchase_id == null) return false
  const id = Number(mr.purchase_id)
  return Number.isFinite(id) && id > 0
}

/** @param {Record<string, unknown>|null|undefined} product */
export function getWholesaleMyReservation(product) {
  return product?.my_reservation ?? null
}

/** Buyer already completed checkout for this reservation (order exists). */
export function isWholesaleReservationPurchased(product) {
  const mr = getWholesaleMyReservation(product)
  if (!mr?.id) return false
  if (reservationHasPurchase(mr)) return true
  return String(mr.status ?? "") === "purchased"
}

/** Active = pending (group filling) or payment_pending (checkout window). */
export function hasActiveWholesaleReservation(product) {
  const mr = getWholesaleMyReservation(product)
  if (!mr?.id || reservationHasPurchase(mr)) return false
  return ACTIVE_RESERVATION_STATUSES.has(String(mr.status ?? ""))
}

export function isWholesaleReservationPending(product) {
  const mr = getWholesaleMyReservation(product)
  if (!mr?.id || reservationHasPurchase(mr)) return false
  return String(mr.status ?? "") === "pending"
}

export function isWholesaleReservationPaymentPending(product) {
  const mr = getWholesaleMyReservation(product)
  if (!mr?.id || reservationHasPurchase(mr)) return false
  return String(mr.status ?? "") === "payment_pending"
}

/** Cancel allowed while group is filling or during checkout window (before purchase). */
export function canCancelWholesaleReservation(product) {
  if (isWholesaleReservationPurchased(product)) return false
  return isWholesaleReservationPending(product) || isWholesaleReservationPaymentPending(product)
}
