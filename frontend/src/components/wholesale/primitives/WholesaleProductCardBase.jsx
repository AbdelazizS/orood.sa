import { motion as Motion, useReducedMotion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

/** Shared card shell for wholesale product tiles (market, company grid, builder preview). */
export function WholesaleProductCardBase({ children, dir = "rtl", isCompact = false, className }) {
  const reduceMotion = useReducedMotion()

  const card = (
    <Card
      dir={dir}
      className={cn(
        "group flex h-full min-w-0 flex-col gap-0 overflow-hidden rounded-[28px] border border-black/5 bg-background py-0 shadow-[0_1px_2px_rgba(0,0,0,0.02),0_12px_32px_rgba(0,0,0,0.04)] transition-all duration-300",
        !reduceMotion &&
          !isCompact &&
          "hover:-translate-y-1 hover:shadow-[0_6px_24px_rgba(0,0,0,0.06),0_24px_48px_rgba(0,0,0,0.08)]",
        isCompact && !reduceMotion && "transition-shadow hover:shadow-md hover:ring-1 hover:ring-border/80",
        className
      )}
    >
      {children}
    </Card>
  )

  if (reduceMotion) {
    return <div className="h-full min-w-0">{card}</div>
  }

  return (
    <Motion.div
      className="h-full min-w-0"
      initial={false}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
    >
      {card}
    </Motion.div>
  )
}
