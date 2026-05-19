import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { bulkSaveSeoPages, fetchSeoPages } from "@/services/seoService"

function rowsToCsv(rows) {
  const header = ["page_key", "seo_title", "meta_description", "meta_keywords", "robots", "priority", "changefreq"]
  const lines = [header.join(",")]
  for (const row of rows) {
    lines.push(
      header
        .map((key) => {
          const val = row[key] ?? ""
          const str = String(val).replace(/"/g, '""')
          return str.includes(",") ? `"${str}"` : str
        })
        .join(",")
    )
  }
  return lines.join("\n")
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return []
  const header = lines[0].split(",").map((h) => h.trim())
  return lines.slice(1).map((line) => {
    const cols = line.match(/("([^"]|"")*"|[^,]*)/g)?.map((c) => c.replace(/^"|"$/g, "").replace(/""/g, '"').trim()) ?? []
    const row = {}
    header.forEach((key, i) => {
      row[key] = cols[i] ?? ""
    })
    return row
  })
}

export function AdminSeoBulkPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data: pages = [], isLoading } = useQuery({ queryKey: ["admin-seo-pages"], queryFn: fetchSeoPages })
  const [csv, setCsv] = useState("")

  const defaultCsv = useMemo(() => rowsToCsv(pages), [pages])

  const saveMutation = useMutation({
    mutationFn: () => bulkSaveSeoPages(parseCsv(csv || defaultCsv)),
    onSuccess: (res) => {
      toast.success(t("admin.seo.bulk.saved", { count: res?.count ?? 0 }))
      qc.invalidateQueries({ queryKey: ["admin-seo-pages"] })
    },
  })

  if (isLoading) return <p className="text-muted-foreground">{t("common.loading")}</p>

  return (
    <div className="space-y-4 max-w-4xl">
      <p className="text-sm text-muted-foreground">{t("admin.seo.bulk.hint")}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => setCsv(defaultCsv)}>
          {t("admin.seo.bulk.export")}
        </Button>
        <Button type="button" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
          {t("common.save")}
        </Button>
      </div>
      <Textarea rows={18} value={csv || defaultCsv} onChange={(e) => setCsv(e.target.value)} className="font-mono text-xs" />
    </div>
  )
}
