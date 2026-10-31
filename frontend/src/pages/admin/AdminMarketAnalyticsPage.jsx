import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import apiClient from "@/lib/apiClient"
import { useRegions } from "@/hooks/useRegions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowDownRight, ArrowUpRight, Info } from "lucide-react"
import { cn } from "@/lib/utils"

const ALL = "all"

/** Saudi calendar "today" as YYYY-MM-DD. */
function riyadhToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())
}
function shift(dateStr, days) {
  const d = new Date(`${dateStr}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
function presetRange(id) {
  const today = riyadhToday()
  const [y, m] = today.split("-").map(Number)
  const pad = (n) => String(n).padStart(2, "0")
  const monthStart = (yy, mm) => `${yy}-${pad(mm)}-01`
  const monthEnd = (yy, mm) => new Date(Date.UTC(yy, mm, 0)).toISOString().slice(0, 10)
  switch (id) {
    case "today": return [today, today]
    case "7d": return [shift(today, -6), today]
    case "30d": return [shift(today, -29), today]
    case "90d": return [shift(today, -89), today]
    case "this_month": return [monthStart(y, m), today]
    case "prev_month": {
      const pm = m === 1 ? 12 : m - 1
      const py = m === 1 ? y - 1 : y
      return [monthStart(py, pm), monthEnd(py, pm)]
    }
    case "this_year": return [`${y}-01-01`, today]
    case "prev_year": return [`${y - 1}-01-01`, `${y - 1}-12-31`]
    default: return [shift(today, -29), today]
  }
}

const PRESETS = [
  ["today", "اليوم"], ["7d", "آخر 7 أيام"], ["30d", "آخر 30 يوماً"], ["90d", "آخر 90 يوماً"],
  ["this_month", "هذا الشهر"], ["prev_month", "الشهر السابق"], ["this_year", "هذه السنة"], ["prev_year", "السنة السابقة"], ["custom", "مخصص"],
]

const nf = (n, lang, opts) => (n == null ? "—" : new Intl.NumberFormat(lang === "ar" ? "ar-SA" : "en-US", opts).format(n))

function Delta({ cur, prev }) {
  if (cur == null || prev == null || prev === 0) return <span className="text-[11px] text-muted-foreground">—</span>
  const pct = ((cur - prev) / prev) * 100
  const up = pct >= 0
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums", up ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
      <Icon className="size-3.5" aria-hidden />
      {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

function Kpi({ label, value, cur, prev, hint }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3" title={hint}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
      <div className="mt-0.5 flex items-center gap-1.5">
        <Delta cur={cur} prev={prev} />
        <span className="text-[10px] text-muted-foreground">مقارنة بالفترة السابقة</span>
      </div>
    </div>
  )
}

/** Single-series bar chart (one metric at a time, one axis) with a hover tooltip per bar. */
function TrendChart({ points, metric, lang }) {
  const max = Math.max(1, ...points.map((p) => p[metric] || 0))
  const [hover, setHover] = useState(null)
  if (!points.length) return <p className="py-10 text-center text-sm text-muted-foreground">لا توجد بيانات لهذه الفترة</p>
  return (
    <div className="relative">
      <div className="flex h-44 items-end gap-[2px] border-b border-border" dir="ltr" role="img" aria-label="trend">
        {points.map((p, i) => (
          <button
            key={p.period}
            type="button"
            className="group relative flex h-full min-w-[3px] flex-1 items-end focus:outline-none"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            aria-label={`${p.period}: ${p[metric]}`}
          >
            <span
              className={cn("w-full rounded-t-[4px] bg-primary/80 transition-colors", hover === i && "bg-primary")}
              style={{ height: `${Math.max(p[metric] ? 2 : 0, (100 * (p[metric] || 0)) / max)}%` }}
            />
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground" dir="ltr">
        <span>{points[0].period}</span>
        <span>{points[points.length - 1].period}</span>
      </div>
      {hover != null ? (
        <div className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md">
          <span className="text-muted-foreground" dir="ltr">{points[hover].period}</span>
          {" · "}
          <span className="font-semibold tabular-nums">{nf(points[hover][metric], lang)}</span>
        </div>
      ) : null}
    </div>
  )
}

function DataTable({ columns, rows, empty = "لا توجد بيانات" }) {
  if (!rows?.length) return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            {columns.map((c) => (
              <th key={c.key} className={cn("px-2 py-2 font-medium", c.num ? "text-end" : "text-start")}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.product_id ?? r.id ?? r.term ?? i} className="border-b border-border/60 last:border-0">
              {columns.map((c) => (
                <td key={c.key} className={cn("px-2 py-2", c.num && "text-end tabular-nums")}>{c.render ? c.render(r) : r[c.key] ?? "—"}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * «ذكاء السوق»: products, cities, sections, sales and search demand for any period — read from the
 * permanent daily aggregates, so past years stay available after detailed events are deleted.
 */
export function AdminMarketAnalyticsPage() {
  const { i18n } = useTranslation()
  const lang = i18n.language?.startsWith("ar") ? "ar" : "en"
  const [preset, setPreset] = useState("30d")
  const [custom, setCustom] = useState(() => presetRange("30d"))
  const [cityId, setCityId] = useState(ALL)
  const [categoryId, setCategoryId] = useState(ALL)
  const [metric, setMetric] = useState("views")
  const [productTab, setProductTab] = useState("most_viewed")
  const [from, to] = preset === "custom" ? custom : presetRange(preset)

  const { data: regions = [] } = useRegions()
  const cities = useMemo(() => regions.flatMap((r) => r.cities ?? []), [regions])
  const { data: categories = [] } = useQuery({
    queryKey: ["categories", i18n.language],
    queryFn: async () => {
      const { data } = await apiClient.get("/categories")
      return Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []
    },
    staleTime: 10 * 60_000,
  })

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "market-analytics", from, to, cityId, categoryId],
    queryFn: async () =>
      (await apiClient.get("/admin/market-analytics", {
        params: {
          from,
          to,
          city_id: cityId === ALL ? undefined : cityId,
          category_id: categoryId === ALL ? undefined : categoryId,
        },
      })).data?.data,
    placeholderData: (prev) => prev,
  })

  const s = data?.summary
  const p = data?.previous_summary
  const money = (n) => (n == null ? "—" : `${nf(n, lang, { maximumFractionDigits: 0 })} ر.س`)
  const pct = (n) => (n == null ? "—" : `${nf(n, lang, { maximumFractionDigits: 2 })}%`)

  const productCols = [
    { key: "title", label: "الإعلان", render: (r) => <span className="line-clamp-1">{r.title ?? `#${r.product_id}`}</span> },
    { key: "category", label: "القسم" },
    { key: "city", label: "المدينة" },
    { key: "views", label: "المشاهدات", num: true, render: (r) => nf(r.views, lang) },
    { key: "change", label: "التغيّر", num: true, render: (r) => <Delta cur={r.views} prev={r.previous_views} /> },
    { key: "completed_orders", label: "مبيعات مكتملة", num: true, render: (r) => nf(r.completed_orders, lang) },
    { key: "completed_revenue", label: "الإيراد", num: true, render: (r) => money(r.completed_revenue) },
    { key: "conversion_rate", label: "التحويل", num: true, render: (r) => pct(r.conversion_rate) },
  ]
  const dimCols = (nameLabel) => [
    { key: "name", label: nameLabel, render: (r) => r.name ?? `#${r.id}` },
    { key: "views", label: "المشاهدات", num: true, render: (r) => nf(r.views, lang) },
    { key: "change", label: "التغيّر", num: true, render: (r) => <Delta cur={r.views} prev={r.previous_views} /> },
    { key: "searches", label: "عمليات البحث", num: true, render: (r) => nf(r.searches, lang) },
    { key: "completed_orders", label: "مبيعات مكتملة", num: true, render: (r) => nf(r.completed_orders, lang) },
    { key: "completed_revenue", label: "الإيراد", num: true, render: (r) => money(r.completed_revenue) },
    { key: "conversion_rate", label: "التحويل", num: true, render: (r) => pct(r.conversion_rate) },
  ]

  const productTabs = [
    ["most_viewed", "الأكثر مشاهدة"], ["best_selling", "الأكثر مبيعاً"], ["top_revenue", "الأعلى إيراداً"],
    ["best_conversion", "الأعلى تحويلاً"], ["rising", "طلب متزايد"], ["declining", "طلب متراجع"],
  ]

  return (
    <div className="space-y-5" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">ذكاء السوق</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          أداء المنصة واتجاهات السوق لأي فترة. الأرقام من إحصاءات يومية دائمة (بتوقيت السعودية)، وتبقى متاحة للسنوات السابقة حتى بعد حذف الأحداث التفصيلية بعد {data?.meta?.raw_retention_days ?? 75} يوماً.
        </p>
      </div>

      {/* Filters in one row */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-wrap gap-1 rounded-xl bg-muted/50 p-1">
          {PRESETS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setPreset(id)}
              className={cn("rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors", preset === id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              {label}
            </button>
          ))}
        </div>
        {preset === "custom" ? (
          <div className="flex items-center gap-1.5">
            <Input type="date" value={custom[0]} max={custom[1]} onChange={(e) => setCustom([e.target.value, custom[1]])} className="h-9 w-40" />
            <span className="text-muted-foreground">—</span>
            <Input type="date" value={custom[1]} min={custom[0]} onChange={(e) => setCustom([custom[0], e.target.value])} className="h-9 w-40" />
          </div>
        ) : null}
        <Select value={String(cityId)} onValueChange={setCityId}>
          <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>كل المدن</SelectItem>
            {cities.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={String(categoryId)} onValueChange={setCategoryId}>
          <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>كل الأقسام</SelectItem>
            {categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground tabular-nums" dir="ltr">{from} → {to}</span>
      </div>

      {isLoading && !data ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : s ? (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi label="مشاهدات الإعلانات" value={nf(s.views, lang)} cur={s.views} prev={p?.views} hint="عدد مرات فتح صفحات الإعلانات" />
            <Kpi label="زوار فريدون (مجموع يومي)" value={nf(s.unique_viewers, lang)} cur={s.unique_viewers} prev={p?.unique_viewers} hint="مجموع الزوار المختلفين لكل يوم؛ الزائر نفسه في يومين يُحسب مرتين" />
            <Kpi label="عمليات البحث" value={nf(s.searches, lang)} cur={s.searches} prev={p?.searches} />
            <Kpi label="الطلبات" value={nf(s.orders, lang)} cur={s.orders} prev={p?.orders} hint="كل الطلبات المنشأة في الفترة بكل حالاتها" />
            <Kpi label="مبيعات مكتملة" value={nf(s.completed_orders, lang)} cur={s.completed_orders} prev={p?.completed_orders} hint="طلبات بحالة مكتمل أو تم التسليم" />
            <Kpi label="إيراد المبيعات المكتملة" value={money(s.completed_revenue)} cur={s.completed_revenue} prev={p?.completed_revenue} />
            <Kpi label="متوسط قيمة الطلب" value={money(s.average_order_value)} cur={s.average_order_value} prev={p?.average_order_value} />
            <Kpi label="معدل التحويل" value={pct(s.conversion_rate)} cur={s.conversion_rate} prev={p?.conversion_rate} hint="المبيعات المكتملة ÷ المشاهدات" />
          </div>
          <p className="text-xs text-muted-foreground">
            ملغاة: {nf(s.cancelled_orders, lang)} · مستردة: {nf(s.refunded_orders, lang)} · بحث بلا نتائج: {nf(s.zero_result_searches, lang)}
          </p>

          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base">الاتجاه {data.trend.granularity === "month" ? "الشهري" : "اليومي"}</CardTitle>
              <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
                {[["views", "المشاهدات"], ["completed_orders", "المبيعات"], ["completed_revenue", "الإيراد"], ["searches", "البحث"]].map(([id, label]) => (
                  <button key={id} type="button" onClick={() => setMetric(id)} className={cn("rounded-md px-2 py-1 text-xs font-semibold", metric === id ? "bg-background shadow-sm" : "text-muted-foreground")}>
                    {label}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <TrendChart points={data.trend.points} metric={metric} lang={lang} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-2">
              <CardTitle className="text-base">أداء الإعلانات</CardTitle>
              <div className="flex flex-wrap gap-1">
                {productTabs.map(([id, label]) => (
                  <button key={id} type="button" onClick={() => setProductTab(id)} className={cn("rounded-full border px-3 py-1 text-xs font-semibold", productTab === id ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
                    {label}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <DataTable columns={productCols} rows={data.products[productTab]} />
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">المدن</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <DataTable columns={dimCols("المدينة")} rows={data.cities.rows} />
                {data.cities.high_demand_low_conversion?.length ? (
                  <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-2.5 text-xs">
                    <p className="mb-1 font-semibold">طلب مرتفع وتحويل منخفض (فرص للتوسع)</p>
                    <p className="text-muted-foreground">
                      {data.cities.high_demand_low_conversion.map((c) => `${c.name ?? c.id} (${nf(c.views, lang)} مشاهدة · ${pct(c.conversion_rate)})`).join(" — ")}
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">الأقسام</CardTitle></CardHeader>
              <CardContent>
                <DataTable columns={dimCols("القسم")} rows={data.categories.rows} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">الكلمات الأكثر بحثاً</CardTitle></CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    { key: "term", label: "الكلمة" },
                    { key: "searches", label: "عمليات البحث", num: true, render: (r) => nf(r.searches, lang) },
                    { key: "change", label: "التغيّر", num: true, render: (r) => <Delta cur={r.searches} prev={r.previous_searches} /> },
                    { key: "zero_result_searches", label: "بلا نتائج", num: true, render: (r) => nf(r.zero_result_searches, lang) },
                  ]}
                  rows={data.search.top_terms}
                  empty="لا توجد عمليات بحث مسجلة في هذه الفترة"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">بحث بلا نتائج (طلب غير مُلبّى)</CardTitle></CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    { key: "term", label: "الكلمة" },
                    { key: "zero_result_searches", label: "مرات بلا نتائج", num: true, render: (r) => nf(r.zero_result_searches, lang) },
                  ]}
                  rows={data.search.zero_result_terms}
                  empty="كل عمليات البحث وجدت نتائج"
                />
              </CardContent>
            </Card>
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            <div className="space-y-1">
              <p>المبيعات المكتملة = طلبات بحالة «مكتمل» أو «تم التسليم»، مؤرخة بيوم إنشاء الطلب. الطلبات المعلقة أو بانتظار الدفع أو الملغاة لا تُحتسب ضمن المبيعات أو الإيراد.</p>
              <p>المستردة = طلبات ملغاة سجّلت الإدارة سبب استرداد لها. مدينة الإعلان هي مدينة العقار/المنتج (لا تتبع المنصة مدينة الزائر).</p>
              <p>آخر تحديث للإحصاءات: <span dir="ltr">{data.meta.last_aggregated_at ?? "—"}</span> · أقدم يوم متاح: <span dir="ltr">{data.meta.first_aggregated_date ?? "—"}</span></p>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
