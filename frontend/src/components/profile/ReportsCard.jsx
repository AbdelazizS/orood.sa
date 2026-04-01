import { useState } from "react"
import { Link } from "react-router-dom"
import { useReports } from "@/hooks/useReports"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { resolveImageUrl } from "@/lib/imageUrl"
import { BarChart3 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

const PERIOD_OPTIONS = [
  { value: "today", label: "اليوم" },
  { value: "week", label: "هذا الأسبوع" },
  { value: "month", label: "هذا الشهر" },
  { value: "year", label: "هذا العام" },
]

const RANK_LABELS = {
  1: "الأول",
  2: "الثاني",
  3: "الثالث",
  4: "الرابع",
  5: "الخامس",
}

export function ReportsCard({ enabled = true }) {
  const [period, setPeriod] = useState("week")
  const { data, isLoading } = useReports(period, enabled)

  if (!enabled) return null

  const entries = data?.entries ?? []

  return (
    <Card className="mx-4 mt-4">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <h3 className="text-base font-semibold">تقارير العروض</h3>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="h-8 w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <BarChart3 size={40} className="mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">لا توجد تقارير متاحة</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <Link
                key={entry.id}
                to={`/products/${entry.id}`}
                className="flex items-center gap-3 rounded-lg border border-border p-2 transition-colors hover:bg-muted/30"
              >
                <div className="h-10 w-12 shrink-0 overflow-hidden rounded border border-border bg-muted">
                  {entry.thumbnail ? (
                    <img
                      src={resolveImageUrl(entry.thumbnail)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <BarChart3 size={16} className="text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 text-start">
                  <p className="truncate text-sm font-semibold text-primary hover:text-primary/80">
                    {entry.title}
                  </p>
                  <p className="text-xs font-bold text-foreground">
                    {entry.view_count} مشاهدة
                  </p>
                </div>
                <span className="shrink-0 rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {RANK_LABELS[entry.rank] ?? `#${entry.rank}`}
                </span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
