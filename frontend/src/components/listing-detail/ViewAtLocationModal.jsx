import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { addMinutes, format, isBefore, startOfDay } from "date-fns"
import { ar, enUS } from "date-fns/locale"
import { useAppDirection } from "@/providers/DirectionProvider"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ScheduleTimePicker } from "@/components/ui/schedule-time-picker.jsx"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { LocationMapPicker } from "@/components/maps/LocationMapPicker"
import { useAuthStore } from "@/store/useAuthStore"
import apiClient from "@/lib/apiClient"
import { toast } from "sonner"
import { CalendarIcon, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { MAP_PICKER_EDIT_PROPS, MAP_PICKER_SHELL_CLASS } from "@/lib/maps/mapPickerUi"

function combineDateAndTime(date, timeHHmm) {
  if (!date || !timeHHmm || typeof timeHHmm !== "string") return null
  const parts = timeHHmm.split(":")
  const h = Number.parseInt(parts[0], 10)
  const m = Number.parseInt(parts[1] ?? "0", 10)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  const out = new Date(date)
  out.setHours(h, m, 0, 0)
  return out
}

function ViewAtLocationForm({ productId, onOpenChange }) {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const { token } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [scheduleDate, setScheduleDate] = useState(undefined)
  const [scheduleTime, setScheduleTime] = useState("12:00")
  const [calOpen, setCalOpen] = useState(false)
  const [pin, setPin] = useState(null)
  const [locationAddress, setLocationAddress] = useState("")
  const [locationPlaceId, setLocationPlaceId] = useState(null)
  const [mapError, setMapError] = useState(null)

  const locale = i18n.language === "ar" ? ar : enUS

  const submitMutation = useMutation({
    mutationFn: async (payload) => apiClient.post(`/products/${productId}/view-request`, payload),
    onSuccess: async () => {
      toast.success(t("purchase.viewRequestSent", "تم إرسال طلب المعاينة"))
      onOpenChange(false)
      await queryClient.invalidateQueries({ queryKey: ["account", "view-requests"] })
      if (productId) {
        await queryClient.invalidateQueries({ queryKey: ["product", String(productId), "view-requests"] })
        await queryClient.invalidateQueries({ queryKey: ["product", String(productId)] })
      }
    },
    onError: (error) => {
      const status = error?.response?.status
      if (status === 422) {
        toast.error(t("purchase.errorValidation", "تعذّر إتمام الشراء. تحقق من الرصيد والبيانات."))
        return
      }
      const serverMessage = error?.response?.data?.message
      toast.error(serverMessage ?? t("common.errorGeneric", "حدث خطأ غير متوقع"))
    },
  })

  const handleSubmit = () => {
    if (!token) {
      navigate("/login", { state: { redirectTo: location.pathname } })
      return
    }
    if (!scheduleDate || !productId) {
      toast.error(t("purchase.pickDate"))
      return
    }
    const combined = combineDateAndTime(scheduleDate, scheduleTime)
    if (!combined || isBefore(combined, addMinutes(new Date(), 5))) {
      toast.error(t("purchase.schedulingTooSoon"))
      return
    }
    if (!pin || pin.lat == null || pin.lng == null || !Number.isFinite(pin.lat) || !Number.isFinite(pin.lng)) {
      setMapError(t("purchase.mapPinRequired", "حدّد موقع المعاينة على الخريطة"))
      toast.error(t("purchase.mapPinRequired", "حدّد موقع المعاينة على الخريطة"))
      return
    }
    setMapError(null)

    submitMutation.mutate({
      scheduled_date: combined.toISOString(),
      location_lat: pin.lat,
      location_lng: pin.lng,
      location_address: locationAddress.trim() || null,
      location_place_id: locationPlaceId || null,
    })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-start">
          {t("purchase.viewAtLocation", "أرغب بمشاهدة المنتج في موقعي")}
        </DialogTitle>
      </DialogHeader>
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">{t("purchase.preferredDateTime")}</Label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Popover open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn("w-full justify-start text-start font-normal sm:flex-1", !scheduleDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="me-2 size-4 shrink-0 opacity-60" />
                  {scheduleDate ? format(scheduleDate, "PPP", { locale }) : t("purchase.pickDate")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={scheduleDate}
                  onSelect={(d) => {
                    setScheduleDate(d)
                    if (d) setCalOpen(false)
                  }}
                  disabled={(d) => isBefore(startOfDay(d), startOfDay(new Date()))}
                />
              </PopoverContent>
            </Popover>
            <ScheduleTimePicker
              id="view-req-time"
              value={scheduleTime}
              onChange={setScheduleTime}
              className="sm:flex-initial"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            {t("purchase.mapSelectLabel", "موقع المعاينة على الخريطة")}
          </Label>
          <LocationMapPicker
            {...MAP_PICKER_EDIT_PROPS}
            key={`${productId}-map`}
            language={i18n.language}
            lat={pin?.lat}
            lng={pin?.lng}
            searchValue={locationAddress}
            searchPlaceholder={t(
              "addListing.propertyLocationSearchPlaceholder",
              "ابحث عن حي، شارع، أو معلم…"
            )}
            className={MAP_PICKER_SHELL_CLASS}
            onChange={({ lat, lng }) => {
              setPin({ lat, lng })
              setLocationPlaceId(null)
              setMapError(null)
            }}
            onPlaceResolved={(addr, _la, _ln, meta) => {
              setLocationAddress(addr ?? "")
              setLocationPlaceId(meta?.placeId ?? null)
              setMapError(null)
            }}
            onReverseGeocode={(addr) => {
              setLocationAddress(addr ?? "")
            }}
          />
          {locationAddress ? (
            <p className="flex items-start gap-1.5 rounded-lg bg-muted/40 px-3 py-2 text-xs text-foreground">
              <MapPin className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
              <span>{locationAddress}</span>
            </p>
          ) : null}
          {mapError ? <p className="text-xs text-destructive">{mapError}</p> : null}
        </div>
      </div>
      <Button className="w-full" onClick={handleSubmit} disabled={!scheduleDate || !pin || submitMutation.isPending}>
        {submitMutation.isPending ? t("common.loading", "جار التحميل...") : t("purchase.submitViewRequest", "إرسال طلب المعاينة")}
      </Button>
    </>
  )
}

/**
 * View-at-location request with preferred date/time, map pin, and optional address.
 */
export function ViewAtLocationModal({ open, onOpenChange, productId }) {
  const { direction } = useAppDirection()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={direction} className="max-w-md max-h-[90vh] overflow-y-auto">
        {open && productId ? <ViewAtLocationForm productId={productId} onOpenChange={onOpenChange} /> : null}
      </DialogContent>
    </Dialog>
  )
}
