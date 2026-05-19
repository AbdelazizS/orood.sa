import { formatDistanceToNow } from "date-fns"
import { ar, enUS } from "date-fns/locale"
import { hasActiveWholesaleReservation } from "@/lib/wholesaleAccess"

export function sarNumberFormatter(dir) {
  const locale = dir === "rtl" ? "ar-SA" : "en-SA"
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "SAR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  } catch {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "SAR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  }
}

export function resolvePrimaryStatus(product, t) {
  const expiresAt = product?.wholesale_expires_at
  const expired =
    expiresAt &&
    !Number.isNaN(Date.parse(expiresAt)) &&
    new Date(expiresAt).getTime() < Date.now()

  if (expired) {
    return {
      label: t("wholesale.card.statusExpired"),
      className:
        "border-transparent bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
    }
  }

  if (product?.campaign_completed) {
    return {
      label: t("wholesale.card.statusCompleted"),
      className:
        "border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    }
  }

  if (hasActiveWholesaleReservation(product) || product?.user_reserved) {
    return {
      label: t("wholesale.market.reservedBadge"),
      className: "border-transparent bg-primary/10 text-primary",
    }
  }

  const minQ = Math.max(1, Number(product?.min_quantity ?? 1))
  const remaining = Number(product?.remaining_needed ?? 0)
  const almostFull = remaining > 0 && remaining <= Math.ceil(minQ * 0.2)

  if (almostFull) {
    return {
      label: t("wholesale.card.statusAlmostFull"),
      className:
        "border-transparent bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    }
  }

  return null
}

export function formatExpiryLabel(expiresAt, language) {
  if (!expiresAt || Number.isNaN(Date.parse(expiresAt))) return null
  const endMs = new Date(expiresAt).getTime()
  if (endMs < Date.now()) return null
  return formatDistanceToNow(new Date(expiresAt), {
    addSuffix: true,
    locale: language?.startsWith("ar") ? ar : enUS,
  })
}
