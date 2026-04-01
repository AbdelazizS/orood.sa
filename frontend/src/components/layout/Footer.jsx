import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"

/**
 * Footer — PDF design: brand, categories, quick links, language.
 */
export function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="mt-auto border-t border-border bg-card text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">{t("common.brandName")}</h3>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              {t("auth.taglineDescription")}
            </p>
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">{t("footer.categories", "الفئات")}</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/" className="hover:text-foreground transition-colors">
                  {t("filters.allCategories")}
                </Link>
              </li>
              <li>
                <Link to="/?filter=offers" className="hover:text-foreground transition-colors">
                  {t("feed.offer")}
                </Link>
              </li>
              <li>
                <Link to="/?filter=requests" className="hover:text-foreground transition-colors">
                  {t("feed.request")}
                </Link>
              </li>
              <li>
                <Link to="/#companies" className="hover:text-foreground transition-colors">
                  {t("feed.companyDirectory")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">{t("footer.quickLinks", "روابط سريعة")}</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
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
            <h3 className="text-base font-semibold text-foreground">{t("common.language")}</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              {t("common.arabic")} / {t("common.english")}
            </p>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-border text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} {t("common.brandName")}. {t("common.brandLine")}
        </div>
      </div>
    </footer>
  )
}
