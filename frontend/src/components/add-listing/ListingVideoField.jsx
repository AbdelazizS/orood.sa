import { useRef } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Clapperboard, Loader2, Trash2, Upload } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { deleteListingVideo, getMyListingVideos } from "@/services/companyVideoService"
import { formatDuration, probeVideoFile } from "@/lib/video/videoFormat"

const MAX_MB_FALLBACK = 200

/**
 * «فيديو الإعلان» on the add / edit form (all sections). The file is uploaded right after the
 * listing is saved. Optional: show the video on the map instead of the price.
 *
 * @param {{
 *   productId?: number|string|null,
 *   file: File|null,
 *   probe: { duration: number, thumbnail: Blob|null }|null,
 *   onFileChange: (file: File|null, probe: object|null) => void,
 *   mapDisplay: "price"|"video",
 *   onMapDisplayChange: (v: "price"|"video") => void,
 *   uploadProgress?: number|null,
 * }} props
 */
export function ListingVideoField({ productId, file, probe, onFileChange, mapDisplay, onMapDisplayChange, uploadProgress = null }) {
  const { t } = useTranslation()
  const inputRef = useRef(null)
  const queryClient = useQueryClient()

  const existingQuery = useQuery({
    queryKey: ["listing-videos", "mine", productId],
    queryFn: () => getMyListingVideos(productId),
    enabled: Boolean(productId),
  })
  const existing = existingQuery.data?.items ?? []
  const maxMb = existingQuery.data?.meta?.max_upload_mb ?? MAX_MB_FALLBACK

  const remove = useMutation({
    mutationFn: (videoId) => deleteListingVideo(productId, videoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listing-videos", "mine", productId] })
      toast.success(t("addListing.video.deleted", "تم حذف الفيديو"))
    },
    onError: () => toast.error(t("common.error", "حدث خطأ")),
  })

  const pick = async (picked) => {
    if (!picked) return
    if (!picked.type.startsWith("video/")) {
      toast.error(t("addListing.video.badType", "اختر ملف فيديو (MP4 أو MOV)"))
      return
    }
    if (picked.size > maxMb * 1024 * 1024) {
      toast.error(t("addListing.video.tooBig", { mb: maxMb, defaultValue: "حجم الفيديو أكبر من {{mb}} ميجابايت" }))
      return
    }
    onFileChange(picked, null)
    const info = await probeVideoFile(picked)
    onFileChange(picked, info)
  }

  const hasVideo = Boolean(file) || existing.length > 0

  return (
    <div className="mb-2 rounded-lg border border-border bg-card p-3 sm:p-4">
      <div className="flex items-start gap-2">
        <Clapperboard className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0">
          <p className="text-[14px] font-bold">{t("addListing.video.title", "فيديو الإعلان (اختياري)")}</p>
          <p className="text-[12px] text-muted-foreground">
            {t("addListing.video.hint", "يظهر في صفحة الإعلان وفي «فيديوهات» وعلى الخارطة. يفضّل فيديو قصير بالطول.")}
          </p>
        </div>
      </div>

      {existing.length ? (
        <ul className="mt-3 space-y-2">
          {existing.map((v) => (
            <li key={v.id} className="flex items-center gap-3 rounded-md border border-border p-2">
              <div className="h-14 w-10 shrink-0 overflow-hidden rounded bg-muted">
                {v.thumbnail_url ? <img src={v.thumbnail_url} alt="" className="size-full object-cover" /> : null}
              </div>
              <span className="min-w-0 flex-1 truncate text-sm">
                {v.duration_sec ? formatDuration(v.duration_sec) : t("addListing.video.saved", "فيديو محفوظ")}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive"
                disabled={remove.isPending}
                onClick={() => remove.mutate(v.id)}
                aria-label={t("addListing.video.delete", "حذف الفيديو")}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      {file ? (
        <div className="mt-3 flex items-center gap-3 rounded-md border border-primary/40 bg-primary/5 p-2">
          {probe ? null : <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />}
          <span className="min-w-0 flex-1 truncate text-sm">
            {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB{probe?.duration ? ` · ${formatDuration(probe.duration)}` : ""}
          </span>
          {uploadProgress != null ? (
            <span className="text-xs font-semibold tabular-nums text-primary">{uploadProgress}%</span>
          ) : (
            <Button type="button" variant="ghost" size="sm" onClick={() => onFileChange(null, null)}>
              {t("common.remove", "إزالة")}
            </Button>
          )}
        </div>
      ) : (
        <Button type="button" variant="outline" className="mt-3 gap-2" onClick={() => inputRef.current?.click()}>
          <Upload className="size-4" aria-hidden />
          {existing.length ? t("addListing.video.addAnother", "إضافة فيديو آخر") : t("addListing.video.pick", "اختيار فيديو")}
        </Button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/x-m4v,video/*"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0] ?? null)
          e.target.value = ""
        }}
      />

      {hasVideo ? (
        <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-md bg-muted/30 p-2.5">
          <Checkbox
            checked={mapDisplay === "video"}
            onCheckedChange={(v) => onMapDisplayChange(v === true ? "video" : "price")}
            className="mt-0.5 size-[18px] rounded-[3px]"
          />
          <span className="min-w-0">
            <span className="block text-sm font-medium">{t("addListing.video.showOnMap", "اعرض الفيديو على الخارطة بدل السعر")}</span>
            <span className="block text-xs text-muted-foreground">
              {t("addListing.video.showOnMapHint", "يظهر إعلانك على الخارطة كفقاعة فيديو، والسعر يبقى ظاهراً عند فتحه.")}
            </span>
          </span>
        </label>
      ) : null}
    </div>
  )
}
