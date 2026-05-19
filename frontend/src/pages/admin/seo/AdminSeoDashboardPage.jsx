import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { fetchSeoDashboard } from "@/services/seoService"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function AdminSeoDashboardPage() {
  const { t } = useTranslation()
  const { data, isLoading } = useQuery({ queryKey: ["admin-seo-dashboard"], queryFn: fetchSeoDashboard })

  if (isLoading) return <p className="text-muted-foreground">{t("common.loading")}</p>

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader><CardTitle>{t("admin.seo.stats.pages", "Page meta")}</CardTitle></CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{data?.page_meta_count ?? 0}</p>
          <p className="text-sm text-muted-foreground">{t("admin.seo.stats.active", { count: data?.active_pages ?? 0 })}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t("admin.seo.stats.audit", "Audit issues")}</CardTitle></CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{data?.pending_audit_issues ?? 0}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t("admin.seo.stats.sitemap", "Sitemap")}</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>{t("admin.seo.stats.lastRun")}: {data?.sitemap?.last_generated_at ?? "—"}</p>
          <p>{t("admin.seo.stats.urlCount")}: {data?.sitemap?.last_url_count ?? "—"}</p>
        </CardContent>
      </Card>
      <Card className="sm:col-span-2 lg:col-span-3">
        <CardHeader><CardTitle>{t("admin.seo.gsc.title", "Post-deploy checklist")}</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2 list-decimal ps-5">
          <li>{t("admin.seo.gsc.step1", "Submit https://www.arooth.com/sitemap_index.xml in Google Search Console")}</li>
          <li>{t("admin.seo.gsc.step2", "Request indexing for /, /wholesale, and top category URLs")}</li>
          <li>{t("admin.seo.gsc.step3", "Allow 2–4 weeks for sitelink refresh (not guaranteed)")}</li>
        </CardContent>
      </Card>
    </div>
  )
}
