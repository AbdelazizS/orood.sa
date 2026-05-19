import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useAppDirection } from "@/providers/DirectionProvider"

const TRUNCATE_LENGTH = 400

export function ListingReDescription({ product }) {
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const [expanded, setExpanded] = useState(false)
  const desc = product?.description ?? ""
  if (!desc) return null

  const isLong = desc.length > TRUNCATE_LENGTH
  const displayText = isLong && !expanded ? desc.slice(0, TRUNCATE_LENGTH) : desc

  return (
    <div dir={direction} className="bg-card px-4 py-3">
      <div className="whitespace-pre-line text-start text-sm leading-relaxed text-foreground">
        {displayText}
        {isLong ? (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="ms-1 text-sm font-medium text-primary hover:underline"
          >
            {expanded ? t("listingDetail.readLess") : t("listingDetail.readMore")}
          </button>
        ) : null}
      </div>
    </div>
  )
}
