import { useTranslation } from "react-i18next"
import { useAppDirection } from "@/providers/DirectionProvider"
import { Separator } from "@/components/ui/separator"
import { FeatureOptionCards } from "@/components/dynamic-listing/FeatureOptionCards"
import { sortListingAttributeSections } from "@/lib/listings/sortListingAttributeSections"
import {
  resolveFieldLabel,
  resolveFieldValue,
  isSwitchField,
  isActiveSwitch,
  isTruthyAttributeValue,
  buildSectionsFromFlatAttributes,
  shouldHideRedundantListingField,
} from "@/lib/listings/resolveListingFieldDisplay"

export { resolveFieldLabel } from "@/lib/listings/resolveListingFieldDisplay"

export function resolveSectionTitle(section, t) {
  const key = section?.key
  if (!key) return section?.title ?? ""
  const apiTitle = section.title?.trim()
  if (apiTitle && apiTitle !== key) return apiTitle
  const i18nKey = `listingSchema.sections.${key}`
  const translated = t(i18nKey, { defaultValue: "" })
  if (translated && translated !== key) return translated
  return t(i18nKey, { defaultValue: section.title || key })
}

function sectionIsChipOnly(section, fields) {
  if (section?.key === "features") return true
  if (!fields.length) return false
  return fields.every((row) => isSwitchField(row))
}

/**
 * Generic PDP grid for schema-driven listing attributes.
 */
export function ListingAttributesGrid({ sections, attributes, variant = "plain", product = null }) {
  const { t, i18n } = useTranslation()
  const { direction } = useAppDirection()
  const locale = i18n.language

  const rawSections =
    Array.isArray(sections) && sections.length > 0
      ? sections
      : buildSectionsFromFlatAttributes(attributes, t)
  const sectionList = sortListingAttributeSections(rawSections)

  const sectionBlocks = sectionList
    .map((section, index) => {
        const fields = (section.fields ?? []).filter((row) => {
          if (!row?.field_key) return false
          if (shouldHideRedundantListingField(row, product)) return false
          if (isSwitchField(row)) return isActiveSwitch(row, t)
          const dv = resolveFieldValue(row, t, locale)
          if (dv != null && dv !== "") return true
          return isTruthyAttributeValue(row.value)
        })
        if (!fields.length) return null

        const chipOnly = sectionIsChipOnly(section, fields)
        const switchFields = fields.filter((row) => isSwitchField(row))
        const gridFields = chipOnly ? [] : fields.filter((row) => !isSwitchField(row))

        const sectionTitle = resolveSectionTitle(section, t)

        return (
          <section key={section.key ?? index} dir={direction} className="px-4 py-4 sm:px-6">
            <h2 className="mb-3 text-start text-sm font-semibold text-foreground">
              {sectionTitle || t("listingDetail.attributesTitle")}
            </h2>
            <div className={variant === "elevated" ? "rounded-xl border border-border/60 bg-muted/20 px-3 py-3 shadow-sm space-y-3" : "space-y-3"}>
              {switchFields.length > 0 ? (
                <FeatureOptionCards
                  fields={switchFields.map((row) => ({
                    field_key: row.field_key,
                    label: resolveFieldLabel(row, t),
                    icon: row.icon,
                  }))}
                  values={Object.fromEntries(
                    switchFields.map((row) => [row.field_key, isActiveSwitch(row, t)]),
                  )}
                  readonly
                />
              ) : null}
              {gridFields.length > 0 ? (
                <dl className="grid grid-cols-2 gap-x-4">
                  {gridFields.map((row) => {
                    const display = resolveFieldValue(row, t, locale)
                    return (
                      <div key={row.field_key} className="border-b border-border/40 py-3 last:border-b-0">
                        <dt className="text-xs text-muted-foreground">{resolveFieldLabel(row, t)}</dt>
                        <dd className="text-sm font-semibold text-foreground">{display}</dd>
                      </div>
                    )
                  })}
                </dl>
              ) : null}
            </div>
          </section>
        )
    })
    .filter(Boolean)

  if (!sectionBlocks.length) return null

  return (
    <>
      {sectionBlocks}
      <Separator />
    </>
  )
}
