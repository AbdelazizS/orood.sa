import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"

export function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="mt-auto border-t bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="text-sm font-semibold">{t("common.brandName")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("auth.taglineDescription")}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold">{t("nav.categories")}</h3>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>
                <Link to="/" className="hover:text-foreground transition-colors">
                  {t("filters.allCategories")}
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-foreground transition-colors">
                  {t("feed.offer")}
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-foreground transition-colors">
                  {t("feed.request")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">{t("auth.tagline")}</h3>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>
                <Link to="/add" className="hover:text-foreground transition-colors">
                  {t("nav.addListing")}
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-foreground transition-colors">
                  {t("common.login")}
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-foreground transition-colors">
                  {t("common.register")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">{t("common.language")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("common.arabic")} / {t("common.english")}
            </p>
          </div>
        </div>
        <div className="mt-8 border-t pt-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} {t("common.brandName")}. {t("common.brandLine")}
        </div>
      </div>
    </footer>
  )
}
