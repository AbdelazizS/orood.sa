import { useEffect, useRef } from "react"
import { useSearchParams } from "react-router-dom"
import { FEATURED_FILTERS } from "@/config/navigation"
import { useFiltersStore } from "@/store/useFiltersStore"

const FILTER_IDS = new Set(FEATURED_FILTERS.map((f) => f.id))

function parseNumberParam(v) {
  if (v == null || v === "") return null
  const n = Number.parseInt(String(v), 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * Wholesale market: URL is shareable source of truth; CategoryBar / FilterToolbar use the global filters store.
 * Hydrates store from the URL when searchParams change, and writes the store back to the URL (preserving `view`).
 */
export function useWholesaleFiltersSync() {
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryId = useFiltersStore((s) => s.categoryId)
  const subcategoryId = useFiltersStore((s) => s.subcategoryId)
  const regionId = useFiltersStore((s) => s.regionId)
  const cityId = useFiltersStore((s) => s.cityId)
  const searchQuery = useFiltersStore((s) => s.searchQuery)
  const activeFilter = useFiltersStore((s) => s.activeFilter)
  const setCategory = useFiltersStore((s) => s.setCategory)
  const setSubcategory = useFiltersStore((s) => s.setSubcategory)
  const setRegion = useFiltersStore((s) => s.setRegion)
  const setCity = useFiltersStore((s) => s.setCity)
  const setSearchQuery = useFiltersStore((s) => s.setSearchQuery)
  const setActiveFilter = useFiltersStore((s) => s.setActiveFilter)
  const resetFilters = useFiltersStore((s) => s.resetFilters)

  const hydratedKey = useRef(null)

  useEffect(() => {
    const key = searchParams.toString()
    if (hydratedKey.current === key) return
    hydratedKey.current = key

    const cat = parseNumberParam(searchParams.get("category_id"))
    const sub = parseNumberParam(searchParams.get("subcategory_id"))
    const reg = parseNumberParam(searchParams.get("region_id"))
    const city = parseNumberParam(searchParams.get("city_id"))
    const q = searchParams.get("q") ?? ""
    const filterRaw = searchParams.get("filter")
    const filter =
      filterRaw &&
      FILTER_IDS.has(filterRaw) &&
      filterRaw !== "wholesale"
        ? filterRaw
        : "all"

    setRegion(reg)
    setCity(city)
    setSearchQuery(q)
    setActiveFilter(filter)
    setCategory(cat)
    setSubcategory(sub)
  }, [
    searchParams,
    setCategory,
    setSubcategory,
    setRegion,
    setCity,
    setSearchQuery,
    setActiveFilter,
  ])

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams()
        const view = prev.get("view")
        if (view) next.set("view", view)

        const groupStatus = prev.get("group_status")
        if (groupStatus === "open" || groupStatus === "almost_full") {
          next.set("group_status", groupStatus)
        }

        if (categoryId) next.set("category_id", String(categoryId))
        if (subcategoryId) next.set("subcategory_id", String(subcategoryId))
        if (regionId) next.set("region_id", String(regionId))
        if (cityId) next.set("city_id", String(cityId))
        if (searchQuery && String(searchQuery).trim()) next.set("q", String(searchQuery).trim())
        if (activeFilter && activeFilter !== "all") next.set("filter", activeFilter)

        return next
      },
      { replace: true }
    )
  }, [categoryId, subcategoryId, regionId, cityId, searchQuery, activeFilter, setSearchParams])

  useEffect(() => {
    return () => {
      resetFilters()
    }
  }, [resetFilters])
}
