const SECTION_ORDER = {
  property_specs: 0,
  features: 1,
}

/**
 * Ensure PDP / form sections appear as: مواصفات العقار → المميزات → others.
 */
export function sortListingAttributeSections(sections) {
  if (!Array.isArray(sections) || sections.length < 2) return sections ?? []

  return [...sections].sort((a, b) => {
    const aOrder = SECTION_ORDER[a?.key] ?? a?.section_sort_order ?? a?.sort_order ?? 50
    const bOrder = SECTION_ORDER[b?.key] ?? b?.section_sort_order ?? b?.sort_order ?? 50
    if (aOrder !== bOrder) return aOrder - bOrder
    return String(a?.key ?? "").localeCompare(String(b?.key ?? ""))
  })
}

/** Fields hidden on public create/edit (admin may still define them). */
export const HIDDEN_LISTING_CREATE_FIELD_KEYS = new Set(["property_direction"])
