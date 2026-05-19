import { NavLink, Outlet } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

const TABS = [
  { to: "/admin/seo", end: true, key: "dashboard" },
  { to: "/admin/seo/global", end: false, key: "global" },
  { to: "/admin/seo/pages", end: false, key: "pages" },
  { to: "/admin/seo/pages/bulk", end: false, key: "bulk" },
  { to: "/admin/seo/structured-data", end: false, key: "structured" },
  { to: "/admin/seo/sitemap", end: false, key: "sitemap" },
  { to: "/admin/seo/robots", end: false, key: "robots" },
  { to: "/admin/seo/social-preview", end: false, key: "social" },
  { to: "/admin/seo/reports", end: false, key: "reports" },
]

export function AdminSeoLayout() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("admin.seo.title", "SEO")}</h1>
        <p className="text-muted-foreground">
          {t("admin.seo.subtitle", "Manage meta tags, sitemaps, and structured data.")}
        </p>
      </div>
      <nav className="flex flex-wrap gap-2 border-b border-border pb-2">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )
            }
          >
            {t(`admin.seo.tabs.${tab.key}`, tab.key)}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}
