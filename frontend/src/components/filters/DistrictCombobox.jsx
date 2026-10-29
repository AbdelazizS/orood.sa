import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Check, ChevronDown, Loader2, Plus } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { useDistricts } from "@/hooks/useDistricts"
import { cn } from "@/lib/utils"

/**
 * Searchable district (الحي) picker, Haraj-style: type part of the name to filter the list.
 *
 * @param {{
 *   cityId: number|null,
 *   value: string|null,
 *   onChange: (district: string|null) => void,
 *   allowAll?: boolean,     // first option "الكل" (filters)
 *   allowCustom?: boolean,  // the typed text can be used when it isn't listed (add-listing form)
 *   className?: string,
 *   triggerClassName?: string,
 *   id?: string,
 *   invalid?: boolean,
 * }} props
 */
export function DistrictCombobox({
  cityId,
  value,
  onChange,
  allowAll = false,
  allowCustom = false,
  className,
  triggerClassName,
  id,
  invalid = false,
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [other, setOther] = useState("")
  const { data: districts = [], isFetching } = useDistricts(cityId)
  const disabled = !cityId

  const pick = (next) => {
    onChange(next || null)
    setOpen(false)
    setQuery("")
    setOther("")
  }

  const submitOther = () => {
    const name = other.trim()
    if (name) pick(name)
  }

  const typed = query.trim()
  const typedIsListed = districts.some((d) => d === typed)

  const label = value
    ? value
    : disabled
      ? t("filters.district", "الحي")
      : allowAll
        ? t("filters.allDistricts", "جميع الأحياء")
        : t("filters.pickDistrict", "اختر الحي")

  return (
    <Popover open={open} onOpenChange={(next) => !disabled && setOpen(next)}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          title={disabled ? t("listingsMap.districtNeedsCity", "اختر المدينة أولاً") : undefined}
          className={cn(
            "flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs transition-colors",
            "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            invalid && "border-destructive",
            !value && "text-muted-foreground",
            triggerClassName,
            className,
          )}
        >
          <span className="truncate">{label}</span>
          {isFetching ? <Loader2 className="size-4 shrink-0 animate-spin opacity-60" aria-hidden /> : <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden />}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[14rem] p-0" align="start">
        {/* Plain "contains" match (Arabic names), not fuzzy — «النر» shows النرجس only. */}
        <Command filter={(itemValue, search) => (itemValue.startsWith("__") || itemValue.includes(search.trim()) ? 1 : 0)}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder={t("filters.searchDistrict", "ابحث باسم الحي…")}
          />
          <CommandList className="max-h-72">
            <CommandEmpty>
              {allowCustom && typed ? null : t("filters.noDistrictMatch", "لا يوجد حي بهذا الاسم")}
            </CommandEmpty>
            <CommandGroup>
              {allowAll ? (
                <CommandItem value="__all__" onSelect={() => pick(null)}>
                  <Check className={cn("size-4", value ? "opacity-0" : "opacity-100")} aria-hidden />
                  {t("filters.allDistricts", "جميع الأحياء")}
                </CommandItem>
              ) : null}
              {districts.map((d) => (
                <CommandItem key={d} value={d} onSelect={() => pick(d)}>
                  <Check className={cn("size-4", value === d ? "opacity-100" : "opacity-0")} aria-hidden />
                  {d}
                </CommandItem>
              ))}
              {allowCustom && typed && !typedIsListed ? (
                <CommandItem value={`__custom__${typed}`} onSelect={() => pick(typed)}>
                  <Plus className="size-4" aria-hidden />
                  {t("filters.useTypedDistrict", { name: typed, defaultValue: "استخدام «{{name}}»" })}
                </CommandItem>
              ) : null}
            </CommandGroup>
          </CommandList>
        </Command>
        {/* «أخرى — اكتب»: always at the end of the list, for a district that isn't listed. */}
        {allowCustom ? (
          <div className="border-t border-border bg-muted/30 p-2">
            <label htmlFor={`${id ?? "district"}-other`} className="mb-1 block text-xs font-semibold text-foreground">
              {t("filters.otherDistrict", "أخرى — اكتب اسم الحي")}
            </label>
            <div className="flex gap-1.5">
              <input
                id={`${id ?? "district"}-other`}
                value={other}
                maxLength={120}
                onChange={(e) => setOther(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    submitOther()
                  }
                }}
                placeholder={t("filters.otherDistrictPlaceholder", "اسم الحي")}
                className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              />
              <button
                type="button"
                onClick={submitOther}
                disabled={!other.trim()}
                className="h-9 shrink-0 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {t("common.add", "إضافة")}
              </button>
            </div>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
