import { useState, useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import apiClient from "@/lib/apiClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

export function OrderEditPolicySection() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "order-edit-policy"],
    queryFn: async () => {
      const { data: res } = await apiClient.get("/admin/order-edit-policies")
      return res?.data ?? {}
    },
  })

  const [form, setForm] = useState(null)

  useEffect(() => {
    if (data && !form) setForm(data)
  }, [data, form])

  const mutation = useMutation({
    mutationFn: (payload) => apiClient.put("/admin/order-edit-policies", payload),
    onSuccess: () => {
      toast.success(t("common.saved", "Saved"))
      queryClient.invalidateQueries({ queryKey: ["admin", "order-edit-policy"] })
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t("common.error")),
  })

  const p = form ?? data ?? {}

  if (isLoading && !form) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="text-base">{t("admin.orderEditPolicyTitle", t("admin.orderEditPolicy", "سياسة تعديل الطلب"))}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>{t("admin.maxTextEdits", "Max text edits")}</Label>
          <Input
            type="number"
            min={0}
            value={p.max_text_edits ?? 2}
            onChange={(e) => setForm((f) => ({ ...f, max_text_edits: Number(e.target.value) }))}
          />
        </div>
        <div>
          <Label>{t("admin.editWindowHours", "Edit window (hours)")}</Label>
          <Input
            type="number"
            min={1}
            value={p.edit_window_hours ?? 24}
            onChange={(e) => setForm((f) => ({ ...f, edit_window_hours: Number(e.target.value) }))}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <Label>{t("admin.imageEditRequiresApproval", "Image changes require approval")}</Label>
          <Switch
            checked={Boolean(p.image_edit_requires_approval)}
            onCheckedChange={(v) => setForm((f) => ({ ...f, image_edit_requires_approval: Boolean(v) }))}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <Label>{t("admin.priceEditRequiresApproval", "Price changes require approval")}</Label>
          <Switch
            checked={Boolean(p.price_edit_requires_approval)}
            onCheckedChange={(v) => setForm((f) => ({ ...f, price_edit_requires_approval: Boolean(v) }))}
          />
        </div>
        <div className="border-t pt-4 space-y-4">
          <p className="text-sm font-medium">{t("admin.locationEditPolicyTitle", "Delivery location edits")}</p>
          <div>
            <Label>{t("admin.maxLocationEdits", "Max location edits per order")}</Label>
            <Input
              type="number"
              min={0}
              value={p.max_location_edits ?? 2}
              onChange={(e) => setForm((f) => ({ ...f, max_location_edits: Number(e.target.value) }))}
            />
          </div>
          <div>
            <Label>{t("admin.locationEditWindowHours", "Location edit window (hours from order)")}</Label>
            <Input
              type="number"
              min={1}
              value={p.location_edit_window_hours ?? 24}
              onChange={(e) => setForm((f) => ({ ...f, location_edit_window_hours: Number(e.target.value) }))}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label>{t("admin.locationEditActive", "Allow buyers to edit delivery location")}</Label>
            <Switch
              checked={Boolean(p.location_edit_active ?? true)}
              onCheckedChange={(v) => setForm((f) => ({ ...f, location_edit_active: Boolean(v) }))}
            />
          </div>
        </div>
        <Button disabled={mutation.isPending} onClick={() => mutation.mutate(form)}>
          {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : t("common.save")}
        </Button>
      </CardContent>
    </Card>
  )
}
