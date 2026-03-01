import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { BadgeCheck, Shield, Building2 } from "lucide-react"
import { cn } from "@/lib/utils"

const LEVEL_CONFIG = {
  grey: { labelKey: "auth.unverified", class: "bg-muted text-muted-foreground", Icon: BadgeCheck },
  green: { labelKey: "auth.verified", class: "bg-green-600 hover:bg-green-600 text-white", Icon: BadgeCheck },
  gold: { labelKey: "verification.idVerified", class: "bg-amber-600 hover:bg-amber-600 text-white", Icon: Shield },
  blue: { labelKey: "verification.companyVerified", class: "bg-blue-600 hover:bg-blue-600 text-white", Icon: Building2 },
}

/**
 * VerificationBadge — grey (unverified), green (email), gold (ID), blue (company).
 */
export function VerificationBadge({ emailVerified, level, size = "sm", className }) {
  const { t } = useTranslation()
  const resolvedLevel = level ?? (emailVerified ? "green" : "grey")
  const config = LEVEL_CONFIG[resolvedLevel] ?? LEVEL_CONFIG.grey
  const Icon = config.Icon

  return (
    <Badge
      variant="default"
      className={cn(
        "gap-1 font-medium border-0",
        config.class,
        size === "sm" && "text-xs",
        size === "md" && "text-sm",
        className
      )}
    >
      <Icon className={cn(size === "sm" ? "size-3" : "size-4")} />
      {t(config.labelKey)}
    </Badge>
  )
}
