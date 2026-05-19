/**
 * Evaluate schema visible_when against current attribute values.
 * @param {Record<string, unknown>|null|undefined} visibleWhen
 * @param {Record<string, unknown>} attributes
 */
export function evaluateVisibleWhen(visibleWhen, attributes) {
  if (!visibleWhen || typeof visibleWhen !== "object") return true
  for (const [key, expected] of Object.entries(visibleWhen)) {
    const actual = attributes[key]
    if (Array.isArray(expected)) {
      if (!expected.includes(actual)) return false
    } else if (String(actual ?? "") !== String(expected ?? "")) {
      return false
    }
  }
  return true
}

/** @param {import("@/hooks/useListingSchema").ListingSchemaPayload|null} schema */
export function schemaFieldVisible(field, attributes) {
  if (!field) return false
  const layoutBlocks = ["info", "divider", "warning", "instruction_block"]
  if (layoutBlocks.includes(field.field_type)) return true
  return evaluateVisibleWhen(field.visible_when, attributes)
}
