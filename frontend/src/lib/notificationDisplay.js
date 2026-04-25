import { format } from "date-fns"
import { ar, enUS } from "date-fns/locale"

function hasTemplateTokens(text) {
  return typeof text === "string" && /\{\{[^}]+\}\}/.test(text)
}

function translateIfDefined(t, key, params) {
  const localized = t(key, params)
  if (localized === key) return ""
  if (hasTemplateTokens(localized)) return ""
  return localized
}

const MEMBER_REJECTION_NOTIFICATION_TYPES = new Set([
  "charge_request_rejected",
  "withdrawal_request_rejected",
  "guarantee_request_rejected",
  "document_verification_rejected",
])

/**
 * Append staff/admin reason for member-facing rejection notifications.
 * Prefers legacy `i18n_params.reasonPart` (older DB rows); otherwise uses structured `data` fields localized in the UI language.
 */
function appendMemberRejectionReasonIfNeeded(notification, baseBody, t) {
  const type = notification?.type
  if (!baseBody || typeof type !== "string" || !MEMBER_REJECTION_NOTIFICATION_TYPES.has(type)) {
    return baseBody
  }

  const d = notification?.data
  const params = d && typeof d === "object" ? d.i18n_params ?? {} : {}
  const legacyPart = typeof params.reasonPart === "string" ? params.reasonPart.trim() : ""
  if (legacyPart) {
    const sep = legacyPart.startsWith("\n") || /^[.,;:!?]/.test(legacyPart) ? "" : " "
    return baseBody + sep + legacyPart
  }

  const rawReason =
    (d && typeof d.rejection_reason === "string" && d.rejection_reason.trim()) ||
    (d && typeof d.rejected_reason === "string" && d.rejected_reason.trim()) ||
    (d && typeof d.admin_note === "string" && d.admin_note.trim()) ||
    ""

  if (!rawReason) return baseBody

  const append = translateIfDefined(t, "notifications.reasonAppend", { reason: rawReason })
  if (!append) return baseBody

  return `${baseBody}\n\n${append}`
}

/**
 * Resolve notification title/body for the current UI language.
 * Prefers structured i18n keys from API `data`; falls back to legacy `title` / `body`.
 *
 * @param {Record<string, unknown> | null | undefined} notification
 * @param {import("i18next").TFunction} t
 * @returns {string}
 */
export function getNotificationTitle(notification, t) {
  const d = notification?.data
  const params = d && typeof d === "object" ? d.i18n_params ?? {} : {}
  if (d && typeof d === "object") {
    if (typeof d.i18n_title_key === "string") {
      const translated = translateIfDefined(t, d.i18n_title_key, params)
      if (translated) return translated
    }
    if (typeof d.i18n_key === "string") {
      const translated = translateIfDefined(t, d.i18n_key, params)
      if (translated) return translated
    }
  }
  const type = notification?.type
  if (typeof type === "string" && type.trim()) {
    const fallbackKey = `notifications.types.${type}.title`
    const localized = translateIfDefined(t, fallbackKey, params)
    if (localized) return localized
    const generic = translateIfDefined(t, `notifications.types.${type}.title_fallback`, params)
    if (generic) return generic
  }
  const raw = notification?.title
  if (typeof raw === "string" && raw.trim() && !hasTemplateTokens(raw)) return raw
  return translateIfDefined(t, "notifications.genericTitle", params)
}

/**
 * @param {Record<string, unknown> | null | undefined} notification
 * @param {import("i18next").TFunction} t
 * @returns {string}
 */
