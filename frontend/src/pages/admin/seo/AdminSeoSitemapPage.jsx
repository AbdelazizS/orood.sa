import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { fetchSitemapSettings, generateSitemap, updateSitemapSettings } from "@/services/seoService"

const FLAGS = [
  "include_main",
  "include_categories",
  "include_subcategories",
  "include_offers",
  "include_requests",
  "include_wholesale",
  "include_companies",
  "include_cities",
  "include_profiles",
  "auto_generate",
  "ping_google",
  "ping_bing",
]

export function AdminSeoSitemapPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ["admin-seo-sitemap"], queryFn: fetchSitemapSettings })
  const [form, setForm] = useState({})

  useEffect(() => {
    if (data) setForm(data)
  }, [data])

  const saveMutation = useMutation({
    mutationFn: () => updateSitemapSettings(form),
    onSuccess: () => {
      toast.success(t("admin.seo.saved"))
      qc.invalidateQueries({ queryKey: ["admin-seo-sitemap"] })
    },
  })

  const generateMutation = useMutation({
    mutationFn: () => generateSitemap(),
    onSuccess: (res) => {
      toast.success(t("admin.seo.sitemap.generated", { count: res?.data?.url_count ?? 0 }))
      qc.invalidateQueries({ queryKey: ["admin-seo-sitemap", "admin-seo-dashboard"] })
    },
  })

  if (isLoading) return <p className="text-muted-foreground">{t("common.loading")}</p>

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h2 className="font-semibold mb-3">{t("admin.seo.sitemap.flags")}</h2>
        <div className="space-y-2">
          {FLAGS.map((key) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={Boolean(form[key])}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, [key]: Boolean(checked) }))}
              />
              {key}
            </label>
          ))}
        </div>
      </div>
      {form.last_generated_at ? (
        <p className="text-sm text-muted-foreground">
          {t("admin.seo.stats.lastRun")}: {form.last_generated_at} — {t("admin.seo.stats.urlCount")}:{" "}
          {form.last_url_count ?? "—"}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
          {t("common.save")}
        </Button>
        <Button type="button" disabled={generateMutation.isPending} onClick={() => generateMutation.mutate()}>
          {t("admin.seo.sitemap.generate")}
        </Button>
      </div>
    </div>
  )
}
