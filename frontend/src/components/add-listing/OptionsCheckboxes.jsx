import { useTranslation } from "react-i18next"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { useAppDirection } from "@/providers/DirectionProvider"
import { Button } from "@/components/ui/button"

const ITEMS = [
  "freeShipping",
  "freeReturn",
  "viewAtClient",
  "contactPhone",
  "contactMessages",
]

export function OptionsCheckboxes({
  freeShipping,
  freeReturn,
  allowViewLocation,
  contactMessages,
  contactPhone,
  contactPhoneNumber,
  termsAccepted,
  legalExpanded = false,
  fieldErrors = {},
  onChange,
}) {
  const { t } = useTranslation()
  const { direction } = useAppDirection()
  const [expandedInternal, setExpandedInternal] = useState(Boolean(legalExpanded))

  const values = {
    freeShipping,
    freeReturn,
    viewAtClient: allowViewLocation,
    contactPhone,
    contactMessages,
  }

  const handlers = {
    freeShipping: (v) => onChange({ freeShipping: !!v }),
    freeReturn: (v) => onChange({ freeReturn: !!v }),
    viewAtClient: (v) => onChange({ allowViewLocation: !!v }),
    contactPhone: (v) => onChange({ contactPhone: !!v }),
    contactMessages: (v) => onChange({ contactMessages: !!v }),
  }

  return (
    <div
      className="rounded-lg border border-border bg-card p-3 sm:p-4 mb-2"
      dir={direction}
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
          <span className="text-[14px] text-foreground">{t(`addListing.${key}`)}</span>
        </label>
      ))}

      {contactPhone ? (
        <div className="pt-3">
          <label className="mb-1 block text-sm text-foreground">{t("addListing.contactPhoneNumberLabel")}</label>
          <input
            type="tel"
            value={contactPhoneNumber ?? ""}
            onChange={(e) => onChange({ contactPhoneNumber: e.target.value })}
            placeholder={t("addListing.contactPhoneNumberPlaceholder")}
            className={cn(
              "h-10 w-full rounded-md border border-input bg-background px-3 text-sm",
              fieldErrors.contactPhoneNumber && "border-destructive"
            )}
          />
          {fieldErrors.contactPhoneNumber ? (
            <p className="mt-1 text-xs text-destructive">{fieldErrors.contactPhoneNumber}</p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3">
        <div>
          <p className="mb-2 text-sm font-semibold text-foreground">{t("addListing.platformRoleTitle")}</p>
          <ol className="list-decimal space-y-1 ps-4 text-xs text-muted-foreground">
            <li>{t("addListing.platformRole1")}</li>
            <li>{t("addListing.platformRole2")}</li>
            <li>{t("addListing.platformRole3")}</li>
            <li>{t("addListing.platformRole4")}</li>
          </ol>
          <div className="mt-3">
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-sm"
              onClick={() => {
                const next = !expandedInternal
                setExpandedInternal(next)
                if (next) onChange({ legalExpanded: true })
              }}
            >
              {expandedInternal
                ? t("addListing.hideWarranties", "إخفاء التعهدات")
                : t("addListing.showWarranties", "عرض التعهدات الخاصة بي")}
            </Button>
          </div>
        </div>
        {expandedInternal ? (
          <div className="mt-4 border-t border-border/60 pt-4">
          <div>
            <p className="mb-2 text-sm font-semibold text-foreground">{t("addListing.userOathTitle")}</p>
            <ol className="list-decimal space-y-1 ps-4 text-xs text-muted-foreground">
              <li>{t("addListing.userOath1")}</li>
              <li>{t("addListing.userOath2")}</li>
              <li>{t("addListing.userOath3")}</li>
              <li>{t("addListing.userOath4")}</li>
            </ol>
          </div>
          </div>
        ) : null}
        <label className="mt-4 flex cursor-pointer items-start gap-3">
          <Checkbox
            checked={termsAccepted}
            onCheckedChange={(v) => onChange({ termsAccepted: !!v })}
            className={cn("mt-0.5 size-[18px] rounded-[3px]", fieldErrors.termsAccepted && "border-destructive")}
          />
          <span className="text-sm text-foreground">{t("addListing.oathAgree")}</span>
        </label>
      </div>
    </div>
  )
}