export function getNotificationBody(notification, t) {
  const d = notification?.data
  const params = d && typeof d === "object" ? d.i18n_params ?? {} : {}
  let base = ""
  if (d && typeof d === "object" && typeof d.i18n_body_key === "string") {
    const translated = translateIfDefined(t, d.i18n_body_key, params)
    if (translated) base = translated
  }
  const type = notification?.type
  if (!base && typeof type === "string" && type.trim()) {
    const fallbackKey = `notifications.types.${type}.body`
    const localized = translateIfDefined(t, fallbackKey, params)
    if (localized) base = localized
    if (!base) {
      const generic = translateIfDefined(t, `notifications.types.${type}.body_fallback`, params)
      if (generic) base = generic
    }
  }
  if (!base) {
    const raw = notification?.body
    if (typeof raw === "string" && raw.trim() && !hasTemplateTokens(raw)) base = raw
  }
  if (!base) {
    base = translateIfDefined(t, "notifications.genericBody", params)
  }
  return appendMemberRejectionReasonIfNeeded(notification, base, t)
}

/**
 * Deep-link actions from API `data.actions` (i18n label keys + href).
 *
 * @param {Record<string, unknown> | null | undefined} notification
 * @returns {Array<{ i18n_label_key: string; href: string; intent?: string }>}
 */
