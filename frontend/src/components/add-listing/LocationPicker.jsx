import { useState } from "react"
import { ChevronDown, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useRegions } from "@/hooks/useRegions"
import { useCities } from "@/hooks/useRegions"

export default function LocationPicker({ form }) {
  const [isOpen, setIsOpen] = useState(false)
  const regionId = form.watch("regionId")
  const [selectedRegionId, setSelectedRegionId] = useState(regionId || "")

  const { data: regions = [], isLoading: loadingRegions } = useRegions()
  const { data: cities = [], isLoading: loadingCities } = useCities(selectedRegionId)

  const cityId = form.watch("cityId")

  const selectedRegion = regions.find((r) => r.id === regionId || String(r.id) === String(regionId))
  const selectedCity = cities.find((c) => c.id === cityId || String(c.id) === String(cityId))

  const handleSelectRegion = (region) => {
    setSelectedRegionId(String(region.id))
    form.setValue("regionId", String(region.id), { shouldValidate: true })
    form.setValue("cityId", "", { shouldValidate: false })
  }

  const handleSelectCity = (city) => {
    form.setValue("cityId", String(city.id), { shouldValidate: true })
    setIsOpen(false)
  }

  const handleOpen = () => {
    if (!isOpen && regionId) setSelectedRegionId(String(regionId))
    setIsOpen((o) => !o)
  }

  const handleClear = (e) => {
    e.stopPropagation()
    setSelectedRegionId("")
    form.setValue("regionId", "")
    form.setValue("cityId", "")
  }

  const name = (item) => item?.nameAr ?? item?.name ?? ""

  return (
    <FormField
      control={form.control}
      name="regionId"
      render={() => (
        <FormItem className="px-4 py-3 sm:px-6 lg:px-8">
          <label className="block text-sm font-medium text-foreground text-right mb-2">
            المكان <span className="text-destructive">*</span>
          </label>
          <div
            onClick={handleOpen}
            className={cn(
              "flex items-center justify-between cursor-pointer",
              "border-2 rounded-2xl px-4 py-3 transition-all shadow-sm",
              "hover:border-primary/50 hover:bg-accent/50",
              isOpen ? "border-primary bg-primary/5" : "border-border"
            )}
          >
            <ChevronDown
              size={16}
              className={cn(
                "text-muted-foreground transition-transform",
                isOpen && "rotate-180"
              )}
            />
            {selectedRegion && selectedCity ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X size={13} />
                </button>
                <span className="text-sm text-foreground">{name(selectedCity)}</span>
                <span className="text-muted-foreground text-sm">—</span>
                <span className="text-sm text-foreground">{name(selectedRegion)}</span>
                <span className="text-muted-foreground text-sm">—</span>
                <span className="text-sm text-foreground">السعودية</span>
                <span>🇸🇦</span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">السعودية — اختر المنطقة والمدينة</span>
            )}
          </div>

          {isOpen && (
            <div className="border-2 border-border rounded-2xl overflow-hidden mt-3 shadow-md">
              <div className="grid grid-cols-2 border-b border-border bg-muted/40">
                <div className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground border-e border-border">
                  قائمة المدن
                </div>
                <div className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">
                  قائمة المناطق
                </div>
              </div>

              <div className="grid grid-cols-2 h-64">
                <ScrollArea className="h-full border-e border-border">
                  {!selectedRegionId ? (
                    <div className="flex items-center justify-center h-full px-3">
                      <p className="text-xs text-muted-foreground text-center">
                        اختر منطقة أولاً
                      </p>
                    </div>
                  ) : loadingCities ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 size={16} className="animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    cities.map((city) => (
                      <button
                        key={city.id}
                        type="button"
                        onClick={() => handleSelectCity(city)}
                        className={cn(
                          "w-full text-right px-3 py-2.5 text-sm",
                          "border-b border-border/40 last:border-0",
                          "hover:bg-accent transition-colors",
                          cityId === city.id || String(cityId) === String(city.id)
                            ? "bg-accent font-medium"
                            : "text-foreground"
                        )}
                      >
                        {name(city)}
                      </button>
                    ))
                  )}
                </ScrollArea>

                <ScrollArea className="h-full">
                  {loadingRegions ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 size={16} className="animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    regions.map((region) => (
                      <button
                        key={region.id}
                        type="button"
                        onClick={() => handleSelectRegion(region)}
                        className={cn(
                          "w-full text-right px-3 py-2.5 text-sm",
                          "border-b border-border/40 last:border-0",
                          "hover:bg-accent transition-colors",
                          selectedRegionId === region.id || String(selectedRegionId) === String(region.id)
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-foreground"
                        )}
                      >
                        {name(region)}
                      </button>
                    ))
                  )}
                </ScrollArea>
              </div>
            </div>
          )}

          <FormMessage />
        </FormItem>
      )}
    />
  )
}
