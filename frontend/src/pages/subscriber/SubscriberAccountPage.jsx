import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { getSubscriberAccount, updateSubscriberAccount } from "@/services/subscriberService"
import * as authService from "@/services/authService"
import { useAuthStore } from "@/store/useAuthStore"
import { SubscriberPageHeader } from "@/components/subscriber/SubscriberPageHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2 } from "lucide-react"

function errorText(err, t) {
  const first = Object.values(err?.response?.data?.errors ?? {})[0]?.[0]
  return first ?? err?.response?.data?.message ?? t("common.errorGeneric", "حدث خطأ")
}

function AccountForm({ account }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [name, setName] = useState(account.name ?? "")
  const [phone, setPhone] = useState(account.phone ?? "")

  const save = useMutation({
    mutationFn: () => updateSubscriberAccount({ name: name.trim(), phone: phone.trim() || null }),
    onSuccess: (data) => {
      toast.success(t("subscriber.account.saved", "تم حفظ البيانات"))
      queryClient.setQueryData(["subscriber", "account"], data)
      const { user, token } = useAuthStore.getState()
      if (user) useAuthStore.getState().setAuth({ ...user, name: data.name, phone: data.phone }, token)
    },
    onError: (err) => toast.error(errorText(err, t)),
  })

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        save.mutate()
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="acc-name">{t("adminSubscribers.name", "الاسم")}</Label>
        <Input id="acc-name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="acc-phone">{t("adminSubscribers.colPhone", "الجوال")}</Label>
        <Input id="acc-phone" dir="ltr" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="acc-email">{t("adminSubscribers.email", "البريد الإلكتروني")}</Label>
        <Input id="acc-email" dir="ltr" value={account.email ?? ""} disabled />
        <p className="text-xs text-muted-foreground">{t("subscriber.account.emailHint", "لتغيير البريد تواصل مع الإدارة.")}</p>
      </div>
      <Button type="submit" disabled={save.isPending || !name.trim()}>
        {save.isPending ? <Loader2 className="size-4 animate-spin" /> : t("common.save", "حفظ")}
      </Button>
    </form>
  )
}

function PasswordForm() {
  const { t } = useTranslation()
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")

  const change = useMutation({
    mutationFn: () => authService.changePassword(current, next, confirm),
    onSuccess: () => {
      toast.success(t("subscriber.account.passwordChanged", "تم تغيير كلمة المرور"))
      setCurrent("")
      setNext("")
      setConfirm("")
    },
    onError: (err) => toast.error(errorText(err, t)),
  })

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        change.mutate()
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="pw-current">{t("subscriber.account.currentPassword", "كلمة المرور الحالية")}</Label>
        <PasswordInput id="pw-current" required value={current} onChange={(e) => setCurrent(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pw-new">{t("subscriber.account.newPassword", "كلمة المرور الجديدة")}</Label>
        <PasswordInput id="pw-new" required value={next} onChange={(e) => setNext(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pw-confirm">{t("subscriber.account.confirmPassword", "تأكيد كلمة المرور")}</Label>
        <PasswordInput id="pw-confirm" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      <Button type="submit" variant="outline" disabled={change.isPending || !current || !next || next !== confirm}>
        {change.isPending ? <Loader2 className="size-4 animate-spin" /> : t("subscriber.account.changePassword", "تغيير كلمة المرور")}
      </Button>
      {next && confirm && next !== confirm ? (
        <p className="text-xs text-destructive">{t("subscriber.account.mismatch", "كلمتا المرور غير متطابقتين")}</p>
      ) : null}
    </form>
  )
}

/** Subscriber account: name, phone and password. */
export function SubscriberAccountPage() {
  const { t } = useTranslation()
  const { data, isLoading } = useQuery({ queryKey: ["subscriber", "account"], queryFn: getSubscriberAccount })

  return (
    <div className="space-y-6">
      <SubscriberPageHeader
        title={t("subscriber.nav.account", "حسابي")}
        subtitle={t("subscriber.account.subtitle", "بياناتك لا تظهر لعملاء المنصة — تراها الإدارة فقط.")}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("subscriber.account.details", "البيانات الأساسية")}</CardTitle>
          </CardHeader>
          <CardContent>{isLoading || !data ? <Skeleton className="h-48 w-full" /> : <AccountForm key={data.id} account={data} />}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("subscriber.account.passwordTitle", "كلمة المرور")}</CardTitle>
          </CardHeader>
          <CardContent>
            <PasswordForm />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
