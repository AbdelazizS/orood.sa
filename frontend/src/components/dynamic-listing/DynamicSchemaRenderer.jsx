import { useMemo } from "react"
import { useAppDirection } from "@/providers/DirectionProvider"
import { Skeleton } from "@/components/ui/skeleton"
import { DynamicFieldRenderer } from "./DynamicFieldRenderer"
import { evaluateVisibleWhen } from "@/lib/listings/schemaUtils"
import { HIDDEN_LISTING_CREATE_FIELD_KEYS, sortListingAttributeSections } from "@/lib/listings/sortListingAttributeSections"
import { FeatureOptionCards } from "./FeatureOptionCards"

export function DynamicSchemaRenderer({
  schema,
  attributes,
  onChange,
  errors = {},
  isLoading = false,
}) {
  const { direction } = useAppDirection()

  const sections = useMemo(() => {
    if (!schema?.sections?.length) {
      const fields = (schema?.fields ?? []).filter((f) => !HIDDEN_LISTING_CREATE_FIELD_KEYS.has(f.field_key))
      return [{ key: "default", title: "", fields }]
    }
    const built = [...schema.sections]
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((section) => ({
        ...section,
        fields: (schema.fields ?? [])
          .filter((f) => f.section_key === section.key || (!f.section_key && section.key === "default"))
          .filter((f) => !HIDDEN_LISTING_CREATE_FIELD_KEYS.has(f.field_key))
          .filter((f) => {
            const layout = ["divider", "info", "warning", "instruction_block"]
            if (layout.includes(f.field_type)) return true
            return evaluateVisibleWhen(f.visible_when, attributes)
          })
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
      }))
      .filter((s) => s.fields.length > 0)

    return sortListingAttributeSections(built)
  }, [schema, attributes])

  if (isLoading) {
    return (
      <div className="mb-4 space-y-3 rounded-lg border border-border bg-card p-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  if (!schema) return null

  const fullWidthTypes = ["textarea", "richtext", "tags", "multiselect", "features", "divider", "info", "warning"]
  const switchTypes = new Set(["switch", "checkbox"])

  return (
    <div dir={direction} className="space-y-4">
      {sections.map((section) => {
        const amenityFields =
          section.key === "features" ? section.fields.filter((f) => switchTypes.has(f.field_type)) : []
        const amenityKeys = new Set(amenityFields.map((f) => f.field_key))
        const otherFields = section.fields.filter((f) => !amenityKeys.has(f.field_key))

        return (
          <section
            key={section.key}
            className="rounded-lg border border-border bg-card p-4 sm:p-5"
          >
            {section.title ? (
              <h2 className="mb-4 text-sm font-semibold text-foreground">{section.title}</h2>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              {amenityFields.length > 0 ? (
                <div className="sm:col-span-2">
                  <FeatureOptionCards
                    fields={amenityFields}
                    values={attributes}
                    onChange={(key, val) => onChange({ ...attributes, [key]: val })}
                  />
                </div>
              ) : null}
              {otherFields.map((field) => {
                const fullWidth = fullWidthTypes.includes(field.field_type)
                return (
                  <div key={field.field_key} className={fullWidth ? "sm:col-span-2" : ""}>
                    <DynamicFieldRenderer
                      field={field}
                      value={attributes[field.field_key]}
                      onChange={(key, val) => onChange({ ...attributes, [key]: val })}
                      error={errors[field.field_key] ?? errors[`listing_attributes.${field.field_key}`]}
                    />
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
