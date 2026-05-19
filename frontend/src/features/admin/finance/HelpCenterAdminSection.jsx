import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import apiClient from "@/lib/apiClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

export function HelpCenterAdminSection() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin", "help", "support-settings"],
    queryFn: async () => {
      const { data } = await apiClient.get("/admin/help/support-settings")
      return data?.data ?? {}
    },
  })

  const [form, setForm] = useState(null)
  const current = form ?? settings ?? {}

  const saveMutation = useMutation({
    mutationFn: (payload) => apiClient.put("/admin/help/support-settings", payload),
    onSuccess: () => {
      toast.success(t("common.saved", "Saved"))
      queryClient.invalidateQueries({ queryKey: ["admin", "help", "support-settings"] })
      queryClient.invalidateQueries({ queryKey: ["help-page"] })
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t("common.error")),
  })

  if (isLoading && !form) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("admin.helpSupportSettings", "Support settings")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>{t("admin.supportEmail", "Support email")}</Label>
            <Input
              value={current.support_email ?? ""}
              onChange={(e) => setForm((p) => ({ ...(p ?? settings), support_email: e.target.value }))}
            />
          </div>
          <div>
            <Label>WhatsApp</Label>
            <Input
              value={current.whatsapp ?? ""}
              onChange={(e) => setForm((p) => ({ ...(p ?? settings), whatsapp: e.target.value }))}
            />
          </div>
          <div>
            <Label>{t("admin.hoursAr", "Hours (AR)")}</Label>
            <Textarea
              rows={2}
              value={current.hours_ar ?? ""}
              onChange={(e) => setForm((p) => ({ ...(p ?? settings), hours_ar: e.target.value }))}
            />
          </div>
          <Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate({ ...settings, ...form })}>
            {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : t("common.save")}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("admin.helpPreview", "Preview")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>{t("admin.helpPreviewHint", "Members see content at /dashboard/help.")}</p>
          <Button variant="link" className="px-0 mt-2" asChild>
            <a href="/dashboard/help" target="_blank" rel="noreferrer">
              {t("admin.previewHelpPage", "Open help page")}
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
