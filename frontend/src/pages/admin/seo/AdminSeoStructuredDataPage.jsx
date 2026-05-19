import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { fetchSeoGlobal, updateSeoGlobal } from "@/services/seoService"

const TOGGLE_KEYS = [
  "website",
  "organization",
  "search_action",
  "breadcrumbs",
  "product",
  "collection_page",
  "faq",
]

export function AdminSeoStructuredDataPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ["admin-seo-global"], queryFn: fetchSeoGlobal })
  const [toggles, setToggles] = useState({})
  const [org, setOrg] = useState({ name: "", logo: "", sameAs: "" })

  useEffect(() => {
    if (data) {
      setToggles(data.schema_toggles ?? {})
      const organization = data.organization ?? {}
      setOrg({
        name: organization.name ?? "",
        logo: organization.logo ?? "",
        sameAs: Array.isArray(organization.sameAs) ? organization.sameAs.join("\n") : "",
      })
    }
  }, [data])

  const saveMutation = useMutation({
    mutationFn: () =>
      updateSeoGlobal({
        schema_toggles: toggles,
        organization: {
          name: org.name,
          logo: org.logo,
          sameAs: org.sameAs
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
        },
      }),
    onSuccess: () => {
      toast.success(t("admin.seo.saved"))
      qc.invalidateQueries({ queryKey: ["admin-seo-global"] })
    },
  })

  if (isLoading) return <p className="text-muted-foreground">{t("common.loading")}</p>

  return (
    <form
      className="max-w-xl space-y-6"
      onSubmit={(e) => {
        e.preventDefault()
        saveMutation.mutate()
      }}
    >
      <div>
        <h2 className="font-semibold mb-3">{t("admin.seo.structured.toggles")}</h2>
        <div className="space-y-2">
          {TOGGLE_KEYS.map((key) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={Boolean(toggles[key])}
                onCheckedChange={(checked) => setToggles((prev) => ({ ...prev, [key]: Boolean(checked) }))}
              />
              {key}
            </label>
          ))}
        </div>
      </div>
      <div>
        <h2 className="font-semibold mb-3">{t("admin.seo.structured.organization")}</h2>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>name</Label>
            <Input value={org.name} onChange={(e) => setOrg({ ...org, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>logo</Label>
            <Input value={org.logo} onChange={(e) => setOrg({ ...org, logo: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>sameAs (one URL per line)</Label>
            <Input value={org.sameAs} onChange={(e) => setOrg({ ...org, sameAs: e.target.value })} />
          </div>
        </div>
      </div>
      <Button type="submit" disabled={saveMutation.isPending}>
        {t("common.save")}
      </Button>
    </form>
  )
}
