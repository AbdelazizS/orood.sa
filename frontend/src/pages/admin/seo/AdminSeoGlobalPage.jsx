import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { fetchSeoGlobal, updateSeoGlobal, uploadSeoOgImage } from "@/services/seoService"

export function AdminSeoGlobalPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ["admin-seo-global"], queryFn: fetchSeoGlobal })
  const [form, setForm] = useState({})

  useEffect(() => {
    if (data) setForm(data)
  }, [data])

  const saveMutation = useMutation({
    mutationFn: () => updateSeoGlobal(form),
    onSuccess: () => {
      toast.success(t("admin.seo.saved"))
      qc.invalidateQueries({ queryKey: ["admin-seo-global"] })
    },
  })

  const uploadMutation = useMutation({
    mutationFn: (file) => uploadSeoOgImage(file),
    onSuccess: (res) => {
      setForm((f) => ({ ...f, og_image: res.url }))
      toast.success(t("admin.seo.saved"))
    },
  })

  if (isLoading) return <p className="text-muted-foreground">{t("common.loading")}</p>

  return (
    <form
      className="max-w-2xl space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        saveMutation.mutate()
      }}
    >
      <div className="space-y-2">
        <Label>{t("admin.seo.global.siteName")}</Label>
        <Input value={form.site_name ?? ""} onChange={(e) => setForm({ ...form, site_name: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>{t("admin.seo.global.description")}</Label>
        <Textarea
          rows={4}
          value={form.meta_description ?? ""}
          onChange={(e) => setForm({ ...form, meta_description: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>{t("admin.seo.global.keywords")}</Label>
        <Input value={form.meta_keywords ?? ""} onChange={(e) => setForm({ ...form, meta_keywords: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>{t("admin.seo.global.ogImage")}</Label>
        <Input value={form.og_image ?? ""} onChange={(e) => setForm({ ...form, og_image: e.target.value })} />
        <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadMutation.mutate(e.target.files[0])} />
      </div>
      <Button type="submit" disabled={saveMutation.isPending}>
        {t("common.save")}
      </Button>
    </form>
  )
}
