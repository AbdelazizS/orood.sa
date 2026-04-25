import { Fragment } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { cn } from "@/lib/utils"

/**
 * @typedef {{ to?: string; label: import("react").ReactNode; current?: boolean }} BreadcrumbItemDef
 */

/**
 * Accessible breadcrumbs with React Router links; last segment highlighted when `current` or missing `to`.
 * @param {{ items: BreadcrumbItemDef[]; className?: string; "aria-label"?: string }} props
 */
export function Breadcrumbs({ items, className, "aria-label": ariaLabel }) {
  const { t } = useTranslation()

  if (!items?.length) return null

  return (
    <Breadcrumb aria-label={ariaLabel ?? t("breadcrumb.ariaLabel")}>
      <BreadcrumbList
        className={cn(
          "min-w-0 flex-wrap gap-x-1 gap-y-0.5 text-xs sm:text-sm sm:gap-x-2",
          className
        )}
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          const isCurrent = item.current === true || (!item.to && isLast)
          const key = typeof item.label === "string" ? `${index}-${item.label}` : index

          return (
            <Fragment key={key}>
              {index > 0 ? <BreadcrumbSeparator /> : null}
              <BreadcrumbItem className="max-w-[min(100%,14rem)] sm:max-w-[20rem]">
                {isCurrent || !item.to ? (
                  <BreadcrumbPage className="truncate font-semibold text-primary">{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={item.to} className="truncate">
                      {item.label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
