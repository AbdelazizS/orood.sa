import { useState } from "react"
import { useVisitorStats } from "@/hooks/useVisitorStats"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { resolveImageUrl } from "@/lib/imageUrl"
import { toast } from "sonner"
import { Copy, Check } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

const PERIOD_LABELS = {
  now: "في هذه اللحظة",
  today: "اليوم",
  week: "هذا الأسبوع",
  month: "هذا الشهر",
}

const SOURCE_LABELS = {
  facebook: "Facebook",
  twitter: "Twitter",
  linkedin: "LinkedIn",
  whatsapp: "WhatsApp",
  youtube: "YouTube",
  direct: "مباشر",
  other: "أخرى",
}

export function VisitorStatsCard({ enabled = true }) {
  const { data, isLoading } = useVisitorStats(enabled)
  const [copied, setCopied] = useState(false)

  const handleCopyLink = () => {
    const link = data?.share_link ?? ""
    if (!link) return
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      toast.success("تم نسخ الرابط")
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (!enabled) return null
  if (isLoading) {
    return (
      <Card className="mx-4 mt-4">
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    )
  }

  const counts = data?.counts ?? {}
  const sources = data?.sources ?? {}
  const recentVisitors = data?.recent_visitors ?? []

  return (
    <Card className="mx-4 mt-4">
      <CardHeader className="pb-2">
        <h3 className="text-base font-semibold">إحصائيات الزوار</h3>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-4 gap-2 divide-x divide-border divide-x-reverse">
          {(["now", "today", "week", "month"]).map((key) => (
            <div key={key} className="text-center">
              <p className="text-3xl font-bold text-foreground">{counts[key] ?? 0}</p>
              <p className="text-xs text-muted-foreground">{PERIOD_LABELS[key]}</p>
            </div>
          ))}
        </div>

        {Object.keys(sources).length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 text-start text-muted-foreground">المصدر</th>
                  <th className="py-2 text-end">اليوم</th>
                  <th className="py-2 text-end">الأسبوع</th>
                  <th className="py-2 text-end">الشهر</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(SOURCE_LABELS).map(([key, label]) => (
                  <tr key={key} className="border-b border-border/60">
                    <td className="py-1.5 text-start">{label}</td>
                    <td className="py-1.5 text-end">{sources.today?.[key] ?? 0}</td>
                    <td className="py-1.5 text-end">{sources.week?.[key] ?? 0}</td>
                    <td className="py-1.5 text-end">{sources.month?.[key] ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {recentVisitors.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold text-muted-foreground">
              آخر الزوار
            </p>
            <div className="flex flex-wrap gap-3">
              {recentVisitors.slice(0, 5).map((v) => (
                <div
                  key={v.id}
                  className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={resolveImageUrl(v.avatar_url)} />
                    <AvatarFallback className="text-xs">
                      {(v.username ?? "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-start">
                    <p className="text-xs font-medium">{v.username ?? "زائر"}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {v.visited_at
                        ? new Date(v.visited_at).toLocaleDateString("ar-SA", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
            رابط المشاركة
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={data?.share_link ?? ""}
              className="flex-1 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={handleCopyLink}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
