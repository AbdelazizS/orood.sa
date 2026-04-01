import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useAppDirection } from "@/providers/DirectionProvider"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { MapPin } from "lucide-react"

/**
 * View at Location Modal — date/hour/minute steppers.
 * Vertical steppers. Map placeholder. Submit button.
 */
export function ViewAtLocationModal({ open, onOpenChange }) {
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const [day, setDay] = useState(1)
  const [hour, setHour] = useState(12)
  const [minute, setMinute] = useState(0)

  const handleSubmit = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={direction} className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-start">
            {t("purchase.viewAtLocation", "أرغب بمشاهدة المنتج في موقعي")}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <Label className="text-xs text-muted-foreground">
              {t("listingDetail.date", "اليوم")} ( )
            </Label>
            <div className="mt-1 flex flex-col items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                onClick={() => setDay((d) => d + 1)}
              >
                +
              </Button>
              <span className="w-8 text-center text-sm font-semibold">{day}</span>
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                onClick={() => setDay((d) => Math.max(1, d - 1))}
              >
                −
              </Button>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">
              {t("listingDetail.hour", "الساعة")}
            </Label>
            <div className="mt-1 flex flex-col items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                onClick={() => setHour((h) => Math.min(23, h + 1))}
              >
                +
              </Button>
              <span className="w-8 text-center text-sm font-semibold">{hour}</span>
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                onClick={() => setHour((h) => Math.max(0, h - 1))}
              >
                −
              </Button>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">
              {t("listingDetail.minute", "الدقيقة")}
            </Label>
            <div className="mt-1 flex flex-col items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                onClick={() => setMinute((m) => Math.min(59, m + 1))}
              >
                +
              </Button>
              <span className="w-8 text-center text-sm font-semibold">{minute}</span>
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                onClick={() => setMinute((m) => Math.max(0, m - 1))}
              >
                −
              </Button>
            </div>
          </div>
        </div>
        <div className="flex h-48 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
          <MapPin className="size-8 text-muted-foreground" />
        </div>
        <Button className="w-full" onClick={handleSubmit}>
          {t("purchase.buyNow", "اشتر الآن")}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
