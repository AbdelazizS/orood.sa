import { useEffect, useRef, useState } from "react"
import { Search, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import { searchPlaces } from "@/lib/maps/geocoder"

export function MapSearchBar({
  onSelect,
  /** Sync input when pin moves / reverse geocode resolves (does not trigger a new search). */
  resolvedValue,
  language = "ar",
  className = "",
  debounceMs = 300,
  placeholder,
}) {
  const { t, i18n } = useTranslation()
  const [query, setQuery] = useState(resolvedValue ?? "")
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(false)
  const [searched, setSearched] = useState(false)
  const debounceRef = useRef(null)
  const abortRef = useRef(null)
  const skipSearchRef = useRef(false)
  const lang = i18n.language || language

  useEffect(() => {
    if (resolvedValue === undefined) return
    const next = resolvedValue ?? ""
    skipSearchRef.current = true
    setQuery(next)
    setResults([])
    setOpen(false)
    setSearched(false)
    setError(false)
  }, [resolvedValue])

  useEffect(() => {
    if (skipSearchRef.current) {
      skipSearchRef.current = false
      return undefined
    }

    const q = query.trim()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (abortRef.current) abortRef.current.abort()

    if (q.length < 2) {
      setResults([])
      setOpen(false)
      setIsLoading(false)
      setError(false)
      setSearched(false)
      return undefined
    }

    debounceRef.current = setTimeout(async () => {
      debounceRef.current = null
      const ac = new AbortController()
      abortRef.current = ac
      setIsLoading(true)
      setError(false)
      setSearched(false)

      try {
        const list = await searchPlaces(q, ac.signal, lang)
        if (!ac.signal.aborted) {
          setResults(list)
          setOpen(list.length > 0)
          setSearched(true)
          setError(false)
        }
      } catch {
        if (!ac.signal.aborted) {
          setResults([])
          setOpen(false)
          setSearched(true)
          setError(true)
        }
      } finally {
        if (!ac.signal.aborted) setIsLoading(false)
      }
    }, debounceMs)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (abortRef.current) abortRef.current.abort()
    }
  }, [query, lang, debounceMs])

  const pick = (item) => {
    skipSearchRef.current = true
    setQuery(item.label)
    setResults([])
    setOpen(false)
    setSearched(false)
    setError(false)
    onSelect?.(item)
  }

  const handleKeyDown = (e) => {
    if (e.key !== "Enter" || results.length === 0) return
    e.preventDefault()
    pick(results[0])
  }

  const showNoResults = searched && !isLoading && !error && results.length === 0 && query.trim().length >= 2
  const placeholderText = placeholder ?? t("maps.searchPlaceholder", "Search address…")

  return (
    <div className={cn("relative z-20 space-y-1", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholderText}
          className="h-10 bg-background/90 pe-9 ps-9 backdrop-blur-md"
          aria-label={placeholderText}
          aria-expanded={open}
          aria-busy={isLoading}
          onFocus={() => {
            if (results.length) setOpen(true)
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        {isLoading ? (
          <Loader2
            className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
            aria-hidden
          />
        ) : null}
      </div>
      {open && results.length ? (
        <ul
          className="absolute inset-x-0 top-full z-50 mt-1 max-h-48 overflow-auto rounded-lg border border-border bg-popover py-1 shadow-lg"
          role="listbox"
        >
          {results.map((r, i) => (
            <li key={`${r.lat}-${r.lng}-${i}`} role="option">
              <button
                type="button"
                className="w-full px-3 py-2 text-start text-sm hover:bg-muted"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(r)}
              >
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {showNoResults ? (
        <p className="text-xs text-muted-foreground">{t("maps.searchNoResults", "لم يُعثر على نتائج")}</p>
      ) : null}
      {error ? (
        <p className="text-xs text-destructive">
          {t("maps.searchError", "تعذّر البحث — تحقق من الاتصال وحاول مرة أخرى")}
        </p>
      ) : null}
      {isLoading && query.trim().length >= 2 ? (
        <p className="sr-only">{t("maps.searchLoading", "جاري البحث…")}</p>
      ) : null}
    </div>
  )
}
