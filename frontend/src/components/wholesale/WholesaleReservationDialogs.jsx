import { useTranslation } from "react-i18next"
import { useAppDirection } from "@/providers/DirectionProvider"
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

/**
 * @param {{
 *   open: boolean,
 *   onOpenChange: (open: boolean) => void,
 *   title: string,
 *   quantity: number,
 *   priceLine?: string | null,
 *   onConfirm: () => void,
 *   pending?: boolean,
 * }} props
 */
export function WholesaleReserveConfirmDialog({
  open,
  onOpenChange,
  title,
  quantity,
  priceLine,
  onConfirm,
  pending = false,
}) {
  const { t } = useTranslation()
  const { direction } = useAppDirection()

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent dir={direction} className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{t("wholesale.confirmReserve.title")}</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2 text-start">
            <span>
              {t("wholesale.confirmReserve.description", {
                title: title || "—",
                quantity,
              })}
            </span>
            {priceLine ? <span className="block font-medium text-foreground">{priceLine}</span> : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-3 sm:flex-row sm:justify-end sm:gap-3">
          <AlertDialogCancel disabled={pending} className="min-h-11 w-full sm:w-auto">
            {t("wholesale.confirmReserve.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            type="button"
            className="min-h-11 w-full sm:w-auto"
            disabled={pending}
            onClick={(e) => {
              e.preventDefault()
              onConfirm()
            }}
          >
            {t("wholesale.confirmReserve.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/**
 * @param {{
 *   open: boolean,
 *   onOpenChange: (open: boolean) => void,
 *   title: string,
 *   onConfirm: () => void,
 *   pending?: boolean,
 * }} props
 */
export function WholesaleCancelConfirmDialog({ open, onOpenChange, title, onConfirm, pending = false }) {
  const { t } = useTranslation()
  const { direction } = useAppDirection()

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent dir={direction} className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{t("wholesale.confirmCancel.title")}</AlertDialogTitle>
          <AlertDialogDescription className="text-start">
            {t("wholesale.confirmCancel.description", { title: title || "—" })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-3 sm:flex-row sm:justify-end sm:gap-3">
          <AlertDialogCancel disabled={pending} className="min-h-11 w-full sm:w-auto">
            {t("wholesale.confirmCancel.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            type="button"
            className="min-h-11 w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:w-auto"
            disabled={pending}
            onClick={(e) => {
              e.preventDefault()
              onConfirm()
            }}
          >
            {t("wholesale.confirmCancel.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
