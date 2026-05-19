import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { fetchRobotsTxt, updateRobotsTxt } from "@/services/seoService"

export function AdminSeoRobotsPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ["admin-seo-robots"], queryFn: fetchRobotsTxt })
  const [content, setContent] = useState("")

  useEffect(() => {
    if (data?.content != null) setContent(data.content)
    else if (data?.stored) setContent(data.stored)
  }, [data])

  const saveMutation = useMutation({
    mutationFn: () => updateRobotsTxt(content),
    onSuccess: () => {
      toast.success(t("admin.seo.saved"))
      qc.invalidateQueries({ queryKey: ["admin-seo-robots"] })
    },
  })

  if (isLoading) return <p className="text-muted-foreground">{t("common.loading")}</p>

  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-sm text-muted-foreground">{t("admin.seo.robots.hint")}</p>
      <Textarea rows={14} value={content} onChange={(e) => setContent(e.target.value)} className="font-mono text-xs" />
      <Button type="button" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
        {t("common.save")}
      </Button>
    </div>
  )
}
