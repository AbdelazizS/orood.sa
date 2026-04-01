import { useTranslation } from "react-i18next"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export function StepOptions({
  type,
  config,
  freeShipping,
  freeReturn,
  returnDays,
  allowViewLocation,
  bidEnabled,
  bidVisibility,
  onChange,
  disabled,
}) {
  const { t } = useTranslation()
  const cfg = config ?? { allowShipping: true, allowReturn: true, allowBidding: true }

  return (
    <div className="space-y-6">
      {cfg.allowShipping && (
        <div className="flex items-center justify-between rounded-lg border p-4">
          <Label htmlFor="freeShipping">{t("addOffer.freeShipping")}</Label>
          <Switch
            id="freeShipping"
            checked={freeShipping}
            onCheckedChange={(v) => onChange({ freeShipping: v })}
            disabled={disabled}
          />
        </div>
      )}
      {cfg.allowReturn && (
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="freeReturn">{t("addOffer.freeReturn")}</Label>
            <Switch
              id="freeReturn"
              checked={freeReturn}
              onCheckedChange={(v) => onChange({ freeReturn: v, returnDays: v ? returnDays : null })}
              disabled={disabled}
            />
          </div>
          {freeReturn && (
          <RadioGroup
            value={returnDays ?? "same_day"}
            onValueChange={(v) => onChange({ returnDays: v })}
            className="flex gap-4 ps-4"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="same_day" id="returnSameDay" disabled={disabled} />
              <Label htmlFor="returnSameDay" className="font-normal">
                {t("addProduct.returnSameDay", "Same day")}
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="3_days" id="return3Days" disabled={disabled} />
              <Label htmlFor="return3Days" className="font-normal">
                {t("addProduct.return3Days", "3 days")}
              </Label>
            </div>
          </RadioGroup>
        )}
        </div>
      )}
      {cfg.allowViewLocation !== false && (
        <div className="flex items-center justify-between rounded-lg border p-4">
        <Label htmlFor="allowViewLocation">
          {t("addOffer.viewAtClient")}
        </Label>
        <Switch
          id="allowViewLocation"
          checked={allowViewLocation}
          onCheckedChange={(v) => onChange({ allowViewLocation: v })}
          disabled={disabled}
        />
      </div>
      )}
      {cfg.allowBidding && (
        <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="bidEnabled">{t("addOffer.acceptBids")}</Label>
          <Switch
            id="bidEnabled"
            checked={bidEnabled}
            onCheckedChange={(v) =>
              onChange({ bidEnabled: v, bidVisibility: v ? bidVisibility : "public" })
            }
            disabled={disabled}
          />
        </div>
        {bidEnabled && (
          <RadioGroup
            value={bidVisibility}
            onValueChange={(v) => onChange({ bidVisibility: v })}
            className="flex flex-col gap-2 ps-4"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="public" id="bidPublic" disabled={disabled} />
              <Label htmlFor="bidPublic" className="font-normal">
                {t("addOffer.bidsVisible")}
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="hidden" id="bidHidden" disabled={disabled} />
              <Label htmlFor="bidHidden" className="font-normal">
                {t("bids.hidden")}
              </Label>
            </div>
          </RadioGroup>
        )}
        </div>
      )}
    </div>
  )
}
