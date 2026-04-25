import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAppDirection } from "@/providers/DirectionProvider"
import { cn } from "@/lib/utils"

const MINUTE_STEP = 5

function pad2(n) {
  return String(n).padStart(2, "0")
}

function parseHHmm(value) {
  if (!value || typeof value !== "string") return { hour: 12, minute: 0 }
  const [a, b] = value.split(":")
  const hour = Number.parseInt(a, 10)
  const minute = Number.parseInt(b ?? "0", 10)
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return { hour: 12, minute: 0 }
  if (!Number.isFinite(minute) || minute < 0 || minute > 59) return { hour, minute: 0 }
  const snapped = Math.round(minute / MINUTE_STEP) * MINUTE_STEP
  const m = snapped >= 60 ? 55 : snapped
  return { hour, minute: m }
}

function toHHmm(hour, minute) {
  return `${pad2(hour)}:${pad2(minute)}`
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = Array.from({ length: 60 / MINUTE_STEP }, (_, i) => i * MINUTE_STEP)

/**
 * Shadcn-style schedule time: Popover trigger + hour/minute Selects (24h, 5-minute steps).
 */
export function ScheduleTimePicker({ value, onChange, disabled, className, id }) {
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const [open, setOpen] = useState(false)
  const parsed = useMemo(() => parseHHmm(value), [value])
  const [hour, setHour] = useState(parsed.hour)
  const [minute, setMinute] = useState(parsed.minute)

  useEffect(() => {
    const p = parseHHmm(value)
    setHour(p.hour)
    setMinute(p.minute)
  }, [value])

  const label = toHHmm(hour, minute)

  const commit = (nextH, nextM) => {
    onChange(toHHmm(nextH, nextM))
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label={t("purchase.chooseTime")}
          className={cn("w-full justify-start font-normal sm:w-[8.5rem]", className)}
        >
          <Clock className="me-2 size-4 shrink-0 opacity-60" />
          <span className="tabular-nums">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent dir={direction} className="w-auto min-w-[240px] p-3" align="start">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("purchase.scheduleHour", "Hour")}</Label>
            <Select
              value={String(hour)}
              onValueChange={(v) => {
                const h = Number.parseInt(v, 10)
                setHour(h)
                commit(h, minute)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-60">
                {HOURS.map((h) => (
                  <SelectItem key={h} value={String(h)}>
                    {pad2(h)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("purchase.scheduleMinute", "Minute")}</Label>
            <Select
              value={String(minute)}
              onValueChange={(v) => {
                const m = Number.parseInt(v, 10)
                setMinute(m)
                commit(hour, m)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-60">
                {MINUTES.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {pad2(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
