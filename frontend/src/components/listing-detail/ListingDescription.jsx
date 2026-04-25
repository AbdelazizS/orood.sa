import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useAppDirection } from "@/providers/DirectionProvider"
import { Separator } from "@/components/ui/separator"

/**
 * Section 5 — Listing Description.
 * px-4 py-3. Expandable at 280 chars.
 */
const TRUNCATE_LENGTH = 280

export function ListingDescription({ product }) {
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const [expanded, setExpanded] = useState(false)
  const desc = product?.description ?? ""

  if (!desc) return null

  const isLong = desc.length > TRUNCATE_LENGTH
  const displayText = isLong && !expanded ? desc.slice(0, TRUNCATE_LENGTH) : desc

  return (
    <>
      <div dir={direction} className="px-4 py-4 sm:px-6">
        <div className="whitespace-pre-line text-start text-sm leading-loose text-foreground">
          {displayText}
          {isLong && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="me-1 rounded-sm text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              {expanded ? t("listingDetail.readLess", "... أقل") : t("listingDetail.readMore", "... اقرأ المزيد")}
            </button>
          )}
        </div>
      </div>
      <Separator />
    </>
  )
}
