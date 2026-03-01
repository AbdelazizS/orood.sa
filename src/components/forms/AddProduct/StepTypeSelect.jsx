import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Package, Search } from "lucide-react"

export function StepTypeSelect({ value, onChange }) {
  const { t } = useTranslation()

  const options = [
    {
      id: "offer",
      label: t("feed.offer"),
      labelAr: "عرض",
      icon: Package,
      description: t("addProduct.typeOfferDesc", "I'm selling or offering something"),
    },
    {
      id: "request",
      label: t("feed.request"),
      labelAr: "طلب",
      icon: Search,
      description: t("addProduct.typeRequestDesc", "I'm looking to buy or receive something"),
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {options.map((opt) => {
        const Icon = opt.icon
        const isSelected = value === opt.id

        return (
          <Card
            key={opt.id}
            role="button"
            tabIndex={0}
            onClick={() => onChange(opt.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onChange(opt.id)
              }
            }}
            className={cn(
              "cursor-pointer transition-all duration-200",
              "hover:border-primary/50 hover:shadow-md",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isSelected && "border-2 border-primary bg-primary/5 shadow-md ring-2 ring-primary/20",
            )}
            aria-pressed={isSelected}
            aria-label={`${opt.label} - ${opt.description}`}
          >
            <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
              <div
                className={cn(
                  "flex size-14 items-center justify-center rounded-full transition-colors",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="size-7" />
              </div>
              <div>
                <p className="font-semibold text-lg">{opt.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{opt.description}</p>
              </div>
              {isSelected && (
                <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                  {t("addProduct.selected", "Selected")}
                </span>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
