import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

const STEPS = [
  { id: "type", key: "addProduct.stepType" },
  { id: "category", key: "addProduct.stepCategory" },
  { id: "location", key: "addProduct.stepLocation" },
  { id: "details", key: "addProduct.stepDetails" },
  { id: "options", key: "addProduct.stepOptions" },
  { id: "contact", key: "addProduct.stepContact" },
  { id: "submit", key: "addProduct.stepSubmit" },
]

export function AddProductStepper({ currentStep, onStepClick }) {
  const { t } = useTranslation()
  const stepIndex = STEPS.findIndex((s) => s.id === currentStep)

  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex flex-wrap items-center gap-2">
        {STEPS.map((step, i) => {
          const isComplete = i < stepIndex
          const isCurrent = i === stepIndex
          const isClickable = onStepClick && i <= stepIndex

          return (
            <li key={step.id} className="flex items-center">
              <button
                type="button"
                onClick={() => isClickable && onStepClick(step.id)}
                disabled={!isClickable}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isCurrent && "bg-primary text-primary-foreground",
                  isComplete && "bg-primary/10 text-primary",
                  isClickable && !isCurrent && !isComplete && "hover:bg-muted",
                  !isClickable && "cursor-default opacity-60",
                )}
                aria-current={isCurrent ? "step" : undefined}
              >
                {isComplete ? (
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3" />
                  </span>
                ) : (
                  <span
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full text-xs font-bold",
                      isCurrent ? "bg-primary-foreground/20" : "bg-muted",
                    )}
                  >
                    {i + 1}
                  </span>
                )}
                <span className="hidden sm:inline">{t(step.key, step.id)}</span>
              </button>
              {i < STEPS.length - 1 && (
                <span className="mx-1 text-muted-foreground rtl:rotate-180 inline-block" aria-hidden>
                  ›
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
