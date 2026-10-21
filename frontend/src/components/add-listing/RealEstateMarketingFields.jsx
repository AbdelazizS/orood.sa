import { useTranslation } from "react-i18next"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * Real-estate extras on the add/edit listing form: district (الحي) and "needs a marketer".
 */
export function RealEstateMarketingFields({ district, needsMarketer, adLicenseNo = "", showNeedsMarketer = true, onChange }) {
  const { t } = useTranslation()

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="listing-district" className="text-sm font-medium">
          {t("realEstate.district", "الحي")}
        </Label>
        <Input
          id="listing-district"
          maxLength={120}
          value={district}
          placeholder={t("realEstate.districtPlaceholder", "مثال: النرجس")}
          onChange={(e) => onChange({ district: e.target.value })}
        />
      </div>

      {showNeedsMarketer ? (
        <div className="space-y-1.5">
          <Label htmlFor="listing-ad-license" className="text-sm font-medium">
            {t("realEstate.adLicense", "رقم ترخيص الإعلان (الهيئة العامة للعقار)")}
          </Label>
          <Input
            id="listing-ad-license"
            dir="ltr"
            inputMode="numeric"
            maxLength={50}
            value={adLicenseNo}
            placeholder="7200000000"
            onChange={(e) => onChange({ adLicenseNo: e.target.value.replace(/[^0-9A-Za-z-]/g, "") })}
          />
          <p className="text-xs text-muted-foreground">
            {t("realEstate.adLicenseHint", "يظهر للزوار في صفحة الإعلان، وفق اشتراطات الهيئة العامة للعقار.")}
          </p>
        </div>
      ) : null}

      {showNeedsMarketer ? (
        <label
          htmlFor="listing-needs-marketer"
          className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 bg-muted/15 p-3 sm:p-3.5"
        >
          <Checkbox
            id="listing-needs-marketer"
            checked={needsMarketer}
            onCheckedChange={(v) => onChange({ needsMarketer: v === true })}
            className="mt-0.5 size-[18px] shrink-0 rounded-[3px]"
          />
          <span className="min-w-0">
            <span className="block text-sm font-medium leading-snug text-foreground">
              {t("realEstate.needsMarketer", "يحتاج مسوق")}
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
              {t(
                "realEstate.needsMarketerHint",
                "يظهر العقار على الخريطة بعلامة «انتظار» بدون سعر أو بيانات تواصل حتى يتبناه مسوق.",
              )}
            </span>
          </span>
        </label>
      ) : null}
    </div>
  )
}
