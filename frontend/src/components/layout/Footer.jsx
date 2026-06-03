import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { FooterLegalBar } from "@/components/layout/FooterLegalBar"
import { FooterLogoColumn } from "@/components/layout/FooterLogoColumn"
import { useAppDirection } from "@/providers/DirectionProvider"

function FooterLinkGroup({ title, links, className }) {
  if (!links?.length) return null
  return (
    <div className={className}>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">{title}</h3>
      <ul className="mt-2 space-y-1.5 text-sm">
        {links.map((link) => (
          <li key={link.key}>
            <Link
              to={link.to}
              className="text-muted-foreground transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Footer() {
  const { t } = useTranslation()
  const { direction } = useAppDirection()

  const categoryLinks = [
    { key: "real-estate", to: "/?cat=real-estate", label: t("footer.compact.categories.realEstate", "عقارات") },
    { key: "cars", to: "/?cat=cars", label: t("footer.compact.categories.cars", "سيارات") },
    { key: "furniture", to: "/?cat=furniture", label: t("footer.compact.categories.furniture", "أثاث") },
    { key: "electronics", to: "/?cat=electronics", label: t("footer.compact.categories.electronics", "إلكترونيات") },
  ]

  const quickLinks = [
    { key: "wholesale", to: "/wholesale", label: t("footer.compact.quick.wholesale", "سوق الجملة") },
    { key: "add", to: "/add", label: t("footer.compact.quick.addListing", "أضف عرض") },
    { key: "requests", to: "/requests", label: t("footer.compact.quick.requests", "طلبات الشراء") },
    { key: "my-listings", to: "/dashboard/listings", label: t("footer.compact.quick.myListings", "إعلاناتي") },
  ]

  const legalLinks = [
    { key: "help", to: "/help", label: t("footer.compact.legal.help", "مركز المساعدة") },
    { key: "about", to: "/about", label: t("footer.compact.legal.about", "عن المنصة") },
    { key: "terms", to: "/terms", label: t("footer.compact.legal.terms", "الشروط والأحكام") },
    { key: "privacy", to: "/privacy-policy", label: t("footer.compact.legal.privacy", "الخصوصية") },
    { key: "refund", to: "/refund-policy", label: t("footer.compact.legal.refund", "سياسة الاسترجاع") },
  ]

  const linkSections = [
    { key: "categories", title: t("footer.compact.sections.categories", "أقسام الموقع"), links: categoryLinks },
    { key: "quick", title: t("footer.compact.sections.quick", "روابط سريعة"), links: quickLinks },
    { key: "legal", title: t("footer.compact.sections.legal", "منصة عروض"), links: legalLinks },
  ]

  return (
    <footer
      className="site-footer mt-auto border-t border-border bg-muted/40 text-muted-foreground"
      dir={direction}
      data-nosnippet
    >
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 lg:gap-8">
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <FooterLogoColumn />
          </div>
          {linkSections.map((section) => (
            <FooterLinkGroup
              key={section.key}
              title={section.title}
              links={section.links}
              className={section.key === "legal" ? "col-span-2 sm:col-span-1 md:col-span-1" : undefined}
            />
          ))}
        </div>
      </div>

      <FooterLegalBar />
    </footer>
  )
}
