import { cn } from "@/lib/utils"

/** Max-width 1440px + responsive horizontal padding for wholesale surfaces. */
export function WholesalePageContainer({ children, className, as: Comp = "div", ...rest }) {
  return (
    <Comp className={cn("wholesale-page-container", className)} {...rest}>
      {children}
    </Comp>
  )
}
