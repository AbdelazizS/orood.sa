import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import apiClient from "@/lib/apiClient"
import { ShortCard, VideoCard } from "@/components/company/videos/VideoCards"
import { Clapperboard } from "lucide-react"
import { cn } from "@/lib/utils"

/** «فيديوهات الإعلان»: the listing's own video and channel videos linked to it (hidden when there are none). */
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
    <section className="border-b border-border px-4 py-4" aria-label={t("listingVideos.title", "فيديوهات الإعلان")}>
      <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
        <Clapperboard className="size-5 text-primary" aria-hidden />
        {t("listingVideos.title", "فيديوهات الإعلان")}
      </h2>
      {videos.length ? (
        <div className={cn("grid grid-cols-1 gap-4", videos.length > 1 && "sm:grid-cols-2")}>
          {videos.map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </div>
      ) : null}
      {shorts.length ? (
        // One Short is centred at a comfortable size; several sit in an even grid.
        <div
          className={cn(
            "grid gap-3",
            shorts.length === 1 ? "grid-cols-1 justify-items-center" : "grid-cols-2 sm:grid-cols-3",
            videos.length && "mt-4",
          )}
        >
          {shorts.map((v) => (
            <ShortCard key={v.id} video={v} className={shorts.length === 1 ? "w-full max-w-[280px] sm:w-full" : "w-full sm:w-full"} />
          ))}
        </div>
      ) : null}
    </section>
  )
}
