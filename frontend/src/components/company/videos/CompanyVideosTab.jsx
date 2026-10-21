import { useState } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { getCompanyVideos } from "@/services/companyVideoService"
import { ShortCard, VideoCard } from "@/components/company/videos/VideoCards"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Clapperboard, Settings2, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Company channel, like a YouTube channel page: a "Shorts" row on top, then the videos grid
 * (sort: newest / most viewed).
 */
export function CompanyVideosTab({ companyId, isOwner }) {
  const { t } = useTranslation()
  const [sort, setSort] = useState("new")

  const shortsQuery = useQuery({
    queryKey: ["company-videos", companyId, "short"],
    queryFn: () => getCompanyVideos(companyId, { type: "short", perPage: 30 }),
    enabled: Boolean(companyId),
  })
  const longQuery = useQuery({
    queryKey: ["company-videos", companyId, "long"],
    queryFn: () => getCompanyVideos(companyId, { type: "long", perPage: 48 }),
    enabled: Boolean(companyId),
  })

  const shorts = shortsQuery.data?.items ?? []
  const videos = [...(longQuery.data?.items ?? [])].sort((a, b) =>
    sort === "popular" ? b.views_count - a.views_count : new Date(b.published_at) - new Date(a.published_at),
  )
  const loading = shortsQuery.isLoading || longQuery.isLoading

  return (
    <div className="space-y-6">
      {isOwner ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 text-sm">
          <span>{t("companyChannel.ownerHint", "هذه قناتك. ارفع فيديوهات عقاراتك وأدر التعليقات من لوحة التحكم.")}</span>
          <Button size="sm" className="gap-1.5" asChild>
            <Link to="/dashboard/videos">
              <Settings2 className="size-4" aria-hidden />
              {t("companyChannel.manage", "إدارة الفيديوهات")}
            </Link>
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-4">
          <div className="flex gap-3 overflow-hidden">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="aspect-[9/16] w-[150px] shrink-0 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="aspect-video rounded-xl" />
            ))}
          </div>
        </div>
      ) : shorts.length === 0 && videos.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <Clapperboard className="mx-auto size-10 text-muted-foreground" aria-hidden />
          <p className="mt-3 text-sm text-muted-foreground">{t("companyChannel.empty", "لا توجد فيديوهات بعد.")}</p>
        </div>
      ) : (
        <>
          {shorts.length ? (
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-base font-bold">
                <Zap className="size-5 text-destructive" aria-hidden />
                {t("companyChannel.shorts", "Shorts")}
              </h3>
              <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
                {shorts.map((v) => (
                  <ShortCard key={v.id} video={v} />
                ))}
              </div>
            </section>
          ) : null}

          {videos.length ? (
            <section>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-base font-bold">
                  <Clapperboard className="size-5 text-primary" aria-hidden />
                  {t("companyChannel.videos", "الفيديوهات")}
                </h3>
                <div className="inline-flex gap-1" role="tablist">
                  {[
                    { id: "new", label: t("companyChannel.sortNew", "الأحدث") },
                    { id: "popular", label: t("companyChannel.sortPopular", "الأكثر مشاهدة") },
                  ].map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      role="tab"
                      aria-selected={sort === o.id}
                      onClick={() => setSort(o.id)}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-xs font-semibold",
                        sort === o.id ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
                {videos.map((v) => (
                  <VideoCard key={v.id} video={v} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}
