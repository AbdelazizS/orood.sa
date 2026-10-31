import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import apiClient from "@/lib/apiClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { BarChart3, Clapperboard, Database, Eye, History, ShieldCheck, Trash2, TriangleAlert } from "lucide-react"
import { cn } from "@/lib/utils"

const CONFIRM_WORD = "حذف"

const AGE_PRESETS = [
  [7, "أقدم من أسبوع"],
  [30, "أقدم من شهر"],
  [90, "أقدم من 3 أشهر"],
  [180, "أقدم من 6 أشهر"],
  [365, "أقدم من سنة"],
]

const DAY_PRESETS = [30, 60, 75, 90, 180, 365]

const VIDEO_SCOPES = [
  ["inactive_listings", "فيديوهات الإعلانات غير النشطة", "إعلانات مباعة أو منتهية أو مؤرشفة أو محذوفة أو موقوفة، والفيديوهات المخفية (موصى به)"],
  ["hidden", "الفيديوهات المخفية فقط", "التي أخفاها المشرف أو صاحبها"],
  ["all", "كل الفيديوهات", "يشمل فيديوهات الإعلانات المنشورة حالياً — تختفي من الإعلان والخريطة"],
]

const TABLE_LABELS = {
  page_visits: "مشاهدات الإعلانات والملفات",
  visitors: "زيارات الصفحات",
  analytics_search_events: "عمليات البحث",
}

const JOB_LABELS = {
  prune: "حذف تلقائي (تفاصيل التحليلات)",
  "data-analytics": "حذف يدوي — تفاصيل التحليلات",
  "data-videos": "حذف يدوي — فيديوهات",
}

const SCOPE_LABELS = Object.fromEntries(VIDEO_SCOPES.map(([id, label]) => [id, label]))

function riyadhToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())
}
function shift(dateStr, days) {
  const d = new Date(`${dateStr}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

const nf = (n, lang) => (n == null ? "—" : new Intl.NumberFormat(lang === "ar" ? "ar-SA" : "en-US").format(n))

function formatSize(kb, lang) {
  if (!kb) return "0 م.ب"
  if (kb >= 1024 * 1024) return `${nf(Math.round((kb / 1024 / 1024) * 10) / 10, lang)} ج.ب`
  if (kb >= 1024) return `${nf(Math.round((kb / 1024) * 10) / 10, lang)} م.ب`
  return `${nf(kb, lang)} ك.ب`
}

function formatDate(value, lang) {
  if (!value) return "—"
  const d = new Date(String(value).includes("T") || String(value).length <= 10 ? value : `${String(value).replace(" ", "T")}Z`)
  if (Number.isNaN(d.getTime())) return String(value)
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-SA-u-nu-latn" : "en-GB", {
    timeZone: "Asia/Riyadh", year: "numeric", month: "short", day: "numeric",
    ...(String(value).length > 10 ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(d)
}

function errorMessage(err) {
  const data = err?.response?.data
  const first = data?.errors && Object.values(data.errors)[0]
  return (Array.isArray(first) ? first[0] : null) || data?.message || "حدث خطأ"
}

function Stat({ icon: Icon, label, value, hint }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4.5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-lg font-bold tabular-nums">{value}</p>
        {hint ? <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  )
}

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted",
      )}
    >
      {children}
    </button>
  )
}

function AutoCleanupCard({ settings, analytics, lang }) {
  const queryClient = useQueryClient()
  const [enabled, setEnabled] = useState(settings.auto_enabled)
  const [days, setDays] = useState(String(settings.raw_days))
  useEffect(() => {
    setEnabled(settings.auto_enabled)
    setDays(String(settings.raw_days))
  }, [settings.auto_enabled, settings.raw_days])

  const save = useMutation({
    mutationFn: async (body) => (await apiClient.put("/admin/data-management/settings", body)).data?.data,
    onSuccess: () => {
      toast.success("تم حفظ إعدادات الحذف التلقائي")
      queryClient.invalidateQueries({ queryKey: ["admin", "data-management"] })
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const daysNum = Number(days)
  const daysValid = Number.isInteger(daysNum) && daysNum >= settings.min_days && daysNum <= settings.max_days
  const dirty = enabled !== settings.auto_enabled || daysNum !== settings.raw_days

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="size-4.5 text-primary" aria-hidden />
          الحذف التلقائي لتفاصيل التحليلات
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex items-start justify-between gap-4 rounded-xl border border-border p-3">
          <span>
            <span className="block text-sm font-semibold">تفعيل الحذف التلقائي</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
              يعمل يومياً الساعة {settings.schedule} (بتوقيت السعودية). يحذف التفاصيل فقط (من شاهد ومتى ومن أي جهاز)، والأرقام في «ذكاء السوق» تبقى دائماً.
            </span>
          </span>
          <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="تفعيل الحذف التلقائي" />
        </label>

        <div>
          <p className="mb-2 text-sm font-semibold">مدة الاحتفاظ بالتفاصيل (بالأيام)</p>
          <div className="flex flex-wrap items-center gap-2">
            {DAY_PRESETS.map((d) => (
              <Chip key={d} active={daysNum === d} onClick={() => setDays(String(d))}>
                {d === 75 ? "75 يوماً (شهران ونصف)" : d === 365 ? "سنة" : `${d} يوماً`}
              </Chip>
            ))}
            <Input
              type="number"
              inputMode="numeric"
              min={settings.min_days}
              max={settings.max_days}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="h-8 w-24"
              aria-label="عدد الأيام"
            />
          </div>
          {!daysValid ? (
            <p className="mt-1.5 text-xs text-destructive">بين {settings.min_days} و {settings.max_days} يوماً.</p>
          ) : null}
        </div>

        <div className="rounded-xl bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
          {!analytics.auto_would_delete ? (
            <>لا توجد حالياً تفاصيل أقدم من <b className="text-foreground">{formatDate(analytics.auto_cutoff, lang)}</b> — لن يُحذف شيء الآن.</>
          ) : settings.auto_enabled ? (
            <>
              في التشغيل القادم سيُحذف <b className="text-foreground tabular-nums">{nf(analytics.auto_would_delete, lang)}</b> سجل أقدم من{" "}
              <b className="text-foreground">{formatDate(analytics.auto_cutoff, lang)}</b>.
            </>
          ) : (
            <>
              الحذف التلقائي متوقف. لو فُعِّل الآن سيُحذف <b className="text-foreground tabular-nums">{nf(analytics.auto_would_delete, lang)}</b> سجل أقدم من{" "}
              <b className="text-foreground">{formatDate(analytics.auto_cutoff, lang)}</b>.
            </>
          )}
        </div>

        <Button
          disabled={!dirty || !daysValid || save.isPending}
          onClick={() => save.mutate({ auto_enabled: enabled, raw_days: daysNum })}
        >
          {save.isPending ? "جارٍ الحفظ…" : "حفظ الإعدادات"}
        </Button>
      </CardContent>
    </Card>
  )
}

function PreviewResult({ preview, lang }) {
  if (preview.target === "analytics") {
    return (
      <div className="space-y-2">
        <ul className="divide-y divide-border rounded-xl border border-border">
          {Object.entries(preview.tables).map(([table, count]) => (
            <li key={table} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span>{TABLE_LABELS[table] ?? table}</span>
              <span className="font-semibold tabular-nums">{nf(count, lang)}</span>
            </li>
          ))}
          <li className="flex items-center justify-between gap-3 bg-muted/40 px-3 py-2 text-sm font-bold">
            <span>المجموع</span>
            <span className="tabular-nums">{nf(preview.total, lang)}</span>
          </li>
        </ul>
        {preview.days_aggregated_first > 0 ? (
          <p className="text-xs text-muted-foreground">
            سيتم احتساب أرقام {nf(preview.days_aggregated_first, lang)} يوم أولاً قبل الحذف حتى لا تضيع من التقارير.
          </p>
        ) : null}
      </div>
    )
  }
  return (
    <ul className="divide-y divide-border rounded-xl border border-border text-sm">
      <li className="flex items-center justify-between gap-3 px-3 py-2">
        <span>عدد الفيديوهات</span>
        <span className="font-bold tabular-nums">{nf(preview.count, lang)}</span>
      </li>
      <li className="flex items-center justify-between gap-3 px-3 py-2">
        <span>المساحة التي ستتوفر (تقريباً)</span>
        <span className="whitespace-nowrap font-semibold tabular-nums">{formatSize(preview.size_kb, lang)}</span>
      </li>
      {preview.published > 0 ? (
        <li className="flex items-center justify-between gap-3 px-3 py-2 text-amber-700 dark:text-amber-400">
          <span>منها منشورة حالياً</span>
          <span className="font-semibold tabular-nums">{nf(preview.published, lang)}</span>
        </li>
      ) : null}
      {preview.unknown_size > 0 ? (
        <li className="px-3 py-2 text-xs text-muted-foreground">
          {nf(preview.unknown_size, lang)} فيديو حجمه غير مسجّل (رُفع قبل تسجيل الأحجام) — المساحة الفعلية أكبر.
        </li>
      ) : null}
    </ul>
  )
}

function ManualCleanupCard({ lang }) {
  const queryClient = useQueryClient()
  const [target, setTarget] = useState("analytics")
  const [age, setAge] = useState(90)
  const [custom, setCustom] = useState(false)
  const [from, setFrom] = useState(() => shift(riyadhToday(), -365))
  const [to, setTo] = useState(() => shift(riyadhToday(), -90))
  const [scope, setScope] = useState("inactive_listings")
  const [preview, setPreview] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmText, setConfirmText] = useState("")

  const body = useMemo(() => {
    const base = custom ? { mode: "range", from, to } : { mode: "older_than", older_than_days: age }
    return { target, ...base, ...(target === "videos" ? { scope } : {}) }
  }, [target, custom, from, to, age, scope])
  const bodyKey = JSON.stringify(body)

  // Any change of the selection invalidates the preview.
  useEffect(() => {
    setPreview(null)
  }, [bodyKey])

  const previewMutation = useMutation({
    mutationFn: async () => (await apiClient.post("/admin/data-management/preview", body)).data?.data,
    onSuccess: (data) => setPreview(data),
    onError: (err) => toast.error(errorMessage(err)),
  })

  const executeMutation = useMutation({
    mutationFn: async () => (await apiClient.post("/admin/data-management/execute", { ...body, confirm: confirmText.trim() })).data?.data,
    onSuccess: (data) => {
      toast.success(
        data.target === "videos"
          ? `تم حذف ${nf(data.deleted, lang)} فيديو وتوفير ${formatSize(data.size_kb, lang)}`
          : `تم حذف ${nf(data.total, lang)} سجل من التفاصيل`,
      )
      setConfirmOpen(false)
      setConfirmText("")
      setPreview(null)
      queryClient.invalidateQueries({ queryKey: ["admin", "data-management"] })
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const total = preview ? preview.total : 0
  const periodText = custom ? `من ${formatDate(from, lang)} إلى ${formatDate(to, lang)}` : AGE_PRESETS.find(([d]) => d === age)?.[1]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trash2 className="size-4.5 text-destructive" aria-hidden />
          حذف يدوي حسب الفترة
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <p className="mb-2 text-sm font-semibold">1. ماذا تريد أن تحذف؟</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[
              ["analytics", BarChart3, "تفاصيل التحليلات", "المشاهدات والزيارات وعمليات البحث بالتفصيل. الأرقام المجمّعة تبقى."],
              ["videos", Clapperboard, "الفيديوهات", "ملف الفيديو وصورته وسجله. لا يمكن استرجاعها."],
            ].map(([id, Icon, label, hint]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTarget(id)}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3 text-start transition-colors",
                  target === id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted/50",
                )}
              >
                <Icon className={cn("mt-0.5 size-5 shrink-0", target === id ? "text-primary" : "text-muted-foreground")} aria-hidden />
                <span>
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{hint}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {target === "videos" ? (
          <div>
            <p className="mb-2 text-sm font-semibold">أي فيديوهات؟</p>
            <div className="space-y-2">
              {VIDEO_SCOPES.map(([id, label, hint]) => (
                <label
                  key={id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-3",
                    scope === id ? "border-primary bg-primary/5" : "border-border",
                  )}
                >
                  <input
                    type="radio"
                    name="video-scope"
                    value={id}
                    checked={scope === id}
                    onChange={() => setScope(id)}
                    className="mt-1 accent-[var(--primary)]"
                  />
                  <span>
                    <span className={cn("block text-sm font-medium", id === "all" && "text-destructive")}>{label}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <p className="mb-2 text-sm font-semibold">2. الفترة</p>
          <div className="flex flex-wrap gap-2">
            {AGE_PRESETS.map(([d, label]) => (
              <Chip key={d} active={!custom && age === d} onClick={() => { setCustom(false); setAge(d) }}>
                {label}
              </Chip>
            ))}
            <Chip active={custom} onClick={() => setCustom(true)}>فترة مخصصة</Chip>
          </div>
          {custom ? (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:max-w-sm">
              <label className="text-xs text-muted-foreground">
                من
                <Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="mt-1" />
              </label>
              <label className="text-xs text-muted-foreground">
                إلى
                <Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="mt-1" />
              </label>
            </div>
          ) : null}
          {target === "analytics" ? (
            <p className="mt-2 text-[11px] text-muted-foreground">تفاصيل آخر 3 أيام لا تُحذف لأنها ما زالت تُحتسب.</p>
          ) : null}
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold">3. معاينة ثم تأكيد</p>
          <Button variant="outline" onClick={() => previewMutation.mutate()} disabled={previewMutation.isPending}>
            <Eye className="size-4" aria-hidden />
            {previewMutation.isPending ? "جارٍ الحساب…" : "معاينة ما سيُحذف"}
          </Button>

          {preview ? (
            <div className="space-y-3">
              <PreviewResult preview={preview} lang={lang} />
              {total > 0 ? (
                <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
                  <Trash2 className="size-4" aria-hidden />
                  حذف نهائي ({nf(total, lang)})
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">لا يوجد شيء للحذف في هذه الفترة.</p>
              )}
            </div>
          ) : null}
        </div>
      </CardContent>

      <Dialog open={confirmOpen} onOpenChange={(open) => { setConfirmOpen(open); if (!open) setConfirmText("") }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TriangleAlert className="size-5 text-destructive" aria-hidden />
              تأكيد الحذف النهائي
            </DialogTitle>
            <DialogDescription className="leading-relaxed">
              {target === "videos"
                ? `سيُحذف ${nf(total, lang)} فيديو (${SCOPE_LABELS[scope]}) — ${periodText}. لا يمكن التراجع.`
                : `سيُحذف ${nf(total, lang)} سجل من تفاصيل التحليلات — ${periodText}. الأرقام في «ذكاء السوق» تبقى. لا يمكن التراجع.`}
            </DialogDescription>
          </DialogHeader>
          <label className="block text-sm">
            اكتب كلمة <b>«{CONFIRM_WORD}»</b> للتأكيد
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="mt-2"
              autoFocus
              aria-label="كلمة التأكيد"
            />
          </label>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>إلغاء</Button>
            <Button
              variant="destructive"
              disabled={confirmText.trim() !== CONFIRM_WORD || executeMutation.isPending}
              onClick={() => executeMutation.mutate()}
            >
              {executeMutation.isPending ? "جارٍ الحذف…" : "حذف نهائياً"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function runSummary(run, lang) {
  if (run.error) return run.error
  const r = run.result
  if (!r) return run.status === "running" ? "قيد التنفيذ…" : "—"
  if (run.job === "data-videos") return `${nf(r.deleted, lang)} فيديو · ${formatSize(r.size_kb, lang)}`
  return `${nf(r.total, lang)} سجل`
}

function runPeriod(run, lang) {
  const p = run.params
  if (!p) return "—"
  const scope = p.scope ? ` · ${SCOPE_LABELS[p.scope] ?? p.scope}` : ""
  if (p.from) return `${formatDate(p.from, lang)} – ${formatDate(p.to, lang)}${scope}`
  if (p.older_than_days) return `أقدم من ${p.older_than_days} يوم${scope}`
  return `قبل ${formatDate(p.to, lang)}${scope}`
}

function RunsCard({ runs, lang }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="size-4.5 text-primary" aria-hidden />
          سجل عمليات الحذف
        </CardTitle>
      </CardHeader>
      <CardContent>
        {runs.length === 0 ? (
          <p className="text-sm text-muted-foreground">لم تتم أي عملية حذف بعد.</p>
        ) : (
          <ul className="divide-y divide-border">
            {runs.map((run) => (
              <li key={run.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{JOB_LABELS[run.job] ?? run.job}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(run.started_at, lang)} · {run.actor ? `${run.actor.name}${run.actor.account_number ? ` #${run.actor.account_number}` : ""}` : "النظام"} · {runPeriod(run, lang)}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-sm font-semibold tabular-nums",
                    run.status === "failed" ? "text-destructive" : run.status === "running" ? "text-amber-600" : "text-foreground",
                  )}
                >
                  {runSummary(run, lang)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export function AdminDataManagementPage() {
  const { i18n } = useTranslation()
  const lang = i18n.language?.startsWith("ar") ? "ar" : "en"
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "data-management"],
    queryFn: async () => (await apiClient.get("/admin/data-management")).data?.data,
  })

  const rawTotal = data ? Object.values(data.analytics.tables).reduce((s, t) => s + t.count, 0) : 0
  const rawOldest = data ? Object.values(data.analytics.tables).map((t) => t.oldest).filter(Boolean).sort()[0] : null

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 px-4 py-5 sm:px-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Database className="size-5 text-primary" aria-hidden />
          إدارة البيانات
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          احذف التفاصيل القديمة والفيديوهات لتوفير المساحة. الأرقام المجمّعة (أكثر المنتجات مشاهدة ومبيعاً، المدن، الأقسام، البحث) محفوظة دائماً ولا تُحذف من هنا.
        </p>
      </div>

      {isError ? <p className="text-sm text-destructive">تعذّر تحميل البيانات.</p> : null}

      {isLoading || !data ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat
              icon={BarChart3}
              label="تفاصيل التحليلات"
              value={`${nf(rawTotal, lang)} سجل`}
              hint={rawOldest ? `أقدم سجل: ${formatDate(rawOldest, lang)}` : "لا توجد سجلات"}
            />
            <Stat
              icon={Clapperboard}
              label="الفيديوهات"
              value={`${nf(data.videos.count, lang)} فيديو`}
              hint={`الحجم: ${formatSize(data.videos.size_kb, lang)} — منها ${nf(data.videos.inactive_listings, lang)} لإعلانات غير نشطة أو مخفية`}
            />
            <Stat
              icon={ShieldCheck}
              label="أرقام محفوظة دائماً"
              value={`${nf(data.analytics.aggregated_days, lang)} يوم`}
              hint={data.analytics.first_aggregated_date ? `منذ ${formatDate(data.analytics.first_aggregated_date, lang)}` : "—"}
            />
          </div>

          <AutoCleanupCard settings={data.settings} analytics={data.analytics} lang={lang} />
          <ManualCleanupCard lang={lang} />
          <RunsCard runs={data.runs} lang={lang} />
        </>
      )}
    </div>
  )
}

export default AdminDataManagementPage
