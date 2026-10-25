import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import apiClient from "@/lib/apiClient"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

/** Homepage switches: show / hide the «سوق الجملة» button (hidden by default). */
export function SiteFeaturesSection() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "site-features"],
    queryFn: async () => (await apiClient.get("/admin/site-features")).data?.data ?? {},
  })

  const save = useMutation({
    mutationFn: async (patch) => (await apiClient.put("/admin/site-features", patch)).data?.data,
    onSuccess: (next) => {
      queryClient.setQueryData(["admin", "site-features"], next)
      queryClient.invalidateQueries({ queryKey: ["homepage", "features"] })
      toast.success(t("common.saved", "تم الحفظ"))
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t("common.error", "حدث خطأ")),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("admin.siteFeatures.title", "عرض سوق الجملة")}</CardTitle>
        <CardDescription>
          {t("admin.siteFeatures.hint", "إخفاء أو إظهار زر «سوق الجملة» في الصفحة الرئيسية وأسفل الموقع. صفحة سوق الجملة نفسها تبقى كما هي.")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
          <Label htmlFor="site-feature-wholesale" className="cursor-pointer text-sm font-medium">
            {t("admin.siteFeatures.showWholesaleButton", "إظهار زر «سوق الجملة»")}
          </Label>
          <Switch
            id="site-feature-wholesale"
            checked={Boolean(data?.show_wholesale_button)}
            disabled={isLoading || save.isPending}
            onCheckedChange={(v) => save.mutate({ show_wholesale_button: v })}
          />
        </div>
      </CardContent>
    </Card>
  )
}
