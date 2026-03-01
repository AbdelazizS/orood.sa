import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

/**
 * Enterprise preloader: smooth sliding title animation.
 * Used on initial app load for a polished, big-company feel.
 */
export function Preloader({ onComplete, minDuration = 1200 }) {
  const { t } = useTranslation()
  const [phase, setPhase] = useState("visible")
  const [done, setDone] = useState(false)

  useEffect(() => {
    const start = Date.now()
    const timer = setTimeout(() => {
      setPhase("slide-out")
    }, minDuration * 0.6)

    const doneTimer = setTimeout(() => {
      setDone(true)
      onComplete?.()
    }, minDuration)

    return () => {
      clearTimeout(timer)
      clearTimeout(doneTimer)
    }
  }, [minDuration, onComplete])

  if (done) return null

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-opacity duration-500",
        phase === "slide-out" && "opacity-0",
      )}
    >
      <div className="flex flex-col items-center gap-6">
        {/* Logo mark */}
        <div
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-2xl font-bold shadow-lg transition-all duration-700",
            phase === "slide-out" && "scale-90 opacity-0 -translate-y-4",
          )}
        >
          {t("common.brandName").charAt(0)}
        </div>
        {/* Title — smooth slide up */}
        <div
          className={cn(
            "flex flex-col items-center gap-1 transition-all duration-700 ease-out",
            phase === "slide-out" && "opacity-0 -translate-y-6",
          )}
        >
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("common.brandName")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("auth.tagline")}
          </p>
        </div>
        {/* Spinner */}
        <div
          className={cn(
            "size-8 rounded-full border-2 border-primary border-t-transparent animate-spin transition-opacity duration-500",
            phase === "slide-out" && "opacity-0",
          )}
        />
      </div>
    </div>
  )
}
