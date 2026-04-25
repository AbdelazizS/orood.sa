import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Eye, CalendarDays } from "lucide-react"
import apiClient from "@/lib/apiClient"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

const PERIOD_OPTIONS = ["today", "week", "month", "year"]
const CHART_PERIODS = [...PERIOD_OPTIONS, "all_time"]

function toNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function normalizeVisitorStatsPayload(raw) {
  const countsCombined = {
    today: toNumber(raw?.counts_combined?.today ?? raw?.counts?.today),
    week: toNumber(raw?.counts_combined?.week ?? raw?.counts?.week),
    month: toNumber(raw?.counts_combined?.month ?? raw?.counts?.month),
    year: toNumber(raw?.counts_combined?.year ?? raw?.counts?.year),
  }

  return {
    counts_combined: countsCombined,
    total_visits: toNumber(raw?.total_visits),
    valid_visits_count: toNumber(raw?.valid_visits_count ?? raw?.total_visits),
    invalid_visits_without_timestamp: toNumber(raw?.invalid_visits_without_timestamp),
    excluded_internal_visits: toNumber(raw?.excluded_internal_visits),
    today_breakdown: {
      profile_today: toNumber(raw?.today_breakdown?.profile_today),
      listings_today: toNumber(raw?.today_breakdown?.listings_today),
    },
    last_visit_at_combined: raw?.last_visit_at_combined ?? null,
  }
}

function normalizeDashboardHomeFallback(raw) {
  const today = toNumber(raw?.stats?.views?.today)
  const week = toNumber(raw?.stats?.views?.thisWeek)
  return {
    counts_combined: {
      today,
      week,
      month: week,
      year: week,
    },
    total_visits: week,
    valid_visits_count: week,
    invalid_visits_without_timestamp: 0,
    excluded_internal_visits: 0,
    today_breakdown: {
      profile_today: today,
      listings_today: Math.max(0, week - today),
    },
    last_visit_at_combined: null,
  }
}

export function DashboardViewsPage() {
  const { t } = useTranslation()
  const [period, setPeriod] = useState("week")
  const browserTimezone =
    Intl?.DateTimeFormat?.().resolvedOptions?.().timeZone || "UTC"

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "views", "visitor-stats", browserTimezone],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get("/account/visitor-stats", {
          params: { tz: browserTimezone },
          headers: { "X-Timezone": browserTimezone },
        })
        return normalizeVisitorStatsPayload(data?.data ?? {})
      } catch {
        const { data } = await apiClient.get("/dashboard/home")
        return normalizeDashboardHomeFallback(data?.data ?? {})
      }
    },
    retry: 2,
    retryDelay: (attempt) => Math.min(1200 * attempt, 3000),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })

  const chartData = useMemo(
    () =>
      CHART_PERIODS.map((key) => ({
        key,
        label: t(`dashboard.viewsPage.period.${key}`),
        value:
          key === "all_time"
            ? Number(data?.total_visits ?? 0)
            : toNumber(data?.counts_combined?.[key]),
      })),
    [data, t]
  )

  const selectedValue = toNumber(data?.counts_combined?.[period])
  const totalVisits = toNumber(data?.total_visits)
  const hasAnyData = chartData.some((item) => item.value > 0)
  const invalidVisits = toNumber(data?.invalid_visits_without_timestamp)
  const excludedInternal = toNumber(data?.excluded_internal_visits)
  const profileToday = toNumber(data?.today_breakdown?.profile_today)
  const listingsToday = toNumber(data?.today_breakdown?.listings_today)
  const showTodayHint = period === "today" && selectedValue === 0 && totalVisits > 0
  const lastVisitText = useMemo(() => {
    if (!data?.last_visit_at_combined) return null
    const d = new Date(data.last_visit_at_combined)
    if (Number.isNaN(d.getTime())) return null
    return d.toLocaleString()
  }, [data?.last_visit_at_combined])

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 py-4 sm:py-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.viewsPage.title")}</CardTitle>
          <CardDescription>{t("dashboard.viewsPage.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Eye className="size-4" />
              {t("dashboard.viewsPage.totalVisitors")}
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-3xl font-bold">{totalVisits.toLocaleString()}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">{t("dashboard.viewsPage.totalVisitorsHint")}</p>
          </div>
          <div className="rounded-xl border p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CalendarDays className="size-4" />
              {t("dashboard.viewsPage.selectedPeriod")}
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-3xl font-bold">{selectedValue.toLocaleString()}</p>
            )}
            <p className="mt-1 text-xs font-medium text-muted-foreground">{t(`dashboard.viewsPage.period.${period}`)}</p>
            {!isLoading && showTodayHint ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {t("dashboard.viewsPage.todayDiagnostic", {
                  profile: profileToday,
                  listings: listingsToday,
                  lastVisit: lastVisitText ?? t("dashboard.viewsPage.noRecentVisit"),
                })}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.viewsPage.chartTitle")}</CardTitle>
          <CardDescription>{t("dashboard.viewsPage.chartSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((key) => (
              <Button
                key={key}
                type="button"
                size="sm"
                variant={period === key ? "default" : "outline"}
                onClick={() => setPeriod(key)}
              >
                {t(`dashboard.viewsPage.period.${key}`)}
              </Button>
            ))}
          </div>

          {isLoading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : !hasAnyData ? (
            <p className="text-sm text-muted-foreground">
              {invalidVisits > 0
                ? t("dashboard.viewsPage.noQualifyingVisits", { count: invalidVisits })
                : excludedInternal > 0
                  ? t("dashboard.viewsPage.internalExcluded")
                  : t("dashboard.viewsPage.empty")}
            </p>
          ) : (
            <>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} domain={[0, "auto"]} />
                    <Tooltip />
                    <Bar
                      dataKey="value"
                      fill="var(--chart-1)"
                      minPointSize={4}
                      radius={[6, 6, 0, 0]}
                      name={t("dashboard.viewsPage.visits")}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