export function getNotificationActions(notification) {
  const d = notification?.data
  const type = notification?.type
  const bidId = Number(d?.bid_id)
  const bidsManageHref = bidId
    ? `/dashboard/bids?tab=received&bid=${bidId}`
    : "/dashboard/bids?tab=received"
  const explicit = d && typeof d === "object" && Array.isArray(d.actions)
    ? d.actions.filter(
      (a) =>
        a &&
        typeof a === "object" &&
        typeof a.href === "string" &&
        typeof a.i18n_label_key === "string"
    )
    : []

  if (explicit.length > 0) {
    return explicit.map((action) => {
      const isBidAction = typeof type === "string" && type.startsWith("bid_")
      const isOpenBidsLabel = action.i18n_label_key === "notifications.actions.openBids"
      const isOpenBidsIntent = action.intent === "open_bids"
      const isListingBidsHash = typeof action.href === "string" && action.href.includes("#bids-section")
      if (isBidAction && (isOpenBidsLabel || isOpenBidsIntent || isListingBidsHash)) {
        return { ...action, href: bidsManageHref }
      }
      return action
    })
  }

  const productId = Number(d?.product_id)
  const orderId = Number(d?.order_id)
  if (type === "bid_new") {
    return [
      { i18n_label_key: "notifications.actions.openBids", href: bidsManageHref, intent: "open_bids" },
      { i18n_label_key: "notifications.actions.openListing", href: productId ? `/products/${productId}` : "/", intent: "open_listing" },
    ]
  }
  if (type === "bid_accepted") {
    return [
      { i18n_label_key: "notifications.actions.manageMyBids", href: bidsManageHref, intent: "manage_bids" },
      { i18n_label_key: "notifications.actions.completeOrder", href: bidsManageHref, intent: "complete_order" },
    ]
  }
  if (type === "bid_rejected") {
    return [
      { i18n_label_key: "notifications.actions.manageMyBids", href: bidsManageHref, intent: "manage_bids" },
      { i18n_label_key: "notifications.actions.openListing", href: productId ? `/products/${productId}` : "/", intent: "open_listing" },
    ]
  }
  if (type === "bid_order_created") {
    return [
      { i18n_label_key: "notifications.actions.openOrder", href: orderId ? `/dashboard/orders/${orderId}` : "/dashboard/orders", intent: "open_order" },
      { i18n_label_key: "notifications.actions.openBids", href: bidsManageHref, intent: "open_bids" },
    ]
  }
  if (type === "order_pending" || type === "order_shipped" || type === "order_delivered" || type === "order_completed" || type === "order_cancelled" || type === "order_disputed" || type === "review_eligible") {
    return [
      { i18n_label_key: "notifications.actions.openOrder", href: orderId ? `/dashboard/orders/${orderId}` : "/dashboard/orders", intent: "open_order" },
    ]
  }
  if (type === "review_new") {
    const profileHref = typeof d?.link === "string" ? d.link : "/dashboard/reviews"
    return [
      { i18n_label_key: "notifications.actions.openProfile", href: profileHref, intent: "open_profile" },
    ]
  }

  if (type === "charge_request_pending") {
    const chargeId = Number(d?.charge_request_id)
    const email = typeof d?.user_email === "string" ? d.user_email.trim() : ""
    if (!chargeId || !email) return []
    return [
      {
        i18n_label_key: "notifications.actions.reviewChargeRequests",
        href: `/admin/charges?focus=${chargeId}`,
        intent: "open_admin_charges",
      },
      {
        i18n_label_key: "notifications.actions.contactClientCharge",
        href: `/admin/messages?user_email=${encodeURIComponent(email)}&source=charge_request&charge_id=${chargeId}`,
        intent: "open_admin_messages_charge",
      },
    ]
  }

  if (type === "charge_request_approved" || type === "charge_request_rejected") {
    return [{ i18n_label_key: "notifications.actions.viewWallet", href: "/dashboard/balance", intent: "open_balance" }]
  }

  if (type === "withdrawal_request_pending") {
    const wid = Number(d?.withdrawal_request_id)
    const email = typeof d?.user_email === "string" ? d.user_email.trim() : ""
    if (!wid || !email) return []
    return [
      {
        i18n_label_key: "notifications.actions.reviewWithdrawals",
        href: `/admin/withdrawals?focus=${wid}`,
        intent: "open_admin_withdrawals",
      },
      {
        i18n_label_key: "notifications.actions.contactClientWithdrawal",
        href: `/admin/messages?user_email=${encodeURIComponent(email)}&source=withdrawal_request&withdrawal_id=${wid}`,
        intent: "open_admin_messages_withdrawal",
      },
    ]
  }

  if (type === "withdrawal_request_approved" || type === "withdrawal_request_rejected") {
    return [{ i18n_label_key: "notifications.actions.viewWallet", href: "/dashboard/balance", intent: "open_balance" }]
  }

  if (type === "guarantee_request_pending") {
    const gid = Number(d?.guarantee_request_id)
    const email = typeof d?.user_email === "string" ? d.user_email.trim() : ""
    if (!gid || !email) return []
    return [
      {
        i18n_label_key: "notifications.actions.reviewGuaranteeRequests",
        href: `/admin/guarantee-requests?focus=${gid}`,
        intent: "open_admin_guarantee_requests",
      },
      {
        i18n_label_key: "notifications.actions.contactClientGuarantee",
        href: `/admin/messages?user_email=${encodeURIComponent(email)}&source=guarantee_request&guarantee_request_id=${gid}`,
        intent: "open_admin_messages_guarantee",
      },
    ]
  }

  if (type === "guarantee_request_approved" || type === "guarantee_request_rejected") {
    return [
      { i18n_label_key: "notifications.actions.viewWallet", href: "/dashboard/balance", intent: "open_balance" },
      { i18n_label_key: "notifications.actions.openGuaranteePage", href: "/dashboard/guarantee", intent: "open_guarantee" },
    ]
  }

  if (type === "document_verification_pending") {
    const vid = Number(d?.document_verification_id)
    const email = typeof d?.user_email === "string" ? d.user_email.trim() : ""
    if (!vid || !email) return []
    return [
      {
        i18n_label_key: "notifications.actions.reviewVerifications",
        href: `/admin/verifications?focus=${vid}`,
        intent: "open_admin_verifications",
      },
      {
        i18n_label_key: "notifications.actions.contactClientVerification",
        href: `/admin/messages?user_email=${encodeURIComponent(email)}&source=document_verification&document_verification_id=${vid}`,
        intent: "open_admin_messages_verification",
      },
    ]
  }

  if (type === "document_verification_approved" || type === "document_verification_rejected") {
    return [{ i18n_label_key: "notifications.actions.openVerification", href: "/dashboard/verification", intent: "open_verification" }]
  }

  return []
}

/**
 * @param {string | null | undefined} iso
 * @param {string | undefined} language i18next language code
 */
export function formatNotificationTimestamp(iso, language) {
  if (!iso || typeof iso !== "string") return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const locale = language?.startsWith("ar") ? ar : enUS
  return format(d, "PPp", { locale })
}
