import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Copy } from "lucide-react"
import { toast } from "sonner"
import { formatIbanForDisplay } from "@/lib/finance/iban"

export function SellerBankDetailsCard({ sellerBank, transferAmountLabel }) {
  const { t } = useTranslation()

  if (!sellerBank) return null

  const iban =
    sellerBank.bank_iban ||
    sellerBank.bank_iban_masked ||
    ""
  const ibanDisplay = formatIbanForDisplay(iban) || iban

  const copyIban = async () => {
    const raw = String(iban).replace(/\s/g, "")
    if (!raw) return
    try {
      await navigator.clipboard.writeText(raw)
      toast.success(t("purchase.ibanCopied", "تم نسخ رقم الآيبان"))
    } catch {
      toast.error(t("common.error"))
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-primary/20 bg-muted/30 p-4 text-sm space-y-3">
      <div>
        <p className="font-semibold text-foreground">
          {t("purchase.sellerBankDetails", "بيانات حساب البائع")}
        </p>
        <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
          {t(
            "purchase.directTransferSteps",
            "حوّل المبلغ إلى الحساب أدناه، ثم أدخل رقم التحويل وارفع سند التحويل في الحقول التالية.",
          )}
        </p>
        {transferAmountLabel ? (
          <p className="mt-2 font-medium text-foreground">{transferAmountLabel}</p>
        ) : null}
      </div>
      {sellerBank.bank_name ? (
        <p>
          <span className="text-muted-foreground">{t("finance.bankName", "اسم البنك")}: </span>
          {sellerBank.bank_name}
        </p>
      ) : null}
      {sellerBank.account_holder ? (
        <p>
          <span className="text-muted-foreground">{t("finance.accountHolder", "صاحب الحساب")}: </span>
          {sellerBank.account_holder}
        </p>
      ) : null}
      {iban ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="min-w-0 flex-1">
            <span className="text-muted-foreground">{t("finance.iban", "الآيبان")}: </span>
            <span className="font-mono tabular-nums break-all">{ibanDisplay}</span>
          </p>
          <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={copyIban}>
            <Copy className="size-3.5" />
            {t("purchase.copyIban", "نسخ الآيبان")}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
