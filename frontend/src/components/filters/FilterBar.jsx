import { FEATURED_FILTERS } from "@/config/navigation"
import { useFiltersStore } from "@/store/useFiltersStore"
import { useTranslation } from "react-i18next"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function FilterBar() {
  const { t } = useTranslation()
  const { activeFilter, setActiveFilter } = useFiltersStore()

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border bg-card px-4 py-3 shadow-sm">
      <span className="text-sm font-semibold text-muted-foreground">التصنيف</span>
      <Select value={activeFilter ?? "all"} onValueChange={(value) => setActiveFilter(value)}>
        <SelectTrigger className="w-[220px] rounded-full">
          <SelectValue placeholder={t("common.all")} />
        </SelectTrigger>
        <SelectContent>
          {FEATURED_FILTERS.map((filter) => (
            <SelectItem key={filter.id} value={filter.id}>
              {t(filter.label)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
