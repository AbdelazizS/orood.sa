import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"

export function SubmitSection({
  termsAccepted,
  onSubmit,
  isPending,
  requireTerms = true,
  submitLabelPending,
  submitLabelIdle,
}) {
  const { t } = useTranslation()
  const termsOk = !requireTerms || termsAccepted
  const idle = submitLabelIdle ?? t("addListing.publish")
  const pending = submitLabelPending ?? t("addListing.publishing")

  return (
    <div className="space-y-4">
      <Button
        type="button"
        onClick={onSubmit}
        disabled={!termsOk || isPending}
        className="w-full h-[52px] rounded-lg text-[16px] font-bold"
      >
        {isPending ? pending : idle}
      </Button>
    </div>
  )
}
