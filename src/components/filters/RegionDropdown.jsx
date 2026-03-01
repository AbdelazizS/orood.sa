import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useFiltersStore } from "@/store/useFiltersStore"
import { MapPin } from "lucide-react"

/**
 * RegionDropdown shows selected region/city or "All Regions".
 * No placeholder – always displays current filter state.
 */
export function RegionDropdown({ regions = [] }) {
  const { t } = useTranslation()
  const { regionId, cityId, setRegion, setCity } = useFiltersStore()
  const [open, setOpen] = useState(false)

  const selectedRegion = useMemo(() => regions.find((region) => region.id === regionId), [regions, regionId])
  const selectedCity = selectedRegion?.cities?.find((city) => city.id === cityId)

  const displayLabel = useMemo(() => {
    if (!selectedRegion) return t("filters.allRegions")
    return selectedCity ? `${selectedRegion.name} / ${selectedCity.name}` : selectedRegion.name
  }, [selectedRegion, selectedCity, t])

  return (
    <div className="flex flex-col gap-2 rounded-2xl border bg-card px-4 py-3 shadow-sm">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between rounded-2xl">
            <span className="flex items-center gap-2 truncate">
              <MapPin className="size-4 shrink-0 text-primary" />
              {displayLabel}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="z-[110] w-full min-w-[var(--radix-popper-anchor-width)] p-0" align="end">
            <Command>
            <CommandInput placeholder={t("filters.searchRegionPlaceholder")} />
            <CommandList>
              <CommandEmpty>{t("common.noResults")}</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setRegion(null)
                    setCity(null)
                    setOpen(false)
                  }}
                >
                  {t("filters.allRegions")}
                </CommandItem>
              </CommandGroup>
              {regions.map((region) => (
                <CommandGroup key={region.id} heading={region.name}>
                  <CommandItem
                    onSelect={() => {
                      setRegion(region.id)
                      setCity(null)
                      setOpen(false)
                    }}
                  >
                    {region.name}
                  </CommandItem>
                  {region.cities?.map((city) => (
                    <CommandItem
                      key={city.id}
                      onSelect={() => {
                        setRegion(region.id)
                        setCity(city.id)
                        setOpen(false)
                      }}
                    >
                      {`${region.name} / ${city.name}`}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
