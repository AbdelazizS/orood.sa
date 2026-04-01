const links = [
  { label: "الرئيسية", href: "#" },
  { label: "الأقسام", href: "#categories" },
  { label: "سعر الجملة", href: "#sir-aljomla" },
  { label: "التواصل", href: "#contact" },
  { label: "الدعم", href: "#support" },
]

export function SecondaryNavigation() {
  return (
    <div className="relative left-1/2 right-1/2 w-screen -translate-x-1/2">
      <nav className="w-full border border-primary/30 bg-primary text-primary-foreground shadow-sm">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-6 py-3 text-sm font-semibold">
          {links.map((link) => (
            <a key={link.label} href={link.href} className="transition hover:opacity-80">
              {link.label}
            </a>
          ))}
        </div>
      </nav>
    </div>
  )
}
