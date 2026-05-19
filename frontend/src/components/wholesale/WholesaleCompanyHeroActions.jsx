import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ContactDialog } from "@/components/chat/ContactDialog"
import { MessageCircle, Share2 } from "lucide-react"
import { cn } from "@/lib/utils"

export function WholesaleCompanyHeroActions({
  company,
  featuredProductId = null,
  className,
}) {
  const { t } = useTranslation()
  const ownerId = company?.user?.id
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/wholesale/company/${company?.id}` : ""

  const onShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: company?.name, url: shareUrl })
        return
      }
      await navigator.clipboard.writeText(shareUrl)
      toast.success(t("wholesale.companyProfile.linkCopied"))
    } catch {
      /* user cancelled */
    }
  }

  return (
    <div className={cn("flex flex-wrap gap-2 border-b border-border/60 px-5 py-4 sm:px-8", className)}>
      {featuredProductId ? (
        <ContactDialog
          productId={featuredProductId}
          productTitle={company?.name}
          trigger={
            <Button type="button" variant="outline" className="min-h-11 rounded-xl px-4">
              <MessageCircle className="me-2 size-4" />
              {t("listingDetail.messageMe")}
            </Button>
          }
        />
      ) : ownerId ? (
        <Button type="button" variant="outline" className="min-h-11 rounded-xl px-4" asChild>
          <Link to={`/dashboard/messages?with=${ownerId}`}>
            <MessageCircle className="me-2 size-4" />
            {t("listingDetail.messageMe")}
          </Link>
        </Button>
      ) : null}
      <Button type="button" variant="outline" className="min-h-11 rounded-xl px-4" onClick={onShare}>
        <Share2 className="me-2 size-4" />
        {t("wholesale.companyProfile.share")}
      </Button>
    </div>
  )
}
