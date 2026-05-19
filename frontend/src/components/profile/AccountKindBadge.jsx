import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Building2, ShoppingBag, UserRound } from "lucide-react"
import { cn } from "@/lib/utils"
import { getAccountKindLabel, resolveAccountKind } from "@/lib/accountKind"

const KIND_STYLES = {
  company: {
    icon: Building2,
    className: "border-violet-500/35 bg-violet-500/10 text-violet-900 dark:text-violet-100",
  },
  individual_seller: {
    icon: ShoppingBag,
    className: "border-sky-500/35 bg-sky-500/10 text-sky-900 dark:text-sky-100",
  },
  individual_buyer: {
    icon: UserRound,
    className: "border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-100",
  },
}

/**
 * @param {{ user?: { account_kind?: string | null } | null; accountKind?: string | null; className?: string; size?: "sm" | "md" }} props
 */
export function AccountKindBadge({ user, accountKind, className, size = "sm" }) {
  const { t } = useTranslation()
  const kind = accountKind ?? resolveAccountKind(user)
  const label = getAccountKindLabel(kind, t)
  if (!label) return null

  const style = KIND_STYLES[kind] ?? KIND_STYLES.individual_buyer
  const Icon = style.icon
  const compact = size === "sm"

  return (
    <Badge
      variant="outline"
      className={cn(
        "shrink-0 gap-1 font-medium",
        compact ? "h-5 px-1.5 py-0 text-[10px]" : "h-6 px-2 text-xs",
        style.className,
        className
      )}
    >
      <Icon className={cn("shrink-0", compact ? "size-3" : "size-3.5")} aria-hidden />
      {label}
    </Badge>
  )
}
