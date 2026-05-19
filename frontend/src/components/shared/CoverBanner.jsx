import { useState } from "react"
import { cn } from "@/lib/utils"
import { resolveImageUrl } from "@/lib/imageUrl"

const GRADIENT_EMPTY =
  "bg-gradient-to-br from-primary/10 via-background to-primary/5 dark:from-primary/15 dark:via-background dark:to-primary/5"

/**
 * Short profile/company cover strip — user cover only (no product fallback).
 */
export function CoverBanner({
  coverUrl,
  className,
  rounded = "none",
  showBottomScrim = true,
  showTopScrim = false,
  alt = "",
  onCoverClick,
  children,
}) {
  const [broken, setBroken] = useState(false)
  const resolved = coverUrl ? resolveImageUrl(coverUrl) : ""
  const showImage = Boolean(resolved && !broken)

  const roundedClass =
    rounded === "top"
      ? "rounded-t-xl"
      : rounded === "card"
        ? "rounded-t-[28px]"
        : ""

  const content = showImage ? (
    onCoverClick ? (
      <button
        type="button"
        onClick={onCoverClick}
        className="group relative z-0 block h-full w-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={alt}
      >
        <img
          src={resolved}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover object-center"
          loading="lazy"
          onError={() => setBroken(true)}
        />
      </button>
    ) : (
      <img
        src={resolved}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover object-center"
        loading="lazy"
        onError={() => setBroken(true)}
      />
    )
  ) : (
    <div className={cn("absolute inset-0", GRADIENT_EMPTY)} aria-hidden />
  )

  return (
    <div
      className={cn(
        "relative h-32 w-full overflow-hidden sm:h-36",
        roundedClass,
        className
      )}
    >
      {content}
      {showTopScrim ? (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-black/15 to-transparent"
          aria-hidden
        />
      ) : null}
      {showBottomScrim ? (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background/90 via-background/30 to-transparent"
          aria-hidden
        />
      ) : null}
      {children}
    </div>
  )
}
