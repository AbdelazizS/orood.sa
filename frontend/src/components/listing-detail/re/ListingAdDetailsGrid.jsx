import { useTranslation } from "react-i18next"
import { useAppDirection } from "@/providers/DirectionProvider"
import { Separator } from "@/components/ui/separator"
import {
  Ruler,
  Home,
  BedDouble,
  Bath,
  Layers,
  Calendar,
  Signpost,
} from "lucide-react"
import { buildReAdDetailRows } from "./buildReAdDetailRows"

const ICONS = {
  street_width: Signpost,
  area: Ruler,
  category: Home,
  bedrooms: BedDouble,
  bathrooms: Bath,
  floor: Layers,
  age: Calendar,
}

function DetailCell({ label, value, iconKey }) {
  const Icon = ICONS[iconKey] ?? Home
  return (
    <div className="flex items-start gap-2 border-b border-border/40 py-3 last:border-b-0">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 flex-1 text-start">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  )
}

export function ListingAdDetailsGrid({ product }) {
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const rows = buildReAdDetailRows(product, t)
  if (!rows.length) return null

  return (
    <>
      <section dir={direction} className="px-4 py-4 sm:px-6">
        <h2 className="mb-3 text-start text-sm font-semibold text-foreground">
          {t("listingDetail.re.adDetailsTitle")}
        </h2>
        <div className="rounded-xl border border-border/60 bg-muted/20 px-3 shadow-sm">
          <div className="grid grid-cols-2 gap-x-4">
            {rows.map((row) => (
              <DetailCell
                key={row.key}
                iconKey={row.key}
                label={row.label}
                value={row.value}
              />
            ))}
          </div>
        </div>
      </section>
      <Separator />
    </>
  )
}
