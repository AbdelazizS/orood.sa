import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { AppLogo } from "@/components/common/AppLogo"
import { useBranding } from "@/hooks/useBranding"

export function FooterLogoColumn() {
  const { t } = useTranslation()
  const { footerTagline } = useBranding()

  const tagline =
    footerTagline() ||
    t(
      "footer.compact.taglineShort",
      "سوق موثوق للعروض والطلبات وسوق الجملة",
    )

  return (
    <div className="max-w-full space-y-3">
      <Link to="/" className="inline-flex max-w-[min(120px,40vw)] shrink-0 sm:max-w-[140px]">
        <AppLogo
          placement="footer"
          alt={t("common.brandLogoAr", "عروض")}
          className="h-auto w-full max-h-8 object-contain object-start sm:max-h-10"
        />
      </Link>
      <p className="max-w-full text-sm leading-relaxed text-muted-foreground sm:max-w-[220px]">{tagline}</p>
    </div>
  )
}
