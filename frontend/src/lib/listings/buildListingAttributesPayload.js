import { evaluateVisibleWhen } from "@/lib/listings/schemaUtils"

const LAYOUT_TYPES = ["divider", "info", "warning", "instruction_block"]

/**
 * Only send schema fields that are visible for the current attribute values.
 * Normalizes switches to booleans so the API passes validation.
 *
 * @param {import("@/hooks/useListingSchema").ListingSchemaPayload|null} schema
 * @param {Record<string, unknown>} attributes
 */
export function buildListingAttributesPayload(schema, attributes) {
  if (!schema?.fields?.length) return {}

  const out = {}
  for (const field of schema.fields) {
    if (LAYOUT_TYPES.includes(field.field_type)) continue
    if (!evaluateVisibleWhen(field.visible_when, attributes)) continue

    const key = field.field_key
    const raw = attributes[key]

    if (field.field_type === "switch" || field.field_type === "checkbox") {
      out[key] = Boolean(raw)
      continue
    }

    if (raw === undefined || raw === null || raw === "") {
      if (field.required) {
        out[key] = raw ?? ""
      }
      continue
    }

    out[key] = raw
  }

  return out
}
