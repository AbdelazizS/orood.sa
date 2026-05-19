import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

const LOGO_SRC = "/logo.png"

/** Full-screen splash: main wordmark + spinner (static logo, not from admin branding). */
export function Preloader({ onComplete, minDuration = 1400 }) {
  const { t } = useTranslation()
  const [phase, setPhase] = useState("visible")
  const [done, setDone] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setPhase("slide-out"), minDuration * 0.6)
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
      <div
        className={cn(
          "flex flex-col items-center gap-8 px-6 transition-all duration-700 ease-out",
          phase === "slide-out" && "-translate-y-4 opacity-0",
        )}
      >
        <img
          src={LOGO_SRC}
          alt={t("common.brandName")}
          className="block h-auto w-[min(260px,82vw)] max-h-28 shrink-0 object-contain sm:max-h-32"
          decoding="async"
          fetchPriority="high"
        />
        <div
          className="size-10 rounded-full border-2 border-primary border-t-transparent animate-spin sm:size-11"
          role="status"
          aria-label={t("common.loading", "Loading")}
        />
      </div>
    </div>
  )
}
