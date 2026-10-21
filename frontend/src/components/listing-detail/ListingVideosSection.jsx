import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import apiClient from "@/lib/apiClient"
import { ShortCard, VideoCard } from "@/components/company/videos/VideoCards"
import { Clapperboard } from "lucide-react"

/** "فيديوهات العقار": company channel videos linked to this listing (hidden when there are none). */
export function ListingVideosSection({ productId }) {
  const { t } = useTranslation()
  const { data = [] } = useQuery({
    queryKey: ["product-videos", String(productId)],
    queryFn: async () => {
      const { data: res } = await apiClient.get(`/products/${productId}/videos`)
      return Array.isArray(res?.data) ? res.data : []
    },
    enabled: Boolean(productId),
    staleTime: 5 * 60_000,
  })

  if (!data.length) return null
  const shorts = data.filter((v) => v.is_short)
  const videos = data.filter((v) => !v.is_short)

  return (
    <section className="border-b border-border px-4 py-4" aria-label={t("companyChannel.listingVideos", "فيديوهات العقار")}>
      <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
        <Clapperboard className="size-5 text-primary" aria-hidden />
        {t("companyChannel.listingVideos", "فيديوهات العقار")}
      </h2>
      {videos.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {videos.map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </div>
      ) : null}
      {shorts.length ? (
        <div className={videos.length ? "mt-4 flex gap-3 overflow-x-auto pb-2" : "flex gap-3 overflow-x-auto pb-2"}>
          {shorts.map((v) => (
            <ShortCard key={v.id} video={v} />
          ))}
        </div>
      ) : null}
    </section>
  )
}
