import { cn } from "@/lib/utils"

/**
 * Unified max-width + horizontal rhythm for wholesale surfaces (directory, company, PDP).
 * Spacing rhythm: page vertical sections use py-6 md:py-8; card gaps follow gap-4 sm:gap-5 lg:gap-6 on grids.
 */
export function WholesalePageShell({ children, className, as: Comp = "div", ...rest }) {
  return (
    <Comp
      className={cn(
        "mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8",
        "[font-feature-settings:'kern'_1,'liga'_1]",
        className
      )}
      {...rest}
    >
      {children}
    </Comp>
  )
}
