import { useState } from "react"
import { Link } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { adminListCompanyVideos, adminSetCompanyVideoStatus } from "@/services/companyVideoService"
import { formatCount } from "@/lib/video/videoFormat"
import { timeAgo } from "@/lib/timeAgo"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Eye, EyeOff, Loader2, Search } from "lucide-react"
import { cn } from "@/lib/utils"

/** Admin: moderate company channel videos (hide with a reason / restore). */
export function AdminCompanyVideosPage() {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("")
  const [hiding, setHiding] = useState(null)
  const [reason, setReason] = useState("")

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "company-videos", search, status],
    queryFn: () => adminListCompanyVideos({ search, status }),
  })
  const rows = data?.items ?? []

  const setVideoStatus = useMutation({
    mutationFn: ({ id, next, why }) => adminSetCompanyVideoStatus(id, next, why),
    onSuccess: () => {
      toast.success(t("adminVideos.updated", "تم تحديث حالة الفيديو"))
      setHiding(null)
      queryClient.invalidateQueries({ queryKey: ["admin", "company-videos"] })
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t("common.errorGeneric", "حدث خطأ")),
  })

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <Card>
        <CardHeader className="space-y-3">
          <CardTitle>{t("adminVideos.title", "فيديوهات الشركات")}</CardTitle>
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("adminVideos.search", "بحث بالعنوان أو اسم الشركة")} className="ps-9" />
            </div>
            {[
              { id: "", label: t("adminVideos.all", "الكل") },
              { id: "published", label: t("adminVideos.published", "منشور") },
              { id: "hidden", label: t("adminVideos.hidden", "مخفي") },
            ].map((o) => (
              <Button key={o.id || "all"} size="sm" variant={status === o.id ? "default" : "outline"} onClick={() => setStatus(o.id)}>
                {o.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("adminVideos.empty", "لا توجد فيديوهات")}</p>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((v) => (
                <li key={v.id} className={cn("flex flex-col gap-3 py-3 sm:flex-row sm:items-center", v.status === "hidden" && "opacity-70")}>
                  <Link to={v.is_short ? `/shorts/${v.id}` : `/videos/${v.id}`} className="block w-full shrink-0 overflow-hidden rounded-lg bg-muted sm:w-40">
                    <div className="aspect-video">{v.thumbnail_url ? <img src={v.thumbnail_url} alt="" className="size-full object-cover" loading="lazy" /> : null}</div>
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {v.title} {v.is_short ? <span className="text-xs text-destructive">· Short</span> : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {v.company?.name} · {formatCount(v.views_count, i18n.language)} {t("adminVideos.views", "مشاهدة")} · {timeAgo(v.published_at ?? v.created_at, t)}
                    </p>
                    {v.hidden_reason ? <p className="text-xs text-destructive">{t("adminVideos.reason", "سبب الإخفاء")}: {v.hidden_reason}</p> : null}
                  </div>
                  {v.status === "hidden" ? (
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setVideoStatus.mutate({ id: v.id, next: "published" })}>
                      <Eye className="size-4" aria-hidden />
                      {t("adminVideos.restore", "إعادة النشر")}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-destructive"
                      onClick={() => {
                        setReason("")
                        setHiding(v)
                      }}
                    >
                      <EyeOff className="size-4" aria-hidden />
                      {t("adminVideos.hide", "إخفاء")}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(hiding)} onOpenChange={(o) => !o && setHiding(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("adminVideos.hideTitle", "إخفاء الفيديو")}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              setVideoStatus.mutate({ id: hiding.id, next: "hidden", why: reason.trim() })
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="hide-reason">{t("adminVideos.reasonLabel", "السبب (يُرسل للشركة)")}</Label>
              <Input id="hide-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="submit" variant="destructive" disabled={setVideoStatus.isPending}>
                {setVideoStatus.isPending ? <Loader2 className="size-4 animate-spin" /> : t("adminVideos.hide", "إخفاء")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
