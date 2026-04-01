import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"

export function SubmitSection({ termsAccepted, onSubmit, isPending }) {
  const { t } = useTranslation()

  return (
    <div className="space-y-4">
      <Button
        type="button"
        onClick={onSubmit}
        disabled={!termsAccepted || isPending}
        className="w-full h-[52px] rounded-lg text-[16px] font-bold"
      >
        {isPending ? t("addListing.publishing") : t("addListing.publish")}
      </Button>
    </div>
  )
}
