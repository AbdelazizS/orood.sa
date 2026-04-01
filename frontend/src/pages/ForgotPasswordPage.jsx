import { useState } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useMutation } from "@tanstack/react-query"
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import * as authService from "@/services/authService"
import { Loader2, ArrowLeft } from "lucide-react"

export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState("")

  const mutation = useMutation({
    mutationFn: () => authService.forgotPassword(email),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    mutation.mutate()
  }

  return (
    <div className="flex w-full max-w-lg flex-col border border-border rounded-lg bg-card p-6">
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg font-bold text-foreground text-end">
          {t("auth.forgotPasswordTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-semibold text-foreground">
              {t("auth.emailLabel")}
            </Label>
            <Input
              id="email"
              type="email"
              placeholder={t("auth.enterEmailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={mutation.isPending}
            />
          </div>
          {mutation.isSuccess && (
            <p className="text-sm text-primary">
              {t("auth.forgotPasswordSuccess")}
            </p>
          )}
          {mutation.isError && (
            <p className="text-xs text-destructive">
              {mutation.error?.response?.data?.message ?? t("auth.forgotPasswordError")}
            </p>
          )}
          <Button
            type="submit"
            size="lg"
            className="w-full bg-primary"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            {t("auth.sendResetLink")}
          </Button>
        </form>
        <Button variant="ghost" asChild className="mt-4 w-full">
          <Link to="/login" className="flex items-center justify-center gap-2">
            <ArrowLeft className="size-4 rtl-rotate" />
            {t("auth.backToLogin")}
          </Link>
        </Button>
      </CardContent>
    </div>
  )
}
