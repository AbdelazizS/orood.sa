import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

import { LEGAL_ACK_ITEM_KEYS } from "@/lib/legal/legalAcknowledgmentItems"

/**
 * Single merged legal list for register and add-listing (platform 1+4, then user oaths).
 * @param {{ translationPrefix?: "auth" | "addListing", className?: string, listClassName?: string }} props
 */
export function LegalAcknowledgmentList({
  translationPrefix = "auth",
  className = "",
  listClassName = "list-decimal space-y-1 ps-4 text-sm text-muted-foreground",
}) {
  const { t } = useTranslation()

  return (
    <div className={cn("rounded-lg border border-border bg-muted/30 px-4 py-4 text-sm leading-relaxed", className)}>
      <p className="mb-2 font-semibold text-foreground">{t(`${translationPrefix}.platformRoleTitle`)}</p>
      <ol className={listClassName}>
        {LEGAL_ACK_ITEM_KEYS.map((key) => (
          <li key={key}>{t(`${translationPrefix}.${key}`)}</li>
        ))}
      </ol>
    </div>
  )
}
