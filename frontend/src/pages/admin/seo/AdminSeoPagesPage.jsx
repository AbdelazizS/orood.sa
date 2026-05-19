import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { fetchSeoPages, saveSeoPage, syncCategorySeoPages } from "@/services/seoService"
import { GoogleSeoPreview } from "@/features/admin/seo/GoogleSeoPreview"

export function AdminSeoPagesPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data: pages = [], isLoading } = useQuery({ queryKey: ["admin-seo-pages"], queryFn: fetchSeoPages })
  const [selectedKey, setSelectedKey] = useState("home")
  const selected = pages.find((p) => p.page_key === selectedKey) ?? pages[0]
  const [draft, setDraft] = useState(null)

  const draftPage = draft ?? selected

  const saveMutation = useMutation({
    mutationFn: () => saveSeoPage(draftPage.page_key, draftPage),
    onSuccess: () => {
      toast.success(t("admin.seo.saved"))
      qc.invalidateQueries({ queryKey: ["admin-seo-pages"] })
      setDraft(null)
    },
  })

  const syncMutation = useMutation({
    mutationFn: syncCategorySeoPages,
    onSuccess: (res) => {
      toast.success(t("admin.seo.synced", { count: res?.count ?? 0 }))
      qc.invalidateQueries({ queryKey: ["admin-seo-pages"] })
    },
  })

  if (isLoading || !draftPage) return <p className="text-muted-foreground">{t("common.loading")}</p>

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <div className="space-y-2 max-h-[70vh] overflow-y-auto border rounded-lg p-2">
        <Button type="button" variant="outline" size="sm" className="w-full mb-2" onClick={() => syncMutation.mutate()}>
          {t("admin.seo.syncCategories")}
        </Button>
        {pages.map((p) => (
          <button
            key={p.page_key}
            type="button"
            className={`w-full text-start rounded px-2 py-1.5 text-sm ${p.page_key === draftPage.page_key ? "bg-muted font-medium" : ""}`}
            onClick={() => {
              setSelectedKey(p.page_key)
              setDraft(null)
            }}
          >
            {p.page_key}
          </button>
        ))}
      </div>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          saveMutation.mutate()
        }}
      >
        <GoogleSeoPreview
          title={draftPage.seo_title}
          description={draftPage.meta_description}
          url={`https://www.arooth.com${draftPage.route_pattern || "/"}`}
        />
        <motion-safe-field>
          <Label>{t("admin.seo.pages.title")}</Label>
          <Input
            value={draftPage.seo_title ?? ""}
            onChange={(e) => setDraft({ ...draftPage, seo_title: e.target.value })}
          />
        </motion-safe-field>
        <div className="space-y-2">
          <Label>{t("admin.seo.pages.description")}</Label>
          <Textarea
            rows={4}
            value={draftPage.meta_description ?? ""}
            onChange={(e) => setDraft({ ...draftPage, meta_description: e.target.value })}
          />
        </div>
        <Button type="submit" disabled={saveMutation.isPending}>{t("common.save")}</Button>
      </form>
    </div>
  )
}
