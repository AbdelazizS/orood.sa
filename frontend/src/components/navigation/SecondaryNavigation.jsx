import { useTranslation } from "react-i18next"

const links = [
  { labelKey: "nav.home", href: "#", fallback: "الرئيسية" },
  { labelKey: "nav.categories", href: "#categories", fallback: "الأقسام" },
  { labelKey: "home.wholesale", href: "#sir-aljomla", fallback: "منتجات جديدة بسعر الجملة" },
  { labelKey: "nav.contact", href: "#contact", fallback: "التواصل" },
  { labelKey: "nav.support", href: "#support", fallback: "الدعم" },
]

export function SecondaryNavigation() {
  const { t } = useTranslation()

  return (
    <div className="relative left-1/2 right-1/2 w-screen -translate-x-1/2">
      <nav className="w-full border border-primary/30 bg-primary text-primary-foreground shadow-sm">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-6 py-3 text-sm font-semibold">
          {links.map((link) => (
            <a key={link.labelKey} href={link.href} className="transition hover:opacity-80">
              {t(link.labelKey, link.fallback)}
            </a>
          ))}
        </div>
      </nav>
    </div>
  )
}
