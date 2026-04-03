import { useTranslation } from "react-i18next"
import { Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ShareButton({ product }) {
  const { t } = useTranslation()
  const url = typeof window !== "undefined" ? window.location.href : ""
  const title = product?.title ?? ""
  const text = product?.description?.slice(0, 100) ?? title
  const image = product?.media?.image_url ?? product?.media?.cover ?? product?.image_url ?? ""

  const shareUrls = {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
  }

  const handleShare = (platform) => {
    window.open(shareUrls[platform], "_blank", "noopener,noreferrer,width=600,height=500")
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="me-2 size-4" />
          {t("share.title", "Share")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleShare("whatsapp")}>
          {t("share.whatsapp", "WhatsApp")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare("facebook")}>
          {t("share.facebook", "Facebook")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare("linkedin")}>
          {t("share.linkedin", "LinkedIn")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare("twitter")}>
          {t("share.twitter", "Twitter / X")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
