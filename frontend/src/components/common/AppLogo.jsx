import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"
import { resolveImageUrl } from "@/lib/imageUrl"
import { NavbarLogo } from "@/components/brand/NavbarLogo"
import { BRANDING_FALLBACK, useBranding } from "@/hooks/useBranding"

/**
 * Branding-driven logo for footer, sidebar, auth, preloader.
 * Navbar / mobile menu use {@link NavbarLogo} instead.
 *
 * @param {{
 *   placement: 'navbar' | 'sidebar' | 'footer' | 'preloader' | 'auth' | 'mobileNav' | 'nav' | 'mobile_nav',
 *   variant?: 'full' | 'mark' | 'light' | 'dark' | 'favicon',
 *   link?: boolean,
 *   priority?: boolean,
 *   className?: string,
 *   alt: string,
 * }} props
 */
export function AppLogo({
  placement = "navbar",
  variant,
  link = false,
  priority = false,
  className,
  alt,
}) {
  const placementKey =
    placement === "nav"
      ? "navbar"
      : placement === "mobileNav"
        ? "mobile_nav"
        : placement

  if (placementKey === "navbar") {
    return (
      <NavbarLogo
        alt={alt}
        priority={priority}
        link={link}
        variant="default"
        className={className}
      />
    )
  }

  if (placementKey === "mobile_nav") {
    return (
      <NavbarLogo
        alt={alt}
        priority={priority}
        link={link}
        variant="sheet"
        className={className}
      />
    )
  }

  const { assetFor, styleFor, isPending } = useBranding()
  const style = styleFor(placementKey)
  const fallback = BRANDING_FALLBACK.placements[placementKey] ?? BRANDING_FALLBACK.placements.footer
  const ready = !isPending
  const src = ready ? resolveImageUrl(assetFor(placementKey, variant)) : ""

  const isSquare = placementKey === "sidebar"

  const wrapperStyle = isSquare
    ? {
        width: style.width,
        height: style.height,
        maxHeight: style.maxHeight,
        flexShrink: 0,
      }
    : {
        ["--logo-w"]: style.width || fallback?.width,
        ["--logo-w-lg"]:
          style.widthDesktop ||
          style.width ||
          fallback?.widthDesktop ||
          fallback?.width,
        ["--logo-max-h"]: style.maxHeight || fallback?.maxHeight,
        maxHeight: style.maxHeight,
        padding: style.padding || undefined,
        flexShrink: 0,
      }

  const wrapperClass = cn(
    "inline-flex shrink-0 items-center",
    !isSquare && "w-[var(--logo-w)] max-w-full",
    isSquare && "w-auto",
  )

  const imgStyle = isSquare
    ? {
        width: style.width,
        height: style.height,
        maxHeight: style.maxHeight,
        objectFit: style.objectFit || "contain",
        padding: style.padding || undefined,
      }
    : {
        width: "100%",
        height: "auto",
        maxHeight: "var(--logo-max-h)",
        objectFit: style.objectFit || "contain",
        display: "block",
      }

  const inner = ready ? (
    <img
      src={src}
      alt={alt}
      className={cn("block w-full max-w-full shrink-0", className)}
      style={imgStyle}
      decoding="async"
      fetchPriority={priority ? "high" : undefined}
    />
  ) : (
    <span
      className={cn("block w-full", className)}
      style={{ maxHeight: "var(--logo-max-h)", minHeight: "var(--logo-max-h)" }}
      aria-hidden
    />
  )

  const content = (
    <span className={wrapperClass} style={wrapperStyle}>
      {inner}
    </span>
  )

  if (link) {
    return (
      <Link
        to="/"
        className="inline-flex shrink-0 items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {content}
      </Link>
    )
  }

  return content
}
