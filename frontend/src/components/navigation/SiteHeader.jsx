import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { SearchBar } from "./SearchBar"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ThemeToggle } from "./ThemeToggle"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import { useAuthStore } from "@/store/useAuthStore"
import { useFiltersStore } from "@/store/useFiltersStore"
import { PlusCircle } from "lucide-react"

/**
 * Site header: logo, search, regions, add offer, login.
 */
export function SiteHeader({ categories = [], regions = [], isLoading }) {
  const { t } = useTranslation()
  const { token, user } = useAuthStore()
  const { regionId, setRegion, setCategory } = useFiltersStore()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6">
        {/* Row 1: Logo + Search + Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/"
            className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 shrink-0 rounded-lg"
          >
            <img
              src="/logo.png"
              alt={`${t("common.brandLogoEn")} · ${t("common.brandLogoAr")}`}
              className="h-8 w-auto max-w-[180px] object-contain sm:h-9 sm:max-w-[200px]"
              width={200}
              height={40}
              decoding="async"
            />
          </Link>

          <div className="min-w-0 flex-1">
            <SearchBar />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Select
              value={regionId ? String(regionId) : "all"}
              onValueChange={(v) => setRegion(v === "all" ? null : Number(v))}
              disabled={isLoading}
            >
              <SelectTrigger className="w-[140px] rounded-full sm:w-[160px]">
                <SelectValue placeholder={t("feed.allRegions", "كل المناطق")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("feed.allRegions", "كل المناطق")}</SelectItem>
                {regions.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {token && user && <NotificationBell />}
            {token && user ? (
              <Button asChild size="sm" className="rounded-full">
                <Link to="/add">
                  <PlusCircle className="me-1.5 size-4" />
                  {t("feed.addOffer", "إضافة عرض")}
                </Link>
              </Button>
            ) : (
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link to="/login">{t("common.login")}</Link>
              </Button>
            )}

            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>

        {/* Row 2: Quick category links */}
        {categories.length > 0 && (
          <nav className="flex flex-wrap gap-2">
            {categories.slice(0, 8).map((cat) => (
              <Button key={cat.id} variant="ghost" size="sm" className="h-8 rounded-full text-sm" asChild>
                <Link to="/" onClick={() => setCategory(cat.id)}>
                  {cat.name}
                </Link>
              </Button>
            ))}
          </nav>
        )}
      </div>
    </header>
  )
}
