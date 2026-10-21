import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { useAuthStore } from "@/store/useAuthStore"
import { publicProfilePath } from "@/lib/profileRoutes"
import {
  deleteCompanyVideo,
  getMyCompanyVideos,
  updateCompanyActivities,
  updateCompanyVideo,
  uploadCompanyVideo,
} from "@/services/companyVideoService"
import { COMPANY_ACTIVITIES, formatCount, formatDuration, probeVideoFile } from "@/lib/video/videoFormat"
import { timeAgo } from "@/lib/timeAgo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Eye, EyeOff, ExternalLink, Loader2, MessageSquare, Pencil, ThumbsUp, Trash2, Upload, Zap } from "lucide-react"

const NONE = "none"

function errorText(err, t) {
  const first = Object.values(err?.response?.data?.errors ?? {})[0]?.[0]
  return first ?? err?.response?.data?.message ?? t("common.errorGeneric", "حدث خطأ")
}

function ActivitiesCard({ company }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [activities, setActivities] = useState(company?.activities ?? [])
  const [description, setDescription] = useState(company?.description ?? "")
  const [falLicense, setFalLicense] = useState(company?.fal_license_no ?? "")

  const save = useMutation({
    mutationFn: () => updateCompanyActivities(activities, description.trim() || null, falLicense.trim() || null),
    onSuccess: () => {
      toast.success(t("companyVideos.activitiesSaved", "تم حفظ بيانات الشركة"))
      queryClient.invalidateQueries({ queryKey: ["company", "my-videos"] })
    },
    onError: (err) => toast.error(errorText(err, t)),
  })

  const toggle = (a, on) => setActivities((prev) => (on ? [...new Set([...prev, a])] : prev.filter((x) => x !== a)))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("companyVideos.activitiesTitle", "نشاط الشركة")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4">
          {COMPANY_ACTIVITIES.map((a) => (
            <label key={a} className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={activities.includes(a)} onCheckedChange={(v) => toggle(a, v === true)} />
              {t(`companyChannel.activity.${a}`, a)}
            </label>
          ))}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="company-about">{t("companyVideos.about", "نبذة عن الشركة (تظهر في تبويب «عن الشركة»)")}</Label>
          <Textarea id="company-about" rows={3} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="company-fal">{t("auth.falLicense", "رقم رخصة فال (اختياري)")}</Label>
          <Input id="company-fal" dir="ltr" maxLength={50} className="max-w-xs" value={falLicense} onChange={(e) => setFalLicense(e.target.value.replace(/[^0-9A-Za-z-]/g, ""))} />
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? <Loader2 className="size-4 animate-spin" /> : t("common.save", "حفظ")}
        </Button>
      </CardContent>
    </Card>
  )
}

