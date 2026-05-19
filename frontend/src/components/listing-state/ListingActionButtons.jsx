import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Renders API-driven listing actions (links or hide/cancel mutation).
 */
export function ListingActionButtons({ actions = [], className, size = "sm", onHideListing }) {
  const { t } = useTranslation()

  if (!actions?.length) return null

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {actions.map((action, idx) => {
        const label =
          action.label ||
          (action.i18n_label_key ? t(action.i18n_label_key, action.i18n_label_key) : "")
        if (!label) return null

        const intent = action.intent ?? action.action
        const variant =
          action.variant === "primary"
            ? "default"
            : action.variant === "outline"
              ? "outline"
              : "secondary"

        if (intent === "hide_listing" && onHideListing) {
          return (
            <Button
              key={`hide-${idx}`}
              type="button"
              variant={variant}
              size={size}
              onClick={() => onHideListing()}
            >
              {label}
            </Button>
          )
        }

        if (!action.href || action.href === "#") return null

        const href = action.href.startsWith("/") ? action.href : `/${action.href}`

        return (
          <Button key={`${intent ?? idx}-${href}`} variant={variant} size={size} asChild>
            <Link to={href}>{label}</Link>
          </Button>
        )
      })}
    </div>
  )
}
