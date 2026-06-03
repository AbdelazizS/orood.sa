import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { useAppDirection } from "@/providers/DirectionProvider"
import { LegalAcknowledgmentList } from "@/components/legal/LegalAcknowledgmentList"
import { normalizeSaudiPhone } from "@/lib/phone/saudiPhone"
import { SaudiMobilePhoneField } from "@/components/phone/SaudiMobilePhoneField"

function OptionTile({ children, className, fullWidth = false }) {
  return (
    <div
      className={cn(
        "flex min-h-[52px] rounded-lg border border-border/60 bg-muted/15 p-3 sm:p-3.5",
        fullWidth && "col-span-1 sm:col-span-2",
        className,
      )}
    >
      {children}
    </div>
  )
}

function SimpleCheck({ checked, onCheckedChange, label, id }) {
  return (
    <label htmlFor={id} className="flex h-full w-full cursor-pointer items-start gap-3">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="mt-0.5 size-[18px] shrink-0 rounded-[3px]"
      />
      <span className="text-sm leading-snug text-foreground sm:text-[14px]">{label}</span>
    </label>
  )
}

/**
 * Listing options — responsive 2-column grid on sm+ (1 column on mobile).
 */
export function OptionsCheckboxes({
  freeShipping,
  freeReturn,
  returnDays,
  allowViewLocation,
  showComments,
  bidEnabled,
  bidVisible,
  contactMessages,
  contactPhone,
  contactPhoneNumber,
  termsAccepted,
  hideLegal = false,
  isRequest = false,
  fieldErrors = {},
  defaultPhone = "",
  onChange,
}) {
  const { t } = useTranslation()
  const { direction } = useAppDirection()

  const toggle = (patch) => onChange(patch)

  return (
    <section
      className="mb-2 w-full rounded-xl border border-border bg-card p-4 sm:p-5 md:p-6"
      dir={direction}
      aria-labelledby="listing-options-heading"
    >
      <h3 id="listing-options-heading" className="mb-4 text-sm font-semibold text-foreground sm:text-base">
        {t("addListing.optionsSectionTitle", "خيارات الإعلان")}
      </h3>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {!isRequest ? (
          <>
            <OptionTile>
              <SimpleCheck
                id="opt-free-shipping"
                checked={freeShipping}
                onCheckedChange={(v) => toggle({ freeShipping: !!v })}
                label={t("addListing.freeShipping")}
              />
            </OptionTile>

            <OptionTile fullWidth>
              <label className="flex w-full cursor-pointer items-start gap-3">
                <Checkbox
                  id="opt-free-return"
                  checked={freeReturn}
                  onCheckedChange={(v) => toggle({ freeReturn: !!v })}
                  className="mt-0.5 size-[18px] shrink-0 rounded-[3px]"
                />
                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-1 text-sm leading-snug text-foreground sm:text-[14px]">
                  <span>{t("addListing.freeReturnPrefix")}</span>
                  {freeReturn ? (
                    <Input
                      type="number"
                      min={0}
                      max={365}
                      value={returnDays ?? ""}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => toggle({ returnDays: e.target.value })}
                      className="h-8 w-16 shrink-0 px-2 text-center text-sm"
                      aria-label={t("addListing.returnDaysLabel")}
                    />
                  ) : (
                    <span className="inline-block w-8 text-center text-muted-foreground">—</span>
                  )}
                  <span>{t("addListing.freeReturnSuffix")}</span>
                </span>
              </label>
            </OptionTile>

            <OptionTile fullWidth>
              <label htmlFor="opt-view-client" className="flex w-full cursor-pointer items-start gap-3">
                <Checkbox
                  id="opt-view-client"
                  checked={allowViewLocation}
                  onCheckedChange={(v) => toggle({ allowViewLocation: !!v })}
                  className="mt-0.5 size-[18px] shrink-0 rounded-[3px]"
                />
                <span className="min-w-0 text-sm leading-snug text-foreground sm:text-[14px]">
                  {t("addListing.viewAtClient")}
                  {allowViewLocation ? (
                    <span className="mt-1.5 block text-xs font-normal text-muted-foreground">
                      {t("addListing.viewAtClientHint")}
                    </span>
                  ) : null}
                </span>
              </label>
            </OptionTile>

            <OptionTile fullWidth>
              <label htmlFor="opt-bids" className="flex w-full cursor-pointer items-start gap-3">
                <Checkbox
                  id="opt-bids"
                  checked={bidEnabled}
                  onCheckedChange={(v) => toggle({ bidEnabled: !!v, bidVisible: v ? bidVisible : true })}
                  className="mt-0.5 size-[18px] shrink-0 rounded-[3px]"
                />
                <span className="min-w-0 flex-1 text-sm leading-snug text-foreground sm:text-[14px]">
                  {t("addListing.bidLabel")}
                  {bidEnabled ? (
                    <span className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={cn(
                          "rounded-md border px-2.5 py-1 text-xs transition-colors",
                          bidVisible
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:bg-muted/50",
                        )}
                        onClick={(e) => {
                          e.preventDefault()
                          toggle({ bidVisible: true })
                        }}
                      >
                        {t("addListing.bidVisible")}
                      </button>
                      <button
                        type="button"
                        className={cn(
                          "rounded-md border px-2.5 py-1 text-xs transition-colors",
                          !bidVisible
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:bg-muted/50",
                        )}
                        onClick={(e) => {
                          e.preventDefault()
                          toggle({ bidVisible: false })
                        }}
                      >
                        {t("addListing.bidHidden")}
                      </button>
                    </span>
                  ) : null}
                </span>
              </label>
            </OptionTile>
          </>
        ) : null}

        <OptionTile>
          <SimpleCheck
            id="opt-comments"
            checked={showComments}
            onCheckedChange={(v) => toggle({ showComments: !!v })}
            label={t("addListing.showCommentsPublic")}
          />
        </OptionTile>

        <OptionTile>
          <SimpleCheck
            id="opt-contact-phone"
            checked={contactPhone}
            onCheckedChange={(v) => {
              const enabled = !!v
              const updates = { contactPhone: enabled }
              if (enabled && !String(contactPhoneNumber ?? "").trim() && defaultPhone) {
                updates.contactPhoneNumber =
                  normalizeSaudiPhone(defaultPhone) ?? String(defaultPhone).trim()
              }
              if (!enabled) updates.contactPhoneNumber = ""
              toggle(updates)
            }}
            label={t("addListing.contactPhone")}
          />
        </OptionTile>

        <OptionTile>
          <SimpleCheck
            id="opt-contact-messages"
            checked={contactMessages}
            onCheckedChange={(v) => toggle({ contactMessages: !!v })}
            label={t("addListing.contactMessages")}
          />
        </OptionTile>
      </div>

      {contactPhone ? (
        <div className="mt-4 w-full">
          <label className="mb-2 block text-sm font-medium text-foreground" htmlFor="add-listing-contact-phone">
            {t("addListing.contactPhoneNumberLabel")}
          </label>
          <SaudiMobilePhoneField
            id="add-listing-contact-phone"
            value={contactPhoneNumber ?? ""}
            required
            error={fieldErrors.contactPhoneNumber}
            onChange={(next) => toggle({ contactPhoneNumber: next })}
          />
        </div>
      ) : null}

      <p className="mt-4 rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
        {t("addListing.termsText")}
      </p>

      {!hideLegal ? (
        <div className="mt-4 w-full">
          <LegalAcknowledgmentList
            translationPrefix="addListing"
            className="border-0 bg-muted/20 p-3 sm:p-4"
            listClassName="list-decimal space-y-1.5 ps-4 text-xs text-muted-foreground sm:text-sm"
          />
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 bg-muted/15 p-3 sm:p-4">
            <Checkbox
              checked={termsAccepted}
              onCheckedChange={(v) => toggle({ termsAccepted: !!v })}
              className={cn("mt-0.5 size-[18px] rounded-[3px]", fieldErrors.termsAccepted && "border-destructive")}
            />
            <span className="text-sm leading-relaxed text-foreground">{t("addListing.oathAgree")}</span>
          </label>
        </div>
      ) : null}
    </section>
  )
}
