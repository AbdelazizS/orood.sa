import { Link } from "react-router-dom"
import { useBranding } from "@/hooks/useBranding"
import { resolveImageUrl } from "@/lib/imageUrl"
import {
  NAVBAR_LOGO_INTRINSIC,
  NAVBAR_LOGO_VARIANTS,
} from "@/lib/navbarLogoSizing"
import { cn } from "@/lib/utils"

/**
 * Navbar / mobile menu logo — ignores admin width caps; uses simple Tailwind heights.
 *
 * @param {{
 *   alt: string,
 *   variant?: 'default' | 'sheet',
 *   priority?: boolean,
 *   link?: boolean,
 *   className?: string,
 * }} props
 */
export function NavbarLogo({
  alt,
  variant = "default",
  priority = false,
  link = false,
  className,
}) {
  const { assetFor, isPending } = useBranding()
  const ready = !isPending
  const src = ready ? resolveImageUrl(assetFor("navbar")) : ""

  const imageClass = cn(
    NAVBAR_LOGO_VARIANTS[variant] ?? NAVBAR_LOGO_VARIANTS.default,
    className,
  )

  const inner = ready ? (
    <img
      src={src}
      alt={alt}
      width={NAVBAR_LOGO_INTRINSIC.width}
      height={NAVBAR_LOGO_INTRINSIC.height}
      className={imageClass}
      decoding="async"
      fetchPriority={priority ? "high" : undefined}
    />
  ) : (
    <span
      className={cn(imageClass, "bg-muted/30")}
      style={{ aspectRatio: `${NAVBAR_LOGO_INTRINSIC.width} / ${NAVBAR_LOGO_INTRINSIC.height}` }}
      aria-hidden
    />
  )

  const content = <span className="inline-flex shrink-0 items-center">{inner}</span>

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
