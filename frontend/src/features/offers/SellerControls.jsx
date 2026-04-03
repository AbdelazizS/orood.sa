import { Link, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ShareButton } from "@/components/share/ShareButton"
import apiClient from "@/lib/apiClient"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Pencil, RefreshCw, Trash2, Copy, Loader2 } from "lucide-react"

/**
 * Seller controls: Edit, Update (bump), Delete, Duplicate, Share.
 */
export function SellerControls({ product }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(`/products/${product.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      navigate("/dashboard/listings")
    },
  })

  const bumpMutation = useMutation({
    mutationFn: () => apiClient.post(`/products/${product.id}/bump`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", product.id] })
    },
  })

  const handleDuplicate = () => {
    navigate("/add", {
      state: {
        duplicateFrom: {
          title: product.title,
          description: product.description,
          price: product.price,
          type: product.type,
          category_id: product.category?.id,
          subcategory_id: product.subcategory?.id,
          region_id: product.region?.id,
          city_id: product.city?.id,
          accept_bids: product.accept_bids,
          contact_preferences: product.contact_preferences,
          shipping_details: product.shipping_details,
          tags: product.tags,
        },
      },
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" asChild>
        <Link to={`/products/${product.id}/edit`}>
          <Pencil className="size-4 me-1" />
          {t("admin.editListing", "تعديل")}
        </Link>
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => bumpMutation.mutate()}
        disabled={bumpMutation.isPending}
      >
        {bumpMutation.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <RefreshCw className="size-4 me-1" />
        )}
        {t("profile.update", "تحديث")}
      </Button>
      <Button variant="outline" size="sm" onClick={handleDuplicate}>
        <Copy className="size-4 me-1" />
        {t("productDetails.duplicate", "نسخ")}
      </Button>
      <ShareButton product={product} />
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="size-4 me-1" />
            {t("admin.deleteListing", "حذف")}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.deleteConfirm", "حذف العرض؟")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.deleteConfirmDesc", "لا يمكن التراجع عن هذا الإجراء.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                t("profile.delete", "حذف")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
