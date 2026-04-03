import { useMemo } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useFiltersStore } from "@/store/useFiltersStore"
import { useTranslation } from "react-i18next"
import { FEATURED_FILTERS } from "@/config/navigation"

/**
 * FilterDropdown shows selected filter label. No placeholder – always displays current state.
 */
export function FilterDropdown() {
  const { t } = useTranslation()
  const { activeFilter, setActiveFilter } = useFiltersStore()

  const selectedLabel = useMemo(() => {
    const f = FEATURED_FILTERS.find((x) => x.id === (activeFilter ?? "all"))
    return f ? t(f.label) : t("filters.allFilters")
  }, [activeFilter, t])

  return (
    <Select value={activeFilter ?? "all"} onValueChange={setActiveFilter}>
      <SelectTrigger className="w-full rounded-2xl">
        <SelectValue>{selectedLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {FEATURED_FILTERS.map((filter) => (
          <SelectItem key={filter.id} value={filter.id}>
            {t(filter.label)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
