import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { useAppDirection } from "@/providers/DirectionProvider"
import { LEGAL_ACK_ITEM_KEYS } from "@/lib/legal/legalAcknowledgmentItems"

/**
 * Register (and similar) — each legal line is its own checkbox, same card style as add-listing options.
 */
export function LegalAcknowledgmentCheckboxes({
  translationPrefix = "auth",
  checkedByKey,
  onToggle,
  error,
  className,
}) {
  const { t } = useTranslation()
  const { direction } = useAppDirection()

  return (
    <div className={cn("space-y-2", className)} dir={direction}>
      <div className="rounded-lg border border-border bg-card p-3 sm:p-4">
        <p className="mb-2 text-sm font-semibold text-foreground">
          {t(`${translationPrefix}.platformRoleTitle`)}
        </p>
        {LEGAL_ACK_ITEM_KEYS.map((key, i) => (
          <label
            key={key}
            className={cn(
              "flex cursor-pointer items-start gap-3 py-3 min-h-[44px]",
              i < LEGAL_ACK_ITEM_KEYS.length - 1 && "border-b border-border/50",
            )}
          >
            <Checkbox
              checked={Boolean(checkedByKey?.[key])}
              onCheckedChange={(v) => onToggle?.(key, !!v)}
              className="mt-0.5 size-[18px] shrink-0 rounded-[3px]"
            />
            <span className="text-[14px] leading-relaxed text-foreground">
              {t(`${translationPrefix}.${key}`)}
            </span>
          </label>
        ))}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
