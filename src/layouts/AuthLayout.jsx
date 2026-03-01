import { Outlet } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/navigation/ThemeToggle"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"

/**
 * Auth layout: enterprise split screen — left brand, right form.
 * Premium, big-company feel with refined typography and spacing.
 */
export function AuthLayout() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-screen">
      {/* Left: Brand — enterprise style */}
      <div
        className={cn(
          "hidden lg:flex w-[55%] flex-col justify-center px-16 xl:px-24",
          "bg-gradient-to-br from-primary via-primary to-primary/90",
          "relative overflow-hidden",
        )}
      >
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
        <Link
          to="/"
          className="relative z-10 max-w-lg focus:outline-none focus:ring-2 focus:ring-primary-foreground/40 focus:ring-offset-2 focus:ring-offset-primary rounded-xl transition-transform hover:scale-[1.01]"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary-foreground/15 text-3xl font-bold text-primary-foreground shadow-lg">
              {t("common.brandName").charAt(0)}
            </div>
            <div>
              <h1 className="text-4xl xl:text-5xl font-bold tracking-tight text-primary-foreground drop-shadow-sm">
                {t("common.brandName")}
              </h1>
              <p className="mt-2 text-lg xl:text-xl text-primary-foreground/90 font-medium">
                {t("auth.tagline")}
              </p>
            </div>
          </div>
          <p className="mt-8 text-base text-primary-foreground/80 leading-relaxed max-w-md">
            {t("auth.taglineDescription", "منصة موثوقة للعروض والطلبات في المملكة — تواصل مع البائعين والمشترين بسهولة.")}
          </p>
        </Link>
      </div>

      {/* Right: Form */}
      <div className="relative flex w-full flex-col justify-center px-6 py-12 lg:w-[45%] lg:px-12 xl:px-16">
        <div className="absolute end-4 top-4 flex items-center gap-2">
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
        <Outlet />
      </div>
    </div>
  )
}
