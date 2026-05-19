import { useTranslation } from "react-i18next"
import { Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { resolveImageUrl } from "@/lib/imageUrl"

function anonymizeName(name) {
  const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return "?"
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase() + "."
  return `${parts[0]} ${parts[1][0]}.`
}

/**
 * Horizontal momentum strip — group stats + progress + recent participants.
 */
export function WholesaleDealMomentumStrip({ product, className, dir = "rtl", participants = [] }) {
  const { t } = useTranslation()
  if (!product) return null

  const minQ = Math.max(1, Number(product.min_quantity ?? 1))
  const reserved = Number(product.reserved_seats ?? product.current_buyers ?? 0)
  const remaining = Math.max(0, Number(product.remaining_needed ?? 0))
  const progress = Math.min(100, Number(product.progress_percentage ?? 0))

  return (
    <div
      dir={dir}
      className={cn(
        "border-b border-border/60 bg-gradient-to-b from-muted/40 to-background px-4 py-4 sm:px-6 lg:px-8",
        className
      )}
    >
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="inline-flex items-center gap-2 font-medium text-foreground">
            <Users className="size-4 shrink-0 text-primary" aria-hidden />
            {t("wholesale.pdp.momentumJoined", { current: reserved, min: minQ })}
          </span>
          <span className="text-muted-foreground tabular-nums">
            {t("wholesale.pdp.momentumRemaining", { count: remaining })}
          </span>
          <span className="text-muted-foreground tabular-nums">{t("wholesale.pdp.momentumProgress", { pct: progress })}</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2 lg:max-w-md">
          <Progress value={progress} className="h-2" />
        </div>
      </div>
      {participants.length > 0 ? (
        <div className="mx-auto mt-4 flex max-w-[1440px] flex-wrap items-center gap-2 px-4 sm:px-6 lg:px-8">
          <span className="text-xs font-medium text-muted-foreground">
            {t("wholesale.pdp.participantsJoined", { count: participants.length })}
          </span>
          {participants.slice(0, 8).map((row) => {
            const avatar = row?.user?.avatar ? resolveImageUrl(row.user.avatar) : undefined
            return (
              <span
                key={row.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-2 py-1 text-xs"
              >
                <Avatar className="size-5">
                  <AvatarImage src={avatar} alt="" />
                  <AvatarFallback className="text-[10px]">
                    {anonymizeName(row?.user?.name).slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                {anonymizeName(row?.user?.name)}
              </span>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
