import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { getSubscriberOverview } from "@/services/subscriberService"
import { useAuthStore } from "@/store/useAuthStore"
import { SubscriberPageHeader } from "@/components/subscriber/SubscriberPageHeader"
import { timeAgo } from "@/lib/timeAgo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  BadgeCheck,
  Coins,
  FolderCheck,
  Headset,
  Hourglass,
  Megaphone,
  MessageSquareText,
  ShoppingBag,
  Tag,
  Wallet,
  Ban,
  CalendarX,
  Undo2,
} from "lucide-react"

function StatCard({ icon, label, value, to, tone = "default" }) {
  const IconCmp = icon
  const body = (
    <Card className="h-full transition-colors hover:border-primary/40">
      <CardContent className="flex items-center gap-3 p-4">
        <span
          className={
            tone === "primary"
              ? "flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary"
              : tone === "danger"
                ? "flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive text-white"
                : "flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"
          }
        >
          <IconCmp className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tabular-nums">{value ?? "—"}</p>
        </div>
      </CardContent>
    </Card>
  )
  return to ? <Link to={to} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">{body}</Link> : body
}

/**
 * Subscriber dashboard home: live stats (client's note 3), pending top-up, latest follow-ups and quick actions.
 */
export function SubscriberOverviewPage() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const { data, isLoading } = useQuery({
    queryKey: ["subscriber", "overview"],
    queryFn: getSubscriberOverview,
    refetchInterval: 30_000,
  })

  const stats = [
    {
      icon: MessageSquareText,
      label: t("subscriber.stats.unread", "متابعات جديدة غير مقروءة"),
      value: data?.unread_total,
      to: "/subscriber/my-listings",
      tone: data?.unread_total > 0 ? "danger" : "default",
    },
    { icon: Coins, label: t("subscriber.stats.balance", "الرصيد المتبقي"), value: data?.credits_balance, to: "/subscriber/credits", tone: "primary" },
    { icon: ShoppingBag, label: t("subscriber.stats.purchased", "إجمالي الإعلانات المشتراة من عروض"), value: data?.credits_purchased, to: "/subscriber/credits" },
    { icon: BadgeCheck, label: t("subscriber.stats.used", "الإعلانات المستخدمة"), value: data?.credits_used, to: "/subscriber/credits" },
    { icon: FolderCheck, label: t("subscriber.stats.bought", "العقارات التي اشتريت إعلانها"), value: data?.bought_count, to: "/subscriber/my-listings" },
    { icon: Tag, label: t("subscriber.stats.sold", "العقارات المباعة"), value: data?.sold_count, to: "/subscriber/my-listings" },
    { icon: Megaphone, label: t("subscriber.stats.available", "عقارات تحتاج تسويق الآن"), value: data?.available_count, to: "/subscriber/requests", tone: "primary" },
  ]

  const sar = (v) => (v == null ? null : `${Math.round(v).toLocaleString("en-US")} ${t("common.currency", "ريال")}`)
  const moneyStats = [
    { icon: Wallet, label: t("subscriber.stats.amountPaid", "إجمالي مبلغ الإعلانات المشتراة"), value: sar(data?.amount_paid_sar), to: "/subscriber/credits" },
    { icon: BadgeCheck, label: t("subscriber.stats.amountUsed", "المستخدم حتى الآن"), value: sar(data?.amount_used_sar), to: "/subscriber/credits" },
    { icon: Coins, label: t("subscriber.stats.amountRemaining", "المتبقي"), value: sar(data?.amount_remaining_sar), to: "/subscriber/credits", tone: "primary" },
    { icon: CalendarX, label: t("subscriber.stats.expired", "إعلانات انتهت مدتها"), value: data?.expired_count, to: "/subscriber/my-listings" },
    { icon: Ban, label: t("subscriber.stats.cancelled", "إعلانات أُلغيت بطلب صاحب العقار"), value: data?.cancelled_count, to: "/subscriber/my-listings" },
    { icon: Undo2, label: t("subscriber.stats.refunded", "مبالغ مسترجعة"), value: sar(data?.amount_refunded_sar), to: "/subscriber/credits" },
  ]

  return (
    <div className="space-y-6">
      <SubscriberPageHeader
        title={t("subscriber.welcome", { name: user?.name ?? "", defaultValue: "أهلاً {{name}}" })}
        subtitle={t("subscriber.subtitle", "عقارات تحتاج مسوق — اشترِ الإعلان وتابع تسويقه")}
        actions={
          <>
            <Button asChild>
              <Link to="/subscriber/requests">{t("subscriber.tabs.available", "طلبات التسويق")}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/subscriber/credits">{t("subscriber.credits.request", "طلب رصيد")}</Link>
            </Button>
          </>
        }
      />

      {data?.pending_credit_request ? (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <Hourglass className="size-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <p className="min-w-0 flex-1">
            {t("subscriber.credits.pendingBanner", {
              count: data.pending_credit_request.quantity,
              defaultValue: "طلب رصيد ({{count}} إعلان) قيد مراجعة الإدارة.",
            })}
          </p>
          <Button size="sm" variant="ghost" asChild>
            <Link to="/subscriber/credits">{t("subscriber.credits.view", "التفاصيل")}</Link>
          </Button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {isLoading
          ? stats.map((s) => <Skeleton key={s.label} className="h-[76px] rounded-xl" />)
          : stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      <div>
        <h2 className="mb-3 text-base font-bold">{t("subscriber.stats.moneyTitle", "المبالغ والإلغاءات")}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {isLoading
            ? moneyStats.map((s) => <Skeleton key={s.label} className="h-[76px] rounded-xl" />)
            : moneyStats.map((s) => <StatCard key={s.label} {...s} />)}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquareText className="size-4" aria-hidden />
              {t("subscriber.recentNotes", "آخر المتابعات من فريق عروض")}
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/subscriber/my-listings">{t("subscriber.tabs.mine", "عروضي")}</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (data?.recent_notes ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("subscriber.notes.none", "لا توجد متابعات بعد")}</p>
            ) : (
              data.recent_notes.map((n) => (
                <Link
                  key={n.id}
                  to={`/subscriber/listings/${n.product_id}`}
                  className="block rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="truncate font-medium text-foreground">{n.product_title}</span>
                    <time dateTime={n.created_at} className="shrink-0">{timeAgo(n.created_at, t)}</time>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm">{n.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">— {n.author}</p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Headset className="size-4" aria-hidden />
              {t("subscriber.nav.support", "تواصل مع الإدارة")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>{t("subscriber.support.short", "لأي استفسار عن حسابك أو الرصيد أو عقار معيّن، راسل فريق عروض مباشرة.")}</p>
            <Button className="w-full" variant="outline" asChild>
              <Link to="/subscriber/support">{t("subscriber.support.open", "فتح محادثة مع الإدارة")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
