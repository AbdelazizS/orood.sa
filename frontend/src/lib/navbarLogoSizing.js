/**
 * Navbar logo only — simple height-driven sizing (Tailwind).
 * Footer and other placements stay on AppLogo + admin branding.
 */

export const NAVBAR_LOGO_INTRINSIC = { width: 320, height: 80 }

export const NAVBAR_HEADER_ROW_CLASS =
  "mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 sm:gap-4 sm:px-6 min-h-[4.5rem] sm:min-h-20"

export const NAVBAR_LOGO_LINK_CLASS =
  "inline-flex shrink-0 items-center rounded-lg py-1 transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

/** Big visible logo — tune down later if needed */
export const NAVBAR_LOGO_IMAGE_CLASS =
  "block h-14 w-auto shrink-0 object-contain object-left sm:h-16 md:h-[4.5rem] lg:h-24"

export const NAVBAR_LOGO_SHEET_IMAGE_CLASS =
  "block h-12 w-auto shrink-0 object-contain object-start sm:h-14"

export const NAVBAR_LOGO_VARIANTS = {
  default: NAVBAR_LOGO_IMAGE_CLASS,
  sheet: NAVBAR_LOGO_SHEET_IMAGE_CLASS,
}
