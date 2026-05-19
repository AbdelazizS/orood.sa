import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { useFiltersStore } from "@/store/useFiltersStore"
import { RotateCcw } from "lucide-react"

export function ResetFiltersButton() {
  const { t } = useTranslation()
  const {
    categoryId,
    subcategoryId,
    regionId,
    cityId,
    activeFilter,
    searchQuery,
    rePurpose,
    rePropertyType,
    reMinArea,
    reMaxArea,
    reBedroomsMin,
    resetFilters,
  } = useFiltersStore()

  const hasActiveFilters =
    categoryId ||
    subcategoryId ||
    regionId ||
    cityId ||
    (activeFilter && activeFilter !== "all") ||
    searchQuery ||
    rePurpose ||
    rePropertyType ||
    reMinArea ||
    reMaxArea ||
    reBedroomsMin

  if (!hasActiveFilters) return null

  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full rounded-2xl"
      onClick={resetFilters}
    >
      <RotateCcw className="me-2 size-4" />
      {t("filters.resetFilters")}
    </Button>
  )
}
