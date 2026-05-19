/**
 * One location line for wholesale company cards (city preferred, else region).
 * @param {{ city?: string | null, region?: string | null } | null | undefined} company
 */
export function formatWholesaleCompanyLocation(company) {
  const city = typeof company?.city === "string" ? company.city.trim() : ""
  const region = typeof company?.region === "string" ? company.region.trim() : ""
  return city || region || null
}

/**
 * Filters that affect GET /wholesale/companies (excludes homepage-only activeFilter).
 */
export function hasWholesaleCompanyFilters(state) {
  return Boolean(
    state.categoryId ||
      state.subcategoryId ||
      state.regionId ||
      state.cityId ||
      (state.searchQuery && String(state.searchQuery).trim())
  )
}

export function resolveWholesaleSupplierCountLabel(t, { total, hasActiveFilters }) {
  if (hasActiveFilters) {
    if (total === 0) {
      return t("wholesale.companies.supplierCountZeroFiltered")
    }
    return t("wholesale.companies.supplierCountFiltered", { count: total })
  }
  return t("wholesale.companies.supplierCountTotal", { count: total })
}
