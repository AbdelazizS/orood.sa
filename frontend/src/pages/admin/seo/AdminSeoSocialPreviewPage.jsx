import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useResolvedSeo } from "@/hooks/useResolvedSeo"
import { GoogleSeoPreview } from "@/features/admin/seo/GoogleSeoPreview"
import { SITE_URL } from "@/components/seo/SeoHead"

export function AdminSeoSocialPreviewPage() {
  const { t } = useTranslation()
  const [path, setPath] = useState("/")
  const normalized = path.startsWith("/") ? path : `/${path}`
  const { data: seo, isLoading } = useResolvedSeo(normalized)

  const title = seo?.seo_title ?? seo?.title
  const description = seo?.description
  const url = `${SITE_URL}${normalized === "/" ? "" : normalized}`

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="space-y-2">
        <Label>{t("admin.seo.social.url")}</Label>
        <Input value={path} onChange={(e) => setPath(e.target.value)} placeholder="/wholesale" />
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : (
        <div className="space-y-4">
          <h2 className="font-semibold">{t("admin.seo.social.preview")}</h2>
          <GoogleSeoPreview title={title} description={description} url={url} />
          <div className="rounded-lg border p-4 bg-muted/30 max-w-xl">
            <p className="text-xs text-muted-foreground mb-2">Open Graph</p>
            <p className="font-medium">{seo?.og?.title ?? title}</p>
            <p className="text-sm text-muted-foreground line-clamp-2">{seo?.og?.description ?? description}</p>
            {seo?.og?.image ? (
              <img src={seo.og.image} alt="" className="mt-2 max-h-32 rounded object-cover" />
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
