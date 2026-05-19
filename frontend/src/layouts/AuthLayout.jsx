import { Outlet } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { ThemeToggle } from "@/components/navigation/ThemeToggle"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { AppLogo } from "@/components/common/AppLogo"

/**
 * Auth layout: header bar + centered form on muted background.
 * Flat style per PDF spec — no gradients, no shadows.
 */
export function AuthLayout() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-screen flex-col bg-muted">
      {/* Header bar — flat teal */}
      <header className="flex w-full items-center justify-between border-b border-primary/20 bg-primary px-4 py-3.5 sm:px-6 text-primary-foreground">
        <Link
          to="/"
          className="rounded-lg bg-primary-foreground/95 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-foreground/40 focus:ring-offset-2 focus:ring-offset-primary"
        >
          <AppLogo
            placement="auth"
            alt={`${t("common.brandLogoEn")} · ${t("common.brandLogoAr")}`}
          />
        </Link>
        <div className="flex items-center gap-2 [&_button]:text-primary-foreground [&_button]:hover:bg-primary-foreground/10 [&_button]:border-primary-foreground/30">
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
      </header>

      {/* Page area — form centered */}
      <div className="flex flex-1 flex-col items-center px-4 py-6">
        <Outlet />
      </div>
    </div>
  )
}
