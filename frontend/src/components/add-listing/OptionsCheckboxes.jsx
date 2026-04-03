import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"

const ITEMS = [
  "freeShipping",
  "freeReturn",
  "viewAtClient",
  "contactPhone",
  "contactMessages",
  "termsText",
]

export function OptionsCheckboxes({
  freeShipping,
  freeReturn,
  allowViewLocation,
  contactMessages,
  contactPhone,
  termsAccepted,
  onChange,
}) {
  const { t } = useTranslation()

  const values = {
    freeShipping,
    freeReturn,
    viewAtClient: allowViewLocation,
    contactPhone,
    contactMessages,
    termsText: termsAccepted,
  }

  const handlers = {
    freeShipping: (v) => onChange({ freeShipping: !!v }),
    freeReturn: (v) => onChange({ freeReturn: !!v }),
    viewAtClient: (v) => onChange({ allowViewLocation: !!v }),
    contactPhone: (v) => onChange({ contactPhone: !!v }),
    contactMessages: (v) => onChange({ contactMessages: !!v }),
    termsText: (v) => onChange({ termsAccepted: !!v }),
  }

  return (
    <div
      className="rounded-lg border border-border bg-card p-3 sm:p-4 mb-2"
      dir="rtl"
    >
      {ITEMS.map((key, i) => (
        <label
          key={key}
          className={cn("flex cursor-pointer items-center gap-3 py-3 min-h-[44px]", i < ITEMS.length - 1 && "border-b border-border/50")}
        >
          <Checkbox
            checked={values[key]}
            onCheckedChange={handlers[key]}
            className="size-[18px] rounded-[3px]"
          />
          <span
            className={cn(key === "termsText" ? "text-[12px] text-muted-foreground" : "text-[14px] text-foreground")}
          >
            {t(`addListing.${key}`)}
          </span>
        </label>
      ))}
    </div>
  )
}
