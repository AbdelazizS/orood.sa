import { timeAgo } from "@/lib/timeAgo"

/**
 * Buyer-facing seller presence: online OR last activity — never both at once.
 * Aligns with ListingDetailHeroSection / common marketplace UX.
 *
 * @param {object|null} seller — expects `is_online`, `last_seen` from API
 * @param {function} t — i18next `t`
 * @param {{ isSelfSeller?: boolean }} options
 */
export function getSellerPresenceUi(seller, t, options = {}) {
  const { isSelfSeller = false } = options

  if (isSelfSeller || !seller) {
    return {
      showOnline: false,
      lastSeenParagraph: "",
      showOfflineBadge: false,
    }
  }

  const isOnline = Boolean(seller.is_online)
  const lastSeen = seller.last_seen

  if (isOnline) {
    return {
      showOnline: true,
      lastSeenParagraph: "",
      showOfflineBadge: false,
    }
  }

  if (lastSeen) {
    const time = timeAgo(lastSeen, t)
    const lastSeenParagraph = time
      ? t("listingDetail.lastSeenAt", { time, defaultValue: "{{time}}" })
      : ""

    return {
      showOnline: false,
      lastSeenParagraph,
      showOfflineBadge: true,
    }
  }

  return {
    showOnline: false,
    lastSeenParagraph: "",
    showOfflineBadge: false,
  }
}
