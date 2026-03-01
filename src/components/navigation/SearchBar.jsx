import { useMemo, useState } from "react"
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { useFiltersStore } from "@/store/useFiltersStore"
import { useSearchAutocomplete } from "@/hooks/useSearchAutocomplete"
import { useDebounce } from "@/hooks/useDebounce"
import { Search } from "lucide-react"
import { useTranslation } from "react-i18next"

export function SearchBar() {
  const { t } = useTranslation()
  const { setSearchQuery } = useFiltersStore()
  const [localQuery, setLocalQuery] = useState("")
  const debounced = useDebounce(localQuery, 350)
  const { data: suggestions } = useSearchAutocomplete(debounced)

  const showSuggestions = useMemo(() => Boolean(debounced && suggestions?.length), [debounced, suggestions])

  const handleSubmit = (value) => {
    setSearchQuery(value)
  }

  return (
    <div className="relative w-full min-w-[240px]">
      <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder={t("feed.searchPlaceholder")}
        className="w-full rounded-2xl border border-input bg-card/40 px-10 py-3 shadow-sm"
        value={localQuery}
        onChange={(event) => {
          setLocalQuery(event.target.value)
          if (!event.target.value) setSearchQuery("")
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            handleSubmit(localQuery)
          }
        }}
      />
      {showSuggestions && (
        <div className="absolute inset-x-0 top-full z-20 mt-2 rounded-2xl border bg-card shadow-2xl">
          <Command>
            <CommandList>
              <CommandEmpty>{t("common.noResults")}</CommandEmpty>
              <CommandGroup heading={t("feed.suggestions", "Suggestions")}>
                {suggestions.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.title}
                    onSelect={(value) => {
                      setLocalQuery(value)
                      handleSubmit(value)
                    }}
                  >
                    {item.title}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  )
}
