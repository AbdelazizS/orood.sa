import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { fetchSeoAuditIssues, runSeoAudit } from "@/services/seoService"

export function AdminSeoReportsPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data: issues = [], isLoading } = useQuery({
    queryKey: ["admin-seo-audit"],
    queryFn: fetchSeoAuditIssues,
  })

  const runMutation = useMutation({
    mutationFn: runSeoAudit,
    onSuccess: () => {
      toast.success(t("admin.seo.saved"))
      qc.invalidateQueries({ queryKey: ["admin-seo-audit", "admin-seo-dashboard"] })
    },
  })

  return (
    <div className="space-y-4">
      <Button type="button" disabled={runMutation.isPending} onClick={() => runMutation.mutate()}>
        {t("admin.seo.reports.run")}
      </Button>
      {isLoading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : issues.length === 0 ? (
        <p className="text-muted-foreground">{t("admin.seo.reports.empty")}</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {issues.map((issue) => (
            <li key={issue.id} className="px-4 py-3 text-sm">
              <p className="font-medium">{issue.issue_type ?? t("admin.seo.reports.issue")}</p>
              <p className="text-muted-foreground">{issue.message ?? issue.page_key}</p>
              {issue.page_key ? (
                <p className="text-xs mt-1">
                  {issue.page_key}
                  {issue.suggested_fix ? ` — ${issue.suggested_fix}` : ""}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
