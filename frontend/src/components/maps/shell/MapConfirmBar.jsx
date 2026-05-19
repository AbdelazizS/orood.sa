import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"

export function MapConfirmBar({ onConfirm, disabled = false, label, className = "" }) {
  const { t } = useTranslation()
  const text = label ?? t("maps.confirmLocation", "Confirm location")

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur-md sm:static",
        "max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:z-50 max-sm:border-t max-sm:shadow-lg",
        className
      )}
    >
      <p className="text-xs text-muted-foreground sm:text-sm">{t("maps.confirmHint", "Drag the pin or tap the map")}</p>
      <Button type="button" size="sm" disabled={disabled} onClick={onConfirm}>
        {text}
      </Button>
    </div>
  )
}
