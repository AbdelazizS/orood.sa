import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import apiClient from "@/lib/apiClient"
import { DynamicContentRenderer } from "@/components/finance/DynamicContentRenderer"
import { HelpQuickTopics } from "@/components/help/HelpQuickTopics"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PageLoadingShell } from "@/components/ui/PageLoadingShell"
import { PAGE_CONTAINER_CLASS } from "@/lib/pageLayout"
import { cn } from "@/lib/utils"

export function HelpPage() {
  const { t, i18n } = useTranslation()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["help-page", i18n.language],
    queryFn: async () => {
      const { data: res } = await apiClient.get("/help/page", {
        params: { page: "dashboard_help" },
        headers: { "Accept-Language": i18n.language?.startsWith("en") ? "en" : "ar" },
      })
      return res?.data ?? {}
    },
  })

  if (isLoading) {
    return <PageLoadingShell variant="help" />
  }

  if (isError) {
    return (
      <div className={cn(PAGE_CONTAINER_CLASS, "py-16 text-center text-sm text-muted-foreground")}>
        <p>{t("common.error")}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
          {t("common.retry", "Retry")}
        </Button>
      </div>
    )
  }

  const hasSupportEmail = Boolean(data?.support?.email)

  return (
    <div className={cn(PAGE_CONTAINER_CLASS, "space-y-8 py-6 md:py-10 overflow-x-hidden")}>
      <header className="space-y-2 border-b border-border pb-6">
        <p className="text-sm font-medium text-primary">{t("help.kicker", "Help center")}</p>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t("help.pageTitle", "Help & support")}</h1>
        <p className="text-muted-foreground max-w-3xl leading-relaxed">{t("help.pageSubtitle")}</p>
      </header>

      <HelpQuickTopics />

      <DynamicContentRenderer
        blocks={(data?.blocks ?? []).filter((b) => b.block_type !== "hero")}
        support={data?.support}
        contacts={data?.contacts ?? []}
        showContactCard={hasSupportEmail}
      />

      <Card className="border-primary/20 bg-muted/30">
        <CardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">{t("help.needMoreTitle", "Still need help?")}</p>
            <p className="text-sm text-muted-foreground mt-1">{t("help.needMoreDesc")}</p>
          </div>
          <Button asChild className="shrink-0">
            <Link to="/contact">{t("help.contactFormLink", "Contact us")}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
