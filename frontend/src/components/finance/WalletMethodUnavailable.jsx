import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"

/** Shown when no wallet payment methods are enabled in admin settings. */
export function WalletMethodUnavailable({ context = "charge" }) {
  const { t } = useTranslation()
  const isCharge = context === "charge"

  return (
    <div className="space-y-4 py-2 text-sm">
      <p className="text-muted-foreground">
        {isCharge ? t("dashboard.walletChargeUnavailable") : t("dashboard.walletWithdrawUnavailable")}
      </p>
      <p className="text-muted-foreground">{t("dashboard.contactAdminForWallet")}</p>
      <Button variant="outline" className="w-full sm:w-auto" asChild>
        <Link to="/dashboard/help">{t("dashboard.walletContactSupport")}</Link>
      </Button>
    </div>
  )
}
