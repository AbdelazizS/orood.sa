import { Check, Package, Search } from "lucide-react"
import { cn } from "@/lib/utils"

export default function AddListingTypeSelector({ form }) {
  const type = form.watch("type")

  const options = [
    {
      value: "OFFER",
      label: "عرض",
      description: "بيع منتج أو خدمة",
      icon: Package,
    },
    {
      value: "REQUEST",
      label: "طلب",
      description: "اطلب ما تحتاجه",
      icon: Search,
    },
  ]

  const selectedLabel = type === "OFFER" ? "عرض" : "طلب"

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <p className="text-xs text-muted-foreground text-right mb-3">
        للأفراد والبائعين — وليس للشركات الكبرى
      </p>
      <div className="flex items-center justify-end gap-2 mb-3">
        <span className="text-sm font-semibold text-primary bg-primary/15 border border-primary/30 px-4 py-1.5 rounded-full">
          ✓ تم الاختيار: {selectedLabel}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {options.map((opt) => {
          const Icon = opt.icon
          const isSelected = type === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={isSelected}
              aria-label={`${opt.label} - ${opt.description}`}
              className={cn(
                "w-full text-right appearance-none",
                "cursor-pointer transition-all duration-200 rounded-2xl border-2",
                "hover:border-primary/50 hover:shadow-md",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                "p-6 flex flex-col gap-3",
                isSelected
                  ? "border-primary bg-primary/10 shadow-lg ring-2 ring-primary/30"
                  : "border-border bg-card"
              )}
              onClick={() => form.setValue("type", opt.value, { shouldValidate: true })}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl",
                      isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base text-foreground">{opt.label}</h3>
                    <p className="text-sm text-muted-foreground">{opt.description}</p>
                  </div>
                </div>
                {isSelected && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white ring-2 ring-primary/50">
                    <Check size={16} strokeWidth={3} />
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
