import { useTranslation } from "react-i18next"
import { Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { getWholesaleProductPageUrl, buildWholesaleShareText } from "@/lib/wholesaleShare"

function openWindow(url) {
  window.open(url, "_blank", "noopener,noreferrer,width=600,height=500")
}

export function WholesaleShareControl({ product, dir = "rtl" }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language?.startsWith("ar") ? "ar" : "en"
  const url = getWholesaleProductPageUrl(product?.id)
  const title = product?.title ?? ""
  const shareText = buildWholesaleShareText({ productTitle: title, productId: product?.id, lang })

  const copyLink = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      toast.success(t("share.copied"))
    } catch {
      toast.error(t("common.errorGeneric"))
    }
  }

  const nativeShare = async () => {
    if (!url || !navigator.share) return
    try {
      await navigator.share({
        title: title || t("wholesale.market.card.shareTitle"),
        text: shareText,
        url,
      })
    } catch (e) {
      if (e?.name !== "AbortError") {
        toast.error(t("common.errorGeneric"))
      }
    }
  }

  const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`

  const hasNative = typeof navigator !== "undefined" && typeof navigator.share === "function"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="w-full gap-2 rounded-xl border-dashed">
          <Share2 className="size-4 shrink-0" aria-hidden />
          {t("wholesale.market.card.share")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={dir === "rtl" ? "start" : "end"} dir={dir}>
        {hasNative ? (
          <DropdownMenuItem onClick={nativeShare}>{t("wholesale.market.card.shareDevice")}</DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onClick={copyLink}>{t("share.copyLink")}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => openWindow(waUrl)}>{t("share.whatsapp")}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => openWindow(facebookUrl)}>{t("share.facebook")}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => openWindow(twitterUrl)}>{t("share.twitter")}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
