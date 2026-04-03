import { useTranslation } from "react-i18next"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

export function StepSubmit({ agreed, onChange, disabled }) {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-lg border p-4">
        <Checkbox
          id="agree"
          checked={agreed}
          onCheckedChange={(v) => onChange({ agreed: !!v })}
          disabled={disabled}
        />
        <Label
          htmlFor="agree"
          className="cursor-pointer text-sm font-normal leading-relaxed"
        >
          {t("addProduct.agreeTerms", "I agree to the platform terms and commission policy.")}
        </Label>
      </div>
    </div>
  )
}
