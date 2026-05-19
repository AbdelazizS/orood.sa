import { AppLogo } from "@/components/common/AppLogo"

/** @deprecated Use AppLogo with `placement` instead. */
const CONTEXT_TO_PLACEMENT = {
  sidebar: "sidebar",
  nav: "navbar",
  footer: "footer",
  preloader: "preloader",
  auth: "auth",
  mobileNav: "mobileNav",
}

/**
 * @param {{ variant?: 'favicon' | 'logo', context?: string, alt: string, className?: string, priority?: boolean }} props
 */
export function BrandLogo({ variant = "logo", context = "nav", alt, className, priority = false }) {
  const placement = CONTEXT_TO_PLACEMENT[context] ?? "navbar"
  const logoVariant = variant === "favicon" ? "favicon" : variant === "logo" ? "full" : variant

  return (
    <AppLogo
      placement={placement}
      variant={logoVariant}
      alt={alt}
      className={className}
      priority={priority}
    />
  )
}
