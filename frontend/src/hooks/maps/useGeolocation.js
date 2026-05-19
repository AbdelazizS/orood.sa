import { useCallback, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

/**
 * Browser geolocation with a single-flight guard (same semantics as OSM picker).
 */
export function useGeolocationPick(onPick) {
  const { t } = useTranslation()
  const busyRef = useRef(false)
  const [error, setError] = useState(null)

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError(t("purchase.mapGeolocationUnsupported", "المتصفح لا يدعم تحديد الموقع"))
      return
    }
    if (busyRef.current) return
    busyRef.current = true
    setError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        busyRef.current = false
        onPick(pos.coords.latitude, pos.coords.longitude)
      },
      () => {
        busyRef.current = false
        setError(t("purchase.mapGeolocationDenied", "تعذّر الحصول على موقعك. اختر الموقع على الخريطة."))
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 }
    )
  }, [onPick, t])

  return { requestLocation, error, clearError: () => setError(null) }
}
