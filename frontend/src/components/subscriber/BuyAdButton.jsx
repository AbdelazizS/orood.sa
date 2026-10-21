import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { buyListingAd } from "@/services/subscriberService"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Loader2, ShoppingBag } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * "شراء الإعلان" with a confirm dialog (one ad credit is spent).
 */
export function BuyAdButton({ product, creditsBalance, onBought, className, size = "default" }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const noCredits = creditsBalance != null && creditsBalance < 1

  const mutation = useMutation({
    mutationFn: () => buyListingAd(product.id),
    onSuccess: (res) => {
      toast.success(t("subscriber.buy.success", "تم شراء الإعلان، وأصبح العقار معروضاً بالسعر"))
      setOpen(false)
      queryClient.invalidateQueries({ queryKey: ["subscriber"] })
      queryClient.invalidateQueries({ queryKey: ["listings", "map"] })
      onBought?.(res)
    },
    onError: (err) => {
      const errors = err?.response?.data?.errors ?? {}
      const first = Object.values(errors)[0]?.[0]
      toast.error(first ?? err?.response?.data?.message ?? t("common.errorGeneric", "حدث خطأ"))
      setOpen(false)
    },
  })

  return (
    <>
      <Button
        type="button"
        size={size}
        className={cn("gap-2", className)}
        disabled={noCredits || mutation.isPending}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }}
      >
        <ShoppingBag className="size-4" aria-hidden />
        {noCredits ? t("subscriber.buy.noCredits", "الرصيد غير كافٍ") : t("subscriber.buy.cta", "شراء الإعلان")}
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("subscriber.buy.confirmTitle", "تأكيد شراء الإعلان")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("subscriber.buy.confirmBody", {
                title: product?.title ?? "",
                balance: creditsBalance ?? 0,
                defaultValue: "سيتم خصم إعلان واحد من رصيدك (الرصيد الحالي: {{balance}}) ويظهر سعر «{{title}}» للجميع على الخارطة.",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutation.isPending}>{t("common.cancel", "إلغاء")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={mutation.isPending}
              onClick={(e) => {
                e.preventDefault()
                mutation.mutate()
              }}
            >
              {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : t("subscriber.buy.confirm", "تأكيد الشراء")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