function UploadCard({ listings, maxMb, shortMaxSeconds }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const fileRef = useRef(null)
  const [file, setFile] = useState(null)
  const [probe, setProbe] = useState(null)
  const [preview, setPreview] = useState(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isShort, setIsShort] = useState(false)
  const [productId, setProductId] = useState(NONE)
  const [progress, setProgress] = useState(0)

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])

  const pick = async (f) => {
    if (!f) return
    if (f.size > maxMb * 1024 * 1024) {
      toast.error(t("companyVideos.tooBig", { mb: maxMb, defaultValue: "حجم الفيديو أكبر من {{mb}} ميجابايت" }))
      return
    }
    setFile(f)
    setTitle((prev) => prev || f.name.replace(/\.[^.]+$/, ""))
    const info = await probeVideoFile(f)
    setProbe(info)
    if (info.thumbnail) setPreview(URL.createObjectURL(info.thumbnail))
    // Short = vertical, or short enough (like YouTube Shorts).
    setIsShort((info.height > info.width && info.duration > 0) || (info.duration > 0 && info.duration <= shortMaxSeconds))
  }

  const reset = () => {
    setFile(null)
    setProbe(null)
    setPreview(null)
    setTitle("")
    setDescription("")
    setIsShort(false)
    setProductId(NONE)
    setProgress(0)
    if (fileRef.current) fileRef.current.value = ""
  }

  const upload = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      fd.append("video", file)
      if (probe?.thumbnail) fd.append("thumbnail", probe.thumbnail, "thumbnail.jpg")
      fd.append("title", title.trim())
      if (description.trim()) fd.append("description", description.trim())
      fd.append("is_short", isShort ? "1" : "0")
      if (probe?.duration) fd.append("duration_sec", String(probe.duration))
      if (productId !== NONE) fd.append("product_id", productId)
      return uploadCompanyVideo(fd, setProgress)
    },
    onSuccess: () => {
      toast.success(t("companyVideos.uploaded", "تم نشر الفيديو في قناتك"))
      reset()
      queryClient.invalidateQueries({ queryKey: ["company", "my-videos"] })
      queryClient.invalidateQueries({ queryKey: ["company-videos"] })
    },
    onError: (err) => {
      setProgress(0)
      toast.error(errorText(err, t))
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("companyVideos.uploadTitle", "رفع فيديو جديد")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={fileRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v"
          className="sr-only"
          id="video-file"
          onChange={(e) => pick(e.target.files?.[0])}
        />
        {!file ? (
          <label
            htmlFor="video-file"
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-8 text-center hover:border-primary/60 hover:bg-primary/5"
          >
            <Upload className="size-8 text-primary" aria-hidden />
            <span className="text-sm font-semibold">{t("companyVideos.pick", "اختر فيديو من جهازك")}</span>
            <span className="text-xs text-muted-foreground">
              {t("companyVideos.pickHint", { mb: maxMb, defaultValue: "MP4 أو WebM أو MOV — حتى {{mb}} ميجابايت. الفيديو العمودي أو القصير يُنشر كـ Short." })}
            </span>
          </label>
        ) : (
          <form
            className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]"
            onSubmit={(e) => {
              e.preventDefault()
              upload.mutate()
            }}
          >
            <div className="space-y-2">
              <div className={isShort ? "mx-auto aspect-[9/16] w-32 overflow-hidden rounded-lg bg-muted" : "aspect-video overflow-hidden rounded-lg bg-muted"}>
                {preview ? <img src={preview} alt="" className="size-full object-cover" /> : null}
              </div>
              <p className="text-center text-xs text-muted-foreground" dir="ltr">
                {probe?.duration ? formatDuration(probe.duration) : "…"} · {(file.size / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="video-title">{t("companyVideos.title", "العنوان")}</Label>
                <Input id="video-title" required maxLength={150} value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="video-desc">{t("companyVideos.description", "الوصف (يظهر تحت الفيديو)")}</Label>
                <Textarea id="video-desc" rows={3} maxLength={5000} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{t("companyVideos.linkListing", "ربط بعقار (اختياري)")}</Label>
                  <Select value={productId} onValueChange={setProductId}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>{t("companyVideos.noListing", "بدون عقار")}</SelectItem>
                      {listings.map((l) => (
                        <SelectItem key={l.id} value={String(l.id)}>
                          {l.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                  <span className="flex items-center gap-2 text-sm">
                    <Zap className="size-4 text-destructive" aria-hidden />
                    {t("companyVideos.isShort", "نشر كـ Short")}
                  </span>
                  <Switch checked={isShort} onCheckedChange={setIsShort} />
                </label>
              </div>
              {upload.isPending ? (
                <div className="space-y-1">
                  <Progress value={progress} />
                  <p className="text-xs text-muted-foreground tabular-nums">{t("companyVideos.uploading", { p: progress, defaultValue: "جاري الرفع… {{p}}%" })}</p>
                </div>
              ) : null}
              <div className="flex gap-2">
                <Button type="submit" disabled={upload.isPending || !title.trim()} className="gap-2">
                  {upload.isPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" aria-hidden />}
                  {t("companyVideos.publish", "نشر الفيديو")}
                </Button>
                <Button type="button" variant="ghost" onClick={reset} disabled={upload.isPending}>
                  {t("common.cancel", "إلغاء")}
                </Button>
              </div>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

function EditDialog({ video, listings, onClose }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [title, setTitle] = useState(video.title)
  const [description, setDescription] = useState(video.description ?? "")
  const [isShort, setIsShort] = useState(video.is_short)
  const [productId, setProductId] = useState(video.product?.id ? String(video.product.id) : NONE)

  const save = useMutation({
    mutationFn: () =>
      updateCompanyVideo(video.id, {
        title: title.trim(),
        description: description.trim() || null,
        is_short: isShort,
        product_id: productId === NONE ? null : Number(productId),
      }),
    onSuccess: () => {
      toast.success(t("companyVideos.saved", "تم حفظ التعديلات"))
      queryClient.invalidateQueries({ queryKey: ["company", "my-videos"] })
      queryClient.invalidateQueries({ queryKey: ["company-videos"] })
      onClose()
    },
    onError: (err) => toast.error(errorText(err, t)),
  })

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("companyVideos.edit", "تعديل الفيديو")}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            save.mutate()
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="edit-title">{t("companyVideos.title", "العنوان")}</Label>
            <Input id="edit-title" required maxLength={150} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-desc">{t("companyVideos.description", "الوصف (يظهر تحت الفيديو)")}</Label>
            <Textarea id="edit-desc" rows={4} maxLength={5000} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("companyVideos.linkListing", "ربط بعقار (اختياري)")}</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{t("companyVideos.noListing", "بدون عقار")}</SelectItem>
                {listings.map((l) => (
                  <SelectItem key={l.id} value={String(l.id)}>
                    {l.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
            {t("companyVideos.isShort", "نشر كـ Short")}
            <Switch checked={isShort} onCheckedChange={setIsShort} />
          </label>
          <DialogFooter>
            <Button type="submit" disabled={save.isPending || !title.trim()}>
              {save.isPending ? <Loader2 className="size-4 animate-spin" /> : t("common.save", "حفظ")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Company dashboard → "قناة الفيديو": activities, upload (with progress), and managing published videos.
 */
export function CompanyVideosPage() {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [editing, setEditing] = useState(null)

  const { data, isLoading, isError, error } = useQuery({ queryKey: ["company", "my-videos"], queryFn: getMyCompanyVideos, retry: false })
  const videos = data?.items ?? []
  const meta = data?.meta ?? {}
  const channelHref = publicProfilePath(user)

  const toggleStatus = useMutation({
    mutationFn: (v) => updateCompanyVideo(v.id, { status: v.status === "hidden" ? "published" : "hidden" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company", "my-videos"] })
      queryClient.invalidateQueries({ queryKey: ["company-videos"] })
    },
    onError: (err) => toast.error(errorText(err, t)),
  })
  const remove = useMutation({
    mutationFn: (v) => deleteCompanyVideo(v.id),
    onSuccess: () => {
      toast.success(t("companyVideos.deleted", "تم حذف الفيديو"))
      queryClient.invalidateQueries({ queryKey: ["company", "my-videos"] })
      queryClient.invalidateQueries({ queryKey: ["company-videos"] })
    },
    onError: (err) => toast.error(errorText(err, t)),
  })

  if (isError) {
    return (
      <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        {error?.response?.data?.message ?? t("companyVideos.onlyCompanies", "قناة الفيديو متاحة لحسابات الشركات فقط.")}
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("companyVideos.pageTitle", "قناة الفيديو")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("companyVideos.pageHint", "فيديوهات عقاراتك تظهر في صفحة شركتك مثل قناة يوتيوب: فيديوهات عادية و Shorts مع التعليقات.")}
          </p>
        </div>
        {channelHref ? (
          <Button variant="outline" className="gap-2" asChild>
            <Link to={channelHref}>
              <ExternalLink className="size-4" aria-hidden />
              {t("companyVideos.viewChannel", "عرض قناتي")}
            </Link>
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <>
          <ActivitiesCard key={meta.company?.id} company={meta.company} />
          <UploadCard listings={meta.listings ?? []} maxMb={meta.max_upload_mb ?? 200} shortMaxSeconds={meta.short_max_seconds ?? 90} />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("companyVideos.myVideos", { count: videos.length, defaultValue: "فيديوهاتي ({{count}})" })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {videos.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{t("companyVideos.none", "لم ترفع أي فيديو بعد.")}</p>
              ) : (
                <ul className="divide-y divide-border">
                  {videos.map((v) => (
                    <li key={v.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
                      <Link to={v.is_short ? `/shorts/${v.id}` : `/videos/${v.id}`} className="relative block w-full shrink-0 overflow-hidden rounded-lg bg-muted sm:w-44">
                        <div className={v.is_short ? "mx-auto aspect-[9/16] w-24" : "aspect-video"}>
                          {v.thumbnail_url ? <img src={v.thumbnail_url} alt="" className="size-full object-cover" loading="lazy" /> : null}
                        </div>
                      </Link>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold">{v.title}</p>
                          {v.is_short ? (
                            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">Short</span>
                          ) : null}
                          {v.status === "hidden" ? (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{t("companyChannel.hidden", "مخفي")}</span>
                          ) : null}
                        </div>
                        <p className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><Eye className="size-3.5" />{formatCount(v.views_count, i18n.language)}</span>
                          <span className="inline-flex items-center gap-1"><ThumbsUp className="size-3.5" />{formatCount(v.likes_count, i18n.language)}</span>
                          <span className="inline-flex items-center gap-1"><MessageSquare className="size-3.5" />{formatCount(v.comments_count, i18n.language)}</span>
                          <span>{timeAgo(v.published_at ?? v.created_at, t)}</span>
                        </p>
                        {v.product ? <p className="truncate text-xs text-muted-foreground">🏠 {v.product.title}</p> : null}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setEditing(v)} aria-label={t("companyVideos.edit", "تعديل الفيديو")}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => toggleStatus.mutate(v)}
                          aria-label={v.status === "hidden" ? t("companyVideos.show", "إظهار") : t("companyVideos.hide", "إخفاء")}
                        >
                          {v.status === "hidden" ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => {
                            if (window.confirm(t("companyVideos.confirmDelete", "حذف الفيديو نهائياً مع تعليقاته؟"))) remove.mutate(v)
                          }}
                          aria-label={t("videoComments.delete", "حذف")}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {editing ? <EditDialog video={editing} listings={meta.listings ?? []} onClose={() => setEditing(null)} /> : null}
    </div>
  )
}
