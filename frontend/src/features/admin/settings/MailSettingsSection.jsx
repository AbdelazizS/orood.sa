import { useState, useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import apiClient from "@/lib/apiClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

export function MailSettingsSection() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [form, setForm] = useState(null)
  const [testTo, setTestTo] = useState("")

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "mail-settings"],
    queryFn: async () => {
      const { data: res } = await apiClient.get("/admin/settings/mail")
      return res?.data ?? {}
    },
  })

  useEffect(() => {
    if (data && !form) setForm(data)
  }, [data, form])

  const saveMutation = useMutation({
    mutationFn: (payload) => apiClient.put("/admin/settings/mail", payload),
    onSuccess: () => {
      toast.success(t("common.saved"))
      queryClient.invalidateQueries({ queryKey: ["admin", "mail-settings"] })
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t("common.error")),
  })

  const testMutation = useMutation({
    mutationFn: (email) => apiClient.post("/admin/settings/mail/test", { to: email }),
    onSuccess: () => toast.success(t("admin.mailTestSent", "تم إرسال رسالة الاختبار")),
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
        <CardTitle className="text-base">{t("admin.mailSettingsTitle", "إعدادات البريد")}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("admin.mailSettingsDesc", "SMTP والمرسل — للإنتاج عدّل أيضاً ملف .env على الخادم.")}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>{t("admin.mailFromAddress", "بريد المرسل")}</Label>
          <Input
            type="email"
            value={p.from_address ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, from_address: e.target.value }))}
          />
        </div>
        <div>
          <Label>{t("admin.mailFromName", "اسم المرسل")}</Label>
          <Input
            value={p.from_name ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, from_name: e.target.value }))}
          />
        </div>
        <div>
          <Label>{t("admin.mailHost", "خادم SMTP")}</Label>
          <Input value={p.host ?? ""} onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t("admin.mailPort", "المنفذ")}</Label>
            <Input
              type="number"
              value={p.port ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, port: Number(e.target.value) }))}
            />
          </div>
          <div>
            <Label>{t("admin.mailEncryption", "التشفير")}</Label>
            <Input
              value={p.encryption ?? ""}
              placeholder="tls"
              onChange={(e) => setForm((f) => ({ ...f, encryption: e.target.value }))}
            />
          </div>
        </div>
        <div>
          <Label>{t("admin.mailUsername", "اسم المستخدم")}</Label>
          <Input value={p.username ?? ""} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />
        </div>
        <div>
          <Label>{t("admin.mailPassword", "كلمة المرور")}</Label>
          <Input
            type="password"
            placeholder={p.password_set ? "••••••••" : ""}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
        </div>
        <Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate(form)}>
          {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {t("common.saved", "حفظ")}
        </Button>
        <div className="border-t pt-4 space-y-2">
          <Label>{t("admin.mailTestTo", "إرسال اختبار إلى")}</Label>
          <div className="flex gap-2">
            <Input type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
            <Button
              type="button"
              variant="outline"
              disabled={!testTo || testMutation.isPending}
              onClick={() => testMutation.mutate(testTo)}
            >
              {t("admin.mailSendTest", "إرسال")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
